'use strict';
(() => {
  const root=document.querySelector('[data-showcase]');
  if(!root)return;
  const rail=root.querySelector('.showcase-slides');
  const cards=[...rail.children];
  const indicators=[...root.querySelectorAll('[data-showcase-index]')];
  const toggle=root.querySelector('[data-showcase-toggle]');
  const announcement=root.querySelector('[data-showcase-announcement]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const count=cards.length, interval=2400, transition=380;
  let index=0,cycle=0,step=0,frame,previous,elapsed=0,motion,scrollTimer;
  let visible=!('IntersectionObserver' in window),hovering=false,touching=false,paused=reduced.matches;

  function copies(){
    return cards.map(card=>{
      const copy=card.cloneNode(true);
      copy.dataset.loopCopy='';
      copy.removeAttribute('id');
      copy.removeAttribute('aria-labelledby');
      copy.setAttribute('aria-hidden','true');
      copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      copy.querySelectorAll('a,button,[tabindex]').forEach(node=>node.tabIndex=-1);
      return copy;
    });
  }
  const before=copies(),after=copies();
  rail.prepend(...before);
  rail.append(...after);
  function normalize(){
    if(!cycle)return;
    const snap=rail.style.scrollSnapType;
    rail.style.scrollSnapType='none';
    if(rail.scrollLeft<cycle)rail.scrollLeft+=cycle;
    else if(rail.scrollLeft>=cycle*2)rail.scrollLeft-=cycle;
    rail.style.scrollSnapType=snap;
  }
  function layout(){
    motion=undefined;
    const first=cards[0].offsetLeft;
    step=cards[1].offsetLeft-first;
    cycle=first-before[0].offsetLeft;
    rail.style.scrollSnapType='none';
    rail.scrollLeft=cycle+index*step;
    rail.style.scrollSnapType='';
  }
  function mark(next,announce=false){
    indicators[index].removeAttribute('aria-current');
    indicators[index].style.removeProperty('--showcase-progress');
    index=(next+count)%count;
    indicators[index].setAttribute('aria-current','true');
    elapsed=0;
    if(announce)announcement.textContent=indicators[index].getAttribute('aria-label');
  }
  function move(delta,announce=true){
    if(!cycle)return;
    if(motion){rail.scrollLeft=motion.to;motion=undefined;normalize();}
    const position=Math.round((rail.scrollLeft-cycle)/step);
    mark(index+delta,announce);
    const to=cycle+(position+delta)*step;
    if(reduced.matches){rail.scrollLeft=to;normalize();}
    else {
      rail.style.scrollSnapType='none';
      motion={from:rail.scrollLeft,to,elapsed:0};
    }
    sync();
  }
  function running(){
    return visible&&!document.hidden&&!paused&&!hovering&&!touching&&!rail.contains(document.activeElement);
  }
  function sync(){
    if((motion&&!document.hidden)||(running()&&cycle)){
      if(frame===undefined)frame=requestAnimationFrame(tick);
    }else {
      if(frame!==undefined)cancelAnimationFrame(frame);
      frame=previous=undefined;
    }
  }
  function tick(now){
    frame=undefined;
    const dt=Math.min(60,now-(previous??now));
    previous=now;
    if(motion){
      motion.elapsed+=dt;
      const progress=Math.min(1,motion.elapsed/transition);
      const eased=1-Math.pow(1-progress,3);
      rail.scrollLeft=motion.from+(motion.to-motion.from)*eased;
      if(progress===1){rail.scrollLeft=motion.to;motion=undefined;normalize();rail.style.scrollSnapType='';}
    }else if(running()){
      elapsed+=dt;
      indicators[index].style.setProperty('--showcase-progress',String(Math.min(1,elapsed/interval)));
      if(elapsed>=interval)move(1,false);
    }
    sync();
  }
  function playLabel(){
    const label=window.SiteI18n?.t(paused?'Otomatik geçişi başlat':'Otomatik geçişi duraklat')??(paused?'Otomatik geçişi başlat':'Otomatik geçişi duraklat');
    toggle.setAttribute('aria-label',label);toggle.title=label;toggle.toggleAttribute('data-paused',paused);
  }
  root.querySelectorAll('[data-showcase-step]').forEach(button=>button.onclick=()=>move(Number(button.dataset.showcaseStep)));
  indicators.forEach((button,i)=>button.onclick=()=>{
    let delta=(i-index+count)%count;
    if(delta>count/2)delta-=count;
    move(delta);
  });
  toggle.onclick=()=>{paused=!paused;playLabel();sync();};
  root.onkeydown=event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
    event.preventDefault();move(event.key==='ArrowLeft'?-1:1);
  };
  root.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;sync();}});
  root.addEventListener('pointerleave',()=>{hovering=false;sync();});
  rail.addEventListener('pointerdown',()=>{touching=true;motion=undefined;rail.style.scrollSnapType='';sync();});
  const finish=()=>{touching=false;sync();};
  window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
  rail.addEventListener('scroll',()=>{
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{
      if(motion||touching)return;
      normalize();
      const next=((Math.round((rail.scrollLeft-cycle)/step)%count)+count)%count;
      if(next!==index)mark(next);
    },140);
  },{passive:true});
  rail.addEventListener('wheel',event=>{
    if(event.ctrlKey||!cycle)return;
    const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
    if(!delta)return;
    event.preventDefault();
    motion=undefined;elapsed=0;
    rail.style.scrollSnapType='none';
    rail.scrollLeft+=delta*(event.deltaMode===1?16:event.deltaMode===2?rail.clientWidth:1);
    normalize();
    sync();
  },{passive:false});
  rail.addEventListener('focusin',event=>{
    const card=event.target.closest('.showcase-slide');
    const next=cards.indexOf(card);
    if(next>=0&&next!==index)mark(next);
  });
  root.addEventListener('focusin',sync);root.addEventListener('focusout',()=>queueMicrotask(sync));
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('site:languagechange',playLabel);
  reduced.addEventListener('change',()=>{paused=reduced.matches;playLabel();sync();});
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(root);
  new ResizeObserver(()=>{layout();sync();}).observe(rail);
  layout();
  root.querySelector('.showcase-controls').hidden=false;
  playLabel();sync();
})();
