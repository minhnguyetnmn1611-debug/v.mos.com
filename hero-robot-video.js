/* ==========================================================================
   VMOS HERO - ROBOT VIDEO (peek behind the screen-edge wall -> step out -> wave
   -> idle, then follows the cursor and reacts to clicks)

   Needs images/robot-hero.mp4 (colour | alpha packed side by side, 2 x 960x720)
   and images/robot-idle.png (fallback). Serve over http (server.py), not file://.
   ========================================================================== */
(function () {
  'use strict';

  // ---- Video / geometry constants (video-crop pixel space, 960 x 720) ----
  var CW = 960, CH = 720, FPS = 24;
  var WALL_X = 656;            // x of the wall edge in the crop
  var WALL_HOLD_K = 39;        // frame index (file) where the wall starts sliding away
  var SLAB = 200;              // wall slab width (crop px) between wall edge and screen edge
  var FEET_Y = 690;
  var HEAD_CX = 640;
  // head track per file frame: [centreX, topY]
  var TRACK = [[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[478,0],[477,0],[477,0],[477,0],[477,0],[477,0],[477,0],[478,0],[478,0],[478,0],[536,0],[538,0],[539,0],[539,0],[547,0],[552,0],[552,0],[552,0],[554,0],[552,0],[547,0],[534,0],[534,0],[534,0],[536,0],[539,0],[543,0],[546,0],[550,0],[550,0],[550,0],[551,0],[550,4],[548,5],[532,6],[532,7],[532,9],[536,12],[542,15],[546,19],[552,24],[556,29],[561,34],[565,39],[568,43],[572,47],[576,49],[581,49],[586,49],[592,48],[596,46],[600,44],[605,41],[609,40],[618,39],[621,39],[624,39],[626,40],[628,42],[630,45],[630,49],[630,53],[630,58],[630,62],[629,62],[628,62],[628,60],[628,58],[628,55],[628,52],[628,50],[628,48],[629,48],[630,48],[630,50],[632,52],[633,55],[634,59],[636,62],[637,64],[638,64],[640,64],[642,62],[644,60],[646,57],[647,54],[648,52],[648,50],[648,49],[647,49],[645,49],[642,50],[640,50],[638,51],[635,52],[634,53],[634,53],[634,55],[634,57],[634,58],[634,60],[635,60],[636,60],[636,59],[636,58],[637,57],[637,55],[638,54],[638,53],[638,53],[638,53],[638,53],[638,53],[638,53],[640,53],[641,53],[643,53],[645,53],[648,53],[650,53],[652,53],[654,53],[656,53],[658,54],[660,54],[660,54],[661,55],[661,55],[662,55],[662,55],[662,55],[662,55],[662,55],[661,55],[661,54],[660,54],[658,54],[656,53],[652,53],[650,53],[646,53],[644,53],[641,53],[638,52],[636,52],[632,52],[630,52],[628,53],[625,53],[624,53],[622,53],[620,53],[620,53],[620,53],[620,53],[620,53],[621,53],[622,53],[622,53],[624,53],[625,53],[626,53],[627,53],[628,53],[630,53],[633,53],[634,52],[636,52],[636,52],[638,52],[638,52],[639,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52],[640,52]];
  // wave clip (seconds in file): start -> A, jump -> B -> END
  // The first part of the source clip (extreme close-up that zooms out) was cut away; the clip now starts
  // on the 'hiding behind the wall' pose, held for HOLD frames. K0 = first kept frame of the old timeline.
  var K0 = 48, HOLD = 16;
  var WAVE_START = 3.9167, WAVE_A = 5.375, WAVE_B = 5.9583, WAVE_END = 7.625;

  var TEXT = {
    vi: {
      hint: 'Di chuột để robot nhìn theo · Nhấn vào robot để chào hỏi',
      greet: 'Chào bạn! Mình là robot của VMOS \uD83D\uDC4B',
      wave: 'Xin chào! Rất vui được gặp bạn!',
      jump: 'Hop! Nhảy nè~',
      tickle: 'Ối, nhột quá!',
      pat: 'Hihi, thích quá~',
      dizzy: 'Chóng mặt quá…',
      aria: 'Robot VMOS tương tác'
    },
    en: {
      hint: 'Move your mouse and the robot follows · Click it to say hi',
      greet: "Hi! I'm VMOS's robot \uD83D\uDC4B",
      wave: 'Hello! Nice to meet you!',
      jump: 'Boing!',
      tickle: 'Hehe, that tickles!',
      pat: 'Aww, that feels nice~',
      dizzy: "I'm so dizzy…",
      aria: 'Interactive VMOS robot'
    },
    ja: {
      hint: 'マウスを動かすとロボットが見ています・クリックしてあいさつ',
      greet: 'こんにちは！VMOSのロボットです \uD83D\uDC4B',
      wave: 'こんにちは！会えてうれしいです！',
      jump: 'ぴょん！',
      tickle: 'わっ、くすぐったい！',
      pat: 'えへへ、うれしいな〜',
      dizzy: '目が回る〜…',
      aria: 'VMOSのインタラクティブロボット'
    }
  };

  function lang() {
    var l = window.currentLang;
    return TEXT[l] ? l : 'vi';
  }
  function tx(key) { return TEXT[lang()][key]; }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // keyframe interpolation: keys = [[u, v1, v2...], ...]
  function kf(keys, u) {
    for (var i = 1; i < keys.length; i++) {
      if (u <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        var t = (u - a[0]) / (b[0] - a[0] || 1);
        t = t * t * (3 - 2 * t);
        var out = [];
        for (var j = 1; j < a.length; j++) out.push(lerp(a[j], b[j], t));
        return out;
      }
    }
    return keys[keys.length - 1].slice(1);
  }

  function wallEdge(k) {
    return k <= WALL_HOLD_K ? WALL_X : WALL_X + 1.375 * Math.pow(k - WALL_HOLD_K, 1.5);
  }

  function init() {
    var hero = document.getElementById('hero-video');
    var stage = document.getElementById('rx-robot-stage');
    if (!hero || !stage) return;

    var media = stage.parentNode;
    var wall = document.getElementById('rx-robot-wall');
    var ground = document.getElementById('rx-robot-ground');
    var body = document.getElementById('rx-robot-body');
    var video = document.getElementById('rx-robot-video');
    var glCanvas = document.getElementById('rx-robot-gl');
    var fxCanvas = document.getElementById('rx-robot-fx');
    var fallbackImg = document.getElementById('rx-robot-fallback');
    var bubble = document.getElementById('rx-robot-bubble');
    var hintEl = document.getElementById('rx-hero-hint');
    var hintText = document.getElementById('rx-hint-text');

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    hero.classList.add('rx-hero--robot');
    media.classList.add('rx-hero-media--robot');

    // ---------------- WebGL setup ----------------
    var gl = null, prog = null, tex = null, U = {};
    try {
      gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });
    } catch (e) { gl = null; }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }

    if (gl) {
      try {
        var vs = 'attribute vec2 aPos; varying vec2 vUV;' +
          'void main(){ vUV = vec2(aPos.x*0.5+0.5, 0.5-aPos.y*0.5); gl_Position = vec4(aPos,0.0,1.0); }';
        var fs = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
          'varying vec2 vUV; uniform sampler2D uTex; uniform vec2 uCrop; uniform vec2 uNeck; uniform vec3 uHead; uniform vec2 uFeather;' +
          'void main(){' +
          '  vec2 p = vUV * uCrop;' +
          '  float w = 1.0 - smoothstep(uNeck.y - 26.0, uNeck.y + 6.0, p.y);' +
          '  vec2 d = p - uNeck;' +
          '  float ang = -uHead.x * w; float c = cos(ang); float s = sin(ang);' +
          '  vec2 q = vec2(c*d.x - s*d.y, s*d.x + c*d.y) + uNeck - uHead.yz * w;' +
          '  vec2 uv = q / uCrop;' +
          '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }' +
          '  float ux = clamp(uv.x * 0.5, 0.0003, 0.4997);' +
          '  float a = texture2D(uTex, vec2(0.5 + ux, uv.y)).r;' +
          '  vec3 col = texture2D(uTex, vec2(ux, uv.y)).rgb;' +
          '  float f = smoothstep(0.0, uFeather.x, p.x);' +
          '  if (uFeather.y > 0.5) f *= smoothstep(0.0, uFeather.y, p.y);' +
          '  a *= f; col *= f; col = min(col, vec3(a));' +
          '  gl_FragColor = vec4(col, a);' +
          '}';
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
        gl.useProgram(prog);

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // 1x1 transparent placeholder so sampling before the first frame is safe
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

        ['uTex', 'uCrop', 'uNeck', 'uHead', 'uFeather'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
        gl.uniform1i(U.uTex, 0);
        gl.uniform2f(U.uCrop, CW, CH);
        gl.clearColor(0, 0, 0, 0);
      } catch (err) {
        console.warn('[Hero Robot] WebGL init failed, using fallback image:', err);
        gl = null;
      }
    }

    var useFallback = !gl;
    if (useFallback) {
      glCanvas.style.display = 'none';
      fallbackImg.hidden = false;
      wall.style.display = 'none';
    }
    var fx = fxCanvas.getContext('2d');

    // ---------------- Layout ----------------
    var W = 0, H = 0, S = 1, canvasLeft = 0, canvasTop = 0, canvasW = 0, canvasH = 0, sc = 1, lineX = 0;

    function layout() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      var mobile = W <= 992;
      S = mobile ? Math.min(H * 0.5, 520) / 635 : Math.min(H * 0.85 / CH, (W * 0.34) / 372);
      S = Math.max(S, 0.3);
      canvasW = CW * S; canvasH = CH * S;
      lineX = W - SLAB * S;
      canvasLeft = lineX - WALL_X * S;
      canvasTop = H - canvasH;

      body.style.left = canvasLeft + 'px';
      body.style.top = canvasTop + 'px';
      body.style.width = canvasW + 'px';
      body.style.height = canvasH + 'px';
      body.style.transformOrigin = (HEAD_CX / CW * 100) + '% ' + (FEET_Y / CH * 100) + '%';

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var bw = Math.min(Math.round(canvasW * dpr), 1440);
      var bh = Math.round(bw * CH / CW);
      [glCanvas, fxCanvas].forEach(function (c) {
        if (c.width !== bw) { c.width = bw; c.height = bh; }
      });
      sc = bw / CW;
      if (gl) gl.viewport(0, 0, bw, bh);

      ground.style.left = (canvasLeft + HEAD_CX * S) + 'px';
      ground.style.top = (canvasTop + FEET_Y * S) + 'px';
      ground.style.width = (300 * S) + 'px';
      ground.style.height = (40 * S) + 'px';
    }

    // ---------------- State ----------------
    var state = 'loading';       // loading | intro | idle | react | wave
    var look = { x: 0, y: 0 }, lookT = { x: 0, y: 0 };
    var pointer = { x: -1, y: -1, active: false, last: 0 };
    var trackCx = HEAD_CX, trackTop = 52;
    var anim = null;             // { name, t0, dur }
    var waveJumped = false;
    var clickTimes = [];
    var bodyIdx = 0;
    var particles = [];
    var lastUploadT = -1;
    var needUpload = true;
    var running = false, rafId = 0, lastNow = 0, visible = true;
    var bubbleTimer = 0, hintFaded = false;
    var bodyT = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, hAng: 0, hTy: 0 };
    var glanceAt = 0;
    var idleTex = null, idleReady = false;   // static standing pose (packed colour|alpha), independent of video seeking

    function loadIdleTexture() {
      if (!gl) return;
      var img = new Image();
      img.onload = function () {
        try {
          var t = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          idleTex = t; idleReady = true;
        } catch (e) { idleReady = false; }
      };
      img.src = 'images/robot-idle-packed.png';
    }
    function useIdleSource() { return idleReady && (state === 'idle' || state === 'react'); }
    function canSeek() {
      try { return video.seekable && video.seekable.length > 0 && video.seekable.end(0) >= WAVE_END; } catch (e) { return false; }
    }

    function setTexts() {
      stage.setAttribute('aria-label', tx('aria'));
      if (hintText) hintText.textContent = tx('hint');
    }
    setTexts();

    var origSetLang = window.setLanguage;
    if (typeof origSetLang === 'function') {
      window.setLanguage = function (l) {
        origSetLang.apply(this, arguments);
        setTexts();
      };
    }

    function showBubble(text, ms) {
      return; // speech-bubble text disabled
      bubble.textContent = text;
      bubble.classList.add('is-visible');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(function () { bubble.classList.remove('is-visible'); }, ms || 2400);
    }

    function fadeHint() {
      if (!hintFaded && hintEl) { hintFaded = true; hintEl.classList.add('is-faded'); }
    }

    // ---------------- Video control ----------------
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.loop = false;

    function lastFrameTime() { return Math.max(0, (video.duration || 7.96) - 0.03); }

    function goIdle() {
      state = 'idle';
      anim = null;
    }

    video.addEventListener('seeked', function () { needUpload = true; });
    video.addEventListener('loadeddata', function () { needUpload = true; startIntro(); });
    video.addEventListener('ended', function () {
      if (state === 'intro') {
        goIdle();
        showBubble(tx('greet'), 3200);
      }
    });
    video.addEventListener('error', function () { enterFallback(); });

    var introStarted = false;
    function startIntro() {
      if (introStarted) return;
      introStarted = true;
      layout();
      stage.classList.add('is-ready');
      if (reduced) {
        video.currentTime = lastFrameTime();
        wall.style.display = 'none';
        goIdle();
        return;
      }
      state = 'intro';
      var p = video.play();
      if (p && p.catch) {
        p.catch(function () {
          // autoplay blocked (e.g. low power mode): jump straight to the idle pose
          video.currentTime = lastFrameTime();
          wall.style.display = 'none';
          goIdle();
        });
      }
    }

    function enterFallback() {
      if (useFallback && state === 'idle') return;
      useFallback = true;
      glCanvas.style.display = 'none';
      fxCanvas.style.display = 'none';
      fallbackImg.hidden = false;
      wall.style.display = 'none';
      stage.classList.add('is-ready');
      layout();
      goIdle();
    }

    if (useFallback) {
      introStarted = true;
      layout();
      stage.classList.add('is-ready');
      goIdle();
    }

    function uploadFrame() {
      if (!gl || video.readyState < 2 || video.seeking) return;
      if (!needUpload && video.currentTime === lastUploadT) return;
      if (video.ended && lastUploadT >= 0 && !needUpload) return;
      try {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        lastUploadT = video.currentTime;
        needUpload = false;
      } catch (e) {
        console.warn('[Hero Robot] texture upload failed, using fallback image:', e);
        enterFallback();
      }
    }

    // ---------------- Reactions ----------------
    function startAnim(name, dur) { anim = { name: name, t0: performance.now() / 1000, dur: dur }; }

    function spawn(type, n) {
      for (var i = 0; i < n; i++) {
        particles.push({
          type: type,
          x: trackCx + (Math.random() - 0.5) * 90,
          y: trackTop + 30 + Math.random() * 30,
          vx: (Math.random() - 0.5) * 30,
          vy: -50 - Math.random() * 40,
          life: 0, max: 1.1 + Math.random() * 0.5,
          size: 10 + Math.random() * 8
        });
      }
    }

    function react(zone) {
      if (state !== 'idle') return;
      fadeHint();
      var now = performance.now();
      clickTimes.push(now);
      clickTimes = clickTimes.filter(function (t) { return now - t < 3500; });

      if (clickTimes.length >= 5) {
        clickTimes = [];
        state = 'react';
        showBubble(tx('dizzy'), 2600);
        if (!reduced) startAnim('dizzy', 2.4);
        else setTimeout(goIdle, 1200);
        return;
      }

      var name;
      if (zone === 'head') name = 'pat';
      else name = ['jump', 'tickle', 'wave'][bodyIdx++ % 3];

      if (name === 'wave' && !canSeek()) name = 'jump';
      if (name === 'wave') {
        showBubble(tx('wave'), 3000);
        if (reduced) return;
        state = 'wave';
        waveJumped = false;
        video.currentTime = WAVE_START;
        var p = video.play();
        if (p && p.catch) p.catch(function () { video.currentTime = lastFrameTime(); goIdle(); });
        return;
      }

      state = 'react';
      showBubble(tx(name === 'pat' ? 'pat' : name), 2200);
      if (name === 'pat') spawn('heart', 6);
      if (reduced) { setTimeout(goIdle, 1000); return; }
      startAnim(name, name === 'jump' ? 0.95 : name === 'tickle' ? 0.9 : 1.0);
    }

    function evalAnim(now) {
      var out = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, hAng: 0, hTy: 0 };
      if (!anim) return out;
      var u = (now - anim.t0) / anim.dur;
      if (u >= 1) { goIdle(); return out; }
      var sh = canvasH;
      if (anim.name === 'jump') {
        var k = kf([[0, 1, 1], [0.2, 0.87, 1.09], [0.3, 1.1, 0.93], [0.7, 1.03, 0.98], [0.8, 0.88, 1.08], [0.9, 1.02, 0.99], [1, 1, 1]], u);
        out.sy = k[0]; out.sx = k[1];
        if (u > 0.2 && u < 0.8) { var a = (u - 0.2) / 0.6; out.ty = -sh * 0.085 * 4 * a * (1 - a); }
      } else if (anim.name === 'tickle') {
        var d = 1 - u;
        out.rot = Math.sin(u * 46) * 0.04 * d;
        out.tx = Math.sin(u * 58) * 5 * d * S;
        out.sy = 1 - 0.02 * Math.sin(Math.PI * u);
        out.hAng = Math.sin(u * 40) * 0.05 * d;
      } else if (anim.name === 'pat') {
        var n = Math.sin(Math.PI * Math.min(1, u * 1.2));
        out.hTy = 9 * n; out.hAng = 0.05 * Math.sin(u * 12) * (1 - u);
        out.sy = 1 - 0.025 * n; out.sx = 1 + 0.015 * n;
      } else if (anim.name === 'dizzy') {
        var dd = 1 - u * 0.5;
        out.rot = Math.sin(u * 15) * 0.07 * dd;
        out.tx = Math.sin(u * 15 + 1.2) * 11 * dd * S;
        out.hAng = Math.cos(u * 15) * 0.12 * dd;
        if (Math.random() < 0.05) spawn('star', 1);
      }
      return out;
    }

    // ---------------- Pointer ----------------
    function toCrop(clientX, clientY) {
      var r = hero.getBoundingClientRect();
      return { x: (clientX - r.left - canvasLeft) / S, y: (clientY - r.top - canvasTop) / S };
    }
    function zoneAt(clientX, clientY) {
      var c = toCrop(clientX, clientY);
      var hx = trackCx, hy = trackTop + 85;
      var dx = c.x - hx, dy = c.y - hy;
      if (dx * dx + dy * dy < 92 * 92) return 'head';
      if (c.x > hx - 155 && c.x < hx + 155 && c.y > trackTop + 170 && c.y < trackTop + 400) return 'body';
      if (c.x > hx - 115 && c.x < hx + 115 && c.y >= trackTop + 400 && c.y < FEET_Y + 6) return 'body';
      return null;
    }
    function isUi(target) {
      return target && target.closest && target.closest('a, button, input, select, textarea, label');
    }

    document.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.last = performance.now();
      if (state === 'idle' && !isUi(e.target)) {
        hero.style.cursor = zoneAt(e.clientX, e.clientY) ? 'pointer' : '';
      } else if (hero.style.cursor) hero.style.cursor = '';
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', function () { pointer.active = false; });

    hero.addEventListener('pointerdown', function (e) {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; pointer.last = performance.now();
      if (isUi(e.target)) return;
      var z = zoneAt(e.clientX, e.clientY);
      if (z) react(z);
    });

    // keyboard access: invisible button focused with Tab
    var kbd = document.getElementById('rx-robot-kbd');
    if (kbd) kbd.addEventListener('click', function () { react('body'); });

    // ---------------- Frame loop ----------------
    function drawParticles(dt) {
      fx.setTransform(1, 0, 0, 1, 0, 0);
      fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      if (!particles.length) return;
      fx.setTransform(sc, 0, 0, sc, 0, 0);
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life += dt;
        if (p.life >= p.max) { particles.splice(i, 1); continue; }
        var t = p.life / p.max;
        p.x += p.vx * dt; p.y += p.vy * dt;
        fx.globalAlpha = 1 - t * t;
        if (p.type === 'heart') {
          var s = p.size;
          fx.fillStyle = '#ff5c8a';
          fx.beginPath();
          fx.moveTo(p.x, p.y + s * 0.35);
          fx.bezierCurveTo(p.x - s, p.y - s * 0.4, p.x - s * 0.5, p.y - s, p.x, p.y - s * 0.4);
          fx.bezierCurveTo(p.x + s * 0.5, p.y - s, p.x + s, p.y - s * 0.4, p.x, p.y + s * 0.35);
          fx.fill();
        } else {
          fx.fillStyle = '#facc15';
          fx.beginPath();
          for (var j = 0; j < 10; j++) {
            var rr = j % 2 ? p.size * 0.35 : p.size * 0.8;
            var aa = j * Math.PI / 5 - Math.PI / 2 + p.life * 3;
            fx.lineTo(p.x + Math.cos(aa) * rr, p.y + Math.sin(aa) * rr);
          }
          fx.closePath(); fx.fill();
        }
      }
      fx.globalAlpha = 1;
    }

    function frame(nowMs) {
      rafId = requestAnimationFrame(frame);
      var now = nowMs / 1000;
      var dt = Math.min(0.05, lastNow ? now - lastNow : 0.016);
      lastNow = now;

      var tVid = video.currentTime || 0;
      var kNew = Math.round(tVid * FPS);
      var k = useIdleSource() ? TRACK.length - 1 : clamp(kNew < HOLD ? K0 : kNew - HOLD + K0, 0, TRACK.length - 1);   // index on the original timeline

      // wave clip control
      if (state === 'wave') {
        if (!waveJumped && tVid >= WAVE_A) { waveJumped = true; video.currentTime = WAVE_B; }
        else if (waveJumped && !video.seeking && tVid >= WAVE_END) {
          video.pause(); if (!idleReady) { try { video.currentTime = lastFrameTime(); } catch (e) {} } goIdle();
        }
      }

      // head tracking (valid once the head is fully in frame)
      var tr = TRACK[k];
      var valid = k >= 50;
      var tcx = valid ? tr[0] : HEAD_CX, ttop = valid ? tr[1] : 52;
      trackCx += (tcx - trackCx) * 0.5;
      trackTop += (ttop - trackTop) * 0.5;

      // look-at target
      var canLook = !reduced && !useFallback && (state === 'idle' || state === 'react' || state === 'wave' || (state === 'intro' && k >= 75));
      if (canLook) {
        var r = hero.getBoundingClientRect();
        var hx = r.left + canvasLeft + trackCx * S, hy = r.top + canvasTop + (trackTop + 85) * S;
        if (pointer.active && now * 1000 - pointer.last < 9000) {
          lookT.x = clamp((pointer.x - hx) / (window.innerWidth * 0.32), -1, 1);
          lookT.y = clamp((pointer.y - hy) / (window.innerHeight * 0.32), -1, 1);
        } else {
          if (now > glanceAt) {
            glanceAt = now + 2.5 + Math.random() * 3;
            lookT.x = (Math.random() - 0.5) * 0.9;
            lookT.y = (Math.random() - 0.5) * 0.4;
          }
        }
      } else { lookT.x = 0; lookT.y = 0; }
      var kk = 1 - Math.exp(-dt * 7);
      look.x += (lookT.x - look.x) * kk;
      look.y += (lookT.y - look.y) * kk;

      // body animation + idle breathing
      var b = evalAnim(now);
      var breathe = (state === 'idle' && !reduced) ? Math.sin(now * 1.9) * 0.004 : 0;
      b.sy *= 1 + breathe; b.sx *= 1 - breathe * 0.5;
      b.rot += look.x * 0.012;
      var headAng = look.x * 0.14 + b.hAng;
      var headTx = look.x * 11;
      var headTy = look.y * 7 + b.hTy;

      // wall slab + ground shadow
      if (wall.style.display !== 'none') {
        var edge = wallEdge(k);
        var wl = lineX + (edge - WALL_X) * S;
        if (state !== 'intro' && state !== 'loading') wl = W + 60;
        wall.style.transform = 'translate3d(' + wl.toFixed(1) + 'px,0,0)';
        if (wl > W + 40 && state !== 'intro') wall.style.display = 'none';
      }
      var gOp = smoothstep(70, 92, k);
      ground.style.opacity = (gOp * (1 - clamp(-b.ty / (canvasH * 0.1), 0, 0.6))).toFixed(3);

      body.style.transform = 'translate3d(' + b.tx.toFixed(1) + 'px,' + b.ty.toFixed(1) + 'px,0) rotate(' + b.rot.toFixed(4) + 'rad) scale(' + b.sx.toFixed(4) + ',' + b.sy.toFixed(4) + ')';

      // render
      if (gl && !useFallback) {
        if (useIdleSource()) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, idleTex); }
        else uploadFrame();
        gl.uniform2f(U.uNeck, trackCx, trackTop + 168);
        gl.uniform3f(U.uHead, headAng, headTx, headTy);
        gl.uniform2f(U.uFeather, 110, 100 * (1 - smoothstep(28, 44, k)));
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        drawParticles(dt);
      }

      // bubble follows the head
      if (bubble.classList.contains('is-visible')) {
        var bw = bubble.offsetWidth || 160;
        var bx = clamp(canvasLeft + trackCx * S, bw / 2 + 12, W - bw / 2 - 12);
        var by = canvasTop + (trackTop - 4) * S + b.ty;
        bubble.style.left = bx.toFixed(1) + 'px';
        bubble.style.top = Math.max(by, 90).toFixed(1) + 'px';
        bubble.style.setProperty('--tail', (canvasLeft + trackCx * S - bx).toFixed(1) + 'px');
      }
    }

    function start() { if (!running) { running = true; lastNow = 0; rafId = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(rafId); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { start(); if (state === 'intro' && video.paused && !video.ended) video.play().catch(function () {}); }
        else { stop(); if (state === 'intro') video.pause(); }
      }, { threshold: 0.05 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (state === 'intro') video.pause(); }
      else if (state === 'intro' && visible) video.play().catch(function () {});
    });

    var resizeT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { layout(); needUpload = true; }, 120);
    });

    layout();
    loadIdleTexture();
    start();

    // load the video last so the page paints first
    var src = stage.getAttribute('data-video');
    if (!useFallback && src) {
      video.src = src;
      video.load();
    }

    // reveal the hint once the intro is over
    setInterval(function () {
      if (hintEl && state === 'idle' && !hintFaded) hintEl.classList.add('is-shown');
    }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();