'use strict';
/* Ege Coşkun • offline çalışan etkileşimli bileşenler. Gerçek sensör okumaz. */
(() => {
  const doc = document;
  const t=s=>window.SiteI18n?.t(s) ?? s;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const themeButton = doc.querySelector('.theme-toggle');
  const root = doc.documentElement;
  const setTheme = (value) => {
    root.dataset.theme = value;
    const dark = value === 'dark';
    if (themeButton) {
      themeButton.setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
      themeButton.setAttribute('title', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
      themeButton.querySelector('.theme-icon').textContent = dark ? '☀' : '◐';
    }
    const meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#08090c'); // sabit koyu üst menü
  };
  setTheme(root.dataset.theme || 'light');
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('ege-theme', next); } catch (_) {}
  });

  // Açılıştaki sekmeler; gerçek 3D perspektifli CSS kartı ile terminal arasında geçiş.
  const tabs = [...doc.querySelectorAll('.hero-tab')];
  const showPanel = (panel) => {
    tabs.forEach(tab => {
      const active = tab.dataset.panel === panel;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panelEl = doc.getElementById('hero-panel-' + tab.dataset.panel);
      if (panelEl) panelEl.hidden = !active;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.panel));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      showPanel(next.dataset.panel); next.focus();
    });
  });
  const board = doc.getElementById('pcb-board');
  const stage = doc.getElementById('circuit-stage');
  let rx = 15, ry = -19, drag = null;
  const rotate = () => {
    if (!board) return;
    board.style.setProperty('--rx', `${rx}deg`);
    board.style.setProperty('--ry', `${ry}deg`);
  };
  stage?.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag = { x: e.clientX, y: e.clientY, rx, ry, id: e.pointerId };
    stage.setPointerCapture(e.pointerId);
  });
  stage?.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    ry = Math.max(-65, Math.min(65, drag.ry + (e.clientX - drag.x) * .34));
    rx = Math.max(-50, Math.min(50, drag.rx - (e.clientY - drag.y) * .34));
    rotate();
  });
  const endDrag = () => { drag = null; };
  stage?.addEventListener('pointerup', endDrag);
  stage?.addEventListener('pointercancel', endDrag);
  stage?.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowLeft') ry -= 9;
    else if (e.key === 'ArrowRight') ry += 9;
    else if (e.key === 'ArrowUp') rx -= 9;
    else rx += 9;
    rx = Math.max(-50, Math.min(50, rx)); ry = Math.max(-65, Math.min(65, ry)); rotate();
  });
  doc.getElementById('board-reset')?.addEventListener('click', () => { rx=15; ry=-19; rotate(); });
  const led = doc.getElementById('pcb-led');
  doc.getElementById('board-led-toggle')?.addEventListener('click', e => {
    const off = led.classList.toggle('is-off');
    e.currentTarget.textContent = 'LED: ' + (off ? 'Kapalı' : 'Açık');
  });

  // Terminaldeki rakamlar cihazdan değil, açıkça işaretlenmiş demo verisinden gelir.
  const gpio = doc.getElementById('live-gpio');
  if (gpio) {
    const uptime=doc.getElementById('live-uptime');
    const log=doc.getElementById('live-log');
    let seconds=0;
    const update = () => {
      if (doc.hidden || reduced.matches) return;
      seconds++;
      const signal = Math.round(1900 + 750*Math.sin(seconds*.41) + 260*Math.cos(seconds*.91));
      gpio.textContent = String(Math.max(0,Math.min(4095,signal)));
      uptime.textContent = new Date(seconds*1000).toISOString().slice(11,19);
      log.textContent = `> analogRead(GPIO34) => ${gpio.textContent}  ·  paket #${String(seconds).padStart(4,'0')}`;
    };
    window.setInterval(update, 1000);
  }

  // Ekran görüntüsünü büyütme: yeni pencereye bağımlı olmadan modal. JS kapalıysa bağlantı dosyayı açar.
  const gallery = [...doc.querySelectorAll('[data-lightbox]')];
  if (gallery.length) {
    const modal = doc.createElement('div');
    modal.className = 'lightbox'; modal.hidden = true;
    modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-label','Proje görseli');
    modal.innerHTML = `<div class="lightbox-top"><span id="lightbox-caption">Proje görseli</span><button type="button" class="lightbox-close" aria-label="Görseli kapat">×</button></div><img alt="Büyütülmüş proje görseli"><a class="lightbox-download" href="#" download>Görseli indir ↓</a>`;
    doc.body.append(modal);
    const pic=modal.querySelector('img'), caption=modal.querySelector('#lightbox-caption'), link=modal.querySelector('a');
    let previousFocus;
    const close = () => { modal.hidden = true; doc.body.style.overflow=''; previousFocus?.focus?.(); };
    gallery.forEach(a => a.addEventListener('click',e => {
      e.preventDefault();previousFocus=doc.activeElement;
      pic.src=a.href;pic.alt=a.dataset.caption || a.querySelector('img')?.alt || 'Görsel';
      caption.textContent = a.dataset.caption || 'Proje görseli';
      link.href=a.href;
      modal.hidden=false; doc.body.style.overflow='hidden';modal.querySelector('button').focus();
    }));
    modal.querySelector('button').addEventListener('click',close);
    modal.addEventListener('click',e => { if(e.target===modal)close(); });
    doc.addEventListener('keydown',e => {
      if(modal.hidden)return;
      if(e.key==='Escape')close();
      if(e.key==='Tab'){const items=[modal.querySelector('button'),link];const i=items.indexOf(doc.activeElement);if(e.shiftKey&&i===0){e.preventDefault();items[1].focus();}else if(!e.shiftKey&&i===1){e.preventDefault();items[0].focus();}}
    });
  }

  // İndirilen kaynakları ve metinlerini değiştirmeden hafif sözdizimi renklendirmesi.
  doc.querySelectorAll('.code-block code').forEach(block => {
    const source = block.textContent;
    const pat = /\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:include|define|const|byte|int|float|void|return|unsigned|long|String|Serial|Servo|if|else|for|while|new|setup|loop|class|import|from|with|def|None|True|False|in|as|continue|break|public|static|final)\b|\b\d+(?:\.\d+)?\b/g;
    const fragment=doc.createDocumentFragment();let last=0,match;
    while((match=pat.exec(source))) {
      if(match.index>last)fragment.append(doc.createTextNode(source.slice(last,match.index)));
      const chunk=match[0], el=doc.createElement('span');
      el.className=chunk.startsWith('//')||chunk.startsWith('# ') ? 'token-comment' : chunk.startsWith('#') ? 'token-preprocessor' : /^["']/.test(chunk) ? 'token-string' : /^\d/.test(chunk) ? 'token-number' : 'token-keyword';
      el.textContent=chunk;fragment.append(el);last=pat.lastIndex;
    }
    if(last<source.length)fragment.append(doc.createTextNode(source.slice(last)));
    block.replaceChildren(fragment);
  });

  // Görünürlük durumuyla kısıtlı, tamamen yerel canvas döngüleri.
  const radarCanvas=doc.getElementById('radar-canvas');
  if(radarCanvas){
    const ctx=radarCanvas.getContext('2d');
    const range=doc.getElementById('radar-range');
    const output=doc.getElementById('radar-range-value');
    const textDist=doc.getElementById('radar-distance');
    const angleLabel=doc.getElementById('radar-angle');
    const btn=doc.getElementById('radar-toggle');
    let running=!reduced.matches, angle=40, dir=1, last=0;
    const getDistance=()=>Number(range.value);
    const updateRange=()=>{output.textContent=range.value+' cm';textDist.textContent=range.value+' cm';draw();};
    range.addEventListener('input',updateRange);
    btn.textContent=running?'Taramayı durdur':'Taramayı başlat';
    btn.addEventListener('click',()=>{running=!running;btn.textContent=running?'Taramayı durdur':'Taramayı başlat';draw();});
    const xy=(r,a)=>{const t=(180-a)*Math.PI/180;return [450+r*Math.cos(t),440-r*Math.sin(t)];};
    function draw(){
      const W=900,H=490,cx=450,cy=440,R=385;
      ctx.clearRect(0,0,W,H);
      const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#061824');bg.addColorStop(1,'#020911');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.font='14px monospace';ctx.fillStyle='#62ad8b';ctx.fillText(t('RADAR / SİMÜLASYON'),20,29);
      ctx.textAlign='right';ctx.fillStyle='#589f8c';ctx.fillText(t(`AÇI ${Math.round(angle)}°   •   HEDEF ${range.value} cm`),880,29);ctx.textAlign='left';
      ctx.save();ctx.strokeStyle='rgba(41,184,117,.26)';ctx.lineWidth=1.5;
      [0.25,0.5,0.75,1].forEach(k=>{ctx.beginPath();ctx.arc(cx,cy,R*k,Math.PI,2*Math.PI);ctx.stroke();});
      [0,30,60,90,120,150,180].forEach(a=>{const [x,y]=xy(R,a);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#4b8a74';ctx.font='12px monospace';ctx.fillText(a+'°',x-12,y-7);});
      ctx.strokeStyle='#2b9d70';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-R,cy);ctx.lineTo(cx+R,cy);ctx.stroke();
      // radar hüzmesi ve hedefler yapaydır
      const sweep=(180-angle)*Math.PI/180;
      const grad=ctx.createConicGradient(sweep,cx,cy);grad.addColorStop(0,'rgba(51,255,134,.0)');grad.addColorStop(.06,'rgba(51,255,134,.12)');grad.addColorStop(.1,'rgba(51,255,134,.00)');grad.addColorStop(1,'rgba(51,255,134,.0)');
      ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,Math.PI,2*Math.PI);ctx.closePath();ctx.fill();
      const [sx,sy]=xy(R,angle);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(sx,sy);ctx.strokeStyle='#4cffa9';ctx.shadowColor='#39ffa0';ctx.shadowBlur=17;ctx.lineWidth=4;ctx.stroke();ctx.shadowBlur=0;
      const targetAngle=67; const [tx,ty]=xy((getDistance()/40)*R,targetAngle);
      ctx.beginPath();ctx.arc(tx,ty,7,0,Math.PI*2);ctx.fillStyle='#ff726b';ctx.shadowColor='#ff675e';ctx.shadowBlur=19;ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle='#fcb6ab';ctx.font='13px monospace';ctx.fillText(`${range.value} cm`,tx+13,ty-10);
      ctx.restore();angleLabel.textContent=Math.round(angle)+'°';
    }
    function frame(t){requestAnimationFrame(frame);if(doc.hidden||!running||!radarCanvas.getBoundingClientRect().width||t-last<32)return;const dt=Math.min(55,t-(last||t));last=t;angle+=dir*dt*.052;if(angle>=165){angle=165;dir=-1;}else if(angle<=15){angle=15;dir=1;}draw();}
    draw();requestAnimationFrame(frame);
    doc.addEventListener('site:languagechange',draw);
    reduced.addEventListener?.('change',e=>{if(e.matches){running=false;btn.textContent='Taramayı başlat';draw();}});
  }

  const ledCanvas=doc.getElementById('led-canvas');
  if(ledCanvas){
    const c=ledCanvas.getContext('2d'),text=doc.getElementById('led-text'),speed=doc.getElementById('led-speed'),speedOut=doc.getElementById('led-speed-value'),btn=doc.getElementById('led-toggle');
    // 5x7 piksel alfabesi, yerel. Türkçe karakterler latin karşılıklarına dönüştürülür.
    const F={
    ' ':['00000','00000','00000','00000','00000','00000','00000'],
    'A':['01110','10001','10001','11111','10001','10001','10001'], 'B':['11110','10001','10001','11110','10001','10001','11110'],
    'C':['01111','10000','10000','10000','10000','10000','01111'], 'D':['11110','10001','10001','10001','10001','10001','11110'],
    'E':['11111','10000','10000','11110','10000','10000','11111'], 'F':['11111','10000','10000','11110','10000','10000','10000'],
    'G':['01111','10000','10000','10111','10001','10001','01111'], 'H':['10001','10001','10001','11111','10001','10001','10001'],
    'I':['11111','00100','00100','00100','00100','00100','11111'], 'J':['00111','00010','00010','00010','10010','10010','01100'],
    'K':['10001','10010','10100','11000','10100','10010','10001'], 'L':['10000','10000','10000','10000','10000','10000','11111'],
    'M':['10001','11011','10101','10101','10001','10001','10001'], 'N':['10001','11001','10101','10011','10001','10001','10001'],
    'O':['01110','10001','10001','10001','10001','10001','01110'], 'P':['11110','10001','10001','11110','10000','10000','10000'],
    'Q':['01110','10001','10001','10001','10101','10010','01101'], 'R':['11110','10001','10001','11110','10100','10010','10001'],
    'S':['01111','10000','10000','01110','00001','00001','11110'], 'T':['11111','00100','00100','00100','00100','00100','00100'],
    'U':['10001','10001','10001','10001','10001','10001','01110'], 'V':['10001','10001','10001','10001','10001','01010','00100'],
    'W':['10001','10001','10001','10101','10101','10101','01010'], 'X':['10001','10001','01010','00100','01010','10001','10001'],
    'Y':['10001','10001','01010','00100','00100','00100','00100'], 'Z':['11111','00001','00010','00100','01000','10000','11111'],
    '0':['01110','10001','10011','10101','11001','10001','01110'], '1':['00100','01100','00100','00100','00100','00100','01110'],
    '2':['01110','10001','00001','00010','00100','01000','11111'], '3':['11110','00001','00001','01110','00001','00001','11110'],
    '4':['00010','00110','01010','10010','11111','00010','00010'], '5':['11111','10000','10000','11110','00001','00001','11110'],
    '6':['01110','10000','10000','11110','10001','10001','01110'], '7':['11111','00001','00010','00100','01000','01000','01000'],
    '8':['01110','10001','10001','01110','10001','10001','01110'], '9':['01110','10001','10001','01111','00001','00001','01110'],
    '!':['00100','00100','00100','00100','00100','00000','00100'], '.':['00000','00000','00000','00000','00000','01100','01100'],
    '-':['00000','00000','00000','11111','00000','00000','00000'], '?':['01110','10001','00001','00010','00100','00000','00100']};
    let pixels=[],offset=0,last=0,running=!reduced.matches;
    function rebuild(){
      const clean=(text.value||' ').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C').replace(/ı/g,'I');
      const cols=Array.from({length:32},()=>Array(8).fill(false));
      for(const letter of clean){const bitmap=F[letter]||F['?'];for(let x=0;x<5;x++) cols.push(Array.from({length:8},(_,y)=>y<7&&bitmap[y][x]==='1'));cols.push(Array(8).fill(false));}
      pixels=cols.concat(Array.from({length:32},()=>Array(8).fill(false)));offset=0;paint();
    }
    function paint(){
      const W=960,H=280; c.fillStyle='#050a0e';c.fillRect(0,0,W,H);
      const dx=27,dy=27,r=8.3,startX=55,startY=42;
      for(let x=0;x<32;x++)for(let y=0;y<8;y++){
        const on=pixels[(offset+x)%pixels.length]?.[y]||false;
        const cx=startX+x*dx,cy=startY+y*dy;
        c.beginPath();c.arc(cx,cy,r,0,2*Math.PI);c.fillStyle=on?'#38ff8c':'#143127';c.fill();
        if(on){c.beginPath();c.arc(cx,cy,r*.52,0,2*Math.PI);c.fillStyle='#b3ffd2';c.fill();}
      }
      c.strokeStyle='rgba(109,224,154,.25)';c.lineWidth=1.5;
      for(let part=1;part<4;part++){let bx=startX+(part*8-.5)*dx;c.beginPath();c.moveTo(bx,19);c.lineTo(bx,252);c.stroke();}
    }
    speedOut.textContent='Orta';
    const speedWords=['','Çok yavaş','Yavaş','Yavaş','Orta','Orta','Hızlı','Hızlı','Çok hızlı','Çok hızlı','Maksimum'];
    speed.addEventListener('input',()=>speedOut.textContent=speedWords[Number(speed.value)]);
    text.addEventListener('input',rebuild);
    btn.textContent=running?'Animasyonu durdur':'Animasyonu başlat';
    btn.addEventListener('click',()=>{running=!running;btn.textContent=running?'Animasyonu durdur':'Animasyonu başlat';});
    function frame(t){requestAnimationFrame(frame);if(doc.hidden||!running||!ledCanvas.getBoundingClientRect().width)return;const delay=420-Number(speed.value)*34;if(t-last>delay){last=t;offset=(offset+1)%pixels.length;paint();}}
    rebuild();requestAnimationFrame(frame);
    reduced.addEventListener?.('change',e=>{if(e.matches){running=false;btn.textContent='Animasyonu başlat';paint();}});
  }
})();
