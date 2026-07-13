/* =====================================================================
   TOUCH ABROAD — tracking.js
   Centralised, GTM-first analytics layer.
   - Initialises window.dataLayer
   - Captures attribution (UTM / gclid / fbclid / referrer / landing page)
   - Pushes standardised events GTM can map to GA4 / Google Ads / Meta Pixel
   - Auto-tracks clicks via [data-event] attributes + common interactions
   Nothing here sends data anywhere by itself — GTM owns the destinations.
   ===================================================================== */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  /* Helper: push a standardised event */
  function dlPush(event, params) {
    var payload = Object.assign({
      event: event,
      page_name: document.body ? (document.body.getAttribute('data-page') || document.title) : document.title,
      page_url: location.href,
      page_path: location.pathname,
      timestamp: new Date().toISOString()
    }, params || {});
    window.dataLayer.push(payload);
    return payload;
  }
  window.taTrack = dlPush; // exposed so forms.js (and you) can reuse it

  /* ---------------------------------------------------------------
     1. ATTRIBUTION CAPTURE
     First-touch attribution stored for the session so every lead
     carries its true source even after internal navigation.
  --------------------------------------------------------------- */
  function getParam(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }
  function captureAttribution() {
    var KEY = 'ta_attribution';
    var existing = null;
    try { existing = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
    if (!existing) {
      existing = {
        utm_source:   getParam('utm_source'),
        utm_medium:   getParam('utm_medium'),
        utm_campaign: getParam('utm_campaign'),
        utm_term:     getParam('utm_term'),
        utm_content:  getParam('utm_content'),
        gclid:        getParam('gclid'),
        fbclid:       getParam('fbclid'),
        referrer:     document.referrer || '(direct)',
        landing_page: location.pathname + location.search,
        first_seen:   new Date().toISOString()
      };
      try { sessionStorage.setItem(KEY, JSON.stringify(existing)); } catch (e) {}
    }
    // Long-lived gclid/fbclid cookies (90 days) for offline conversion import
    ['gclid', 'fbclid'].forEach(function (k) {
      var v = getParam(k);
      if (v) setCookie('ta_' + k, v, 90);
    });
    return existing;
  }
  function setCookie(name, value, days) {
    var d = new Date(); d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }
  function getCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  }
  /* Public: full attribution object (session + cookies + device) */
  window.taGetAttribution = function () {
    var a = {};
    try { a = JSON.parse(sessionStorage.getItem('ta_attribution')) || {}; } catch (e) {}
    a.gclid = a.gclid || getCookie('ta_gclid');
    a.fbclid = a.fbclid || getCookie('ta_fbclid');
    a.device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    a.user_agent = navigator.userAgent;
    a.language = navigator.language;
    return a;
  };

  var attribution = captureAttribution();

  /* ---------------------------------------------------------------
     2. PAGE VIEW
  --------------------------------------------------------------- */
  dlPush('page_view', {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign
  });

  /* ---------------------------------------------------------------
     3. SCROLL DEPTH (25 / 50 / 75 / 100)
  --------------------------------------------------------------- */
  (function () {
    var fired = {}, marks = [25, 50, 75, 100];
    function onScroll() {
      var h = document.documentElement;
      var pct = (h.scrollTop + h.clientHeight) / h.scrollHeight * 100;
      marks.forEach(function (m) {
        if (pct >= m && !fired[m]) { fired[m] = true; dlPush('scroll_depth', { scroll_percent: m }); }
      });
    }
    window.addEventListener('scroll', throttle(onScroll, 400), { passive: true });
  })();

  /* ---------------------------------------------------------------
     4. SESSION DURATION (on unload)
  --------------------------------------------------------------- */
  (function () {
    var start = Date.now();
    window.addEventListener('beforeunload', function () {
      dlPush('session_duration', { seconds_on_page: Math.round((Date.now() - start) / 1000) });
    });
  })();

  /* ---------------------------------------------------------------
     5. UNIVERSAL CLICK TRACKING (event delegation)
     - Anything with [data-event] fires that named event + its data-* set
     - tel:, mailto:, wa.me / whatsapp links auto-classified
     - External vs internal links
     - Downloads (file extensions)
  --------------------------------------------------------------- */
  var DOWNLOAD_RE = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|csv|txt|mp4|mp3)(\?|$)/i;
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button, [data-event]');
    if (!el) return;

    // Explicit, author-defined events
    if (el.hasAttribute('data-event')) {
      dlPush(el.getAttribute('data-event'), datasetToParams(el));
    }

    var link = el.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';

    if (/^tel:/i.test(href)) {
      dlPush('phone_click', { phone_number: href.replace(/^tel:/i, ''), link_text: txt(link) });
    } else if (/^mailto:/i.test(href)) {
      dlPush('email_click', { email: href.replace(/^mailto:/i, ''), link_text: txt(link) });
    } else if (/wa\.me|whatsapp|api\.whatsapp/i.test(href)) {
      dlPush('whatsapp_click', { link_text: txt(link) });
    } else if (DOWNLOAD_RE.test(href)) {
      dlPush('file_download', { file_url: href, link_text: txt(link) });
    } else if (/^https?:\/\//i.test(href) && link.hostname !== location.hostname) {
      dlPush('external_link_click', { link_url: href, link_text: txt(link) });
    }
  }, true);

  /* ---------------------------------------------------------------
     6. FAQ / ACCORDION CLICKS
  --------------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var q = e.target.closest('.faq-q');
    if (q) {
      var qt = q.querySelector('.faq-q-text');
      dlPush('faq_click', { faq_question: qt ? qt.textContent.trim() : '' });
    }
  });

  /* ---------------------------------------------------------------
     helpers
  --------------------------------------------------------------- */
  function datasetToParams(el) {
    var p = {};
    Object.keys(el.dataset).forEach(function (k) { if (k !== 'event') p[k] = el.dataset[k]; });
    if (!p.button_text) { var t = txt(el); if (t) p.button_text = t; }
    return p;
  }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80); }
  function throttle(fn, wait) {
    var last = 0, t;
    return function () {
      var now = Date.now(), ctx = this, args = arguments;
      if (now - last >= wait) { last = now; fn.apply(ctx, args); }
      else { clearTimeout(t); t = setTimeout(function () { last = Date.now(); fn.apply(ctx, args); }, wait - (now - last)); }
    };
  }
})();
