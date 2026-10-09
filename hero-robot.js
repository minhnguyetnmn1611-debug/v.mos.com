/* ==========================================================================
   VMOS HERO ROBOT -- Video Entrance (Wall Peeking & Stepping Out) +
   Interactive 3D WebGL (Mouse Eye-Tracking & "Talking Tom" Click Reactions)
   ========================================================================== */
(function () {
  'use strict';

  // Region thresholds for vertex pseudo-rig
  var HEAD_Y_BLEND_LOW = 0.20;
  var HEAD_Y_BLEND_HIGH = 0.24;
  var HEAD_PIVOT = { x: 0, y: 0.18, z: 0.01 };

  var ARM_PIVOT_Y = 0.134;
  var ARM_PIVOT_Z = 0;

  var MAX_HEAD_YAW = 0.65;
  var MAX_HEAD_PITCH = 0.5;

  var MAX_ARM_LIFT = 0.70;
  var ARM_IDLE_SWAY_AMP = 0.035;
  var ARM_IDLE_SWAY_FREQ = 1.6;
  var ARM_IDLE_PHASE_OFFSET = 1.25;
  var ARM_REACH_BIAS = 0.45;

  // Interactive Talking Tom Quotes by Language
  var ROBOT_QUOTES = {
    vi: [
      "Xin chào! Rất vui được gặp bạn! 🤖",
      "Tôi là Robot trợ lý VMOS! ✨",
      "Hãy cùng khám phá các giải pháp tự động hóa nhé! 🚀",
      "VMOS - Bứt phá công nghệ & nâng tầm doanh nghiệp! 💎",
      "Hi hi! Bạn vừa chạm vào tôi đó! 😄"
    ],
    en: [
      "Hello! Great to meet you! 🤖",
      "I am your VMOS AI Robot assistant! ✨",
      "Let's explore smart automation together! 🚀",
      "VMOS - Empowering innovation for your business! 💎",
      "Hehee! You just tapped me! 😄"
    ],
    ja: [
      "こんにちは！ お会いできて嬉しいです！ 🤖",
      "VMOS AIアシスタントロボットです！ ✨",
      "スマート自動化ソリューションをご案内します！ 🚀",
      "VMOS - イノベーションでビジネスを推進します！ 💎",
      "ウフフ！ タッチしてくれてありがとうございます！ 😄"
    ]
  };

  function easeOutCubic(t) {
    var p = 1 - t;
    return 1 - p * p * p;
  }

  // Web Audio synth sound effect for click feedback
  function playRobotChime() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      var now = ctx.currentTime;

      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio fallback silent
    }
  }

  function init() {
    var container = document.getElementById('hero-robot-canvas');
    var videoEl = document.getElementById('hero-robot-video');
    var speechBubbleEl = document.getElementById('robot-speech-bubble');
    var fxLayerEl = document.getElementById('robot-fx-layer');

    if (!container) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var renderer;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    var targetCenterY = 0.92;

    function getFinalDistance() {
      var w = container.clientWidth || window.innerWidth;
      var h = container.clientHeight || window.innerHeight;
      return h > w ? 6.2 : 4.85;
    }

    function positionCamera(distOverride) {
      var w = container.clientWidth || window.innerWidth;
      var h = container.clientHeight || window.innerHeight;
      var dist = (typeof distOverride === 'number') ? distOverride : getFinalDistance();
      camera.aspect = w / Math.max(h, 1);
      camera.position.set(0, targetCenterY + 0.1, dist);
      camera.lookAt(0, targetCenterY, 0);
      camera.updateProjectionMatrix();
    }

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.error('[Hero Robot 3D] WebGLRenderer error:', e);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    if ('toneMapping' in renderer) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    }
    container.appendChild(renderer.domElement);

    function resizeRenderer() {
      var w = container.clientWidth || window.innerWidth;
      var h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      positionCamera();
    }

    // LIGHTING RIG
    var hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.95);
    scene.add(hemiLight);

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    var keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    var rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-4.5, 4, -3.5);
    scene.add(rimLight);

    var fillLight = new THREE.PointLight(0xe0f2fe, 0.8, 12);
    fillLight.position.set(-2.5, 2, 3.5);
    scene.add(fillLight);

    // GROUND SHADOW & GLOW RING
    var groundY = -0.42;
    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(3, 48),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = groundY;
    ground.receiveShadow = true;
    scene.add(ground);

    var glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.95, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = groundY + 0.01;
    scene.add(glowRing);

    // GROUPS
    var floatGroup = new THREE.Group();
    scene.add(floatGroup);

    var robotModelGroup = new THREE.Group();
    floatGroup.add(robotModelGroup);

    var THEME_SETTINGS = {
      dark: { bodyColor: 0xffffff, keyIntensity: 1.6, rimColor: 0x38bdf8, rimIntensity: 1.2, groundOpacity: 0.35 },
      light: { bodyColor: 0xffffff, keyIntensity: 1.85, rimColor: 0x0284c7, rimIntensity: 1.5, groundOpacity: 0.55 }
    };

    var meshFound = null;

    function updateThemeStyles() {
      var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var st = THEME_SETTINGS[theme];
      if (meshFound && meshFound.material && meshFound.material.color) meshFound.material.color.setHex(st.bodyColor);
      if (keyLight) keyLight.intensity = st.keyIntensity;
      if (rimLight) { rimLight.color.setHex(st.rimColor); rimLight.intensity = st.rimIntensity; }
      if (ground && ground.material) ground.material.opacity = st.groundOpacity;
    }

    var themeObs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'data-theme') { updateThemeStyles(); break; }
      }
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // PSEUDO RIG
    var rig = null;

    function weldPositions(positions, count) {
      var map = {};
      var weldId = new Int32Array(count);
      var next = 0;
      for (var i = 0; i < count; i++) {
        var key = Math.round(positions[i * 3] * 10000) + '_' +
                  Math.round(positions[i * 3 + 1] * 10000) + '_' +
                  Math.round(positions[i * 3 + 2] * 10000);
        var id = map[key];
        if (id === undefined) { id = next++; map[key] = id; }
        weldId[i] = id;
      }
      return { count: next, map: weldId };
    }

    function buildPseudoRig(mesh) {
      var geo = mesh.geometry;
      if (!geo || !geo.attributes.position) return null;
      var posAttr = geo.attributes.position;
      var count = posAttr.count;
      var rest = new Float32Array(posAttr.array);

      var welded = weldPositions(rest, count);
      var uniqueCount = welded.count;

      var wHead = new Float32Array(uniqueCount);
      var wArmL = new Float32Array(uniqueCount);
      var wArmR = new Float32Array(uniqueCount);
      var wBody = new Float32Array(uniqueCount);

      var pX = new Float32Array(uniqueCount);
      var pY = new Float32Array(uniqueCount);
      var pZ = new Float32Array(uniqueCount);

      for (var i = 0; i < count; i++) {
        var uid = welded.map[i];
        pX[uid] = rest[i * 3];
        pY[uid] = rest[i * 3 + 1];
        pZ[uid] = rest[i * 3 + 2];
      }

      for (var u = 0; u < uniqueCount; u++) {
        var y = pY[u];
        var x = pX[u];

        var hW = (y <= HEAD_Y_BLEND_LOW) ? 0 :
                 (y >= HEAD_Y_BLEND_HIGH) ? 1 :
                 (y - HEAD_Y_BLEND_LOW) / (HEAD_Y_BLEND_HIGH - HEAD_Y_BLEND_LOW);

        wHead[u] = hW;

        var armL = 0, armR = 0;
        if (x < -0.065 && y > 0.04 && y < 0.26) {
          armL = Math.min(1, (-x - 0.065) / 0.05);
        } else if (x > 0.065 && y > 0.04 && y < 0.26) {
          armR = Math.min(1, (x - 0.065) / 0.05);
        }

        wArmL[u] = armL * (1 - hW);
        wArmR[u] = armR * (1 - hW);
        wBody[u] = Math.max(0, 1 - (wHead[u] + wArmL[u] + wArmR[u]));
      }

      return {
        mesh: mesh,
        geometry: geo,
        rest: rest,
        weldedMap: welded.map,
        uniqueCount: uniqueCount,
        wHead: wHead,
        wArmL: wArmL,
        wArmR: wArmR,
        wBody: wBody,
        pX: pX,
        pY: pY,
        pZ: pZ
      };
    }

    function applyPseudoRig(headYaw, headPitch, armLiftL, armLiftR) {
      if (!rig) return;
      var posAttr = rig.geometry.attributes.position;
      var arr = posAttr.array;
      var rest = rig.rest;
      var map = rig.weldedMap;

      var cy = Math.cos(headYaw), sy = Math.sin(headYaw);
      var cp = Math.cos(headPitch), sp = Math.sin(headPitch);

      var cL = Math.cos(armLiftL), sL = Math.sin(armLiftL);
      var cR = Math.cos(armLiftR), sR = Math.sin(armLiftR);

      var pPivotY = HEAD_PIVOT.y;
      var pPivotZ = HEAD_PIVOT.z;
      var aPivotY = ARM_PIVOT_Y;

      for (var i = 0; i < posAttr.count; i++) {
        var uid = map[i];
        var rx = rest[i * 3];
        var ry = rest[i * 3 + 1];
        var rz = rest[i * 3 + 2];

        var wH = rig.wHead[uid];
        var wL = rig.wArmL[uid];
        var wR = rig.wArmR[uid];
        var wB = rig.wBody[uid];

        // Head rotation
        var dyH = ry - pPivotY;
        var dzH = rz - pPivotZ;
        var hx1 = rx * cy + dzH * sy;
        var hz1 = -rx * sy + dzH * cy;
        var hy1 = dyH * cp - hz1 * sp + pPivotY;
        var hz2 = dyH * sp + hz1 * cp + pPivotZ;

        // Left Arm rotation
        var dyL = ry - aPivotY;
        var hyL = dyL * cL - (rx + 0.10) * sL + aPivotY;
        var hxL = dyL * sL + (rx + 0.10) * cL - 0.10;

        // Right Arm rotation
        var dyR = ry - aPivotY;
        var hyR = dyR * cR + (rx - 0.10) * sR + aPivotY;
        var hxR = -dyR * sR + (rx - 0.10) * cR + 0.10;

        arr[i * 3]     = rx * wB + hx1 * wH + hxL * wL + hxR * wR;
        arr[i * 3 + 1] = ry * wB + hy1 * wH + hyL * wL + hyR * wR;
        arr[i * 3 + 2] = rz * wB + hz2 * wH + rz  * wL + rz  * wR;
      }

      posAttr.needsUpdate = true;
    }

    // LOAD GLTF MODEL
    var loader = new THREE.GLTFLoader();
    loader.load(
      'sample.glb',
      function (gltf) {
        var model = gltf.scene;
        model.traverse(function (child) {
          if (child.isMesh) {
            meshFound = child;
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.25;
              child.material.metalness = 0.15;
            }
          }
        });

        model.scale.set(1.45, 1.45, 1.45);
        model.position.set(0, -0.38, 0);
        robotModelGroup.add(model);

        if (meshFound) rig = buildPseudoRig(meshFound);

        updateThemeStyles();
      },
      undefined,
      function (err) {
        console.error('[Hero Robot 3D] Failed to load sample.glb:', err);
      }
    );

    // VIDEO ENTRANCE & CANVAS TRANSITION
    var is3dCanvasActive = false;

    function switchTo3DCanvas() {
      if (is3dCanvasActive) return;
      is3dCanvasActive = true;
      if (videoEl) {
        videoEl.style.opacity = '0';
        setTimeout(function () {
          videoEl.style.display = 'none';
        }, 600);
      }
      if (container) {
        container.classList.add('is-active');
      }
    }

    if (videoEl) {
      videoEl.play().catch(function () {});
      videoEl.addEventListener('ended', function () {
        switchTo3DCanvas();
      });
      videoEl.addEventListener('timeupdate', function () {
        if (videoEl.duration && videoEl.currentTime > videoEl.duration - 0.5) {
          switchTo3DCanvas();
        }
      });
      // Click on video also triggers Talking Tom & 3D canvas
      videoEl.addEventListener('click', function (e) {
        triggerRobotInteraction(e.clientX, e.clientY);
        switchTo3DCanvas();
      });
    } else {
      switchTo3DCanvas();
    }

    // MOUSE CURSOR TRACKING
    var targetX = 0, targetY = 0;
    var currentX = 0, currentY = 0;

    function updatePointer(clientX, clientY) {
      targetX = (clientX / window.innerWidth) * 2 - 1;
      targetY = (clientY / window.innerHeight) * 2 - 1;
    }

    window.addEventListener('mousemove', function (e) { updatePointer(e.clientX, e.clientY); });
    window.addEventListener('touchmove', function (e) {
      if (e.touches.length > 0) updatePointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    // INTERACTION & TALKING TOM SYSTEM
    var clickWaveL = 0;
    var clickWaveR = 0;
    var nodHeadT = 0;
    var bounceT = 0;
    var pulseGlowT = 0;

    function showSpeechBubble(msg) {
      if (!speechBubbleEl) return;
      speechBubbleEl.innerHTML = `<span class="bubble-text">${msg}</span>`;
      speechBubbleEl.classList.add('is-active');
      clearTimeout(speechBubbleEl._timer);
      speechBubbleEl._timer = setTimeout(function () {
        speechBubbleEl.classList.remove('is-active');
      }, 3400);
    }

    function spawnParticleFX(clientX, clientY) {
      if (!fxLayerEl) return;
      var symbols = ['✨', '⭐', '❤️', '⚡', '🤖'];
      var rect = fxLayerEl.getBoundingClientRect();
      var x = clientX - rect.left;
      var y = clientY - rect.top;

      for (var i = 0; i < 6; i++) {
        var p = document.createElement('span');
        p.className = 'robot-fx-item';
        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        var dx = (Math.random() - 0.5) * 80;
        var dy = -40 - Math.random() * 60;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.setProperty('--dx', dx + 'px');
        p.style.setProperty('--dy', dy + 'px');
        fxLayerEl.appendChild(p);

        setTimeout((function (el) {
          return function () { if (el && el.parentNode) el.parentNode.removeChild(el); };
        })(p), 1000);
      }
    }

    function triggerRobotInteraction(clientX, clientY) {
      playRobotChime();
      spawnParticleFX(clientX, clientY);

      // Speech quote based on language
      var lang = window.currentLang || 'vi';
      var quotes = ROBOT_QUOTES[lang] || ROBOT_QUOTES.vi;
      var randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      showSpeechBubble(randomQuote);

      // Random Talking Tom physical reaction
      var rand = Math.random();
      if (rand < 0.35) {
        bounceT = 1.0;
        nodHeadT = 0.8;
        clickWaveR = 0.9;
        clickWaveL = 0.9;
      } else if (rand < 0.70) {
        nodHeadT = 1.0;
        clickWaveR = 1.0;
        pulseGlowT = 1.0;
      } else {
        clickWaveL = 1.0;
        clickWaveR = 1.0;
        pulseGlowT = 1.0;
      }
    }

    // Canvas click event
    var canvasEl = renderer.domElement;
    canvasEl.style.cursor = 'pointer';

    canvasEl.addEventListener('pointerdown', function (e) {
      triggerRobotInteraction(e.clientX, e.clientY);
    });

    window.addEventListener('resize', resizeRenderer);
    resizeRenderer();

    var clock = new THREE.Clock();
    var isRunning = true;

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        isRunning = entries[0].isIntersecting;
      }, { threshold: 0 });
      obs.observe(container);
    }

    function animate() {
      if (isRunning) {
        var elapsedTime = clock.getElapsedTime();
        var dt = clock.getDelta();

        robotModelGroup.position.x = 0.35;

        // 2. MOUSE CURSOR HEAD & EYE TRACKING
        if (!prefersReducedMotion) {
          currentX += (targetX - currentX) * 0.08;
          currentY += (targetY - currentY) * 0.08;

          var headYaw = currentX * MAX_HEAD_YAW;
          var headPitch = currentY * MAX_HEAD_PITCH;

          if (nodHeadT > 0) {
            nodHeadT -= dt * 3.0;
            if (nodHeadT < 0) nodHeadT = 0;
            headPitch += Math.sin(nodHeadT * Math.PI * 2) * 0.22;
          }

          if (pulseGlowT > 0) {
            pulseGlowT -= dt * 2.0;
            if (pulseGlowT < 0) pulseGlowT = 0;
            glowRing.material.opacity = 0.15 + Math.sin(pulseGlowT * Math.PI) * 0.35;
          } else {
            glowRing.material.opacity = 0.15 + Math.sin(elapsedTime * 1.2) * 0.04;
          }

          if (bounceT > 0) {
            bounceT -= dt * 2.5;
            if (bounceT < 0) bounceT = 0;
            floatGroup.position.y = Math.sin(bounceT * Math.PI) * 0.10;
          } else {
            floatGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.02; // Gentle breathing idle
          }

          var upAmount = Math.max(0, -currentY);
          var reachL = Math.max(0, -currentX);
          var reachR = Math.max(0, currentX);

          var gestureLiftL = (upAmount * 0.50 + reachL * ARM_REACH_BIAS * (upAmount + 0.3)) * MAX_ARM_LIFT;
          var gestureLiftR = (upAmount * 0.50 + reachR * ARM_REACH_BIAS * (upAmount + 0.3)) * MAX_ARM_LIFT;

          var idleSwayL = Math.sin(elapsedTime * ARM_IDLE_SWAY_FREQ) * ARM_IDLE_SWAY_AMP;
          var idleSwayR = Math.sin(elapsedTime * ARM_IDLE_SWAY_FREQ + ARM_IDLE_PHASE_OFFSET) * ARM_IDLE_SWAY_AMP;

          var waveLiftL = 0;
          var waveLiftR = 0;

          if (clickWaveL > 0) {
            clickWaveL -= dt * 2.2;
            if (clickWaveL < 0) clickWaveL = 0;
            var wEnvL = Math.sin((1 - clickWaveL) * Math.PI);
            waveLiftL = wEnvL * 0.70 + Math.sin((1 - clickWaveL) * Math.PI * 4) * 0.14 * wEnvL;
          }

          if (clickWaveR > 0) {
            clickWaveR -= dt * 2.2;
            if (clickWaveR < 0) clickWaveR = 0;
            var wEnvR = Math.sin((1 - clickWaveR) * Math.PI);
            waveLiftR = wEnvR * 0.70 + Math.sin((1 - clickWaveR) * Math.PI * 4) * 0.14 * wEnvR;
          }

          var armLiftL = Math.min(MAX_ARM_LIFT, Math.max(0, gestureLiftL + idleSwayL + waveLiftL));
          var armLiftR = Math.min(MAX_ARM_LIFT, Math.max(0, gestureLiftR + idleSwayR + waveLiftR));

          if (rig) {
            applyPseudoRig(headYaw, headPitch, armLiftL, armLiftR);
            rig.geometry.computeVertexNormals();
          }
        }

        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    }

    updateThemeStyles();
    animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
