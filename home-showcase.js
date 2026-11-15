'use strict';
(() => {
  const root = document.querySelector('[data-showcase]');
  if (!root) return;
  const slides = [...root.querySelectorAll('.showcase-slide')];
  const indicators = [...root.querySelectorAll('[data-showcase-index]')];
  const controls = root.querySelector('.showcase-controls');
  const number = root.querySelector('[data-showcase-current]');
  const toggle = root.querySelector('[data-showcase-toggle]');
  const announcement = root.querySelector('[data-showcase-announcement]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 6500;
  let index = 0, elapsed = 0, frame, previousTime, swipe;
  let inView = !('IntersectionObserver' in window), hovering = false, paused = reducedMotion.matches;

  function drawProgress() {
    indicators[index].style.setProperty('--showcase-progress',String(Math.min(1,elapsed/duration)));
  }
  function preloadNext() {
    slides[(index+1)%slides.length].querySelector('img[loading="lazy"]')?.removeAttribute('loading');
  }
  function select(next,direction,announce = false) {
    const old = index;
    index = (next+slides.length)%slides.length;
    elapsed = 0;
    previousTime = undefined;
    indicators[old].style.removeProperty('--showcase-progress');
    if (old !== index) {
      slides[old].hidden = true;
      delete slides[old].dataset.enter;
      indicators[old].removeAttribute('aria-current');
      slides[index].hidden = false;
      slides[index].dataset.enter = direction;
      indicators[index].setAttribute('aria-current','true');
      number.textContent = String(index+1).padStart(2,'0');
      preloadNext();
    }
    if (announce) announcement.textContent = indicators[index].getAttribute('aria-label');
    drawProgress();
  }
  function running() {
    return inView && !document.hidden && !paused && !hovering &&
      !slides[index].contains(document.activeElement) && !swipe;
  }
  function syncTimer() {
    if (running()) {
      if (frame === undefined) frame = requestAnimationFrame(tick);
      return;
    }
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = previousTime = undefined;
  }
  function tick(now) {
    frame = undefined;
    if (!running()) {
      previousTime = undefined;
      return;
    }
    elapsed += now-(previousTime ?? now);
    previousTime = now;
    if (elapsed >= duration) select(index+1,'forward');
    else drawProgress();
    syncTimer();
  }
  function move(next,direction) {
    if (slides[index].contains(document.activeElement)) indicators[index].focus();
    select(next,direction,true);
    syncTimer();
  }
  function setPlayButton() {
    const text = paused ? 'Otomatik geçişi başlat' : 'Otomatik geçişi duraklat';
    const label = window.SiteI18n?.t(text) ?? text;
    toggle.setAttribute('aria-label',label);
    toggle.title = label;
    toggle.toggleAttribute('data-paused',paused);
  }

  for (const button of root.querySelectorAll('[data-showcase-step]')) {
    const offset = Number(button.dataset.showcaseStep);
    button.addEventListener('click',()=>move(index+offset,offset<0?'back':'forward'));
  }
  indicators.forEach((button,i)=>button.addEventListener('click',()=>move(i,i<index?'back':'forward')));
  toggle.addEventListener('click',()=>{
    paused = !paused;
    setPlayButton();
    syncTimer();
  });
  root.addEventListener('keydown',event=>{
    if (!['ArrowLeft','ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const offset = event.key==='ArrowLeft'?-1:1;
    move(index+offset,offset<0?'back':'forward');
  });
  root.addEventListener('pointerenter',event=>{
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    syncTimer();
  });
  root.addEventListener('pointerleave',()=>{
    hovering = false;
    syncTimer();
  });
  root.addEventListener('pointerdown',event=>{
    if (event.pointerType !== 'touch' || !event.isPrimary || event.target.closest('a,button')) return;
    swipe = {id:event.pointerId,x:event.clientX,y:event.clientY};
    syncTimer();
  });
  root.addEventListener('pointerup',event=>{
    if (swipe?.id !== event.pointerId) return;
    const x = event.clientX-swipe.x, y = event.clientY-swipe.y;
    swipe = undefined;
    if (Math.abs(x)>45 && Math.abs(x)>Math.abs(y)*1.3) move(index+(x>0?-1:1),x>0?'back':'forward');
    else syncTimer();
  });
  root.addEventListener('pointercancel',()=>{
    swipe = undefined;
    syncTimer();
  });
  root.addEventListener('focusin',syncTimer);
  root.addEventListener('focusout',()=>queueMicrotask(syncTimer));
  document.addEventListener('visibilitychange',syncTimer);
  document.addEventListener('site:languagechange',setPlayButton);
  reducedMotion.addEventListener('change',()=>{
    paused = reducedMotion.matches;
    setPlayButton();
    syncTimer();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry])=>{
      inView = entry.isIntersecting;
      syncTimer();
    }).observe(root);
  }
  controls.hidden = false;
  preloadNext();
  setPlayButton();
  syncTimer();
})();
