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
})();
