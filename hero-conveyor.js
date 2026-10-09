/* ==========================================================================
   VMOS 3D Conveyor Belt Engine (Three.js r148 UMD, WebGL1 & 2 Compatible)
   ========================================================================== */
(function (root) {
  'use strict';
  function create(THREE, canvas, opts) {
    opts = opts || {};
    var useAntialias = opts.antialias !== false;
    // 1. WebGL Renderer Setup
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: useAntialias,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // 2. Scene Setup
    var scene = new THREE.Scene();
    // 3. Studio Environment Map (safely wrapped)
    var studioEnvCube = null;
    try {
      studioEnvCube = createStudioCubeEnvironment(THREE);
    } catch (e) {
      console.warn('[VMOS conveyor] Studio env map generation fallback:', e);
    }
    // 4. Camera Setup
    var camera = new THREE.PerspectiveCamera(34, 1.25, 0.1, 100);
    camera.position.set(5.6, 3.2, 8.6);
    camera.lookAt(3.0, 0.55, 1.1);
    // 5. Lighting System
    var hemiLight = new THREE.HemisphereLight(0xfff1de, 0x6e5238, 0.42);
    scene.add(hemiLight);
    var dirLightWarm = new THREE.DirectionalLight(0xffdcb0, 1.45);
    dirLightWarm.position.set(-4, 7.5, 6);
    dirLightWarm.castShadow = true;
    dirLightWarm.shadow.mapSize.width = 2048;
    dirLightWarm.shadow.mapSize.height = 2048;
    dirLightWarm.shadow.camera.near = 1;
    dirLightWarm.shadow.camera.far = 26;
    dirLightWarm.shadow.camera.left = -11;
    dirLightWarm.shadow.camera.right = 11;
    dirLightWarm.shadow.camera.top = 9;
    dirLightWarm.shadow.camera.bottom = -9;
    dirLightWarm.shadow.bias = -0.0006;
    if (dirLightWarm.shadow.normalBias !== undefined) {
      dirLightWarm.shadow.normalBias = 0.02;
    }
    scene.add(dirLightWarm);
    var dirLightCool = new THREE.DirectionalLight(0xa9d4ff, 0.6);
    dirLightCool.position.set(5, 4, -6);
    scene.add(dirLightCool);
    // 6. Main Rig Group Transformation
    var rig = new THREE.Group();
    rig.rotation.y = -0.34;
    rig.position.x = -0.6;
    scene.add(rig);
    // Conveyor Constants & Kinematics Parameters
    var R = 0.32;
    var HALF = 7.0;
    var STRAIGHT = 2 * HALF;
    var W = 1.7;
    var TOP_Y = 2 * R;
    var SPEED = 1.45;
    var SLAT_T = 0.06;
    var L1 = STRAIGHT;
    var L2 = Math.PI * R;
    var L3 = STRAIGHT;
    var L4 = Math.PI * R;
    var LOOP = L1 + L2 + L3 + L4;
    var SLAT_COUNT = Math.round(LOOP / 0.2);
    var PITCH = LOOP / SLAT_COUNT;
    // Metallic Materials
    var brushedBumpTex = null;
    try {
      brushedBumpTex = createBrushedMetalBumpTexture(THREE);
    } catch (e) {
      console.warn('[VMOS conveyor] Brushed bump texture fallback:', e);
    }
    function createMetallicMaterial(color, opacity, reflectivity, shininess, useBump) {
      var params = {
        color: color,
        specular: 0xb8b8c4,
        shininess: shininess
      };
      if (studioEnvCube) {
        params.envMap = studioEnvCube;
        params.combine = THREE.AddOperation;
        params.reflectivity = reflectivity;
      }
      if (useBump && brushedBumpTex) {
        params.bumpMap = brushedBumpTex;
        params.bumpScale = 0.05;
      }
      return new THREE.MeshPhongMaterial(params);
    }
    var slatMat = createMetallicMaterial(0x25262b, 1.0, 0.34, 55, true);
    var railMat = createMetallicMaterial(0x24252a, 1.0, 0.27, 70, false);
    var railEdgeMat = createMetallicMaterial(0x34363c, 1.0, 0.40, 85, false);
    var hubMat = createMetallicMaterial(0x7a7b84, 1.0, 0.70, 120, false);
    // 7. Slats InstancedMesh
    var slatGeo = createRoundedBoxGeometry(THREE, PITCH * 0.9, SLAT_T, W, 0.014, 1, 0);
    var slatMesh = new THREE.InstancedMesh(slatGeo, slatMat, SLAT_COUNT);
    slatMesh.castShadow = true;
    slatMesh.receiveShadow = true;
    if (slatMesh.instanceMatrix.setUsage) {
      slatMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    var baseSlatColor = new THREE.Color(0x25262b);
    for (var i = 0; i < SLAT_COUNT; i++) {
      var hFactor = 0.88 + ((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1 * 0.22;
      slatMesh.setColorAt(i, baseSlatColor.clone().multiplyScalar(hFactor));
    }
    if (slatMesh.instanceColor) slatMesh.instanceColor.needsUpdate = true;
    rig.add(slatMesh);
    var dummy = new THREE.Object3D();
    // Dark Interior Cushion under Slats
    var cushionGeo = new THREE.BoxGeometry(STRAIGHT + 0.2, 0.02, W - 0.04);
    var cushionMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0c });
    var cushionMesh = new THREE.Mesh(cushionGeo, cushionMat);
    cushionMesh.position.set(0, TOP_Y - 0.05, 0);
    rig.add(cushionMesh);
    // 8. Aluminum Side Rails
    var RAIL_T = 0.14;
    var railH = 2 * R * 0.9;
    var railZ1 = W / 2 + RAIL_T / 2 + 0.06;
    var railZ2 = -(W / 2 + RAIL_T / 2 + 0.06);
    var railBodyGeo = createRoundedBoxGeometry(THREE, STRAIGHT, railH, RAIL_T, 0.02, 1, 0);
    var railEdgeGeo = createRoundedBoxGeometry(THREE, STRAIGHT, 0.05, RAIL_T + 0.1, 0.014, 1, 0);
    var darkGrooveGeo = new THREE.BoxGeometry(STRAIGHT - 0.3, 0.02, 0.008);
    var darkGrooveMat = new THREE.MeshBasicMaterial({ color: 0x08080a });
    [railZ1, railZ2].forEach(function (zPos) {
      var rBody = new THREE.Mesh(railBodyGeo, railMat);
      rBody.position.set(0, R, zPos);
      rBody.castShadow = true;
      rBody.receiveShadow = true;
      rig.add(rBody);
      var rEdgeTop = new THREE.Mesh(railEdgeGeo, railEdgeMat);
      rEdgeTop.position.set(0, R + railH / 2, zPos);
      rig.add(rEdgeTop);
      var rEdgeBot = new THREE.Mesh(railEdgeGeo, railEdgeMat);
      rEdgeBot.position.set(0, R - railH / 2, zPos);
      rig.add(rEdgeBot);
      var groove1 = new THREE.Mesh(darkGrooveGeo, darkGrooveMat);
      groove1.position.set(0, R + 0.16, zPos + (zPos > 0 ? RAIL_T / 2 + 0.002 : -(RAIL_T / 2 + 0.002)));
      rig.add(groove1);
      var groove2 = new THREE.Mesh(darkGrooveGeo, darkGrooveMat);
      groove2.position.set(0, R - 0.06, zPos + (zPos > 0 ? RAIL_T / 2 + 0.002 : -(RAIL_T / 2 + 0.002)));
      rig.add(groove2);
    });
    // Hexagonal Bolts along Rails
    var hexBoltGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.035, 6);
    hexBoltGeo.rotateZ(Math.PI / 2);
    var railBoltCount = Math.floor((STRAIGHT - 0.8) / 1.15) + 1;
    var railBoltMesh = new THREE.InstancedMesh(hexBoltGeo, hubMat, railBoltCount * 2);
    var bIdx = 0;
    [railZ1, railZ2].forEach(function (zPos) {
      for (var k = 0; k < railBoltCount; k++) {
        var bx = -STRAIGHT / 2 + 0.5 + k * 1.15;
        dummy.position.set(bx, R + 0.06, zPos + (zPos > 0 ? RAIL_T / 2 + 0.01 : -(RAIL_T / 2 + 0.01)));
        dummy.rotation.set(0, 0, (k * 0.4) % Math.PI);
        dummy.updateMatrix();
        railBoltMesh.setMatrixAt(bIdx++, dummy.matrix);
      }
    });
    rig.add(railBoltMesh);
    // End Roller Caps, Edge Rings & Hub Cores
    var capGeo = new THREE.CylinderGeometry(R * 1.06, R * 1.06, RAIL_T + 0.02, 48);
    capGeo.rotateX(Math.PI / 2);
    var edgeRingGeo = new THREE.TorusGeometry(R * 1.02, 0.022, 10, 56);
    var hubGeo = new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.05, 24);
    hubGeo.rotateX(Math.PI / 2);
    var boltSmallGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.07, 8);
    boltSmallGeo.rotateX(Math.PI / 2);
    [HALF, -HALF].forEach(function (endX) {
      [railZ1, railZ2].forEach(function (zPos) {
        var cap = new THREE.Mesh(capGeo, railMat);
        cap.position.set(endX, R, zPos);
        cap.castShadow = true;
        rig.add(cap);
        var ring = new THREE.Mesh(edgeRingGeo, railEdgeMat);
        ring.position.set(endX, R, zPos + (zPos > 0 ? RAIL_T / 2 + 0.015 : -(RAIL_T / 2 + 0.015)));
        rig.add(ring);
        var hub = new THREE.Mesh(hubGeo, hubMat);
        hub.position.set(endX, R, zPos + (zPos > 0 ? RAIL_T / 2 + 0.02 : -(RAIL_T / 2 + 0.02)));
        rig.add(hub);
        for (var b = 0; b < 6; b++) {
          var bAngle = (b / 6) * Math.PI * 2;
          var sBolt = new THREE.Mesh(boltSmallGeo, hubMat);
          sBolt.position.set(
            endX + Math.cos(bAngle) * R * 0.8,
            R + Math.sin(bAngle) * R * 0.8,
            zPos + (zPos > 0 ? RAIL_T / 2 + 0.025 : -(RAIL_T / 2 + 0.025))
          );
          rig.add(sBolt);
        }
      });
    });
    // 9. Ground Shadow Receiver & Glow Plane
    var shadowGeo = new THREE.PlaneGeometry(20, 10);
    shadowGeo.rotateX(-Math.PI / 2);
    var shadowMat = new THREE.ShadowMaterial({ color: 0x1a0f06, opacity: 0.32 });
    var shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.y = 0.001;
    shadowPlane.receiveShadow = true;
    rig.add(shadowPlane);
    var glowGeo = new THREE.PlaneGeometry(20, 8);
    glowGeo.rotateX(-Math.PI / 2);
    var glowSize = 64;
    var glowData = new Uint8Array(glowSize * glowSize * 4);
    var glowCenter = glowSize / 2;
    for (var gy = 0; gy < glowSize; gy++) {
      for (var gx = 0; gx < glowSize; gx++) {
        var gidx = (gy * glowSize + gx) * 4;
        var gdx = (gx - glowCenter) / glowCenter;
        var gdy = (gy - glowCenter) / glowCenter;
        var gdist = Math.sqrt(gdx * gdx + gdy * gdy);
        var galpha = Math.max(0, Math.min(1, 1 - gdist));
        var gopacity = galpha * galpha;
        glowData[gidx] = 56;
        glowData[gidx + 1] = 189;
        glowData[gidx + 2] = 248;
        glowData[gidx + 3] = Math.round(gopacity * 255);
      }
    }
    var glowTex = new THREE.DataTexture(glowData, glowSize, glowSize, THREE.RGBAFormat);
    glowTex.needsUpdate = true;
    var glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });
    var glowPlane = new THREE.Mesh(glowGeo, glowMat);
    glowPlane.position.set(1.2, 0.0005, 0.9);
    rig.add(glowPlane);
    // 10. Realistic Carton Boxes Construction (5 boxes)
    var paperTexs = [
      createPaperCartonTexture(THREE, 0),
      createPaperCartonTexture(THREE, 1),
      createPaperCartonTexture(THREE, 2)
    ];
    var barcodeTex = createBarcodeQRLabelTexture(THREE);
    var barcodeMat = new THREE.MeshLambertMaterial({ map: barcodeTex });
    var upArrowTex = createUpArrowPrintTexture(THREE);
    var upArrowMat = new THREE.MeshLambertMaterial({
      map: upArrowTex,
      transparent: true,
      depthWrite: false
    });
    var contactShadowTex = createContactShadowTexture(THREE);
    var tapeMat = new THREE.MeshStandardMaterial({
      color: 0xd5b988,
      roughness: 0.3,
      metalness: 0
    });
    var boxConfigs = [
      { w: 1.35, h: 0.95, d: 1.05, yaw: 0.10, color: 0xa8763f },
      { w: 1.10, h: 0.80, d: 0.95, yaw: -0.14, color: 0x9c6b38 },
      { w: 1.55, h: 1.05, d: 1.15, yaw: 0.06, color: 0xb27f48 },
      { w: 1.20, h: 0.90, d: 1.00, yaw: -0.08, color: 0xa3723c },
      { w: 1.40, h: 1.00, d: 1.10, yaw: 0.12, color: 0xae7c45 }
    ];
    var BOX_COUNT = 5;
    var BOX_SPAWN_X = -12.0;
    var BOX_GAP = 4.6;
    var BOX_CYCLE = BOX_COUNT * BOX_GAP;
    var boxes = [];
    boxConfigs.forEach(function (cfg, bIdx) {
      var boxGroup = new THREE.Group();
      var boxMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.9,
        metalness: 0.0,
        map: paperTexs[bIdx % 3],
        bumpMap: paperTexs[bIdx % 3],
        bumpScale: 0.16,
        transparent: true,
        opacity: 1.0
      });
      boxMat.userData = { baseOpacity: 1.0 };
      var bodyGeo = createRoundedBoxGeometry(THREE, cfg.w, cfg.h, cfg.d, 0.032, 2, 0.014);
      var bodyMesh = new THREE.Mesh(bodyGeo, boxMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      boxGroup.add(bodyMesh);
      var tapeTopGeo = createRoundedBoxGeometry(THREE, cfg.w - 2 * 0.032 + 0.03, 0.008, cfg.d * 0.17, 0.003, 1, 0);
      var tapeTopMesh = new THREE.Mesh(tapeTopGeo, tapeMat);
      tapeTopMesh.position.y = cfg.h / 2 + 0.006;
      boxGroup.add(tapeTopMesh);
      var tapeSideGeo = createRoundedBoxGeometry(THREE, 0.008, 0.16, cfg.d * 0.17, 0.003, 1, 0);
      var tapeSide1 = new THREE.Mesh(tapeSideGeo, tapeMat);
      tapeSide1.position.set(cfg.w / 2 + 0.006, cfg.h / 2 - 0.032 - 0.06, 0);
      boxGroup.add(tapeSide1);
      var tapeSide2 = new THREE.Mesh(tapeSideGeo, tapeMat);
      tapeSide2.position.set(-(cfg.w / 2 + 0.006), cfg.h / 2 - 0.032 - 0.06, 0);
      boxGroup.add(tapeSide2);
      var labelGeo = new THREE.PlaneGeometry(0.4, 0.25);
      var labelMesh = new THREE.Mesh(labelGeo, barcodeMat);
      labelMesh.position.set(-cfg.w * 0.2, cfg.h * 0.06, cfg.d / 2 + 0.018);
      boxGroup.add(labelMesh);
      var arrowFrontGeo = new THREE.PlaneGeometry(0.3, 0.3);
      var arrowFrontMesh = new THREE.Mesh(arrowFrontGeo, upArrowMat);
      arrowFrontMesh.position.set(cfg.w * 0.24, -cfg.h * 0.02, cfg.d / 2 + 0.018);
      boxGroup.add(arrowFrontMesh);
      var arrowSideGeo = new THREE.PlaneGeometry(0.28, 0.28);
      var arrowSideMesh = new THREE.Mesh(arrowSideGeo, upArrowMat);
      arrowSideMesh.rotation.y = Math.PI / 2;
      arrowSideMesh.position.set(cfg.w / 2 + 0.018, -cfg.h * 0.02, 0);
      boxGroup.add(arrowSideMesh);
      var shadowContactGeo = new THREE.PlaneGeometry(cfg.w * 1.4, cfg.d * 1.35);
      shadowContactGeo.rotateX(-Math.PI / 2);
      var contactMat = new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });
      contactMat.userData = { baseOpacity: 0.55 };
      var shadowContactMesh = new THREE.Mesh(shadowContactGeo, contactMat);
      shadowContactMesh.position.y = -cfg.h / 2 + 0.004;
      boxGroup.add(shadowContactMesh);
      rig.add(boxGroup);
      boxes.push({
        group: boxGroup,
        boxMat: boxMat,
        contactMat: contactMat,
        idx: bIdx,
        cfg: cfg
      });
    });
    // 11. Kinematics Update Functions
    function updateSlats(t) {
      for (var n = 0; n < SLAT_COUNT; n++) {
        var s = ((n * PITCH + t * SPEED) % LOOP + LOOP) % LOOP;
        var x = 0, y = 0, rotZ = 0;
        if (s < L1) {
          x = -HALF + s;
          y = TOP_Y;
          rotZ = 0;
        } else if (s < L1 + L2) {
          var arcS = s - L1;
          var phi = arcS / R;
          x = HALF + R * Math.sin(phi);
          y = R + R * Math.cos(phi);
          rotZ = -phi;
        } else if (s < L1 + L2 + L3) {
          var botS = s - (L1 + L2);
          x = HALF - botS;
          y = 0;
          rotZ = -Math.PI;
        } else {
          var leftS = s - (L1 + L2 + L3);
          var phiL = leftS / R;
          x = -HALF - R * Math.sin(phiL);
          y = R - R * Math.cos(phiL);
          rotZ = -Math.PI - phiL;
        }
        dummy.position.set(x, y, 0);
        dummy.rotation.set(0, 0, rotZ);
        dummy.updateMatrix();
        slatMesh.setMatrixAt(n, dummy.matrix);
      }
      slatMesh.instanceMatrix.needsUpdate = true;
    }
    function updateBoxes(t) {
      boxes.forEach(function (b) {
        var rawX = BOX_SPAWN_X + (((b.idx * BOX_GAP + t * SPEED) % BOX_CYCLE + BOX_CYCLE) % BOX_CYCLE);
        var yBase = TOP_Y + SLAT_T / 2 + b.cfg.h / 2;
        var yaw = b.cfg.yaw + Math.sin(t * 0.9 + b.idx * 1.7) * 0.05;
        var zOffset = Math.sin(t * 0.8 + b.idx * 1.9) * 0.07;
        var rotX = 0;
        var rotZ = 0;
        var posX = rawX;
        var posY = yBase;
        var opFactor = 1.0;
        var contactShadowOp = b.contactMat.userData.baseOpacity;
        var visible = true;
        if (rawX <= HALF) {
          var buzz = Math.sin((t * SPEED / PITCH) * Math.PI * 2);
          posY += buzz * 0.0022;
          rotX += buzz * 0.0016;
          rotZ += buzz * 0.0012;
        } else {
          var u = Math.max(0, Math.min(1, (rawX - HALF) / 1.5));
          rotZ = -u * 1.15;
          posY = yBase - u * u * 1.7;
          opFactor = 1.0 - Math.max(0, Math.min(1, (u - 0.5) / 0.5));
          contactShadowOp = b.contactMat.userData.baseOpacity * Math.max(0, 1.0 - Math.max(0, Math.min(1, u * 5)));
          visible = u < 1.0;
        }
        b.group.position.set(posX, posY, zOffset);
        b.group.rotation.set(rotX, yaw, rotZ);
        b.boxMat.opacity = b.boxMat.userData.baseOpacity * opFactor;
        b.contactMat.opacity = contactShadowOp * opFactor;
        b.group.visible = visible;
      });
    }
    function hasShaderError() {
      try {
        if (!renderer || !renderer.info || !renderer.info.programs) return false;
        var progs = renderer.info.programs;
        for (var i = 0; i < progs.length; i++) {
          var p = progs[i];
          if (p && p.diagnostics && p.diagnostics.runnable === false) {
            return true;
          }
        }
      } catch (e) {}
      return false;
    }
    // 12. Public API Methods
    function resize(w, h) {
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      var aspect = w / h;
      if (aspect >= 1.25) {
        var fov = 34 - 4 * Math.max(0, Math.min(1, (aspect - 1.25) / 0.55));
        camera.fov = fov;
        camera.updateProjectionMatrix();
        var xOffset = -w * 0.08 * Math.max(0, Math.min(1, (aspect - 1.15) / 0.6));
        camera.setViewOffset(w, h, xOffset, 0, w, h);
      } else {
        var baseTan = Math.tan(17 * Math.PI / 180);
        var fovRad = 2 * Math.atan(baseTan * Math.max(1, Math.min(1.9, 1.25 / aspect)));
        camera.fov = fovRad * 180 / Math.PI;
        camera.updateProjectionMatrix();
        var yOffset = -h * 0.26;
        camera.setViewOffset(w, h, 0, yOffset, w, h);
      }
    }
    function render(t) {
      updateSlats(t);
      updateBoxes(t);
      renderer.render(scene, camera);
    }
    function dispose() {
      try { renderer.dispose(); } catch (e) {}
      try { slatGeo.dispose(); } catch (e) {}
      try { slatMat.dispose(); } catch (e) {}
      if (brushedBumpTex) try { brushedBumpTex.dispose(); } catch (e) {}
      if (studioEnvCube) try { studioEnvCube.dispose(); } catch (e) {}
      try { cushionGeo.dispose(); } catch (e) {}
      try { cushionMat.dispose(); } catch (e) {}
      try { railBodyGeo.dispose(); } catch (e) {}
      try { railEdgeGeo.dispose(); } catch (e) {}
      try { darkGrooveGeo.dispose(); } catch (e) {}
      try { darkGrooveMat.dispose(); } catch (e) {}
      try { railMat.dispose(); } catch (e) {}
      try { railEdgeMat.dispose(); } catch (e) {}
      try { hexBoltGeo.dispose(); } catch (e) {}
      try { capGeo.dispose(); } catch (e) {}
      try { edgeRingGeo.dispose(); } catch (e) {}
      try { hubGeo.dispose(); } catch (e) {}
      try { boltSmallGeo.dispose(); } catch (e) {}
      try { hubMat.dispose(); } catch (e) {}
      try { shadowGeo.dispose(); } catch (e) {}
      try { shadowMat.dispose(); } catch (e) {}
      try { glowGeo.dispose(); } catch (e) {}
      try { glowMat.dispose(); } catch (e) {}
      try { glowTex.dispose(); } catch (e) {}
      try { barcodeTex.dispose(); } catch (e) {}
      try { barcodeMat.dispose(); } catch (e) {}
      try { upArrowTex.dispose(); } catch (e) {}
      try { upArrowMat.dispose(); } catch (e) {}
      try { contactShadowTex.dispose(); } catch (e) {}
      try { tapeMat.dispose(); } catch (e) {}
      paperTexs.forEach(function (tex) { try { tex.dispose(); } catch (e) {} });
      boxes.forEach(function (b) {
        try { b.boxMat.dispose(); } catch (e) {}
        try { b.contactMat.dispose(); } catch (e) {}
      });
    }
    return {
      renderer: renderer,
      scene: scene,
      camera: camera,
      resize: resize,
      render: render,
      dispose: dispose,
      hasShaderError: hasShaderError
    };
  }
  // Custom Rounded Box Geometry Function with Facet Bulging
  function createRoundedBoxGeometry(THREE, w, h, d, r, n, bulge) {
    n = n || 1;
    r = Math.min(r, Math.min(w, Math.min(h, d)) * 0.49);
    bulge = bulge || 0;
    var segs = 2 * n + 1;
    var geo = new THREE.BoxGeometry(1, 1, 1, segs, segs, segs);
    var posAttr = geo.attributes.position;
    var normAttr = geo.attributes.normal;
    var halfSeg = 0.5 / segs;
    var halfW = w / 2 - r;
    var halfH = h / 2 - r;
    var halfD = d / 2 - r;
    for (var i = 0; i < posAttr.count; i++) {
      var vx = posAttr.getX(i);
      var vy = posAttr.getY(i);
      var vz = posAttr.getZ(i);
      var sx = vx >= 0 ? 1 : -1;
      var sy = vy >= 0 ? 1 : -1;
      var sz = vz >= 0 ? 1 : -1;
      var nx = vx - sx * halfSeg;
      var ny = vy - sy * halfSeg;
      var nz = vz - sz * halfSeg;
      var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0.00001) {
        nx /= len;
        ny /= len;
        nz /= len;
      }
      var px = sx * halfW + nx * r;
      var py = sy * halfH + ny * r;
      var pz = sz * halfD + nz * r;
      if (bulge > 0) {
        var absX = Math.abs(vx);
        var absY = Math.abs(vy);
        var absZ = Math.abs(vz);
        if (absX >= absY && absX >= absZ) {
          px += sx * bulge * Math.max(0, 1 - Math.pow(vy / 0.5, 2)) * Math.max(0, 1 - Math.pow(vz / 0.5, 2));
        } else if (absY >= absX && absY >= absZ) {
          py += sy * bulge * Math.max(0, 1 - Math.pow(vx / 0.5, 2)) * Math.max(0, 1 - Math.pow(vz / 0.5, 2));
        } else {
          pz += sz * bulge * Math.max(0, 1 - Math.pow(vx / 0.5, 2)) * Math.max(0, 1 - Math.pow(vy / 0.5, 2));
        }
      }
      posAttr.setXYZ(i, px, py, pz);
      normAttr.setXYZ(i, nx, ny, nz);
    }
    geo.computeVertexNormals(); return geo; } // 6-Sided Studio Environment CubeTexture Generator (WebGL1 compatible)
  function createStudioCubeEnvironment(THREE) {
    var size = 64; var images = []; var faceNames = ['px', 'nx', 'py', 'ny', 'pz', 'nz']; faceNames.forEach(function (face) { var data = new Uint8Array(size * size * 4); for (var y = 0; y < size; y++) { var v = y / (size - 1); for (var x = 0; x < size; x++) { var u = x / (size - 1); var idx = (y * size + x) * 4; var r = 18 + (1 - v) * 15 + v * 12; var g = 24 + (1 - v) * 20 + v * 10; var b = 38 + (1 - v) * 32 + v * 8; if (face === 'py' || face === 'px') { var sbDist = Math.sqrt(Math.pow(u - 0.35, 2) + Math.pow(v - 0.3, 2)); if (sbDist < 0.45) { var intensity = Math.pow(1 - sbDist / 0.45, 2) * 210; r += intensity * 1.0; g += intensity * 0.9; b += intensity * 0.75; } } if (face === 'px' || face === 'nx' || face === 'pz' || face === 'nz') { var strip1 = Math.exp(-Math.pow((v - 0.38) / 0.08, 2)) * 140; var strip2 = Math.exp(-Math.pow((v - 0.52) / 0.05, 2)) * 90; r += strip1 * 0.95 + strip2 * 0.9; g += strip1 * 0.92 + strip2 * 0.9; b += strip1 * 1.0 + strip2 * 1.0; } if (face === 'nz' || face === 'px') { var rimDist = Math.sqrt(Math.pow(u - 0.75, 2) + Math.pow(v - 0.4, 2)); if (rimDist < 0.4) { var rimInt = Math.pow(1 - rimDist / 0.4, 2) * 130; r += rimInt * 0.3; g += rimInt * 0.8; b += rimInt * 1.0; } } data[idx] = Math.min(255, Math.round(r)); data[idx + 1] = Math.min(255, Math.round(g)); data[idx + 2] = Math.min(255, Math.round(b)); data[idx + 3] = 255; } } var tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); tex.encoding = THREE.sRGBEncoding; tex.needsUpdate = true; images.push(tex); }); var cube = new THREE.CubeTexture(); cube.images = images; cube.encoding = THREE.sRGBEncoding; cube.needsUpdate = true; return cube; } // Brushed Metal Bump Texture Generator (256x8)
  function createBrushedMetalBumpTexture(THREE) {
    var w = 256, h = 8; var data = new Uint8Array(w * h * 4);
    function noise1D(x) {
      var sinX = Math.sin(x * 12.9898) * 43758.5453; return sinX - Math.floor(sinX); } for (var y = 0; y < h; y++) { for (var x = 0; x < w; x++) { var idx = (y * w + x) * 4; var val1 = noise1D(x * 0.12); var val2 = noise1D(x * 0.6); var grain = (val1 * 0.7 + val2 * 0.3) * 255; data[idx] = Math.round(grain); data[idx + 1] = Math.round(grain); data[idx + 2] = Math.round(grain); data[idx + 3] = 255; } } var tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat); tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true; return tex; } // Paper Carton Texture Generator (256x256)
  function createPaperCartonTexture(THREE, variant) {
    var size = 256; var data = new Uint8Array(size * size * 4);
    function rand(x, y) {
      var s = Math.sin(x * 12.9898 + y * 78.233 + variant * 17.1) * 43758.5453; return s - Math.floor(s); } for (var y = 0; y < size; y++) { for (var x = 0; x < size; x++) { var idx = (y * size + x) * 4; var base = 224; var fiber = (rand(Math.floor(x / 4), Math.floor(y / 4)) - 0.5) * 14; var grain = (rand(x, y) - 0.5) * 10; var wave = Math.sin(y * 0.4) * 4; var v = Math.min(255, Math.max(0, Math.round(base + fiber + grain + wave))); data[idx] = v; data[idx + 1] = v; data[idx + 2] = v; data[idx + 3] = 255; } } var tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true; return tex; } // Barcode & QR Code Label Texture (96x60, Row 0 = Top)
  function createBarcodeQRLabelTexture(THREE) {
    var w = 96, h = 60; var data = new Uint8Array(w * h * 4); for (var y = 0; y < h; y++) { for (var x = 0; x < w; x++) { var idx = (y * w + x) * 4; var r = 245, g = 245, b = 245; if (x === 0 || x === w - 1 || y === 0 || y === h - 1) { r = 160; g = 160; b = 160; } else if (y >= 4 && y <= 10 && x >= 6 && x <= 60) { r = 50; g = 50; b = 50; } else if ((y === 14 || y === 18 || y === 22) && x >= 6 && x <= 50) { r = 70; g = 70; b = 70; } else if (y >= 28 && y <= 52 && x >= 6 && x <= 58) { if ((x * 11 + (x % 3) * 7) % 5 < 3) { r = 20; g = 20; b = 20; } } else if (x >= 66 && x <= 90 && y >= 6 && y <= 30) { if (x === 66 || x === 90 || y === 6 || y === 30 || (x >= 68 && x <= 88 && (y === 8 || y === 28)) || (y >= 8 && y <= 28 && (x === 68 || x === 88))) { r = 20; g = 20; b = 20; } else if ((x * 7 + y * 13) % 4 < 2) { r = 20; g = 20; b = 20; } } data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255; } } var tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat); tex.encoding = THREE.sRGBEncoding; tex.needsUpdate = true; return tex; } // Up-Arrow Print Texture (64x64 transparent background)
  function createUpArrowPrintTexture(THREE) {
    var size = 64; var data = new Uint8Array(size * size * 4); for (var y = 0; y < size; y++) { for (var x = 0; x < size; x++) { var idx = (y * size + x) * 4; data[idx] = 64; data[idx + 1] = 40; data[idx + 2] = 22; data[idx + 3] = 0; [18, 46].forEach(function (centerX) { var dx = Math.abs(x - centerX); if (y >= 10 && y <= 30) { var headWidth = (y - 10) * 0.65; if (dx <= headWidth && dx >= headWidth - 3) { data[idx + 3] = 220; } } if (y >= 30 && y <= 52) { if (dx <= 2.5) { data[idx + 3] = 220; } } if (y >= 54 && y <= 57 && dx <= 10) { data[idx + 3] = 220; } }); } } var tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); tex.encoding = THREE.sRGBEncoding; tex.needsUpdate = true; return tex; } // Contact Shadow Texture Generator (64x64 soft black radial spot)
  function createContactShadowTexture(THREE) {
    var size = 64; var data = new Uint8Array(size * size * 4); var center = size / 2; for (var y = 0; y < size; y++) { for (var x = 0; x < size; x++) { var idx = (y * size + x) * 4; var dx = (x - center) / center; var dy = (y - center) / center; var dist = Math.sqrt(dx * dx + dy * dy); var alpha = Math.max(0, Math.min(1, 1 - dist)); var opacity = Math.pow(alpha, 1.8) * 0.55; data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0; data[idx + 3] = Math.round(opacity * 255); } } var tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); tex.needsUpdate = true; return tex; } // Global Export & UMD Binding root.VMOSConveyor = { create: create }; // Auto Initialization
  function autoInit() {
    if (typeof document === 'undefined') return; var heroEl = document.querySelector('.hero-video'); if (!heroEl) return; var robotImg = heroEl.querySelector('.hero-robot-img');
    function mark(state, err) {
      try { heroEl.setAttribute('data-conveyor', state); } catch (e) {} if (state !== 'on') { console.warn('[VMOS conveyor] ' + state, err || ''); } } if (typeof root.THREE === 'undefined') { mark('failed:three_min.js-chua-nap', new Error('THREE is undefined')); return; } if (!root.WebGLRenderingContext) { mark('failed:trinh-duyet-khong-ho-tro-webgl', new Error('WebGLRenderingContext not supported')); return; } var app = null; var canvas = null; var lastErr = null; var tries = [true, false]; for (var attempt = 0; attempt < tries.length; attempt++) { if (canvas && canvas.parentNode) { canvas.parentNode.removeChild(canvas); } canvas = document.createElement('canvas'); canvas.className = 'rx-conveyor-canvas'; canvas.setAttribute('aria-hidden', 'true'); canvas.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; display:block; z-index:0; pointer-events:none;'; heroEl.insertBefore(canvas, heroEl.firstChild); try {
        app = create(root.THREE, canvas, { antialias: tries[attempt] });
        if (app) break;
      } catch (e) {
        lastErr = e;
        app = null;
      }
    }
    if (!app) {
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      mark('failed:khong-tao-duoc-webgl', lastErr);
      return;
    }
    var isFailed = false;
    var animationFrameId = null;
    var renderCount = 0;
    function fail(reason, err) {
      if (isFailed) return;
      isFailed = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      heroEl.classList.remove('is-conveyor');
      if (robotImg) robotImg.style.display = '';
      try {
        if (app && typeof app.dispose === 'function') app.dispose();
      } catch (e) {}
      mark('failed:' + reason, err);
    }
    function safeRender(t) {
      if (isFailed) return false;
      try {
        app.render(t);
        renderCount++;
        if (renderCount <= 5) {
          if (typeof app.hasShaderError === 'function' && app.hasShaderError()) {
            fail('shader-khong-bien-dich-duoc', new Error('Shader compilation error detected'));
            return false;
          }
        }
        return true;
      } catch (e) {
        fail('loi-khi-ve', e);
        return false;
      }
    }
    heroEl.classList.add('is-conveyor');
    if (robotImg) robotImg.style.display = 'none';
    mark('on');
    function updateBounds() {
      if (isFailed) return;
      var rect = heroEl.getBoundingClientRect();
      if (rect.width && rect.height) {
        try {
          app.resize(rect.width, rect.height);
        } catch (e) {
          fail('loi-khi-ve', e);
        }
      }
    }
    updateBounds();
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function () {
        updateBounds();
      });
      ro.observe(heroEl);
    } else {
      window.addEventListener('resize', updateBounds);
    }
    var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      safeRender(2.4);
      return;
    }
    var isVisible = true;
    var isTabActive = true;
    if (typeof IntersectionObserver !== 'undefined') {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting;
          if (isVisible && isTabActive && !animationFrameId && !isFailed) {
            loop();
          }
        }); }, { threshold: 0.05 }); io.observe(heroEl); } document.addEventListener('visibilitychange', function () { isTabActive = !document.hidden; if (isVisible && isTabActive && !animationFrameId && !isFailed) { loop(); } }); canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; } }); canvas.addEventListener('webglcontextrestored', function () { if (isFailed) return; updateBounds(); if (isVisible && isTabActive && !animationFrameId) { loop(); } });
    function loop() {
      if (!isVisible || !isTabActive || isFailed) { animationFrameId = null; return; } var t = performance.now() / 1000; var ok = safeRender(t); if (ok) { animationFrameId = requestAnimationFrame(loop); } else { animationFrameId = null; } } loop(); } if (typeof document !== 'undefined') { if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', autoInit); } else { autoInit(); } } })(typeof self !== 'undefined' ? self : this);