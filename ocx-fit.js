/* ocx-fit.js - Tự thu nhỏ sơ đồ cơ cấu tổ chức (about.html) cho vừa chiều rộng khung,
   để laptop nhỏ vẫn thấy TOÀN BỘ sơ đồ mà không phải kéo ngang.
   Nếu màn hình quá hẹp (cần thu nhỏ dưới MIN_SCALE, chữ sẽ quá bé) thì quay về cuộn ngang.
   Chỉnh MIN_SCALE để đổi ngưỡng. */
(function () {
  'use strict';

  var MIN_SCALE = 0.6;

  function init(chart) {
    var tree = chart.querySelector('.ocx-tree');
    if (!tree) return;

    function fit() {
      // Bỏ thu phóng cũ rồi đo kích thước tự nhiên (offsetWidth/Height không bị transform ảnh hưởng)
      tree.style.transform = '';
      tree.style.marginLeft = '';
      tree.style.marginBottom = '';
      chart.classList.remove('is-fit');

      var natW = tree.offsetWidth;
      var natH = tree.offsetHeight;
      var availW = chart.clientWidth;
      if (!natW || !availW || natW <= availW) return; // đã vừa, không cần thu nhỏ

      var scale = availW / natW;
      if (scale < MIN_SCALE) return; // quá hẹp: giữ cuộn ngang

      tree.style.transformOrigin = 'top left';
      tree.style.transform = 'scale(' + scale + ')';
      tree.style.marginLeft = '0';
      tree.style.marginBottom = (-natH * (1 - scale)) + 'px'; // thu lại khoảng trống thừa bên dưới
      chart.classList.add('is-fit');
    }

    var raf = 0;
    function schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    }

    if ('ResizeObserver' in window) {
      // Bắt cả đổi cỡ cửa sổ lẫn đổi ngôn ngữ (chữ dài/ngắn khác nhau làm đổi độ rộng cây)
      var ro = new ResizeObserver(schedule);
      ro.observe(chart);
      ro.observe(tree);
    } else {
      window.addEventListener('resize', schedule);
    }
    window.addEventListener('load', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();
  }

  function boot() {
    var list = document.querySelectorAll('.ocx-chart');
    for (var i = 0; i < list.length; i++) init(list[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
