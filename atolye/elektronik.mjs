import {catalog, solve} from './devre.mjs';

const get = id => document.getElementById(id);
const viewport = get('board');
const board = get('dc-surface');
const result = get('result');
const t=text=>window.SiteI18n?.t(text)??text;
let parts = [], wires = [], selected, next = 0;
let zoom=1;
const history=[];
function snapshot(){
  history.push(JSON.stringify({parts,wires,next}));
  if(history.length>40)history.shift();
  get('undo').disabled=false;
}
const wireColors = ['#72e6bc','#9ab5ff','#d7a8fa','#ffc68f'];
const pinNames = {source:['+','−'],led:['A','K']};
const pinLabel = (type,pin) => pinNames[type]?.[pin==='a'?0:1] ?? pin.toUpperCase();
const label = id => {
  const part = parts.find(item => item.id === id.slice(0,-1));
  return t(catalog[part.type].label)+' '+part.id.slice(1)+' / '+pinLabel(part.type,id.at(-1));
};
const button = (text, action) => {
  const element = document.createElement('button');
  element.textContent = text;
  element.onclick = action;
  return element;
};
const clear = () => {
  const message = document.createElement('p');
  message.className = 'empty-state';
  message.textContent = 'Gerilim ve akım değerlerini görmek için devreyi çöz.';
  result.replaceChildren(message);
  board.querySelectorAll('.lit').forEach(part => part.classList.remove('lit'));
};
function drawWires() {
  const svg = board.querySelector('svg');
  svg.replaceChildren();
  const bounds = board.getBoundingClientRect();
  const point = pin => {
    const rect = document.getElementById(pin).getBoundingClientRect();
    return [(rect.left-bounds.left+rect.width/2)/zoom,(rect.top-bounds.top+rect.height/2)/zoom];
  };
  for (const [i,[a,b]] of wires.entries()) {
    const [x1,y1] = point(a), [x2,y2] = point(b);
    const line = document.createElementNS('http://www.w3.org/2000/svg','path');
    const bend = Math.min(board.clientHeight-4,Math.max(y1,y2)+24+(i%3)*8);
    line.setAttribute('d',`M ${x1} ${y1} C ${x1} ${bend}, ${x2} ${bend}, ${x2} ${y2}`);
    line.setAttribute('stroke',wireColors[i%wireColors.length]);
    line.setAttribute('stroke-width','2.5');
    line.setAttribute('stroke-linecap','round');
    line.setAttribute('fill','none');
    svg.append(line);
  }
}
function render() {
  clear();
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('aria-hidden','true');
  board.replaceChildren(svg);
  get('board-count').textContent = `${parts.length} bileşen · ${wires.length} kablo`;
  get('wire-hint').textContent = t(selected ? 'Bağlantı ucu seçildi. Diğer ucu seç.' : 'Bağlamak için iki uç seç.');
  get('wires').replaceChildren();
  wires.forEach(([a,b],i) => {
    const li = document.createElement('li');
    li.append(button(label(a)+' ↔ '+label(b)+' · '+t('Sil'), () => { snapshot();wires.splice(i,1); render(); }));
    get('wires').append(li);
  });
  for (const part of parts) {
    const spec = catalog[part.type];
    const box = document.createElement('div');
    box.className = 'component';
    box.dataset.part = part.id;
    const position = () => {
      box.style.left = `calc(9px + (100% - var(--board-card-width) - 18px) * ${part.x})`;
      box.style.top = `calc(9px + (100% - var(--board-card-height) - 18px) * ${part.y})`;
    };
    position();
    const heading = document.createElement('strong');
    heading.textContent = t(spec.label)+' '+part.id.slice(1);
    const handle = document.createElement('div');
    handle.className = 'component-handle';
    const symbol = document.createElement('span');
    symbol.className = 'symbol '+part.type;
    symbol.setAttribute('aria-hidden','true');
    handle.append(symbol,heading);
    handle.onpointerdown = event => {
      snapshot();
      handle.setPointerCapture(event.pointerId);
      const start = { x:event.clientX, y:event.clientY, px:part.x, py:part.y };
      handle.onpointermove = move => {
        const clamp = value => Math.max(0,Math.min(1,value));
        part.x = clamp(start.px + (move.clientX-start.x)/zoom/Math.max(1,board.clientWidth-box.offsetWidth-18));
        part.y = clamp(start.py + (move.clientY-start.y)/zoom/Math.max(1,board.clientHeight-box.offsetHeight-18));
        position();
        drawWires();
      };
      handle.onlostpointercapture = () => { handle.onpointermove = null; };
    };
    const value = document.createElement('input');
    value.type = part.type === 'switch' ? 'checkbox' : 'number';
    value.value = part.value;
    value.checked = part.value === 1;
    value.min = spec.min;
    value.max = spec.max;
    value.step = 'any';
    value.onchange = () => {
      snapshot();
      if (part.type === 'switch') part.value = Number(value.checked);
      else if (Number.isFinite(value.valueAsNumber) && value.checkValidity()) part.value = value.valueAsNumber;
      else value.value = part.value;
      clear();
    };
    const field = document.createElement('label');
    field.className = 'component-input';
    field.append(spec.unit || t('Kapalı'), value);
    value.setAttribute('aria-label',heading.textContent+' '+(spec.unit || t('kapalı devre')));
    const ports = document.createElement('div');
    ports.className = 'component-ports';
    box.append(handle,field,ports);
    for (const pin of ['a','b']) {
      const id = part.id+pin;
      const port = button(pinLabel(part.type,pin), () => {
        if (selected && selected !== id && !wires.some(wire => wire.includes(id) && wire.includes(selected))) {
          snapshot();wires.push([selected,id]);
        }
        selected = selected ? undefined : id;
        render();
        (selected ? document.getElementById(selected) : document.getElementById(id)).focus();
      });
      port.id = id;
      port.setAttribute('aria-label',label(id));
      port.setAttribute('aria-pressed',String(id===selected));
      ports.append(port);
    }
    const remove = button('×', () => {
      snapshot();
      parts = parts.filter(item => item !== part);
      wires = wires.filter(wire => wire.every(pin => pin.slice(0,-1) !== part.id));
      selected = undefined;
      render();
    });
    remove.setAttribute('aria-label',t('Bileşeni sil')+' '+heading.textContent);
    remove.className = 'remove-part';
    ports.append(remove);
    board.append(box);
  }
  drawWires();
}
function add(type,x,y) {
  parts.push({id:'p'+(++next),type,value:catalog[type].value,x,y});
}
function example() {
  parts = []; wires = []; next = 0; selected = undefined;
  add('source',.12,.20); add('resistor',.88,.20); add('led',.57,.65);
  wires = [['p1a','p2a'],['p2b','p3a'],['p3b','p1b']];
  render();
  showReadings();
}
get('palette').onclick = ({target}) => {
  const type = target.closest('[data-add]')?.dataset.add;
  if (!type) return;
  if (parts.length >= 24) { result.textContent = 'En fazla 24 bileşen eklenebilir.'; return; }
  snapshot();
  add(type, (next % 3)/2, (Math.floor(next/3)%4)/3);
  render();
};
get('example').onclick = () => { snapshot();example(); };
get('undo').onclick = () => {
  const previous=history.pop();if(!previous)return;
  ({parts,wires,next}=JSON.parse(previous));
  selected=undefined;render();
  get('undo').disabled=!history.length;
};
function showReadings() {
  board.querySelectorAll('.lit').forEach(part => part.classList.remove('lit'));
  result.replaceChildren();
  try {
    const table = document.createElement('table');
    table.className = 'readings';
    const header = table.createTHead().insertRow();
    for (const text of ['Bileşen','V','mA']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = text;
      header.append(cell);
    }
    const rows = table.createTBody();
    const format = new Intl.NumberFormat(window.SiteI18n?.getLanguage()==='en'?'en-US':'tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
    let overloaded = false;
    for (const reading of solve(parts,wires)) {
      const part = parts.find(item => item.id === reading.id);
      const row = rows.insertRow();
      const cell = document.createElement('th');
      cell.scope = 'row';
      cell.textContent = `${t(catalog[part.type].label)} ${part.id.slice(1)}`;
      row.append(cell);
      row.insertCell().textContent = format.format(reading.volts);
      row.insertCell().textContent = format.format(1000*reading.amps);
      if (part.type==='led' && reading.amps>.001) {
        board.querySelector(`[data-part="${part.id}"]`).classList.add('lit');
        overloaded ||= reading.amps > .02;
      }
    }
    result.append(table);
    if (overloaded) {
      const warning = document.createElement('p');
      warning.className = 'feedback';
      warning.dataset.state = 'error';
      warning.textContent = 'LED akımı 20 mA üzerinde. Seri direnci kontrol et.';
      result.append(warning);
    }
  } catch (error) { result.textContent = error.message; }
}
get('run').onclick = showReadings;
get('save').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({version:1,parts,wires},null,2)],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'devre.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
};
get('load').onchange = async ({target}) => {
  const file = target.files[0];
  target.value = '';
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error();
    const data = JSON.parse(await file.text());
    if (data.version !== 1 || !Array.isArray(data.parts) || data.parts.length>24 || !Array.isArray(data.wires) || data.wires.length>1128) throw new Error();
    const ids = new Set();
    for (const {id,type,value,x,y} of data.parts) {
      if (typeof id !== 'string' || !/^p[1-9][0-9]{0,6}$/.test(id) || ids.has(id) || !Object.hasOwn(catalog,type)) throw new Error();
      const {min,max} = catalog[type];
      if (!Number.isFinite(value) || value<min || value>max || (type==='switch' && ![0,1].includes(value))) throw new Error();
      if (![x,y].every(n => Number.isFinite(n) && n>=0 && n<=1)) throw new Error();
      ids.add(id);
    }
    const pins = new Set([...ids].flatMap(id=>[id+'a',id+'b']));
    if (!data.wires.every(wire => Array.isArray(wire) && wire.length===2 && wire[0]!==wire[1] && wire.every(pin=>pins.has(pin)))) throw new Error();
    snapshot();
    parts = data.parts; wires = data.wires; next = Math.max(0,...[...ids].map(id=>Number(id.slice(1))));
    selected = undefined;
    render();
  } catch { result.textContent = 'Bu dosya geçerli bir atölye devresi değil.'; }
};
function setZoom(value){
  zoom=Math.max(.45,Math.min(2,value));
  const width=Math.max(620,viewport.clientWidth);
  board.style.width=width+'px';
  board.style.transform='scale('+zoom+')';
  get('dc-stage-shell').style.width=width*zoom+'px';
  get('dc-stage-shell').style.height=450*zoom+'px';
  get('dc-zoom-label').textContent=Math.round(zoom*100)+'%';
  drawWires();
}
get('dc-zoom-in').onclick=()=>setZoom(zoom*1.2);
get('dc-zoom-out').onclick=()=>setZoom(zoom/1.2);
get('dc-zoom-reset').onclick=()=>setZoom(Math.min(1,viewport.clientWidth/620));
document.addEventListener('keydown',event=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(event.key==='Escape'){selected=undefined;render();}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();get('undo').click();}
});
new ResizeObserver(()=>setZoom(zoom)).observe(viewport);
example();
setZoom(Math.min(1,viewport.clientWidth/620));
document.addEventListener('site:languagechange',()=>{
  const measured=!!result.querySelector('table');
  render();if(measured)showReadings();
});
