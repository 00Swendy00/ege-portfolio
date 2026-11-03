'use strict';
/* Ege Coşkun V4: yeni bileşenler çevrimdışı çalışır. Fiziksel donanım kontrolü yoktur. */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const prefersLess = window.matchMedia('(prefers-reduced-motion: reduce)');
  const obs = ('IntersectionObserver' in window && !prefersLess.matches) ? new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){e.target.classList.add('is-active');obs.unobserve(e.target);} });
  }, {threshold:.13}) : null;
  $$('.v4-story-media').forEach(el => obs ? obs.observe(el) : el.classList.add('is-active'));

  const lab = $('#v4-lab');
  if (lab) {
    const presets = {
      led: { name:'LED + 220 Ω direnç', src:['D9','GND'], dest:['220 Ω → LED +','LED −'], required:[['D9','220 Ω → LED +'],['GND','LED −']], detail:'D9 çıkışı 220 Ω seri direnç üzerinden LED anotuna, LED katodu GND’ye bağlanır.', mode:'led' },
      button: { name:'Buton (INPUT_PULLUP)', src:['D2','GND'], dest:['BUTON 1','BUTON 2'], required:[['D2','BUTON 1'],['GND','BUTON 2']], detail:'Arduino D2 pini INPUT_PULLUP modunda kullanılacak. Butona basılınca giriş LOW olur; harici direnç gerekmez.', mode:'button' },
      sonar: { name:'HC-SR04 mesafe sensörü', src:['5V','GND','D9','D10'], dest:['VCC','GND','TRIG','ECHO'], required:[['5V','VCC'],['GND','GND'],['D9','TRIG'],['D10','ECHO']], detail:'HC-SR04 5V ile beslenir; TRIG D9, ECHO D10. Bu örnek Arduino Uno içindir, ESP32’nin 3.3V girişine ECHO doğrudan bağlanmamalıdır.', mode:'sonar' }
    };
    let kind = 'led', selected = null, connections = [], running = false, tick = 0, timer = 0;
    const sources = $('#v4-sources'), targets = $('#v4-targets'), list = $('#v4-wires'), details=$('#v4-lab-instruction');
    const message = $('#v4-lab-message'), feedback=$('#v4-lab-feedback'), sim=$('#v4-lab-simulation'), val=$('#v4-demo-value'), lamp=$('#v4-demo-lamp');
    const runBtn = $('#v4-lab-run');
    const norm = ([a,b]) => a+'|'+b;
    function setMessage(s){message.textContent=s;}
    function stop(){running=false;clearInterval(timer);timer=0;runBtn.textContent='Simülasyonu başlat';lamp.classList.remove('on');sim.hidden=true;}
    function drawConnections(){
      list.replaceChildren();
      connections.forEach(([a,b],i)=>{
        const row=document.createElement('div');row.className='v4-connection';
        const title=document.createElement('span');title.textContent=a+' → '+b;
        const del=document.createElement('button');del.type='button';del.textContent='×';del.setAttribute('aria-label',a+' → '+b+' bağlantısını sil');
        del.addEventListener('click',()=>{connections.splice(i,1);drawConnections();validate(false);stop();});row.append(title,del);list.append(row);
      });
      if(!connections.length){const p=document.createElement('p');p.textContent='Henüz bağlantı yok.';p.style.margin='0';list.append(p);}
      $$('.v4-terminal').forEach(x=>x.classList.toggle('is-connected',connections.some(pair=>pair.includes(x.dataset.node))));
      window.requestAnimationFrame(drawWires);
    }
    function drawWires(){
      const el=$('#v4-bench-lines'), frame=$('#v4-patch-columns');if(!el||!frame)return;
      const rect=frame.getBoundingClientRect();if(rect.width<1)return;
      el.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);el.replaceChildren();
      connections.forEach(([a,b],i)=>{
        const p=$$('.v4-terminal',sources).find(x=>x.dataset.node===a),q=$$('.v4-terminal',targets).find(x=>x.dataset.node===b);
        if(!p||!q)return;const ra=p.getBoundingClientRect(),rb=q.getBoundingClientRect();
        const x1=ra.right-rect.left,y1=ra.top+ra.height/2-rect.top,x2=rb.left-rect.left,y2=rb.top+rb.height/2-rect.top;
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',`M ${x1} ${y1} C ${x1+30} ${y1}, ${x2-30} ${y2}, ${x2} ${y2}`);
        path.setAttribute('stroke',['#7eaaff','#69d9c7','#f9c775','#d29bff'][i%4]);path.setAttribute('stroke-width','2.6');path.setAttribute('fill','none');path.setAttribute('opacity','.85');el.append(path);
      });
    }
    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(drawWires) : null;
    resizeObserver?.observe($('#v4-patch-columns'));window.addEventListener('resize',drawWires,{passive:true});
    function nodeButton(node,source){
      const b=document.createElement('button');b.className='v4-terminal';b.type='button';b.dataset.node=node;
      const s=document.createElement('span');s.className='v4-node';b.append(s,document.createTextNode(node));
      b.setAttribute('aria-label', (source?'Arduino pini ':'Bileşen ucu ')+node);
      b.addEventListener('click',()=>{
        if(source){selected=node;$$('.v4-terminal',sources).forEach(x=>x.classList.toggle('is-selected',x===b));setMessage(node+' seçildi. Şimdi sağdan bağlantı ucunu seç.');return;}
        if(!selected){setMessage('Önce soldan Arduino pini seç.');return;}
        if(!connections.some(x=>x[0]===selected && x[1]===node))connections.push([selected,node]);
        selected=null;$$('.v4-terminal',sources).forEach(x=>x.classList.remove('is-selected'));
        drawConnections();validate(false);stop();setMessage('Bağlantı eklendi. Diğer pinleri de bağla.');
      });return b;
    }
    function validate(announce=true){
      const cfg=presets[kind],wanted=cfg.required.map(norm),actual=connections.map(norm);
      const valid=actual.length===wanted.length&&actual.every(x=>wanted.includes(x))&&wanted.every(x=>actual.includes(x));
      feedback.replaceChildren();cfg.required.forEach(pair=>{
        const l=document.createElement('li'),ok=actual.includes(norm(pair));l.className=ok?'ok':'bad';l.textContent=(ok?'✓ ':'○ ')+pair[0]+' → '+pair[1];feedback.append(l);
      });
      connections.filter(p=>!wanted.includes(norm(p))).forEach(p=>{const l=document.createElement('li');l.className='bad';l.textContent='! Yanlış: '+p[0]+' → '+p[1];feedback.append(l);});
      $('#v4-complete').textContent=`${cfg.required.filter(p=>actual.includes(norm(p))).length} / ${cfg.required.length}`;
      runBtn.disabled=!valid;
      if(announce)setMessage(valid?'Bağlantılar doğru. Demo simülasyonu başlatabilirsin.':'Bağlantıları kontrol et; işaretli uçlar tamamlanmalı.');
      return valid;
    }
    function changePreset(name){kind=name;selected=null;connections=[];stop();
      $$('.v4-pill[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===kind)));
      sources.replaceChildren();targets.replaceChildren();
      presets[kind].src.forEach(n=>sources.append(nodeButton(n,true)));presets[kind].dest.forEach(n=>targets.append(nodeButton(n,false)));
      details.textContent=presets[kind].detail;$('#v4-circuit-name').textContent=presets[kind].name;
      $('#v4-demo-range-wrap').hidden=kind!=='sonar';$('#v4-demo-button').hidden=kind!=='button';
      drawConnections();validate(false);setMessage('Soldan Arduino pini, sonra sağdan bileşen ucu seç.');
    }
    $$('.v4-pill[data-preset]').forEach(b=>b.addEventListener('click',()=>changePreset(b.dataset.preset)));
    $('#v4-lab-auto').addEventListener('click',()=>{connections=presets[kind].required.map(p=>p.slice());selected=null;$$('.v4-terminal',sources).forEach(x=>x.classList.remove('is-selected'));drawConnections();validate(true);stop();});
    $('#v4-lab-clear').addEventListener('click',()=>{connections=[];selected=null;drawConnections();validate(false);stop();setMessage('Bağlantılar temizlendi.');});
    $('#v4-lab-check').addEventListener('click',()=>validate(true));
    const renderDemo=()=>{
      if(kind==='led'){const on=tick%2===0;lamp.classList.toggle('on',on);val.textContent='D9: '+(on?'HIGH':'LOW')+' · LED '+(on?'AÇIK':'KAPALI');}
      if(kind==='button'){lamp.classList.toggle('on',tick===1);val.textContent=tick===1?'BUTON BASILI · LOW':'BUTON SERBEST · HIGH';}
      if(kind==='sonar'){lamp.classList.toggle('on',true);val.textContent='Mesafe: '+$('#v4-demo-range').value+' cm (örnek veri)';}
    };
    runBtn.addEventListener('click',()=>{
      if(running){stop();return;}if(!validate(true))return;
      running=true;sim.hidden=false;runBtn.textContent='Simülasyonu durdur';tick=0;renderDemo();
      if(kind==='led')timer=setInterval(()=>{if(!document.hidden){tick++;renderDemo();}},750);
    });
    $('#v4-demo-button').addEventListener('click',()=>{if(running&&kind==='button'){tick=tick?0:1;renderDemo();}});
    $('#v4-demo-range').addEventListener('input',()=>{if(running&&kind==='sonar')renderDemo();});
    changePreset('led');
  }

  const pinApp=$('#v4-pin-map');
  if(pinApp){
    const left=['EN','GPIO36','GPIO39','GPIO34','GPIO35','GPIO32','GPIO33','GPIO25','GPIO26','GPIO27','GPIO14','GPIO12','GPIO13','GND','VIN'];
    const right=['GPIO23','GPIO22','GPIO1','GPIO3','GPIO21','GND','GPIO19','GPIO18','GPIO5','GPIO17','GPIO16','GPIO4','GPIO0','GPIO2','GPIO15'];
    const extra={EN:['Etkinleştirme','Kontrol','EN aktif düşürüldüğünde ESP32 yeniden başlatılır.'],VIN:['Harici besleme','Güç','Birçok DevKit V1 kartında 5V/VIN hattıdır. Kartına göre kontrol et.'],GND:['Toprak','Güç','Devrenin ortak referans bağlantısı.'],GPIO34:['ADC1_CH6 · giriş','ADC','Yalnızca giriş olarak çalışır; dahili pull-up/pull-down yoktur.'],GPIO35:['ADC1_CH7 · giriş','ADC','Yalnızca giriş olarak çalışır; dahili pull-up/pull-down yoktur.'],GPIO36:['ADC1_CH0 · giriş','ADC','Yalnızca giriş olarak çalışır; dahili pull-up/pull-down yoktur.'],GPIO39:['ADC1_CH3 · giriş','ADC','Yalnızca giriş olarak çalışır; dahili pull-up/pull-down yoktur.'],GPIO25:['ADC2_CH8 · DAC1','ADC / DAC','DAC çıkışı ve PWM çıkışı olarak kullanılabilir.'],GPIO26:['ADC2_CH9 · DAC2','ADC / DAC','DAC çıkışı ve PWM çıkışı olarak kullanılabilir.'],GPIO21:['I²C SDA','I²C','Genellikle I²C veri hattı için tercih edilir.'],GPIO22:['I²C SCL','I²C','Genellikle I²C saat hattı için tercih edilir.'],GPIO1:['UART0 TX','Seri port','USB-Seri haberleşmesinde kullanılır. Program yüklerken çatışmaya dikkat et.'],GPIO3:['UART0 RX','Seri port','USB-Seri haberleşmesinde kullanılır. Program yüklerken çatışmaya dikkat et.'],GPIO18:['VSPI SCK','SPI','VSPI saat hattı için sık kullanılır.'],GPIO19:['VSPI MISO','SPI','VSPI veri girişi için sık kullanılır.'],GPIO23:['VSPI MOSI','SPI','VSPI veri çıkışı için sık kullanılır.'],GPIO5:['VSPI CS · boot strap','Başlatma pini','Açılış davranışını etkileyebilen strapping pinidir.'],GPIO0:['Boot strap','Başlatma pini','Programlama/başlatma modunu etkileyebilir.'],GPIO2:['Boot strap','Başlatma pini','Başlatma sırasında durumuna dikkat et.'],GPIO12:['Boot strap','Başlatma pini','Güç açılışındaki seviyesi flash beslemesini etkileyebilir; dikkatli kullan.'],GPIO15:['Boot strap','Başlatma pini','Başlatma sırasında durumuna dikkat et.']};
    const adc=new Set(['GPIO32','GPIO33','GPIO34','GPIO35','GPIO36','GPIO39','GPIO25','GPIO26','GPIO27','GPIO14','GPIO12','GPIO13','GPIO4','GPIO0','GPIO2','GPIO15']);
    const strap=new Set(['GPIO0','GPIO2','GPIO5','GPIO12','GPIO15']);
    const power=new Set(['VIN','GND','EN']);
    const cols=[['#v4-pins-left',left],['#v4-pins-right',right]];
    const unique=new Map();
    let active=null, filter='all';
    function kindOf(n){return power.has(n)?'power':strap.has(n)?'restricted':adc.has(n)?'adc':'digital';}
    function choose(n){active=n;$$('.v4-pin').forEach(b=>b.classList.toggle('is-current',b.dataset.pin===n));
      const special=extra[n];let title=n,func='Dijital G/Ç · PWM',note='GPIO olarak kullanılabilir. Özel çevre birimi eşlemelerini kullandığın kütüphanede kontrol et.';
      if(special){func=special[0];note=special[2];}else if(adc.has(n)){func='ADC + dijital G/Ç';note='Analog ölçüm için kullanılabilir. Wi-Fi etkinken ADC2 kanallarının sınırlamalarına dikkat et.';}
      const gpio=Number(n.replace('GPIO',''));
      $('#v4-selected-pin').textContent=title;$('#v4-pin-role').textContent=func;
      $('#v4-pin-desc').textContent=note;
      $('#v4-pin-voltage').textContent=n==='VIN'?'Kart modeline göre 5V':n==='GND'?'0V':'3,3V mantık seviyesi';
      $('#v4-pin-type').textContent=kindOf(n)==='restricted'?'Strapping / dikkat':kindOf(n)==='power'?'Güç / kontrol':kindOf(n)==='adc'?'ADC / GPIO':'Dijital GPIO';
      $('#v4-pin-alt').textContent=Number.isFinite(gpio)?('GPIO '+gpio):'—';
      $('#v4-pin-tags').replaceChildren(...(special?special[1].split(' / '):[kindOf(n)]).map(s=>{const el=document.createElement('span');el.textContent=s;return el;}));
    }
    cols.forEach(([selector,arr])=>arr.forEach(pin=>{
      const b=document.createElement('button');b.type='button';b.className='v4-pin';b.dataset.pin=pin;b.dataset.kind=kindOf(pin);
      b.innerHTML='<i class="v4-pin-dot" aria-hidden="true"></i><span></span>';b.querySelector('span').textContent=pin;
      b.setAttribute('aria-label',pin+' pin özelliklerini göster');b.addEventListener('click',()=>choose(pin));
      $(selector).append(b);unique.set(pin,true);
    }));
    $$('.v4-pill[data-filter]').forEach(b=>b.addEventListener('click',()=>{
      filter=b.dataset.filter;$$('.v4-pill[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
      $$('.v4-pin').forEach(x=>x.classList.toggle('is-filtered',filter!=='all'&&x.dataset.kind!==filter));
    }));choose('GPIO21');
  }
})();
