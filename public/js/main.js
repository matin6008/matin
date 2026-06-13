'use strict';

/* Shared header/footer, injected on every page so the markup lives in one place. */

function renderChrome() {
  const page = document.body.dataset.page || '';

  document.body.insertAdjacentHTML('afterbegin', `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="/">
          <img src="/assets/logo-light.svg" alt="Mohtasham Carpets" class="brand-logo">
        </a>
        <nav class="site-nav" id="site-nav">
          <a href="/" data-i18n="nav.home" class="${page === 'home' ? 'active' : ''}"></a>
          <a href="/collection.html" data-i18n="nav.collection" class="${page === 'collection' ? 'active' : ''}"></a>
          <a href="/about.html" data-i18n="nav.about" class="${page === 'about' ? 'active' : ''}"></a>
          <a href="/contact.html" data-i18n="nav.contact" class="${page === 'contact' ? 'active' : ''}"></a>
          <button class="lang-btn" id="lang-btn" data-i18n="nav.lang" type="button"></button>
        </nav>
        <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`);

  document.body.insertAdjacentHTML('beforeend', `
    <footer class="site-footer">
      <div class="lattice-divider" aria-hidden="true"></div>
      <div class="container footer-inner">
        <div class="footer-brand">
          <img src="/assets/logo-light.svg" alt="Mohtasham Carpets">
          <p data-i18n="footer.tagline"></p>
        </div>
        <div class="footer-col">
          <h4 data-i18n="footer.links"></h4>
          <a href="/" data-i18n="nav.home"></a>
          <a href="/collection.html" data-i18n="nav.collection"></a>
          <a href="/about.html" data-i18n="nav.about"></a>
          <a href="/contact.html" data-i18n="nav.contact"></a>
        </div>
        <div class="footer-col">
          <h4 data-i18n="footer.contact"></h4>
          <a href="tel:+983155999000" dir="ltr">+98 31 5599 9000</a>
          <a href="mailto:info@mohtashamcarpet.com" dir="ltr">info@mohtashamcarpet.com</a>
          <span data-i18n="contact.info.address"></span>
        </div>
      </div>
      <div class="container footer-bottom">
        <span data-i18n="footer.rights"></span>
      </div>
    </footer>`);

  document.getElementById('lang-btn').addEventListener('click', toggleLang);
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.classList.toggle('open');
  });
}

/* Reveal-on-scroll */
function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

function productCard(p) {
  return `
    <a class="card reveal" href="/product.html?id=${p.id}">
      <div class="card-img"><img src="${p.image}" alt="${lf(p, 'name')}" loading="lazy"></div>
      <div class="card-body">
        <h3>${lf(p, 'name')}</h3>
        <p class="card-meta">${lf(p, 'collection')}${lf(p, 'spec') ? ' · ' + lf(p, 'spec') : ''}</p>
        <span class="card-link" data-i18n="collection.view">${t('collection.view')}</span>
      </div>
    </a>`;
}

async function api(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw Object.assign(new Error('api error'), { status: res.status, body: await res.json().catch(() => ({})) });
  return res.json();
}

/* ————— container-scroll reveal (after Aceternity container-scroll-animation) —————
   For each .scroll-stage we measure how far it has travelled through the viewport
   (progress 0→1) and apply the same transforms the React/Framer version uses:
   card rotateX 20deg→0 + scale, title translateY 0→-100px + fade-in. */
function initScrollStages() {
  const stages = [...document.querySelectorAll('.scroll-stage')];
  if (!stages.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const isMobile = () => innerWidth < 760;
  const lerp = (a, b, t) => a + (b - a) * t;
  let ticking = false;

  const update = () => {
    ticking = false;
    for (const stage of stages) {
      const card = stage.querySelector('.scroll-card');
      const title = stage.querySelector('.scroll-title');
      if (!card) continue;
      const rect = stage.getBoundingClientRect();
      // progress: 0 when the stage top reaches viewport bottom, 1 once scrolled one viewport past
      const total = rect.height - innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / (total || 1)));
      const startScale = isMobile() ? 0.8 : 1.05;
      const rotate = lerp(20, 0, p);
      const scale = lerp(startScale, 1, p);
      card.style.transform = `rotateX(${rotate}deg) scale(${scale})`;
      if (title) {
        title.style.transform = `translateY(${lerp(0, -100, p)}px)`;
        title.style.opacity = String(lerp(0.4, 1, Math.min(1, p * 2)));
      }
    }
  };

  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
}

/* ————— interactive Spline scene (after serafim/splite) —————
   Loads Spline's official web-component runtime only when the section nears the
   viewport, then drops in <spline-viewer> so the page stays fast for everyone else. */
function initSpline() {
  const stage = document.querySelector('.spline-stage[data-scene]');
  if (!stage) return;
  const io = new IntersectionObserver((entries, obs) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    obs.disconnect();
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@splinetool/viewer@1.9.48/build/spline-viewer.js';
    document.head.appendChild(s);
    const viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', stage.dataset.scene);
    const clearNote = () => { const n = stage.querySelector('.spline-loading'); if (n) n.remove(); };
    viewer.addEventListener('load', clearNote);
    stage.appendChild(viewer);
    // fallback: drop the loading label once the canvas has actually appeared
    let tries = 0;
    const poll = setInterval(() => {
      if ((viewer.shadowRoot && viewer.shadowRoot.querySelector('canvas')) || ++tries > 40) {
        clearNote();
        clearInterval(poll);
      }
    }, 250);
  }, { rootMargin: '200px' });
  io.observe(stage);
}

document.addEventListener('DOMContentLoaded', () => {
  renderChrome();
  applyI18n();
  initReveal();
  initScrollStages();
  initSpline();
  document.dispatchEvent(new CustomEvent('chrome-ready'));
});
