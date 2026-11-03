'use strict';
/* EC Circuit Studio V6.2 — learning-oriented wire editor. NOT a SPICE simulation or arbitrary Arduino interpreter. */
(() => {
const root=document.getElementById('circuit-studio'); if(!root)return;
const $=s=>root.querySelector(s);
const stage=$('#cs-stage'),partArea=$('#cs-parts'),wireSvg=$('#cs-wirepaths'),preview=$('#cs-previewwire'),viewport=$('#cs-viewport');
const W=1160,H=720, TYPES=['arduino','breadboard','led','resistor','button','sonar','servo','buzzer'];
const names={arduino:'Arduino Uno R3',breadboard:'Breadboard',led:'Kırmızı LED',resistor:'Direnç',button:'Buton',sonar:'HC-SR04',servo:'SG90 Servo',buzzer:'Buzzer'};
const icons={arduino:'▣',breadboard:'▦',led:'◉',resistor:'▰',button:'●',sonar:'◎',servo:'⚙',buzzer:'♫'};
const dims={arduino:[470,290],breadboard:[450,264],led:[126,145],resistor:[186,112],button:[146,136],sonar:[232,148],servo:[176,178],buzzer:[138,136]};
const colors=['#e54c56','#222d3c','#2b82e9','#13b98e','#ffd04d','#b27de8','#f59f4b'];
const codeSamples={
blank:'// EC Circuit Studio\n// Önce bir örnek devre seçin.\n',
led:`// LED + 220 ohm seri direnç · Arduino UNO\nconst int ledPin = 9;\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n  delay(750);\n  digitalWrite(ledPin, LOW);\n  delay(750);\n}\n`,
button:`// Buton: D2 ile GND arasında, dahili pull-up\nconst int buttonPin = 2;\nvoid setup() {\n  pinMode(buttonPin, INPUT_PULLUP);\n  Serial.begin(9600);\n}\nvoid loop() {\n  Serial.println(digitalRead(buttonPin) == LOW ? "BASILI" : "SERBEST");\n  delay(100);\n}\n`,
sonar:`// HC-SR04 · TRIG: D9 · ECHO: D10\nconst int trigPin = 9, echoPin = 10;\nvoid setup() {\n  pinMode(trigPin, OUTPUT);\n  pinMode(echoPin, INPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  digitalWrite(trigPin, LOW); delayMicroseconds(2);\n  digitalWrite(trigPin, HIGH); delayMicroseconds(10);\n  digitalWrite(trigPin, LOW);\n  long us = pulseIn(echoPin, HIGH, 30000);\n  if (us > 0) Serial.println(us * 0.0343 / 2.0);\n  delay(250);\n}\n`,
servo:`// SG90 servo · Sinyal: D11\n#include <Servo.h>\nServo motor;\nvoid setup() { motor.attach(11); }\nvoid loop() {\n  motor.write(0); delay(1000);\n  motor.write(90); delay(1000);\n  motor.write(180); delay(1000);\n}\n`,
buzzer:`// Aktif buzzer · D8 çıkışı / GND\nconst int buzzerPin = 8;\nvoid setup() { pinMode(buzzerPin, OUTPUT); }\nvoid loop() {\n  digitalWrite(buzzerPin, HIGH); delay(400);\n  digitalWrite(buzzerPin, LOW); delay(400);\n}\n`};
let state={parts:[],wires:[],example:'blank'},seq=1,selected=null,pendingPort=null,dragPart=null,paletteDrag=null,wireDrag=null,zoom=1,wireColor=colors[2],running=false,timer=0,tick=0,buttonDown=false,history=[];
let codeRuntime=null, codeLastExample=null, codeDraftTimer=0;
const safeState=window.ECCircuitState;
let codeDrafts=Object.create(null);
try{codeDrafts=safeState.drafts(localStorage.getItem('ege-arduino-code-v62')||'{}');}catch(_){ }

const key=p=>p.part+':'+p.port;
const part=id=>state.parts.find(p=>p.id===id);
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const deep=x=>JSON.parse(JSON.stringify(x));
function snap(){history.push(deep(state));if(history.length>35)history.shift();}
let saveTimer=0;
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('ege-circuit-v5',JSON.stringify(state));$('#cs-save-indicator').textContent='Kaydedildi · bu tarayıcıda';}catch(e){$('#cs-save-indicator').textContent='Yerel kayıt kullanılamıyor';}},250);}
function change(reason=''){stop();render();save(); if(reason && !checkConnections().ok)status(reason);}
function status(msg,kind=''){const el=$('#cs-validation');el.textContent=msg;el.className='cs-validation'+(kind?' '+kind:'');}
function id(){let candidate;do{candidate='p'+(seq++).toString(36);}while(state.parts.some(p=>p.id===candidate)||state.wires.some(w=>w.id===candidate||w.id==='w'+candidate));return candidate;}
function add(type,x,y,{update=true}={}){if(!TYPES.includes(type))return null;if(state.parts.length>=35){status('En fazla 35 bileşen eklenebilir.','bad');return null;}const [w,h]=dims[type];const p={id:id(),type,x:clamp(Math.round(x),5,W-w-5),y:clamp(Math.round(y),5,H-h-5),value:type==='resistor'?220:null};state.parts.push(p);if(update)change(names[type]+' eklendi.');return p}
function mkPort(partId,port,x,y,orientation='bottom',label=port,small=false){const b=document.createElement('button');b.type='button';b.className='cs-port';b.dataset.part=partId;b.dataset.port=port;b.style.left=x+'px';b.style.top=y+'px';b.title=port;b.setAttribute('aria-label',port+' bağlantı ucu');b.addEventListener('pointerdown',startWire);b.addEventListener('click',e=>e.stopPropagation());const lab=document.createElement('span');lab.className='cs-port-label';lab.textContent=label;
if(orientation==='top'){lab.style.left=(x-11)+'px';lab.style.top=(y+11)+'px'}else if(orientation==='bottom'){lab.style.left=(x-10)+'px';lab.style.top=(y-17)+'px'}else if(orientation==='left'){lab.style.left=(x+10)+'px';lab.style.top=(y-5)+'px'}else {lab.style.right=(dims[part(partId).type][0]-x+10)+'px';lab.style.top=(y-5)+'px'}
if(small){lab.style.fontSize='7px'}b.dataset.label=label;return [b,lab]}
function render(){partArea.replaceChildren();for(const p of state.parts)partArea.append(buildPart(p));drawWires();updateCount();showSelection();updateCode();validate(false);}
function buildPart(p){const e=document.createElement('div');e.className='cs-part cs-part-'+p.type+(selected?.type==='part'&&selected.id===p.id?' selected':'');e.dataset.id=p.id;e.style.left=p.x+'px';e.style.top=p.y+'px';const head=document.createElement('div');head.className='cs-part-header';head.innerHTML='<span class="cs-grip">⠿</span><span class="cs-part-name"></span><small>TAŞI</small>';head.querySelector('.cs-part-name').textContent=names[p.type];head.addEventListener('pointerdown',startMove);const body=document.createElement('div');body.className='cs-body';e.append(head,body);e.addEventListener('click',event=>{if(event.target.closest('.cs-port'))return;selected={type:'part',id:p.id};showSelection();});
const put=(port,x,y,face,label,small)=>{const [node,lbl]=mkPort(p.id,port,x,y,face,label,small);e.append(node,lbl)};
if(p.type==='arduino'){
body.innerHTML='<img class="cs-board-art" src="assets/circuit-arduino-pro.svg" alt="" draggable="false">';
Array.from({length:14},(_,i)=>put('D'+i,107+i*25,46,'top',''+i,true));
['IOREF','RESET','3V3','5V','GND','VIN'].forEach((t,i)=>put(t,103+i*26,268,'bottom',t,true));
Array.from({length:6},(_,i)=>put('A'+i,314+i*25,268,'bottom','A'+i,true));
}else if(p.type==='breadboard'){
body.innerHTML='<img class="cs-board-art" src="assets/circuit-breadboard-pro.svg" alt="" draggable="false">';
for(let i=0;i<10;i++){
 let x=49+i*38;
 put('P'+i,x,60,'top','',true);put('N'+i,x,81,'top','',true);
 for(let j=0;j<5;j++){put('T'+i+j,x,112+j*13,'top','',true);put('B'+i+j,x,188+j*13,'top','',true)}
}
}else if(p.type==='led'){body.innerHTML='<span class="cs-led-dome"></span>';put('A',40,134,'bottom','A (+)');put('K',86,134,'bottom','K (−)')}
else if(p.type==='resistor'){body.innerHTML='<span class="cs-res-line"></span><span class="cs-res-tube"></span>';put('L',13,78,'left','1');put('R',172,78,'right','2')}
else if(p.type==='button'){body.innerHTML='<span class="cs-switch-base"></span>';put('1',27,124,'bottom','1');put('2',119,124,'bottom','2')}
else if(p.type==='sonar'){body.innerHTML='<span class="cs-sonar-eyes"><span></span><span></span></span>';['VCC','TRIG','ECHO','GND'].forEach((s,i)=>put(s,28+i*58,134,'bottom',s,true))}
else if(p.type==='servo'){body.innerHTML='<span class="cs-servo-arm"></span><span class="cs-servo-box">SG90</span>';put('VCC',39,166,'bottom','+5V');put('GND',88,166,'bottom','GND');put('SIG',137,166,'bottom','SIG')}
else if(p.type==='buzzer'){body.innerHTML='<span class="cs-buzzer-disk"></span>';put('P',38,127,'bottom','+');put('N',102,127,'bottom','−')}
return e}
function coords(port){const p=part(port.part);if(!p)return null;const element=partArea.querySelector(`.cs-port[data-part="${CSS.escape(port.part)}"][data-port="${CSS.escape(port.port)}"]`);if(!element)return null;return {x:p.x+parseFloat(element.style.left),y:p.y+parseFloat(element.style.top)}}
function point(event){const r=stage.getBoundingClientRect();return {x:clamp((event.clientX-r.left)*W/r.width,0,W),y:clamp((event.clientY-r.top)*H/r.height,0,H)}}
function path(a,b){
  const dx=b.x-a.x,dy=b.y-a.y,absx=Math.abs(dx),absy=Math.abs(dy);
  if(absx<52||absy<24){const c=Math.min(80,Math.max(18,absx*.45));return `M ${a.x} ${a.y} C ${a.x+(dx>=0?c:-c)} ${a.y} ${b.x-(dx>=0?c:-c)} ${b.y} ${b.x} ${b.y}`}
  const mid=a.x+dx/2,sx=Math.sign(mid-a.x),ex=Math.sign(b.x-mid),sy=Math.sign(dy);
  const r=Math.min(18,Math.abs(mid-a.x)*.45,absy*.43);
  return `M ${a.x} ${a.y} L ${mid-sx*r} ${a.y} Q ${mid} ${a.y} ${mid} ${a.y+sy*r} L ${mid} ${b.y-sy*r} Q ${mid} ${b.y} ${mid+ex*r} ${b.y} L ${b.x} ${b.y}`;
}
function drawWires(){wireSvg.replaceChildren();for(const w of state.wires){const a=coords(w.from),b=coords(w.to);if(!a||!b)continue;const d=path(a,b);const g=document.createElementNS('http://www.w3.org/2000/svg','g');const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d',d);line.setAttribute('stroke',w.color);line.setAttribute('class','cs-wire-line'+(selected?.type==='wire'&&selected.id===w.id?' is-selected':''));const hit=document.createElementNS('http://www.w3.org/2000/svg','path');hit.setAttribute('d',d);hit.setAttribute('class','cs-wire-hit');hit.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pendingPort=null;selected={type:'wire',id:w.id};drawWires();showSelection();});const under=document.createElementNS('http://www.w3.org/2000/svg','path');under.setAttribute('d',d);under.setAttribute('class','cs-wire-under');const shine=document.createElementNS('http://www.w3.org/2000/svg','path');shine.setAttribute('d',d);shine.setAttribute('class','cs-wire-shine');g.append(under,line,shine,hit);wireSvg.append(g)}updateCount()}
function updateCount(){$('#cs-count').textContent=state.parts.length+' bileşen · '+state.wires.length+' kablo'}
function finishWire(from,to){if(!to||key(from)===key(to))return; if(state.wires.some(w=>[key(w.from),key(w.to)].sort().join('|')===[key(from),key(to)].sort().join('|'))){status('Bu bağlantı zaten mevcut.');return;} if(state.wires.length>=180){status('En fazla 180 kablo eklenebilir.','bad');return;} snap();state.wires.push({id:'w'+id(),from,to,color:wireColor});selected={type:'wire',id:state.wires.at(-1).id};change('Kablo eklendi.');}
function startWire(e){e.preventDefault();e.stopPropagation();const from={part:e.currentTarget.dataset.part,port:e.currentTarget.dataset.port};if(pendingPort){if(key(pendingPort)!==key(from))finishWire(pendingPort,from);pendingPort=null;preview.setAttribute('d','');return;} wireDrag={from,startX:e.clientX,startY:e.clientY,dragged:false};pendingPort=null;}
document.addEventListener('pointermove',e=>{if(wireDrag){const from=coords(wireDrag.from);if(!from)return;if(Math.hypot(e.clientX-wireDrag.startX,e.clientY-wireDrag.startY)>4)wireDrag.dragged=true;preview.setAttribute('d',path(from,point(e)))}if(dragPart){const current=part(dragPart.id);if(!current)return;const pt=point(e);const [w,h]=dims[current.type];current.x=clamp(Math.round(pt.x-dragPart.dx),3,W-w-3);current.y=clamp(Math.round(pt.y-dragPart.dy),3,H-h-3);const el=partArea.querySelector(`[data-id="${CSS.escape(current.id)}"]`);if(el){el.style.left=current.x+'px';el.style.top=current.y+'px'}drawWires()}if(paletteDrag){paletteDrag.ghost.style.left=e.clientX+10+'px';paletteDrag.ghost.style.top=e.clientY+12+'px'}});
document.addEventListener('pointerup',e=>{if(wireDrag){const target=e.target.closest('.cs-port');const to=target?{part:target.dataset.part,port:target.dataset.port}:null;if(to&&key(wireDrag.from)!==key(to)){finishWire(wireDrag.from,to);pendingPort=null}else if(!wireDrag.dragged){pendingPort=wireDrag.from;status('İkinci bağlantı ucunu seç veya kabloyu oraya sürükle.');}else pendingPort=null;wireDrag=null;preview.setAttribute('d','')} if(dragPart){dragPart=null;save();validate(false)}if(paletteDrag){const rect=stage.getBoundingClientRect();const on=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;const type=paletteDrag.type;const click=Math.hypot(e.clientX-paletteDrag.startX,e.clientY-paletteDrag.startY)<10;paletteDrag.ghost.remove();paletteDrag=null;const pt=on?point(e):{x:clamp(viewport.scrollLeft/zoom+viewport.clientWidth/(2*zoom),75,W-115),y:clamp(viewport.scrollTop/zoom+viewport.clientHeight/(2*zoom),75,H-115)};if(on||click){snap();add(type,pt.x-55,pt.y-38)}else status('Parçayı yerleştirmek için çalışma alanına bırak.')}});
function startMove(e){e.preventDefault();e.stopPropagation();const elem=e.currentTarget.closest('.cs-part');const p=part(elem.dataset.id);if(!p)return;selected={type:'part',id:p.id};showSelection();snap();const pt=point(e);dragPart={id:p.id,dx:pt.x-p.x,dy:pt.y-p.y};}
function showSelection(){partArea.querySelectorAll('.cs-part').forEach(el=>el.classList.toggle('selected',selected?.type==='part'&&el.dataset.id===selected.id));const ins=$('#cs-inspector');ins.replaceChildren();if(!selected){ins.innerHTML='<p>Bir bileşen veya kablo seçerek özelliklerini buradan değiştir.</p>';return}
if(selected.type==='part'){const p=part(selected.id);if(!p){selected=null;return;}const title=document.createElement('h3');title.textContent=names[p.type];ins.append(title);const hint=document.createElement('p');hint.className='cs-helper';hint.textContent='Başlık çubuğundan taşıyabilirsin. Silmek için Delete tuşunu kullan.';ins.append(hint);
if(p.type==='resistor'){const label=document.createElement('label');label.className='cs-prop';label.textContent='Direnç (Ω)';const sel=document.createElement('select');[100,150,220,330,470,1000,10000].forEach(v=>{const o=new Option(v+' Ω',String(v));sel.append(o)});sel.value=String(p.value||220);sel.addEventListener('change',()=>{snap();p.value=Number(sel.value);change('Direnç '+p.value+' Ω olarak güncellendi.')});label.append(sel);ins.append(label)}
}else{const w=state.wires.find(w=>w.id===selected.id);if(!w)return;const title=document.createElement('h3');title.textContent='Kablo';ins.append(title);const p=document.createElement('p');p.textContent=`${w.from.port} → ${w.to.port}`;ins.append(p);const btn=document.createElement('button');btn.className='cs-button cs-soft';btn.textContent='Bu kabloyu sil';btn.addEventListener('click',()=>removeSelected());ins.append(btn)}
}
function removeSelected(){if(!selected)return;snap();if(selected.type==='part'){state.parts=state.parts.filter(p=>p.id!==selected.id);state.wires=state.wires.filter(w=>w.from.part!==selected.id&&w.to.part!==selected.id)}else state.wires=state.wires.filter(w=>w.id!==selected.id);selected=null;change('Seçim silindi.')}
const tiles=[['arduino','Arduino Uno','Kart','boards'],['breadboard','Breadboard','Bağlantı tahtası','boards'],['led','LED','Çıkış','output'],['resistor','Direnç','100–10k Ω','passive'],['button','Buton','Giriş','passive'],['sonar','HC-SR04','Mesafe','sensor'],['servo','SG90 Servo','Motor','output'],['buzzer','Buzzer','Ses','output']];
const thumbs={
arduino:'<span class="cs-mini-art cs-mini-arduino" aria-hidden="true"></span>',
breadboard:'<span class="cs-mini-art cs-mini-breadboard" aria-hidden="true"></span>',
led:'<svg viewBox="0 0 100 64" aria-hidden="true"><defs><radialGradient id="ledg"><stop stop-color="#ffb2b2"/><stop offset=".3" stop-color="#ff4e59"/><stop offset="1" stop-color="#ac1327"/></radialGradient></defs><path d="M43 38V60M57 38V60" stroke="#9daab9" stroke-width="3"/><path d="M30 38V20a20 20 0 0 1 40 0v18Z" fill="url(#ledg)" stroke="#e65058" stroke-width="2"/><ellipse cx="43" cy="18" rx="6" ry="9" fill="#fff" opacity=".45"/></svg>',
resistor:'<svg viewBox="0 0 100 64" aria-hidden="true"><path d="M3 33H27M72 33H97" stroke="#889cac" stroke-width="4"/><rect x="25" y="23" width="50" height="20" rx="8" fill="#e7c493" stroke="#b98c5c"/><path d="M38 23V43" stroke="#8b4a2b" stroke-width="5"/><path d="M48 23V43" stroke="#ce2828" stroke-width="5"/><path d="M58 23V43" stroke="#8b4a2b" stroke-width="5"/></svg>',
button:'<svg viewBox="0 0 100 64" aria-hidden="true"><path d="M29 15H71V49H29Z" rx="7" fill="#303b4a" stroke="#9dadc0" stroke-width="4"/><circle cx="50" cy="32" r="14" fill="#d0d9e4" stroke="#73869e" stroke-width="3"/></svg>',
sonar:'<svg viewBox="0 0 100 64" aria-hidden="true"><rect x="9" y="6" width="82" height="52" rx="5" fill="#177caa" stroke="#0c5780" stroke-width="2"/><circle cx="31" cy="29" r="19" fill="#9fb1c3"/><circle cx="69" cy="29" r="19" fill="#9fb1c3"/><circle cx="31" cy="29" r="12" fill="#424f5d"/><circle cx="69" cy="29" r="12" fill="#424f5d"/></svg>',
servo:'<svg viewBox="0 0 100 64" aria-hidden="true"><rect x="26" y="19" width="48" height="37" rx="6" fill="#186cbd" stroke="#0d4284" stroke-width="3"/><rect x="42" y="10" width="16" height="12" rx="3" fill="#dae5ee"/><path d="M50 11L77 5" stroke="#eef5fa" stroke-width="7" stroke-linecap="round"/><text x="50" y="42" text-anchor="middle" font-size="10" font-family="Arial" font-weight="bold" fill="#fff">SG90</text></svg>',
buzzer:'<svg viewBox="0 0 100 64" aria-hidden="true"><circle cx="50" cy="32" r="25" fill="#2c3949" stroke="#566879" stroke-width="3"/><circle cx="50" cy="32" r="14" fill="#111b29"/><circle cx="50" cy="32" r="5" fill="#394959"/></svg>'
};
let currentCategory='all';
function applyPaletteFilter(){const q=$('#cs-search').value.toLocaleLowerCase('tr');let visible=0;$('#cs-palette').querySelectorAll('.cs-palette-item').forEach(el=>{const show=(currentCategory==='all'||el.dataset.category===currentCategory)&&el.dataset.name.includes(q);el.hidden=!show;if(show)visible++});$('#cs-palette-count').textContent=visible+' bileşen gösteriliyor.'}
function initPalette(){const pal=$('#cs-palette');pal.replaceChildren();tiles.forEach(([type,name,sub,category])=>{
  const b=document.createElement('button');b.type='button';b.className='cs-palette-item';b.dataset.name=(name+' '+sub).toLocaleLowerCase('tr');b.dataset.category=category;
  b.innerHTML=`<span class="cs-item-icon" aria-hidden="true">${thumbs[type]}</span><strong>${name}</strong><small>${sub}</small>`;
  b.addEventListener('pointerdown',e=>{
    e.preventDefault();const ghost=document.createElement('div');ghost.className='cs-ghost';ghost.innerHTML='<span class="cs-ghost-picture">'+thumbs[type]+'</span><span class="cs-ghost-copy"><strong>'+name+'</strong><small>Çalışma alanına bırak</small></span>';document.body.append(ghost);ghost.style.left=e.clientX+16+'px';ghost.style.top=e.clientY+15+'px';paletteDrag={type,ghost,startX:e.clientX,startY:e.clientY};
  });pal.append(b)
});applyPaletteFilter()}
$('#cs-search').addEventListener('input',applyPaletteFilter);
$('#cs-filterbar').querySelectorAll('.cs-filter').forEach(b=>b.addEventListener('click',()=>{currentCategory=b.dataset.category;$('#cs-filterbar').querySelectorAll('.cs-filter').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active?'true':'false')});applyPaletteFilter()}));
const wireSwatches=$('#cs-swatches');colors.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='cs-swatch'+(c===wireColor?' selected':'');b.style.background=c;b.setAttribute('aria-label','Kablo rengi '+c);b.addEventListener('click',()=>{wireColor=c;wireSwatches.querySelectorAll('button').forEach(el=>el.classList.toggle('selected',el===b));if(selected?.type==='wire'){const w=state.wires.find(w=>w.id===selected.id);if(w){snap();w.color=c;change('Kablo rengi değiştirildi.')}}});wireSwatches.append(b)});
function tabs(tab){root.querySelectorAll('.cs-tab').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});['parts','inspect','code'].forEach(t=>{$('#cs-pane-'+t).hidden=t!==tab})}
root.querySelectorAll('.cs-tab').forEach(b=>b.addEventListener('click',()=>tabs(b.dataset.tab)));
function addWires(links){for(let [a,p,b,q,c] of links){state.wires.push({id:'w'+id(),from:{part:a.id,port:p},to:{part:b.id,port:q},color:colors[c]})}}
function loadExample(kind='blank'){snap();state={parts:[],wires:[],example:kind};selected=null;pendingPort=null;stop();const board=add('arduino',70,280,{update:false});const bread=add('breadboard',610,82,{update:false});
if(kind==='led'){const r=add('resistor',617,397,{update:false}),l=add('led',896,403,{update:false});addWires([[board,'D9',r,'L',2],[r,'R',l,'A',0],[l,'K',board,'GND',1]])}
if(kind==='button'){const b=add('button',810,386,{update:false});addWires([[board,'D2',b,'1',2],[board,'GND',b,'2',1]])}
if(kind==='sonar'){const s=add('sonar',740,379,{update:false});addWires([[board,'5V',s,'VCC',0],[board,'GND',s,'GND',1],[board,'D9',s,'TRIG',3],[board,'D10',s,'ECHO',2]])}
if(kind==='servo'){const s=add('servo',810,392,{update:false});addWires([[board,'5V',s,'VCC',0],[board,'GND',s,'GND',1],[board,'D11',s,'SIG',3]])}
if(kind==='buzzer'){const b=add('buzzer',815,415,{update:false});addWires([[board,'D8',b,'P',2],[board,'GND',b,'N',1]])}
$('#cs-presets').value=kind;change(kind==='blank'?'Boş çalışma alanı hazır.':names[kind]||'Örnek devre yüklendi.');}
// Breadboard terminal groups conduct across five holes in each numbered half-row, and rails along their entire segment.
function makeDsu(){const parent=new Map();const find=x=>{if(!parent.has(x))parent.set(x,x);const p=parent.get(x);if(p!==x)parent.set(x,find(p));return parent.get(x)};const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent.set(b,a)};
for(const p of state.parts.filter(p=>p.type==='breadboard')){for(let k=1;k<10;k++){join(p.id+':P0',p.id+':P'+k);join(p.id+':N0',p.id+':N'+k)}for(let i=0;i<10;i++){for(let j=1;j<5;j++){join(p.id+':T'+i+'0',p.id+':T'+i+j);join(p.id+':B'+i+'0',p.id+':B'+i+j)}}}
for(const w of state.wires)join(key(w.from),key(w.to));return {find,join}}
function checkConnections(){const ds=makeDsu();const has=(a,b)=>ds.find(a)===ds.find(b);const boards=state.parts.filter(p=>p.type==='arduino');const getBoard=n=>boards.some(b=>has(b.id+':'+n,b.id+':'+n));const connected=(pin,comp,pin2)=>boards.some(b=>has(b.id+':'+pin,comp.id+':'+pin2));const errors=[];let ok=false,kind=state.example;
if(boards.length===0)return {ok:false,errors:['Çalışma alanına Arduino Uno ekle.']};
const ground=(p,terminal)=>connected('GND',p,terminal);
// Exclude circuits with direct power-to-ground short through wires/breadboard.
if(boards.some(b=>has(b.id+':5V',b.id+':GND')))errors.push('Uyarı: 5V ve GND kabloyla kısa devre olmuş!');
if(boards.some(b=>has(b.id+':D9',b.id+':GND')&&kind==='led'))errors.push('D9 ile GND doğrudan bağlanmış.');
const components=state.parts.filter(p=>p.type===kind||(kind==='led'&&p.type==='led'));
if(kind==='blank')errors.push('Örnek devre seç veya sağ panelden bileşenler yerleştir.');
else if(kind==='led'){const l=components.find(p=>p.type==='led'),rs=state.parts.filter(p=>p.type==='resistor'&&Number(p.value)>=150&&Number(p.value)<=1000);if(!l)errors.push('LED ekle.');else{const valid=rs.some(r=>(connected('D9',r,'L')&&has(r.id+':R',l.id+':A'))||(connected('D9',r,'R')&&has(r.id+':L',l.id+':A')));if(!valid)errors.push('D9 → 150–1000 Ω direnç → LED anot (+) bağla.');if(!ground(l,'K'))errors.push('LED katot (−) ucunu GND’ye bağla.');if(connected('D9',l,'A'))errors.push('LED anodu direnci atlayarak doğrudan D9’a bağlanmış.')}}
else if(kind==='button'){const b=components.find(p=>p.type==='button');if(!b)errors.push('Buton ekle.');else if(!((connected('D2',b,'1')&&ground(b,'2'))||(connected('D2',b,'2')&&ground(b,'1'))))errors.push('Butonu D2 ve GND arasına bağla (INPUT_PULLUP).')}
else if(kind==='sonar'){const s=components.find(p=>p.type==='sonar');if(!s)errors.push('HC-SR04 ekle.');else for(const [a,b] of [['5V','VCC'],['GND','GND'],['D9','TRIG'],['D10','ECHO']])if(!connected(a,s,b))errors.push(a+' → '+b+' bağlantısı eksik.')}
else if(kind==='servo'){const s=components.find(p=>p.type==='servo');if(!s)errors.push('SG90 ekle.');else for(const [a,b] of [['5V','VCC'],['GND','GND'],['D11','SIG']])if(!connected(a,s,b))errors.push(a+' → '+b+' bağlantısı eksik.')}
else if(kind==='buzzer'){const s=components.find(p=>p.type==='buzzer');if(!s)errors.push('Buzzer ekle.');else for(const [a,b] of [['D8','P'],['GND','N']])if(!connected(a,s,b))errors.push(a+' → '+b+' bağlantısı eksik.')}
ok=errors.length===0;return {ok,errors};}
function validate(show=true){const v=checkConnections();if(!running){if(v.ok)status('✓ Bağlantılar uygun görünüyor. Örnek simülasyonu başlatabilirsin.','good');else status((show?'Kontrol sonucu:\n':'')+v.errors.join('\n'),v.errors.some(x=>x.includes('kısa devre'))?'bad':'')}return v.ok}
function stop(){
 running=false;clearInterval(timer);timer=0;
 if(codeRuntime){codeRuntime.stop();codeRuntime=null;}
 $('#cs-demo').hidden=true;$('#cs-run').disabled=false;$('#cs-stop').disabled=true;
 $('#cs-code-run').disabled=false;$('#cs-code-stop').disabled=true;
 partArea.querySelectorAll('.cs-led-dome').forEach(e=>e.classList.remove('on'));
 partArea.querySelectorAll('.cs-servo-arm').forEach(e=>e.style.setProperty('--servo-angle','0deg'));
}
function showDemo(){if(!running)return;const kind=state.example;const light=$('#cs-demo-indicator'),text=$('#cs-demo-text');light.classList.remove('on');if(kind==='led'){const on=tick%2===0;light.classList.toggle('on',on);partArea.querySelectorAll('.cs-led-dome').forEach(el=>el.classList.toggle('on',on));text.textContent='D9: '+(on?'HIGH · LED YANIYOR':'LOW · LED SÖNÜK')}
if(kind==='button'){text.textContent=buttonDown?'D2: LOW · BUTON BASILI':'D2: HIGH · SERBEST';light.classList.toggle('on',buttonDown);partArea.querySelectorAll('.cs-switch-base').forEach(el=>el.classList.toggle('pressed',buttonDown))}
if(kind==='sonar'){text.textContent='Mesafe: '+$('#cs-distance').value+' cm (örnek veri)';light.classList.add('on')}
if(kind==='servo'){text.textContent='SG90 açı: '+$('#cs-angle').value+'° (örnek)';partArea.querySelectorAll('.cs-servo-arm').forEach(el=>el.style.setProperty('--servo-angle',($('#cs-angle').value-90)+'deg'));light.classList.add('on')}
if(kind==='buzzer'){text.textContent=tick%2===0?'D8: HIGH · BUZZER AÇIK':'D8: LOW · BUZZER KAPALI';light.classList.toggle('on',tick%2===0)}}
$('#cs-run').addEventListener('click',()=>{if(!validate(true))return;running=true;tick=0;$('#cs-demo').hidden=false;$('#cs-run').disabled=true;$('#cs-stop').disabled=false;$('#cs-distance-wrap').hidden=state.example!=='sonar';$('#cs-press').hidden=state.example!=='button';$('#cs-angle-wrap').hidden=state.example!=='servo';showDemo();if(['led','buzzer'].includes(state.example))timer=setInterval(()=>{if(!document.hidden){tick++;showDemo()}},750);status('Simülasyon çalışıyor · ölçümler örnektir.','good')});
$('#cs-stop').addEventListener('click',()=>{stop();validate(true)});
$('#cs-distance').addEventListener('input',e=>{$('#cs-distance-output').textContent=e.target.value+' cm';showDemo()});
$('#cs-angle').addEventListener('input',e=>{$('#cs-angle-output').textContent=e.target.value+'°';showDemo()});
$('#cs-press').addEventListener('click',()=>{buttonDown=!buttonDown;showDemo()});
function updateCode(){
 if(codeLastExample!==state.example){
   codeLastExample=state.example;
   $('#cs-code').value=typeof codeDrafts[state.example]==='string'?codeDrafts[state.example]:(codeSamples[state.example]||codeSamples.blank);
   $('#cs-code-result').textContent='Kodunu düzenle, sonra Kontrol Et veya Kodu çalıştır seç.';
 }
}
function storeCode(){
 if($('#cs-code').value.length>14000){codeMessage('Kod en fazla 14.000 karakter olabilir.','bad');return;}
 codeDrafts[state.example]=$('#cs-code').value;
 clearTimeout(codeDraftTimer);
 codeDraftTimer=setTimeout(()=>{try{localStorage.setItem('ege-arduino-code-v62',JSON.stringify(codeDrafts));}catch(_){}},220);
}
function codeMessage(message,kind=''){
 const el=$('#cs-code-result');el.textContent=message;el.className='cs-code-result'+(kind?' '+kind:'');
}
const serialEl=$('#cs-serial');
function serialWrite(value){
 if(serialEl.textContent==='Çalıştırınca komut çıktıları burada görünecek.')serialEl.textContent='';
 serialEl.textContent=(serialEl.textContent+value).slice(-6500);
 serialEl.scrollTop=serialEl.scrollHeight;
}
$('#cs-serial-clear').addEventListener('click',()=>serialEl.textContent='');
$('#cs-code').addEventListener('input',()=>{
 if(codeRuntime){stop();codeMessage('Kod değişti. Yeniden başlatabilirsin.');}
 storeCode();
});
$('#cs-code').addEventListener('keydown',e=>{
 if(e.key==='Tab'){e.preventDefault();const ta=e.target,start=ta.selectionStart,end=ta.selectionEnd;ta.setRangeText('  ',start,end,'end');storeCode();}
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('#cs-code-run').click();}
});
$('#cs-code-reset').addEventListener('click',()=>{
 if(!confirm('Bu örnek için yazdığın kodun yerine başlangıç örneği yüklensin mi?'))return;
 stop();delete codeDrafts[state.example];
 $('#cs-code').value=codeSamples[state.example]||codeSamples.blank;
 try{localStorage.setItem('ege-arduino-code-v62',JSON.stringify(codeDrafts));}catch(_){}
 codeMessage('Örnek kod yüklendi.','good');
});
function compileCurrent(){
 try{
   if(!window.ECArduinoSim)throw Error('Kod yorumlayıcısı bulunamadı; dosyaları aynı klasöre yükle.');
   const parsed=window.ECArduinoSim.compile($('#cs-code').value);
   codeMessage('✓ Sözdizimi kontrolü geçti. Desteklenen komutlar çalıştırılabilir.','good');
   return parsed;
 }catch(error){
   codeMessage('✕ '+error.message,'bad');
   status('Kod hatası: '+error.message,'bad');
   return null;
 }
}
$('#cs-code-verify').addEventListener('click',()=>compileCurrent());
function makeCodeHardware(){
 const ds=makeDsu(), boards=state.parts.filter(p=>p.type==='arduino');
 const connected=(pin,p,port)=>boards.some(board=>ds.find(board.id+':'+pin)===ds.find(p.id+':'+port));
 const ground=(p,port)=>connected('GND',p,port);
 const pinName=n=>'D'+n;
 function ledOnPin(n){
  return state.parts.filter(p=>p.type==='led').filter(l=>ground(l,'K')&&state.parts.filter(p=>p.type==='resistor'&&Number(p.value)>=150&&Number(p.value)<=1000).some(r=>
    (connected(pinName(n),r,'L')&&ds.find(r.id+':R')===ds.find(l.id+':A'))||
    (connected(pinName(n),r,'R')&&ds.find(r.id+':L')===ds.find(l.id+':A'))));
 }
 function buzzerOnPin(n){return state.parts.filter(p=>p.type==='buzzer').filter(b=>connected(pinName(n),b,'P')&&ground(b,'N'));}
 function buttonOnPin(n){return state.parts.filter(p=>p.type==='button').some(b=>(connected(pinName(n),b,'1')&&ground(b,'2'))||(connected(pinName(n),b,'2')&&ground(b,'1')));}
 function servoOnPin(n){return state.parts.filter(p=>p.type==='servo').filter(b=>connected(pinName(n),b,'SIG')&&connected('5V',b,'VCC')&&ground(b,'GND'));}
 const sonic=state.parts.find(p=>p.type==='sonar'&&connected('5V',p,'VCC')&&ground(p,'GND'));
 return {ledOnPin,buzzerOnPin,buttonOnPin,servoOnPin,
  sonarPin:n=>!!sonic&&connected(pinName(n),sonic,'ECHO')};
}
function runCurrentCode(){
 stop();const parsed=compileCurrent();if(!parsed)return;
 if(!state.parts.some(p=>p.type==='arduino')){
  codeMessage('Önce çalışma alanına Arduino Uno ekle.','bad');return;
 }
 const hardware=makeCodeHardware();
 const outputPins=new Map();
 let serialEvents=0;
 serialEl.textContent='[EC Arduino simülasyonu başlatıldı]\n';
 const visualOutput=(pin,value)=>{
  outputPins.set(pin,value);
  const on=Number(value)>0;
  const ledParts=hardware.ledOnPin(pin);
  ledParts.forEach(p=>partArea.querySelector('.cs-part[data-id="'+CSS.escape(p.id)+'"] .cs-led-dome')?.classList.toggle('on',on));
  const connectedOutputs=ledParts.length+hardware.buzzerOnPin(pin).length;
  const msg='D'+pin+': '+(on?'HIGH':'LOW')+(connectedOutputs?' · '+connectedOutputs+' bileşen':' · bağlı çıkış bulunamadı');
  $('#cs-demo-text').textContent=msg;
  $('#cs-demo-indicator').classList.toggle('on',on);
 };
 const readPin=pin=>hardware.buttonOnPin(pin)?(buttonDown?0:1):1;
 const hooks={
  write:visualOutput,
  analog:(pin,value)=>visualOutput(pin,value),
  read:readPin,
  analogRead:()=>512,
  pulseIn:pin=>hardware.sonarPin(pin)?Math.round(Number($('#cs-distance').value)*2/0.0343):0,
  servo:(pin,angle)=>{
    for(const p of hardware.servoOnPin(pin))partArea.querySelector('.cs-part[data-id="'+CSS.escape(p.id)+'"] .cs-servo-arm')?.style.setProperty('--servo-angle',Math.max(-90,Math.min(90,angle-90))+'deg');
    $('#cs-demo-text').textContent='Servo D'+pin+': '+angle+'°';
  },
  tone:(pin,freq)=>visualOutput(pin,freq>0?1:0),
  serial:text=>{if(serialEvents++<500)serialWrite(text);},
  error:err=>{
    serialWrite('\n[Simülasyon durdu: '+err.message+']\n');
    codeMessage('Çalışma zamanı hatası: '+err.message,'bad');
    status('Kod çalıştırma hatası: '+err.message,'bad');
    stop();
  }
 };
 try{
  codeRuntime=window.ECArduinoSim.createRuntime(parsed,hooks);
  $('#cs-code-run').disabled=true;$('#cs-code-stop').disabled=false;
  $('#cs-run').disabled=true;$('#cs-stop').disabled=false;
  $('#cs-demo').hidden=false;
  $('#cs-distance-wrap').hidden=state.example!=='sonar';
  $('#cs-press').hidden=state.example!=='button';
  $('#cs-angle-wrap').hidden=true;
  $('#cs-demo-text').textContent='Arduino komutları çalıştırılıyor...';
  codeMessage('▶ Kod çalışıyor. Seri monitörü ve devreyi izle.','good');
  status('Kod, bağlı parçalar üzerinde simüle ediliyor. Gerçek donanım değildir.','good');
  codeRuntime.start();
 }catch(error){stop();codeMessage('Çalıştırma hatası: '+error.message,'bad');}
}
$('#cs-code-run').addEventListener('click',runCurrentCode);
$('#cs-code-stop').addEventListener('click',()=>{stop();codeMessage('■ Kod çalıştırma durduruldu.');});
$('#cs-copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('#cs-code').value);codeMessage('Kod panoya kopyalandı.','good');}
 catch(_){codeMessage('Panoya erişim izni yok; kodu seçip kopyalayabilirsin.');}
});
function download(name,body,type){const blob=new Blob([body],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('#cs-download').addEventListener('click',()=>download('ec-'+state.example+'.ino',$('#cs-code').value,'text/plain;charset=utf-8'));
$('#cs-export').addEventListener('click',()=>download('ec-arduino-devre.json',JSON.stringify({format:'ege-circuit-v5',...state,sketch:$('#cs-code').value},null,2),'application/json'));
$('#cs-import').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>128000)throw Error('Dosya çok büyük');
  const next=safeState.normalize(safeState.parse(await file.text()),true);
  const {sketch,...circuit}=next;
  snap();stop();state=circuit;seq=Math.max(seq,state.parts.length+201);selected=null;pendingPort=null;
  $('#cs-presets').value=state.example;
  if(typeof sketch==='string'){codeDrafts[state.example]=sketch;codeLastExample=null;}
  change('Devre ve Arduino kodu dosyadan açıldı.');storeCode();
 }catch(err){status('Dosya açılamadı. Biçimi, bağlantıları ve 128 KB sınırını kontrol et. Mevcut devren korunuyor.','bad');}
 finally{e.target.value='';}
});
$('#cs-example').addEventListener('click',()=>loadExample($('#cs-presets').value));
$('#cs-undo').addEventListener('click',()=>{if(!history.length)return;stop();state=history.pop();selected=null;$('#cs-presets').value=state.example;change('Son işlem geri alındı.')});
$('#cs-delete').addEventListener('click',removeSelected);$('#cs-clear').addEventListener('click',()=>{if(!confirm('Çalışma alanındaki bütün bileşenler ve kablolar silinsin mi?'))return;snap();state.parts=[];state.wires=[];selected=null;state.example='blank';$('#cs-presets').value='blank';change('Çalışma alanı temizlendi.')});
function setZoom(z,anchor){
 const prev=zoom;
 const rect=stage.getBoundingClientRect();
 const view=viewport.getBoundingClientRect();
 const px=anchor?.x??view.left+view.width/2,py=anchor?.y??view.top+view.height/2;
 const localX=(px-rect.left)/prev,localY=(py-rect.top)/prev;
 zoom=clamp(z,.45,2.5);
 if(Math.abs(zoom-prev)<.0005)return;
 stage.style.transform='scale('+zoom+')';
 $('#cs-stage-shell').style.width=(W*zoom)+'px';
 $('#cs-stage-shell').style.height=(H*zoom)+'px';
 $('#cs-zoom-label').textContent=Math.round(zoom*100)+'%';
 const after=stage.getBoundingClientRect();
 viewport.scrollLeft+=after.left+localX*zoom-px;
 viewport.scrollTop+=after.top+localY*zoom-py;
 drawWires();
}
viewport.addEventListener('wheel',e=>{
 e.preventDefault();
 const direction=Math.max(-1.5,Math.min(1.5,e.deltaY/(e.deltaMode===1?5:e.deltaMode===2?100:110)));
 setZoom(zoom*Math.pow(0.88,direction),{x:e.clientX,y:e.clientY});
},{passive:false});
$('#cs-zoom-in').addEventListener('click',()=>setZoom(zoom*1.15));
$('#cs-zoom-out').addEventListener('click',()=>setZoom(zoom/1.15));
stage.addEventListener('pointerdown',e=>{if(e.target===stage){selected=null;pendingPort=null;showSelection();drawWires()}});
document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$('#cs-undo').click()}if(e.key==='Escape'){selected=null;pendingPort=null;preview.setAttribute('d','');showSelection();drawWires()}if(e.key==='Delete'&&selected){e.preventDefault();removeSelected()}});
// Auto-load the user's work, keep the known example ready for first-time visitors.
initPalette();try{
 const raw=localStorage.getItem('ege-circuit-v5');
 if(raw){const {sketch,...circuit}=safeState.normalize(safeState.parse(raw));state=circuit;seq=state.parts.length+201;$('#cs-presets').value=state.example;render();save();status('Önceki devren otomatik yüklendi.');}
 else loadExample('led');
}catch(e){loadExample('led');status('Yerel kayıt okunamadı; güvenli başlangıç devresi açıldı.','bad');}
setZoom(innerWidth<750?.75:1);if(innerWidth<750){viewport.scrollLeft=20;viewport.scrollTop=120}
})();
