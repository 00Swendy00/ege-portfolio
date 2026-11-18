'use strict';
(() => {
  const root = document.querySelector('[data-showcase]');
  if (!root) return;
  const rail = root.querySelector('.showcase-slides');
  const slides = [...rail.querySelectorAll('.showcase-slide')];
  const indicators = [...root.querySelectorAll('[data-showcase-index]')];
  const toggle = root.querySelector('[data-showcase-toggle]');
  const announcement = root.querySelector('[data-showcase-announcement]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 6500;
  let index = 0, elapsed = 0, frame, previousTime, scrollTimer;
  let inView = !('IntersectionObserver' in window);
  let hovering = false, touching = false, paused = reducedMotion.matches;

  function mark(next,announce = false) {
    indicators[index].removeAttribute('aria-current');
    indicators[index].style.removeProperty('--showcase-progress');
    index = next;
    elapsed = 0;
    previousTime = undefined;
    indicators[index].setAttribute('aria-current','true');
    if (announce) announcement.textContent = indicators[index].getAttribute('aria-label');
    const following = slides[(index+1)%slides.length].querySelector('img');
    following?.removeAttribute('loading');
  }
  function offset(i) {
    return slides[i].offsetLeft-slides[0].offsetLeft;
  }
  function goTo(next,announce = true) {
    mark((next+slides.length)%slides.length,announce);
    rail.scrollTo({left:offset(index),behavior:reducedMotion.matches?'instant':'smooth'});
    syncTimer();
  }
  function running() {
    return inView && !document.hidden && !paused && !hovering &&
      !touching && !rail.contains(document.activeElement);
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
    if (!running()) { previousTime = undefined; return; }
    elapsed += now-(previousTime ?? now);
    previousTime = now;
    indicators[index].style.setProperty('--showcase-progress',String(Math.min(1,elapsed/duration)));
    if (elapsed >= duration) {
      const atEnd = rail.scrollLeft >= rail.scrollWidth-rail.clientWidth-2;
      goTo(atEnd?0:index+1,false);
    }
    syncTimer();
  }
  function setPlayButton() {
    const text = paused ? 'Otomatik geçişi başlat' : 'Otomatik geçişi duraklat';
    const label = window.SiteI18n?.t(text) ?? text;
    toggle.setAttribute('aria-label',label);
    toggle.title = label;
    toggle.toggleAttribute('data-paused',paused);
  }
  function syncScroll() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(()=>{
      // Keep the selected card when it is visible at the clamped end of the rail.
      const left = offset(index), right = left+slides[index].offsetWidth;
      if (left>=rail.scrollLeft-2 && right<=rail.scrollLeft+rail.clientWidth+2) return;
      const nearest = slides.reduce((best,_,i)=>
        Math.abs(offset(i)-rail.scrollLeft)<Math.abs(offset(best)-rail.scrollLeft)?i:best,0);
      if (nearest !== index) mark(nearest);
    },180);
  }
  for (const button of root.querySelectorAll('[data-showcase-step]')) {
    const step = Number(button.dataset.showcaseStep);
    button.addEventListener('click',()=>{
      const atEnd = rail.scrollLeft >= rail.scrollWidth-rail.clientWidth-2;
      goTo(step>0 && atEnd?0:index+step);
    });
  }
  indicators.forEach((button,i)=>button.addEventListener('click',()=>goTo(i)));
  toggle.addEventListener('click',()=>{
    paused = !paused;
    setPlayButton();
    syncTimer();
  });
  root.addEventListener('keydown',event=>{
    if (!['ArrowLeft','ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    goTo(index+(event.key==='ArrowLeft'?-1:1));
  });
  root.addEventListener('pointerenter',event=>{
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    syncTimer();
  });
  root.addEventListener('pointerleave',()=>{ hovering = false; syncTimer(); });
  rail.addEventListener('pointerdown',event=>{
    if (event.pointerType !== 'touch') return;
    touching = true;
    syncTimer();
  });
  const finishTouch = ()=>{ touching = false; syncTimer(); };
  window.addEventListener('pointerup',finishTouch);
  window.addEventListener('pointercancel',finishTouch);
  rail.addEventListener('scroll',syncScroll,{passive:true});
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
    new IntersectionObserver(([entry])=>{ inView = entry.isIntersecting; syncTimer(); }).observe(root);
  }
  root.querySelector('.showcase-controls').hidden = false;
  setPlayButton();
  syncTimer();
})();
