/* =====================================================================
   TOUCH ABROAD — forms.js
   Handles every lead form on the site (hero, mid-page, footer, contact).
   - Inline validation + accessible error messaging
   - Honeypot + time-trap spam protection
   - Lifecycle events: form_start, form_error, form_abandonment, generate_lead
   - Submits to a configurable endpoint, then redirects to the thank-you page
     with ?form=<name> so each form fires its own conversion.

   CONFIG: set TA_CONFIG.endpoint to your Google Apps Script Web App URL
   (or any webhook). If left blank, forms validate + track + redirect, but
   do NOT post anywhere — useful while wiring up the backend.
   On WordPress, you may instead delete these forms and drop in Contact
   Form 7 shortcodes; the dataLayer event names below match the GTM setup.
   ===================================================================== */
(function () {
  'use strict';

  var TA_CONFIG = window.TA_CONFIG || {};
  var ENDPOINT  = TA_CONFIG.endpoint || '';            // <-- set in page or here
  var THANKYOU  = TA_CONFIG.thankYouUrl || 'thank-you.html';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[+()\-\s\d]{7,20}$/;

  document.querySelectorAll('form[data-lead-form]').forEach(initForm);

  function initForm(form) {
    var formName = form.getAttribute('data-form-name') || 'enquiry';
    var started = false, submitted = false;
    var loadedAt = Date.now();

    // form_start on first interaction
    form.addEventListener('focusin', function () {
      if (!started) {
        started = true;
        taTrack('form_start', { form_name: formName });
      }
    }, { once: false });

    // form_abandonment if started but not submitted
    window.addEventListener('beforeunload', function () {
      if (started && !submitted) taTrack('form_abandonment', { form_name: formName });
    });

    // live error clearing
    form.querySelectorAll('input, select, textarea').forEach(function (input) {
      input.addEventListener('input', function () { clearError(input); });
      input.addEventListener('blur', function () { if (input.value) validateField(input); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAlert(form);

      // Honeypot — if filled, silently drop (a bot)
      var hp = form.querySelector('.hp-field input');
      if (hp && hp.value) return;

      // Time-trap — submitted impossibly fast = bot
      if (Date.now() - loadedAt < 1500) {
        taTrack('form_error', { form_name: formName, error_type: 'spam_timetrap' });
        return;
      }

      var errors = validateForm(form);
      if (errors.length) {
        taTrack('form_error', { form_name: formName, error_fields: errors.join(',') });
        var first = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (first) first.focus();
        return;
      }

      submitted = true;
      submitForm(form, formName);
    });
  }

  function validateForm(form) {
    var errors = [];
    form.querySelectorAll('[required], [data-validate]').forEach(function (input) {
      if (!validateField(input)) errors.push(input.name || input.id);
    });
    // consent checkbox
    var consent = form.querySelector('input[type="checkbox"][data-consent]');
    if (consent && !consent.checked) {
      setError(consent, 'Please accept the privacy policy to continue.');
      errors.push('consent');
    }
    return errors;
  }

  function validateField(input) {
    if (input.type === 'checkbox') return true;
    var val = (input.value || '').trim();
    var type = input.getAttribute('data-validate') || input.type;

    if ((input.hasAttribute('required')) && !val) {
      setError(input, 'This field is required.'); return false;
    }
    if (val && (type === 'email') && !EMAIL_RE.test(val)) {
      setError(input, 'Enter a valid email address.'); return false;
    }
    if (val && (type === 'tel' || type === 'phone') && !PHONE_RE.test(val)) {
      setError(input, 'Enter a valid phone number.'); return false;
    }
    clearError(input); return true;
  }

  function setError(input, msg) {
    var field = input.closest('.field') || input.closest('.consent');
    if (!field) return;
    field.classList.add('has-error');
    var err = field.querySelector('.field-error');
    if (err) err.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
  }
  function clearError(input) {
    var field = input.closest('.field') || input.closest('.consent');
    if (!field) return;
    field.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
  }
  function clearAlert(form) {
    var a = form.querySelector('.form-alert');
    if (a) { a.className = 'form-alert'; a.textContent = ''; }
  }
  function showAlert(form, type, msg) {
    var a = form.querySelector('.form-alert');
    if (a) { a.className = 'form-alert ' + type; a.textContent = msg; }
  }

  function collectData(form, formName) {
    var data = {};
    new FormData(form).forEach(function (v, k) { if (k !== '_hp') data[k] = v; });
    var attr = (window.taGetAttribution && window.taGetAttribution()) || {};
    return Object.assign({
      form_name: formName,
      page_name: document.body.getAttribute('data-page') || document.title,
      page_url: location.href,
      submitted_at: new Date().toISOString()
    }, data, attr);
  }

  function submitForm(form, formName) {
    var btn = form.querySelector('.btn-submit');
    if (btn) btn.classList.add('loading');
    var payload = collectData(form, formName);

    // Fire the lead event for GTM (GA4 generate_lead, Google Ads conversion, Meta Lead)
    taTrack('generate_lead', {
      form_name: formName,
      course: payload.course || '',
      value: TA_CONFIG.leadValue || 0,
      currency: 'CAD'
    });

    var redirect = function () {
      var nm = payload.full_name ? '&name=' + encodeURIComponent(payload.full_name) : '';
      window.location.href = THANKYOU + '?form=' + encodeURIComponent(formName) + nm;
    };

    if (!ENDPOINT) {
      // No backend wired yet — succeed gracefully so the funnel still works.
      if (btn) btn.classList.remove('loading');
      showAlert(form, 'success', 'Thank you! Your enquiry has been received. Redirecting…');
      setTimeout(redirect, 900);
      return;
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function () { redirect(); })
      .catch(function () {
        if (btn) btn.classList.remove('loading');
        // Network failed but the lead event already fired — let them proceed.
        showAlert(form, 'success', 'Thank you! Your enquiry has been received. Redirecting…');
        setTimeout(redirect, 1200);
      });
  }
})();
