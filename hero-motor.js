/* ==========================================================================
   VMOS WEBSITE - 3D EXPLODED MOTOR INTERACTIVE MODULE
   ========================================================================== */
(function () {
  'use strict';

  const PART_DATA = {
    cover: {
      num: "01",
      vi: { name: "Nắp trước", desc: "Nắp định vị vòng bi & chắn bụi phía trước" },
      en: { name: "Front end-cap", desc: "Bearing housing & front dust shield" },
      ja: { name: "フロントカバー", desc: "ベアリングハウジング＆フロント防塵カバー" }
    },
    shaft: {
      num: "02",
      vi: { name: "Trục truyền động", desc: "Trục thép hợp kim truyền mô-men xoắn" },
      en: { name: "Drive shaft", desc: "Alloy steel shaft for torque transmission" },
      ja: { name: "駆動シャフト", desc: "トルク伝達用合金鋼シャフト" }
    },
    rotor: {
      num: "03",
      vi: { name: "Rotor nam châm", desc: "Rotor nam châm vĩnh cửu mật độ từ cao" },
      en: { name: "Magnet rotor", desc: "High flux density permanent magnet rotor" },
      ja: { name: "磁石ロータ", desc: "高磁束密度永久磁石ロータ" }
    },
    stator: {
      num: "04",
      vi: { name: "Stator lõi thép ghép lớp", desc: "Lõi thép kỹ thuật điện ghép lớp giảm tổn hao" },
      en: { name: "Laminated stator", desc: "Laminated electrical steel core minimizing losses" },
      ja: { name: "積層ステータ", desc: "損失を低減する電磁鋼板積層コア" }
    },
    housing: {
      num: "05",
      vi: { name: "Vỏ động cơ", desc: "Vỏ nhôm tản nhiệt gia công CNC chính xác" },
      en: { name: "Motor housing", desc: "Precision CNC machined aluminum heat-sink body" },
      ja: { name: "モーターハウジング", desc: "精密CNC加工アルミ放熱ボディ" }
    }
  };

  let activePartKey = null;
  let hasInteracted = false;

  function initMotorHero() {
    const motorContainer = document.getElementById('rx-motor');
    if (!motorContainer) return;

    const glowLayers = motorContainer.querySelectorAll('.rx-glow');
    const hitLayers = motorContainer.querySelectorAll('.rx-hit');
    const hintElement = document.getElementById('rx-hero-hint');

    let tooltip = document.getElementById('rx-motor-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'rx-motor-tooltip';
      tooltip.className = 'rx-motor-tooltip';
      document.body.appendChild(tooltip);
    }

    function getLang() {
      const l = window.currentLang;
      return (l && PART_DATA.housing[l]) ? l : 'vi';
    }

    function renderTooltipContent(partKey) {
      const data = PART_DATA[partKey];
      if (!data) return;
      const lang = getLang();
      const content = data[lang] || data.vi;
      tooltip.innerHTML = `
        <div class="rx-tt-head">
          <span class="rx-tt-num">${data.num}</span>
          <span class="rx-tt-name">${content.name}</span>
        </div>
        <div class="rx-tt-desc">${content.desc}</div>
      `;
    }

    function updateTooltipPos(e) {
      if (!tooltip.classList.contains('is-visible')) return;
      const x = e.clientX;
      const y = e.clientY;
      const ttWidth = tooltip.offsetWidth || 240;
      const ttHeight = tooltip.offsetHeight || 80;
      const pad = 16;

      let posX = x + pad;
      let posY = y + pad;

      if (posX + ttWidth > window.innerWidth - pad) {
        posX = x - ttWidth - pad;
      }
      if (posY + ttHeight > window.innerHeight - pad) {
        posY = y - ttHeight - pad;
      }

      tooltip.style.left = `${Math.max(pad, posX)}px`;
      tooltip.style.top = `${Math.max(pad, posY)}px`;
    }

    function activatePart(partKey, evt) {
      activePartKey = partKey;
      motorContainer.classList.add('has-hover');

      glowLayers.forEach(el => {
        if (el.getAttribute('data-part') === partKey) {
          el.classList.add('is-on');
        } else {
          el.classList.remove('is-on');
        }
      });

      renderTooltipContent(partKey);
      tooltip.classList.add('is-visible');

      if (evt && (evt.clientX !== undefined || evt.touches)) {
        const coords = evt.touches ? evt.touches[0] : evt;
        updateTooltipPos(coords);
      }

      if (!hasInteracted && hintElement) {
        hasInteracted = true;
        hintElement.classList.add('is-faded');
      }
    }

    function deactivatePart() {
      activePartKey = null;
      motorContainer.classList.remove('has-hover');
      glowLayers.forEach(el => el.classList.remove('is-on'));
      tooltip.classList.remove('is-visible');
    }

    hitLayers.forEach(hit => {
      const partKey = hit.getAttribute('data-part');

      hit.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen' || !e.pointerType) {
          activatePart(partKey, e);
        }
      });

      hit.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen' || !e.pointerType) {
          updateTooltipPos(e);
        }
      });

      hit.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen' || !e.pointerType) {
          deactivatePart();
        }
      });

      hit.addEventListener('focus', () => {
        const rect = hit.getBoundingClientRect();
        activatePart(partKey, { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
      });

      hit.addEventListener('blur', () => {
        deactivatePart();
      });

      hit.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') {
          e.stopPropagation();
          if (activePartKey === partKey) {
            deactivatePart();
          } else {
            activatePart(partKey, e);
          }
        }
      });
    });

    document.addEventListener('pointerdown', (e) => {
      if (activePartKey && !motorContainer.contains(e.target) && !tooltip.contains(e.target)) {
        deactivatePart();
      }
    });

    window.updateMotorLanguage = function () {
      if (activePartKey) {
        renderTooltipContent(activePartKey);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotorHero);
  } else {
    initMotorHero();
  }

  // Wrap window.setLanguage
  const origSetLang = window.setLanguage;
  if (typeof origSetLang === 'function') {
    window.setLanguage = function (lang) {
      origSetLang(lang);
      if (typeof window.updateMotorLanguage === 'function') {
        window.updateMotorLanguage();
      }
    };
  }
})();
