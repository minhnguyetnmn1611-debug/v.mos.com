(function () {
  'use strict';

  function initHeroTabs() {
    var container = document.querySelector('.rx-hero-tabs');
    if (!container) return;

    var tabs = Array.prototype.slice.call(container.querySelectorAll('.rx-tab'));
    if (!tabs.length) return;

    var currentIndex = 0;
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function select(index) {
      if (index < 0 || index >= tabs.length) return;
      currentIndex = index;
      tabs.forEach(function (tab, i) {
        var bar = tab.querySelector('.rx-tab-bar');
        if (i === index) {
          tab.classList.add('is-active');
          tab.setAttribute('aria-selected', 'true');
          if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
        } else {
          tab.classList.remove('is-active');
          tab.setAttribute('aria-selected', 'false');
          if (bar) bar.style.animation = 'none';
        }
      });
    }

    tabs.forEach(function (tab, i) {
      var bar = tab.querySelector('.rx-tab-bar');
      if (bar && !prefersReduced) {
        bar.addEventListener('animationend', function (e) {
          if (e.target === bar && tab.classList.contains('is-active')) {
            select((currentIndex + 1) % tabs.length);
          }
        });
      }
      tab.addEventListener('mouseenter', function () { if (!tab.classList.contains('is-active')) select(i); });
      tab.addEventListener('focus', function () { if (!tab.classList.contains('is-active')) select(i); });
    });

    select(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeroTabs);
  else initHeroTabs();
})();
