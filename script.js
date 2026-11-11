/* Chuyển giao diện mặc định sang bản sáng "nhà máy" một lần duy nhất */
(function () {
  try {
    if (localStorage.getItem('theme-factory-v1')) return;
    localStorage.setItem('theme-factory-v1', '1');
    localStorage.setItem('theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.backgroundColor = '#f8fafc';
  } catch (e) { }
})();

/* ==========================================================================
   WEBSITE CÔNG TY - INTERACTIVE JAVASCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initThemeToggle();
  initHeroSlider();
  initAboutCardStack();
  initServiceAccordion();
  initStatsCounter();
  initPortfolioTabs();
  initContactForm();
  initTerminalStagger();
  initScrollReveal();
  initClientsMarquee();
  initDragScroll('.team-slider-track');
  initDragScroll('.service-detail-intro-scroll');
  initTeamDragSlider();
  initServiceLightbox();
});

/* --- NAVBAR STICKY & UNIFIED SIDEBAR NAVIGATION --- */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sideMenu = document.getElementById('side-menu');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sideMenuClose = document.querySelector('.side-menu-close');
  const groupToggle = document.querySelector('.side-menu-group-toggle');

  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  if (!sidebarToggle || !sideMenu) return;

  function openSidebar() {
    sideMenu.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('open');
    sidebarToggle.classList.add('open');
    sidebarToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('sidebar-open');

    // Focus close button or first focusable element inside sidebar
    const firstFocusable = sideMenu.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeSidebar() {
    sideMenu.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
    sidebarToggle.classList.remove('open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-open');

    // Return focus to toggle button
    if (sidebarToggle) sidebarToggle.focus();
  }

  sidebarToggle.addEventListener('click', () => {
    if (sideMenu.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  if (sideMenuClose) {
    sideMenuClose.addEventListener('click', closeSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  // Escape key listener & Focus Trap
  document.addEventListener('keydown', (e) => {
    if (!sideMenu.classList.contains('open')) return;

    if (e.key === 'Escape') {
      closeSidebar();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = sideMenu.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Accordion toggle for "Dịch vụ"
  if (groupToggle) {
    groupToggle.addEventListener('click', (e) => {
      e.preventDefault();
      groupToggle.classList.toggle('open');
      groupToggle.setAttribute('aria-expanded', groupToggle.classList.contains('open') ? 'true' : 'false');
    });
  }

  // Close sidebar on clicking navigation links (except group toggle)
  const navLinks = sideMenu.querySelectorAll('.side-menu-link:not(.side-menu-group-toggle), .side-menu-submenu a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeSidebar();
    });
  });
}

/* --- THEME TOGGLE (DARK / LIGHT) --- */
function initThemeToggle() {
  const themeBtn = document.getElementById('theme-toggle');
  if (!themeBtn) return;

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcon(themeBtn, currentTheme);

  themeBtn.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    try { localStorage.setItem('theme', newTheme); } catch (e) { /* trình duyệt chặn lưu trữ */ }
    updateThemeIcon(themeBtn, newTheme);
    const toastMsg = newTheme === 'dark'
      ? (window.t ? window.t('toast.theme_dark') : 'Đã chuyển sang giao diện Tối')
      : (window.t ? window.t('toast.theme_light') : 'Đã chuyển sang giao diện Sáng');
    showToast(toastMsg);
  });
}

function updateThemeIcon(btn, theme) {
  btn.innerHTML = theme === 'dark'
    ? '<i class="bi bi-sun-fill" style="color: #f59e0b;"></i>'
    : '<i class="bi bi-moon-stars-fill" style="color: #6366f1;"></i>';
}

/* --- STATS COUNTER ANIMATION --- */
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-item h3');
  if (!statNumbers.length) return;

  let started = false;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !started) {
        started = true;
        statNumbers.forEach(counter => {
          const targetText = counter.innerText.trim();
          if (targetText.includes('/')) return; // Giữ nguyên 24/7

          const target = parseFloat(targetText.replace(/[^0-9.]/g, ''));
          if (isNaN(target)) return;

          const suffix = targetText.replace(/[0-9.]/g, '');
          let count = 0;
          const duration = 2000;
          const stepTime = 30;
          const increment = target / (duration / stepTime);

          const timer = setInterval(() => {
            count += increment;
            if (count >= target) {
              counter.innerText = target + suffix;
              clearInterval(timer);
            } else {
              counter.innerText = (target % 1 === 0 ? Math.floor(count) : count.toFixed(1)) + suffix;
            }
          }, stepTime);
        });
      }
    });
  }, { threshold: 0.5 });

  const statsSection = document.querySelector('.hero-stats, .rx-stats');
  if (statsSection) observer.observe(statsSection);
}

/* --- PORTFOLIO FILTER TABS --- */
function initPortfolioTabs() {
  const tabs = document.querySelectorAll('.portfolio-tabs .tab-btn');
  const items = document.querySelectorAll('.portfolio-grid .project-card');

  if (!tabs.length || !items.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      items.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = 'block';
          item.style.animation = 'fadeInUp 0.4s ease forwards';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* --- CONTACT FORM: GỬI THẬT QUA ENDPOINT (data-endpoint trên thẻ <form>) --- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!name || !email) {
      const msg = window.t ? window.t('toast.contact_invalid') : 'Vui lòng điền đầy đủ các thông tin bắt buộc (*).';
      showToast('⚠️ ' + msg, 'warning');
      return;
    }

    // Ô bẫy chống spam: người thật không thấy nên không điền; bot điền thì bỏ qua êm
    const trap = form.querySelector('[name="botcheck"]');
    if (trap && trap.checked) return;

    const endpoint = (form.dataset.endpoint || '').trim();
    if (!endpoint) {
      console.error('Contact form: chưa cấu hình data-endpoint trên <form id="contact-form">.');
      showToast('⚠️ ' + (window.t ? window.t('toast.contact_error') : 'Gửi thất bại. Vui lòng gọi hotline hoặc email cho chúng tôi.'), 'warning');
      return;
    }

    // Chưa thay Access Key thật (lấy tại web3forms.com) -> báo lỗi rõ ràng thay vì gửi yêu cầu chắc chắn thất bại
    const keyInput = form.querySelector('[name="access_key"]');
    if (keyInput && (!keyInput.value || keyInput.value === 'DAN_ACCESS_KEY_CUA_BAN')) {
      console.error('Contact form: chưa thay Access Key trong <input name="access_key"> (contact.html).');
      showToast('⚠️ ' + (window.t ? window.t('toast.contact_error') : 'Gửi thất bại. Vui lòng gọi hotline hoặc email cho chúng tôi.'), 'warning');
      return;
    }

    const originalText = submitBtn.innerHTML;
    const submittingText = window.t ? window.t('toast.contact_submitting') : 'Đang gửi...';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> ' + submittingText;

    const payload = {
      name: name,
      email: email,
      phone: (form.querySelector('[name="phone"]').value || '').trim(),
      message: (form.querySelector('[name="message"]').value || '').trim(),
      page: location.href
    };
    // Các ô ẩn cấu hình sẵn trong form (access_key, subject, from_name...) được gửi kèm
    form.querySelectorAll('input[type="hidden"]').forEach((h) => { payload[h.name] = h.value; });
    // Để khi bấm "Reply" trong hộp thư, mail trả lời thẳng về khách
    payload._replyto = email;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = null;
      try { data = await res.json(); } catch (_) { /* một số dịch vụ trả về không phải JSON */ }
      if (!res.ok || (data && data.success === false)) throw new Error('HTTP ' + res.status);

      form.reset();
      const successMsg = window.t ? window.t('toast.contact_success') : 'Cảm ơn bạn! Chúng tôi đã nhận được thông tin và sẽ liên hệ lại sớm nhất.';
      showToast('🎉 ' + successMsg);
    } catch (err) {
      console.error('Contact form error:', err);
      const errMsg = window.t ? window.t('toast.contact_error') : 'Gửi thất bại. Vui lòng thử lại hoặc gọi hotline.';
      showToast('⚠️ ' + errMsg, 'warning');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

/* --- TERMINAL STAGGER ANIMATION --- */
function initTerminalStagger() {
  const lines = document.querySelectorAll('.terminal-body .line');
  lines.forEach((line, index) => {
    line.style.opacity = '0';
    line.style.transform = 'translateY(10px)';
    line.style.transition = `all 0.4s ease ${index * 0.3}s`;

    setTimeout(() => {
      line.style.opacity = '1';
      line.style.transform = 'translateY(0)';
    }, 300);
  });
}

/* --- TOAST UTILITY --- */
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  const toastText = document.createElement('span');
  toastText.textContent = message;
  toast.appendChild(toastText);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initHeroSlider() {
  const slider = document.getElementById('hero-slider');
  if (!slider) return;

  const slides = slider.querySelectorAll('.hero-slide');
  const texts = slider.querySelectorAll('.hero-text');
  const dots = slider.querySelectorAll('.hero-slider-dots .dot');
  const total = slides.length;
  let current = 0;
  let timer = null;
  const INTERVAL = 8000;

  texts.forEach((t, i) => t.classList.toggle('active', i === 0));

  function goTo(index) {
    slides[current].classList.remove('active');
    texts[current].classList.remove('active');
    dots[current].classList.remove('active');

    const oldBg = slides[current].querySelector('.hero-slide-bg');
    if (oldBg) {
      const clone = oldBg.cloneNode(true);
      oldBg.parentNode.replaceChild(clone, oldBg);
    }

    current = index;

    const newBg = slides[current].querySelector('.hero-slide-bg');
    if (newBg) {
      const clone = newBg.cloneNode(true);
      newBg.parentNode.replaceChild(clone, newBg);
    }

    slides[current].classList.add('active');
    texts[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() {
    goTo((current + 1) % total);
  }

  function startAutoplay() {
    clearInterval(timer);
    timer = setInterval(next, INTERVAL);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (i === current) return;
      goTo(i);
      startAutoplay();
    });
  });

  startAutoplay();
}

function initServiceAccordion() {
  const items = document.querySelectorAll('.service-accordion-item');
  items.forEach(item => {
    const header = item.querySelector('.service-accordion-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      items.forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

/* --- SCROLL REVEAL OBSERVER --- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal, .reveal-scale');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* --- ABOUT PAGE DIAGONAL CARD STACK --- */
function initAboutCardStack() {
  const container = document.getElementById('about-card-stack');
  if (!container) return;

  const items = container.querySelectorAll('.about-card-item');
  const prevBtn = container.querySelector('.prev-btn');
  const nextBtn = container.querySelector('.next-btn');
  const total = items.length;

  if (total < 2) return;

  let current = 0;
  let timer = null;
  let pauseTimer = null;
  let isAnimating = false;
  const AUTOPLAY_INTERVAL = 5000;

  function renderStack() {
    items.forEach((item) => {
      item.classList.remove('card-active', 'card-next', 'card-prev', 'card-exit-next', 'card-exit-prev');
    });

    const activeIdx = current;
    const nextIdx = (current + 1) % total;
    const prevIdx = (current + 2) % total; // For 3 items: (0+2)%3 = 2, (1+2)%3 = 0, (2+2)%3 = 1

    items[activeIdx].classList.add('card-active');
    items[nextIdx].classList.add('card-next');
    items[prevIdx].classList.add('card-prev');
  }

  function next() {
    if (isAnimating) return;
    isAnimating = true;

    const oldActive = items[current];
    oldActive.classList.add('card-exit-next');

    current = (current + 1) % total;

    setTimeout(() => {
      renderStack();
      isAnimating = false;
    }, 150);
  }

  function prev() {
    if (isAnimating) return;
    isAnimating = true;

    const oldActive = items[current];
    oldActive.classList.add('card-exit-prev');

    current = (current - 1 + total) % total;

    setTimeout(() => {
      renderStack();
      isAnimating = false;
    }, 150);
  }

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(next, AUTOPLAY_INTERVAL);
  }

  function stopAutoplay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  }

  function handleManualClick(action) {
    stopAutoplay();
    action();
    pauseTimer = setTimeout(startAutoplay, 4000);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => handleManualClick(next));
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => handleManualClick(prev));
  }

  renderStack();
  startAutoplay();
}

/* --- CLIENTS MARQUEE STEP-AND-PAUSE MECHANISM --- */
function initClientsMarquee() {
  const wrapper = document.querySelector('.clients-marquee-wrapper');
  const track = document.querySelector('.clients-marquee-track');
  if (!wrapper || !track) return;

  const originalBoxes = track.querySelectorAll('.client-logo-box:not([aria-hidden="true"])');
  const totalOriginal = originalBoxes.length || 10;

  let currentIndex = 0;
  let timer = null;
  let isHovered = false;
  let isTransitioning = false;
  const PAUSE_DURATION = 1500; // 1.5 giây dừng giữa các bước

  // Kiểm tra prefers-reduced-motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isReducedMotion = mediaQuery.matches;

  function getStepWidth() {
    const firstBox = track.querySelector('.client-logo-box');
    if (!firstBox) return 0;
    const boxWidth = firstBox.getBoundingClientRect().width;
    const computedStyle = window.getComputedStyle(track);
    const gap = parseFloat(computedStyle.gap || computedStyle.columnGap || 0) || 0;
    return boxWidth + gap;
  }

  function applyTransform(index, useTransition = true) {
    if (useTransition) {
      track.style.transition = 'transform 0.9s cubic-bezier(0.65, 0, 0.35, 1)';
    } else {
      track.style.transition = 'none';
    }
    const stepWidth = getStepWidth();
    track.style.transform = `translateX(-${index * stepWidth}px)`;
  }

  function scheduleNextStep() {
    clearTimeout(timer);
    if (isHovered || isReducedMotion || wrapper.matches(':hover')) return;

    timer = setTimeout(() => {
      if (isHovered || isReducedMotion || isTransitioning || wrapper.matches(':hover')) return;
      isTransitioning = true;
      currentIndex++;
      applyTransform(currentIndex, true);
    }, PAUSE_DURATION);
  }

  // Xử lý khi hoàn thành transition nhích 1 bước
  track.addEventListener('transitionend', (e) => {
    if (e.target !== track || e.propertyName !== 'transform') return;
    isTransitioning = false;

    if (currentIndex >= totalOriginal) {
      // Khi đã đi hết 10 logo gốc (đến vị trí tương đương logo nhân đôi 1),
      // nhảy về vị trí 0 không dùng transition (nhảy êm không giật)
      currentIndex = 0;
      applyTransform(0, false);
      // Force reflow để browser nhận ngay lập tức vị trí 0
      void track.offsetHeight;
    }

    scheduleNextStep();
  });

  // Tạm dừng/tiếp tục khi di chuột hoặc chạm màn hình
  function handlePause() {
    isHovered = true;
    clearTimeout(timer);
  }

  function handleResume() {
    isHovered = false;
    if (!isTransitioning && !wrapper.matches(':hover')) {
      scheduleNextStep();
    }
  }

  wrapper.addEventListener('mouseenter', handlePause);
  wrapper.addEventListener('mouseleave', handleResume);
  wrapper.addEventListener('touchstart', handlePause, { passive: true });
  wrapper.addEventListener('touchend', handleResume, { passive: true });

  // Lắng nghe thay đổi prefers-reduced-motion theo thời gian thực
  function handleMotionPreference(e) {
    isReducedMotion = e.matches;
    clearTimeout(timer);
    if (isReducedMotion) {
      currentIndex = 0;
      applyTransform(0, false);
    } else {
      scheduleNextStep();
    }
  }

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleMotionPreference);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleMotionPreference);
  }

  // Cập nhật vị trí khi thay đổi kích thước màn hình
  window.addEventListener('resize', () => {
    applyTransform(currentIndex, false);
  });

  // Bắt đầu chu trình nếu không bật giảm chuyển động
  if (!isReducedMotion) {
    scheduleNextStep();
  }
}

/* --- REUSABLE DRAG TO SCROLL ENGINE (đã sửa lỗi rung ở dải ảnh Thiết Kế Cơ Khí) ---
   Thay NGUYÊN hàm initDragScroll cũ trong script.js bằng hàm này.

   Nguyên nhân lỗi cũ:
   - Hàm cũ coi "độ dài một vòng" W = scrollWidth / 2 (lệch ~6px so với thực tế vì còn padding-right).
   - Khi scrollLeft <= 1 thì cộng W, khi scrollLeft >= W - 1 thì trừ W. Hai ngưỡng này chồng nhau:
     0 + W = W (>= W - 1) -> trừ W về 0 (<= 1) -> cộng W ... lặp vô hạn mỗi khung hình => ảnh rung.
   Cách sửa:
   - Đo độ dài một vòng thật (khoảng cách thẻ gốc đầu tiên tới thẻ clone đầu tiên).
   - Đặt vị trí bắt đầu ở giữa dải và chỉ "bẻ vòng" khi ra khỏi vùng đệm [0.25P, 1.25P],
     nên hai ngưỡng không bao giờ chạm nhau.
*/
function initDragScroll(selector, options = {}) {
  const tracks = document.querySelectorAll(selector);
  if (!tracks.length) return;

  const isLoop = typeof options === 'boolean'
    ? options
    : (options.loop || (typeof selector === 'string' && selector.includes('service-detail-intro-scroll')));

  tracks.forEach(track => {
    let originals = null;

    if (isLoop && !track.dataset.cloned) {
      originals = Array.from(track.children);
      const revealClasses = ['reveal', 'reveal-scale', 'reveal-left', 'reveal-right', 'reveal-card'];

      const sanitizeNode = (node) => {
        if (node.classList) {
          revealClasses.forEach(cls => node.classList.remove(cls));
          node.classList.add('visible');
        }
        if (node.style) {
          node.style.opacity = '1';
          node.style.transform = 'none';
          node.style.visibility = 'visible';
        }
      };

      originals.forEach(child => {
        const clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.dataset.loopClone = 'true';
        clone.querySelectorAll('a, button, input, select, textarea').forEach(el => el.setAttribute('tabindex', '-1'));
        sanitizeNode(clone);
        clone.querySelectorAll('*').forEach(sanitizeNode);
        track.appendChild(clone);
      });
      track.dataset.cloned = 'true';
    }

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDragged = false;
    let isAdjustingLoop = false;

    /* Độ dài chính xác của một vòng (px): thẻ clone đầu tiên cách thẻ gốc đầu tiên bao xa. */
    function getPeriod() {
      const first = track.querySelector(':scope > :not([data-loop-clone])');
      const firstClone = track.querySelector(':scope > [data-loop-clone]');
      if (!first || !firstClone) return 0;
      return firstClone.getBoundingClientRect().left - first.getBoundingClientRect().left;
    }

    function jumpBy(delta) {
      const prev = track.style.scrollBehavior;
      track.style.scrollBehavior = 'auto'; // tắt smooth để nhảy tức thời, không thấy giật
      track.scrollLeft += delta;
      track.style.scrollBehavior = prev;
      if (isDown) scrollLeft += delta;
    }

    function checkLoop() {
      if (!isLoop || isAdjustingLoop) return;
      const P = getPeriod();
      if (!P || P < 50) return; // chưa có bố cục (trang vừa nạp / thẻ đang ẩn)

      const lower = P * 0.25;
      const upper = P * 1.25;

      if (track.scrollLeft >= upper) {
        isAdjustingLoop = true;
        jumpBy(-P);
        requestAnimationFrame(() => { isAdjustingLoop = false; });
      } else if (track.scrollLeft < lower) {
        isAdjustingLoop = true;
        jumpBy(P);
        requestAnimationFrame(() => { isAdjustingLoop = false; });
      }
    }

    /* Đặt vị trí bắt đầu ở giữa dải (đúng một vòng) để có chỗ kéo cả hai hướng. */
    function centerTrack() {
      if (!isLoop) return;
      const P = getPeriod();
      if (!P || P < 50) return;
      const prev = track.style.scrollBehavior;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = P;
      track.style.scrollBehavior = prev;
    }

    if (isLoop) {
      centerTrack();
      // Bố cục có thể chưa xong lúc script chạy (font, ảnh, quay lại bằng nút Back) -> căn lại.
      window.addEventListener('load', () => { if (!isDown) centerTrack(); }, { once: true });
      window.addEventListener('pageshow', (e) => { if (e.persisted && !isDown) centerTrack(); });
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (!isDown) checkLoop(); }, 150);
      });
    }

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      hasDragged = false;
      track.classList.add('dragging');
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });

    track.addEventListener('mouseleave', () => {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('dragging');
      checkLoop();
    });

    track.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('dragging');
      checkLoop();
    });

    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) hasDragged = true;
      track.scrollLeft = scrollLeft - walk;
      checkLoop();
    });

    track.addEventListener('scroll', () => {
      if (!isDown) checkLoop();
    }, { passive: true });

    track.addEventListener('click', (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
}

/* --- TEAM MEMBER DRAG SLIDER NAV BUTTONS --- */
function initTeamDragSlider() {
  const prevBtn = document.querySelector('.team-slider-nav .prev-btn');
  const nextBtn = document.querySelector('.team-slider-nav .next-btn');
  const track = document.querySelector('.team-slider-track');

  if (track && prevBtn) {
    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -295, behavior: 'smooth' });
    });
  }

  if (track && nextBtn) {
    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: 295, behavior: 'smooth' });
    });
  }
}

/* --- SERVICE GALLERY LIGHTBOX MODAL --- */
function initServiceLightbox() {
  const modal = document.getElementById('service-lightbox');
  if (!modal) return;

  const lightboxImg = modal.querySelector('.service-lightbox-img');
  const closeBtn = modal.querySelector('.service-lightbox-close');
  const items = document.querySelectorAll('.service-detail-gallery-item');
  let previousActiveElement = null;

  function openLightbox(imgSrc, altText) {
    if (!lightboxImg) return;
    previousActiveElement = document.activeElement;
    lightboxImg.src = imgSrc;
    lightboxImg.alt = altText || 'Ảnh phóng to';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 50);
    }
  }

  function closeLightbox() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  }

  items.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('.service-detail-gallery-img');
      if (img) {
        openLightbox(img.src, img.alt);
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('service-lightbox-container')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeLightbox();
    }
  });
}

/* Căn đều hai bên các đoạn văn (toàn trang): gắn lớp .fx-justify cho đoạn đủ rộng & đủ dài */
(function () {
  'use strict';
  var EXCLUDE = 'header, nav, footer, button, a.btn, .vh-hero, .hero, .side-menu, .floating-contact-widget, .lang-menu, .nav-dropdown-menu, .toast, [data-no-justify]';
  var timer = null;

  function applyJustify() {
    var list = document.querySelectorAll('p, .intro-text');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      el.classList.remove('fx-justify');
      if (el.closest(EXCLUDE)) continue;
      var align = window.getComputedStyle(el).textAlign;
      if (align === 'center' || align === 'right' || align === 'end') continue;
      if (el.clientWidth < 300) continue;
      if ((el.textContent || '').trim().length < 60) continue;
      el.classList.add('fx-justify');
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(applyJustify, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyJustify);
  else applyJustify();
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  document.addEventListener('languagechange', schedule);
  var origSet = window.setLanguage;
  if (typeof origSet === 'function' && !origSet.__fxWrapped) {
    var wrapped = function () { var r = origSet.apply(this, arguments); schedule(); return r; };
    wrapped.__fxWrapped = true;
    window.setLanguage = wrapped;
  } else {
    window.addEventListener('load', function () {
      var o = window.setLanguage;
      if (typeof o === 'function' && !o.__fxWrapped) {
        var w = function () { var r = o.apply(this, arguments); schedule(); return r; };
        w.__fxWrapped = true;
        window.setLanguage = w;
      }
    });
  }
})();