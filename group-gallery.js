/* group-gallery.js - slider ảnh tập đoàn MOS: mũi tên, thanh phân đoạn, vuốt, tự chạy */
(function () {
  'use strict';

  var AUTOPLAY_MS = 5000;

  function init(root) {
    var track = root.querySelector('.group-gallery-track');
    var slides = root.querySelectorAll('.group-gallery-slide');
    var bars = root.querySelector('.group-gallery-bars');
    var prev = root.querySelector('.group-gallery-prev');
    var next = root.querySelector('.group-gallery-next');
    var viewport = root.querySelector('.group-gallery-viewport');
    var total = slides.length;
    if (!track || total < 2) return;

    // Báo trong Console (F12) nếu có ảnh không tải được, kèm đường dẫn cần kiểm tra
    var imgs = root.querySelectorAll('img');
    for (var k = 0; k < imgs.length; k++) {
      imgs[k].addEventListener('error', function () {
        console.warn('[group-gallery] Không tải được ảnh:', this.getAttribute('src'));
      });
    }

    var index = 0;
    var timer = null;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var barEls = [];
    for (var i = 0; i < total; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'group-gallery-bar';
      b.setAttribute('aria-label', 'Ảnh ' + (i + 1));
      (function (n) { b.addEventListener('click', function () { go(n, true); }); })(i);
      bars.appendChild(b);
      barEls.push(b);
    }

    function render() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      for (var i = 0; i < total; i++) {
        var on = i === index;
        barEls[i].classList.toggle('is-active', on);
        barEls[i].setAttribute('aria-current', on ? 'true' : 'false');
        slides[i].setAttribute('aria-hidden', on ? 'false' : 'true');
      }
    }

    function go(n, user) {
      index = (n + total) % total;
      render();
      if (user) restart();
    }

    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (reduce || timer) return;
      timer = setInterval(function () { go(index + 1, false); }, AUTOPLAY_MS);
    }
    function restart() { stop(); start(); }

    prev.addEventListener('click', function () { go(index - 1, true); });
    next.addEventListener('click', function () { go(index + 1, true); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    // Vuốt ngang trên điện thoại
    var x0 = null;
    viewport.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      if (x0 !== null) {
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1), false);
      }
      x0 = null;
      start();
    });

    // Tạm dừng khi tab bị ẩn
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    render();
    start();
  }

  function boot() {
    var list = document.querySelectorAll('.group-gallery');
    for (var i = 0; i < list.length; i++) init(list[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();