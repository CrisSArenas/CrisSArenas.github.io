/* Site chrome: theme (system setting with a manual toggle), mobile menu,
   current-page marker. Loaded in <head> on every page so the saved theme
   applies before first paint. */
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  window.siteTheme = { isDark: isDark };

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.site-nav');
    var tgl = document.querySelector('.theme-toggle');
    if (tgl) {
      var label = function () { tgl.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode'); };
      label();
      tgl.addEventListener('click', function () {
        var next = isDark() ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
        label();
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
      });
    }
    var mb = document.querySelector('.menu-btn');
    if (mb && nav) {
      mb.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        mb.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.querySelectorAll('.nav-links a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); });
      });
    }
    // subtle fade-in on scroll, only when motion is allowed
    var rev = document.querySelectorAll('.reveal');
    if (rev.length && 'IntersectionObserver' in window && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      root.classList.add('reveal-on');
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
      rev.forEach(function (el) { io.observe(el); });
      window.addEventListener('beforeprint', function () { rev.forEach(function (el) { el.classList.add('in'); }); });
    }
    // mark the current page in the nav
    var path = location.pathname.replace(/index\.html$/, '');
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('#') === -1 && href !== '/' && path.indexOf(href.replace(/index\.html$/, '')) === 0) a.setAttribute('aria-current', 'page');
    });
  });
})();
