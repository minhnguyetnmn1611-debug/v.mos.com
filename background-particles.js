/* ==========================================================================
   VMOS - High-Tech Interactive Dynamic Background Particle & Network Engine
   File: background-particles.js
   Creates a 60fps GPU-accelerated cyber constellation particle field with
   interactive cursor repulsion, dynamic light beams, and seamless theme adaptation.
   ========================================================================== */
(function () {
  'use strict';

  function initDynamicBackground() {
    var canvas = document.getElementById('cyber-bg-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'cyber-bg-canvas';
      canvas.className = 'cyber-bg-canvas';
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var width = 0;
    var height = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse interactive coordinates
    var mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, radius: 180 };

    window.addEventListener('mousemove', function (e) {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    });

    window.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      }
    }, { passive: true });

    // Particle Generation
    var particleCount = Math.floor(Math.min(width, 1400) / 22); // Responsive density
    var particles = [];

    function Particle() {
      this.reset();
    }

    Particle.prototype.reset = function () {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.45;
      this.vy = (Math.random() - 0.5) * 0.45;
      this.radius = Math.random() * 1.8 + 1.0;
      this.baseAlpha = Math.random() * 0.35 + 0.15;
      this.alpha = this.baseAlpha;
      this.pulseSpeed = Math.random() * 0.02 + 0.005;
      this.pulsePhase = Math.random() * Math.PI * 2;
    };

    Particle.prototype.update = function (time) {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;

      // Mouse interactive repulsion & magnetic connection
      var dx = mouse.x - this.x;
      var dy = mouse.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouse.radius) {
        var force = (1 - dist / mouse.radius) * 1.8;
        this.x -= (dx / dist) * force;
        this.y -= (dy / dist) * force;
        this.alpha = Math.min(0.85, this.baseAlpha + force * 0.5);
      } else {
        this.alpha = this.baseAlpha + Math.sin(time * this.pulseSpeed + this.pulsePhase) * 0.1;
      }
    };

    for (var i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Laser Light Beam System
    var laserBeams = [
      { x: 0, y: height * 0.2, speed: 1.5, length: 220, alpha: 0.12 },
      { x: width, y: height * 0.65, speed: -2.0, length: 300, alpha: 0.15 }
    ];

    var isRunning = true;
    var frameId = null;

    function render(timestamp) {
      if (!isRunning) return;
      var time = timestamp * 0.001;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      var isDark = document.documentElement.getAttribute('data-theme') !== 'light';

      // Colors adapted to theme
      var dotColor = isDark ? '103, 232, 249' : '79, 70, 229';       // Cyan (dark) / Indigo (light)
      var lineBaseColor = isDark ? '99, 102, 241' : '99, 102, 241';   // Indigo

      // 1. Draw Constellation Network Connections
      var maxDist = 135;
      var maxDistSq = maxDist * maxDist;

      for (var a = 0; a < particles.length; a++) {
        var pA = particles[a];
        pA.update(time);

        for (var b = a + 1; b < particles.length; b++) {
          var pB = particles[b];
          var dx = pA.x - pB.x;
          var dy = pA.y - pB.y;
          var distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            var lineAlpha = (1 - distSq / maxDistSq) * 0.22 * Math.min(pA.alpha, pB.alpha);
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.strokeStyle = 'rgba(' + lineBaseColor + ',' + lineAlpha + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw particle dot with glow
        ctx.beginPath();
        ctx.arc(pA.x, pA.y, pA.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + dotColor + ',' + pA.alpha + ')';
        ctx.fill();
      }

      // 2. Draw Moving Laser Beams along background
      if (!prefersReducedMotion) {
        for (var l = 0; l < laserBeams.length; l++) {
          var lb = laserBeams[l];
          lb.x += lb.speed;
          if (lb.speed > 0 && lb.x > width + lb.length) lb.x = -lb.length;
          if (lb.speed < 0 && lb.x < -lb.length) lb.x = width + lb.length;

          var gradient = ctx.createLinearGradient(lb.x, lb.y, lb.x + lb.length * (lb.speed > 0 ? -1 : 1), lb.y);
          gradient.addColorStop(0, 'rgba(' + dotColor + ',' + lb.alpha + ')');
          gradient.addColorStop(1, 'rgba(' + dotColor + ',0)');

          ctx.beginPath();
          ctx.moveTo(lb.x, lb.y);
          ctx.lineTo(lb.x + lb.length * (lb.speed > 0 ? -1 : 1), lb.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }

      frameId = requestAnimationFrame(render);
    }

    if (!prefersReducedMotion) {
      frameId = requestAnimationFrame(render);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicBackground);
  } else {
    initDynamicBackground();
  }
})();