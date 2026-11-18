/* contact-tabs.js - Hai tab phụ trên trang Liên hệ: Tư vấn (#tu-van) và Tuyển dụng (#tuyen-dung).
   Hỗ trợ bàn phím (mũi tên trái/phải, Home, End) và liên kết trực tiếp contact.html#tuyen-dung. */
(function () {
  'use strict';

  function boot() {
    var tabs = document.querySelectorAll('.ct-tab');
    if (tabs.length < 2) return;

    function panelOf(tab) { return document.getElementById(tab.getAttribute('data-target')); }

    function select(tab, focus, updateHash) {
      for (var i = 0; i < tabs.length; i++) {
        var on = tabs[i] === tab;
        var panel = panelOf(tabs[i]);
        tabs[i].classList.toggle('is-active', on);
        tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
        tabs[i].setAttribute('tabindex', on ? '0' : '-1');
        if (panel) {
          panel.hidden = !on;
          if (on) {
            // Phần tử .reveal trong tab vừa mở hiện ngay, khỏi chờ cuộn
            var items = panel.querySelectorAll('.reveal');
            for (var k = 0; k < items.length; k++) items[k].classList.add('visible');
          }
        }
      }
      if (focus) tab.focus();
      if (updateHash && window.history && history.replaceState) {
        history.replaceState(null, '', '#' + tab.getAttribute('data-target'));
      }
    }

    for (var i = 0; i < tabs.length; i++) {
      (function (tab, idx) {
        tab.addEventListener('click', function () { select(tab, false, true); });
        tab.addEventListener('keydown', function (e) {
          var next = null;
          if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
          else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
          else if (e.key === 'Home') next = tabs[0];
          else if (e.key === 'End') next = tabs[tabs.length - 1];
          if (next) { e.preventDefault(); select(next, true, true); }
        });
      })(tabs[i], i);
    }

    function fromHash(scroll) {
      var id = (location.hash || '').replace('#', '');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].getAttribute('data-target') === id) {
          select(tabs[i], false, false);
          if (scroll) tabs[i].parentNode.scrollIntoView({ block: 'start' });
          return;
        }
      }
    }

    window.addEventListener('hashchange', function () { fromHash(false); });
    fromHash(true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
