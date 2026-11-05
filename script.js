'use strict';

(() => {
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.nav-links');
  const progressBar = document.querySelector('.scroll-progress');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const discover = document.querySelector('.nav-discover');
  const closeDiscover = () => { if (discover) discover.open = false; };

  function closeMenu() {
    if (!menu || !menuButton) return;
    menu.classList.remove('is-open');
    menuButton.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Menüyü aç');
    document.body.classList.remove('menu-open');
    closeDiscover();
  }

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const opening = !menu.classList.contains('is-open');
      if (opening) {
        menu.classList.add('is-open');
        menuButton.classList.add('is-open');
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.setAttribute('aria-label', 'Menüyü kapat');
        document.body.classList.add('menu-open');
      } else {
        closeMenu();
      }
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        const wasOpen = menu.classList.contains('is-open');
        closeMenu();
        if (wasOpen) menuButton.focus();
      }
    });
    document.addEventListener('pointerdown', event => {
      if (menu.classList.contains('is-open') && !header.contains(event.target)) closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }
  document.addEventListener('pointerdown', event => {
    if (discover?.open && !discover.contains(event.target)) closeDiscover();
  });
  discover?.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!discover.contains(document.activeElement)) closeDiscover(); });
  });

  let pending = false;
  function onScroll() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset;
      header?.classList.toggle('scrolled', y > 32);
      if (progressBar) {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = height > 0 ? Math.min(1, y / height) : 0;
        progressBar.style.transform = `scaleX(${ratio})`;
      }
      pending = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Animasyon desteklenmiyorsa içerikler gizlenmez.
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(el => {
      el.classList.add('will-reveal');
      io.observe(el);
    });
  }

  // Kullanıcının kendi görselleri yoksa paketteki vektör görseller görünür.
  document.querySelectorAll('[data-visual-fallback]').forEach(img => {
    const parent = img.closest('.project-visual');
    const markMissing = () => {
      img.style.display = 'none';
      parent?.classList.add('fallback-active');
    };
    img.addEventListener('error', markMissing, { once: true });
    if (img.complete && !img.naturalWidth) markMissing();
    else if (img.complete && img.naturalWidth) parent?.classList.add('photo-ready');
    else img.addEventListener('load', () => parent?.classList.add('photo-ready'), { once: true });
  });
  document.querySelectorAll('[data-hide-on-error]').forEach(img => {
    img.addEventListener('error', () => img.style.display = 'none', { once: true });
    if (img.complete && !img.naturalWidth) img.style.display = 'none';
  });

  // Sınırlı paralaks; azaltılmış hareket tercihinde devre dışı.
  const hero = document.querySelector('.hero');
  const board = document.querySelector('.dev-console');
  if (hero && board && !reducedMotion.matches && window.matchMedia('(pointer:fine)').matches) {
    let frame = 0;
    hero.addEventListener('pointermove', event => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - .5;
        const py = (event.clientY - rect.top) / rect.height - .5;
        board.style.setProperty('--tilt-x', `${(-py * 5).toFixed(2)}deg`);
        board.style.setProperty('--tilt-y', `${(px * 5).toFixed(2)}deg`);
        frame = 0;
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      board.style.setProperty('--tilt-x', '0deg');
      board.style.setProperty('--tilt-y', '0deg');
    });
  }

  const year = document.getElementById('copyright-year');
  if (year) year.textContent = String(new Date().getFullYear());
})();


// Dekoratif kod yağmuru: yerel Canvas, dış kütüphane yok, ekrana giren alanda çizilir.
(() => {
  const layers = [...document.querySelectorAll('.matrix-host > .matrix-rain-layer')];
  if (!layers.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tokens = ['01','1010','0xAF','GPIO','RX','TX','ESP32','IoT','const','void','{ }','setup()','loop()','0x4F','0110','pinMode','</>','C++','serial','if()'];
  const rand = (a,b) => a + Math.random() * (b-a);
  const states = layers.map(canvas => ({
    canvas, ctx: canvas.getContext('2d', { alpha: true }),
    light: canvas.parentElement.classList.contains('matrix-light'),
    width: 0, height: 0, columns: [], active: false, frame: 0
  })).filter(s => s.ctx);
  let last = 0, raf = null;
  const colors = ['110,174,255', '64,218,239','174,130,255','114,159,229'];
  function size(s) {
    const width = Math.max(10, s.canvas.clientWidth);
    const height = Math.max(10, s.canvas.clientHeight);
    if (width === s.width && height === s.height) return;
    s.width = width; s.height = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    s.canvas.width = Math.round(width*dpr);
    s.canvas.height = Math.round(height*dpr);
    s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = width <= 600 ? 82 : 102;
    const count = Math.min(28, Math.ceil(width / gap));
    s.columns = Array.from({length:count}, (_,i) => ({
      x: i*gap + rand(4,30), y: rand(-height, height), speed: rand(.26,.68),
      color: colors[i % colors.length], len: Math.round(rand(4,9)),
      offset: Math.floor(rand(0,tokens.length)), tick:rand(0,100)
    }));
  }
  function paint(s, dt=0) {
    if (!s.width || !s.height) size(s);
    const c = s.ctx;
    c.clearRect(0,0,s.width,s.height);
    c.textBaseline='top';
    c.font= `${s.light ? 10 : 11}px 'Cascadia Code', Consolas, monospace`;
    const row = s.light ? 23 : 24;
    for (const col of s.columns) {
      if (dt) col.y += col.speed*dt;
      if (col.y > s.height + col.len * row) col.y = -col.len*row - rand(0,300);
      for (let i=0; i<col.len; i++) {
        const y = col.y - i*row;
        if (y < -row || y > s.height) continue;
        const token = tokens[(col.offset + Math.floor((col.tick - i)/24) + i + 1000*tokens.length) % tokens.length];
        const weight=(col.len-i)/col.len;
        const alpha=s.light ? (.04 + weight*.13) : (.055 + weight*.29);
        c.fillStyle=`rgba(${col.color}, ${alpha.toFixed(3)})`;
        c.fillText(token,col.x,y);
      }
      col.tick += dt*.042;
    }
  }
  states.forEach(s => { size(s); paint(s); });
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { const s = states.find(item => item.canvas === entry.target); if (s) s.active = entry.isIntersecting; });
  }, { rootMargin: '130px 0px 130px 0px' }) : null;
  states.forEach(s => observer ? observer.observe(s.canvas) : (s.active = true));
  function tick(time) {
    raf = requestAnimationFrame(tick);
    if (document.hidden || reduced.matches || time-last < 34) return;
    const dt = Math.min(55,time-(last || time)); last=time;
    states.forEach(s => { if (s.active) paint(s,dt); });
  }
  if (!reduced.matches) raf=requestAnimationFrame(tick);
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(entries => {
    entries.forEach(entry => { const s = states.find(item => item.canvas === entry.target); if(s){ size(s); paint(s); } });
  }) : null;
  if(resizeObserver) states.forEach(s => resizeObserver.observe(s.canvas));
  window.addEventListener('resize',() => states.forEach(s => {size(s);paint(s)}),{passive:true});
  reduced.addEventListener?.('change', event => {
    if(event.matches){ if(raf)cancelAnimationFrame(raf);raf=null; states.forEach(s=>paint(s)); }
    else if(!raf){ last=0;raf=requestAnimationFrame(tick); }
  });
})();
