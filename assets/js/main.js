/* =====================================================================
   TOUCH ABROAD — main.js
   Core UI behaviour: navigation, mobile menu, FAQ accordion,
   scroll-reveal, sticky shadow, current-year, animated counters.
   ===================================================================== */
(function () {
  'use strict';

  /* Mobile menu toggle */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { mobileMenu.classList.remove('open'); });
    });
  }

  /* FAQ accordion (single-open) */
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function (i) {
        i.classList.remove('open');
        var q = i.querySelector('.faq-q'); if (q) q.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* Scroll fade-up reveal */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.fade-up').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.fade-up').forEach(function (el) { el.classList.add('visible'); });
  }

  /* Sticky navbar shadow */
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(11,30,74,.12)' : '';
    }, { passive: true });
  }

  /* Current year in footer(s) */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Animated stat counters */
  if ('IntersectionObserver' in window) {
    var counters = document.querySelectorAll('[data-count]');
    if (counters.length) {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target, target = parseFloat(el.getAttribute('data-count')), suffix = el.getAttribute('data-suffix') || '';
          var dur = 1200, t0 = performance.now();
          (function tick(now) {
            var p = Math.min((now - t0) / dur, 1);
            var val = Math.floor(p * target);
            el.firstChild ? el.childNodes[0].nodeValue = val.toLocaleString() : el.textContent = val;
            if (p < 1) requestAnimationFrame(tick); else el.childNodes[0].nodeValue = target.toLocaleString();
          })(t0);
          co.unobserve(el);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { co.observe(el); });
    }
  }

  /* =====================================================================
     Free Consultation modal
     Injected once per page so it works from the header CTA site-wide.
     The header links keep href="contact.html" as a no-JS fallback.
     ===================================================================== */
  var MODAL_HTML =
    '<div class="consult-modal" id="consult-modal" role="dialog" aria-modal="true" aria-labelledby="consult-title" hidden>' +
      '<div class="consult-dialog">' +
        '<button type="button" class="consult-close" data-consult-close aria-label="Close">&times;</button>' +
        '<div class="lead-card">' +
          '<div class="lead-card-head">' +
            '<h3 id="consult-title">🎓 Book Your Free Consultation</h3>' +
            '<p>Speak with an advisor about programs, funding &amp; eligibility — free &amp; no obligation.</p>' +
          '</div>' +
          '<div class="lead-card-body">' +
            '<form data-lead-form data-form-name="nav_consultation" novalidate>' +
              '<div class="form-alert" role="status" aria-live="polite"></div>' +
              '<div class="field">' +
                '<label for="consult-name">Full Name <span class="req">*</span></label>' +
                '<input type="text" id="consult-name" name="full_name" required autocomplete="name" placeholder="Your full name">' +
                '<div class="field-error" role="alert"></div>' +
              '</div>' +
              '<div class="field-row">' +
                '<div class="field">' +
                  '<label for="consult-phone">Phone Number <span class="req">*</span></label>' +
                  '<input type="tel" id="consult-phone" name="phone" required data-validate="phone" autocomplete="tel" placeholder="(289) 000-0000">' +
                  '<div class="field-error" role="alert"></div>' +
                '</div>' +
                '<div class="field">' +
                  '<label for="consult-email">Email <span class="req">*</span></label>' +
                  '<input type="email" id="consult-email" name="email" required data-validate="email" autocomplete="email" placeholder="you@email.com">' +
                  '<div class="field-error" role="alert"></div>' +
                '</div>' +
              '</div>' +
              '<div class="field">' +
                '<label for="consult-course">Program of Interest <span class="req">*</span></label>' +
                '<select id="consult-course" name="course" required>' +
                  '<option value="" disabled selected>Select a program…</option>' +
                  '<option value="Personal Support Worker — Government Funded">Personal Support Worker — Government Funded</option>' +
                  '<option value="Personal Support Worker — Self-Funded">Personal Support Worker — Self-Funded</option>' +
                  '<option value="Office Administration Professional">Office Administration Professional</option>' +
                  '<option value="Business Administration – Accounting &amp; Finance">Business Administration – Accounting &amp; Finance</option>' +
                  '<option value="Cyber Security">Cyber Security</option>' +
                  '<option value="Early Childhood Assistant (ECA)">Early Childhood Assistant (ECA)</option>' +
                  '<option value="Not sure yet — need guidance">Not sure yet — need guidance</option>' +
                '</select>' +
                '<div class="field-error" role="alert"></div>' +
              '</div>' +
              '<div class="field">' +
                '<label for="consult-contact">Preferred Contact Method</label>' +
                '<select id="consult-contact" name="contact_method">' +
                  '<option value="Phone Call">Phone Call</option>' +
                  '<option value="WhatsApp">WhatsApp</option>' +
                  '<option value="Email">Email</option>' +
                  '<option value="Text Message">Text Message</option>' +
                '</select>' +
              '</div>' +
              '<div class="field">' +
                '<label for="consult-message">Message (optional)</label>' +
                '<textarea id="consult-message" name="message" rows="3" placeholder="Tell us a little about your goals…"></textarea>' +
              '</div>' +
              '<div class="hp-field" aria-hidden="true"><label>Leave this empty<input type="text" name="_hp" tabindex="-1" autocomplete="off"></label></div>' +
              '<div class="consent">' +
                '<input type="checkbox" id="consult-consent" name="consent" data-consent>' +
                '<label for="consult-consent">I agree to be contacted by Touch Abroad about programs and funding, and accept the <a href="privacy-policy.html" target="_blank">Privacy Policy</a>. <span class="req">*</span>' +
                  '<div class="field-error" role="alert"></div>' +
                '</label>' +
              '</div>' +
              '<button type="submit" class="btn btn-primary btn-block btn-submit" data-event="cta_click" data-button="nav_consultation-submit">' +
                '<span class="btn-label">Book My Free Consultation</span>' +
                '<span class="spinner" aria-hidden="true"></span>' +
              '</button>' +
              '<div class="lead-foot" style="margin-top:12px;font-size:.76rem;color:var(--gray-500);display:flex;align-items:center;gap:6px;justify-content:center;">' +
                '🔒 100% private — we never share your details.' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  var host = document.createElement('div');
  host.innerHTML = MODAL_HTML;
  var modal = host.firstChild;
  document.body.appendChild(modal);

  // Wire the injected form into the shared form lifecycle (forms.js).
  var modalForm = modal.querySelector('form[data-lead-form]');
  if (window.taInitLeadForm && modalForm) window.taInitLeadForm(modalForm);

  var lastFocused = null;
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])';

  function openModal(trigger) {
    lastFocused = trigger || document.activeElement;
    modal.hidden = false;
    // next frame so the CSS transition runs
    requestAnimationFrame(function () { modal.classList.add('open'); });
    document.body.classList.add('modal-open');
    var first = modal.querySelector('#consult-name');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    setTimeout(function () { modal.hidden = true; }, 250);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  // Open triggers: header CTA (desktop + mobile) and any [data-open-consult].
  document.addEventListener('click', function (e) {
    var opener = e.target.closest(
      '[data-button="nav-free-consultation"], [data-open-consult], .mobile-menu a.btn-primary'
    );
    if (opener) { e.preventDefault(); openModal(opener); return; }
    if (e.target.closest('[data-consult-close]')) { e.preventDefault(); closeModal(); return; }
    // Click on the backdrop (outside the dialog) closes.
    if (e.target === modal) closeModal();
  });

  // Escape closes; basic focus trap while open.
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      var items = Array.prototype.filter.call(
        modal.querySelectorAll(FOCUSABLE),
        function (el) { return el.offsetParent !== null; }
      );
      if (!items.length) return;
      var firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }
  });
})();
