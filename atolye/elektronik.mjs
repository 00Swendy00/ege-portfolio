import {catalog, solve} from './devre.mjs';

const get = id => document.getElementById(id);
const board = get('board');
const result = get('result');
let parts = [], wires = [], selected, next = 0;
const label = id => {
  const part = parts.find(item => item.id === id.slice(0,-1));
  return catalog[part.type].label + ' ' + part.id.slice(1) + ' / ' + (id.endsWith('a') ? 'A' : 'B');
};
const button = (text, action) => {
  const element = document.createElement('button');
  element.textContent = text;
  element.onclick = action;
  return element;
};
const clear = () => {
  result.textContent = '';
  board.querySelectorAll('.lit').forEach(part => part.classList.remove('lit'));
};
function drawWires() {
  const svg = board.querySelector('svg');
  svg.replaceChildren();
  const bounds = board.getBoundingClientRect();
  const point = pin => {
    const rect = document.getElementById(pin).getBoundingClientRect();
    return [rect.left-bounds.left+rect.width/2,rect.top-bounds.top+rect.height/2];
  };
  for (const [a,b] of wires) {
    const [x1,y1] = point(a), [x2,y2] = point(b);
    const line = document.createElementNS('http://www.w3.org/2000/svg','path');
    line.setAttribute('d',`M ${x1} ${y1} C ${x1} ${Math.max(y1,y2)+38}, ${x2} ${Math.max(y1,y2)+38}, ${x2} ${y2}`);
    line.setAttribute('stroke','#76d9fc');
    line.setAttribute('stroke-width','3');
    line.setAttribute('fill','none');
    svg.append(line);
  }
}
function render() {
  clear();
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('aria-hidden','true');
  board.replaceChildren(svg);
  get('wires').replaceChildren();
  wires.forEach(([a,b],i) => {
    const li = document.createElement('li');
    li.append(button(label(a)+' ↔ '+label(b)+' · Sil', () => { wires.splice(i,1); render(); }));
    get('wires').append(li);
  });
  for (const part of parts) {
    const spec = catalog[part.type];
    const box = document.createElement('div');
    box.className = 'component';
    box.dataset.part = part.id;
    const position = () => {
      box.style.left = `calc((100% - 122px) * ${part.x})`;
      box.style.top = `calc((100% - 105px) * ${part.y})`;
    };
    position();
    const heading = document.createElement('strong');
    heading.textContent = spec.label+' '+part.id.slice(1);
    heading.onpointerdown = event => {
      heading.setPointerCapture(event.pointerId);
      const start = { x:event.clientX, y:event.clientY, px:part.x, py:part.y };
      heading.onpointermove = move => {
        const clamp = value => Math.max(0,Math.min(1,value));
        part.x = clamp(start.px + (move.clientX-start.x)/Math.max(1,board.clientWidth-122));
        part.y = clamp(start.py + (move.clientY-start.y)/Math.max(1,board.clientHeight-105));
        position();
        drawWires();
      };
      heading.onlostpointercapture = () => { heading.onpointermove = null; };
    };
    const value = document.createElement('input');
    value.type = part.type === 'switch' ? 'checkbox' : 'number';
    value.value = part.value;
    value.checked = part.value === 1;
    value.min = spec.min;
    value.max = spec.max;
    value.step = 'any';
    value.onchange = () => {
      if (part.type === 'switch') part.value = Number(value.checked);
      else if (Number.isFinite(value.valueAsNumber) && value.checkValidity()) part.value = value.valueAsNumber;
      else value.value = part.value;
      clear();
    };
    const field = document.createElement('label');
    field.append(spec.unit || 'Kapalı devre', ' ', value);
    box.append(heading,field);
    for (const pin of ['a','b']) {
      const id = part.id+pin;
      const port = button(pin.toUpperCase(), () => {
        if (selected && selected !== id && !wires.some(wire => wire.includes(id) && wire.includes(selected))) wires.push([selected,id]);
        selected = selected ? undefined : id;
        render();
        (selected ? document.getElementById(selected) : document.getElementById(id)).focus();
      });
      port.id = id;
      port.setAttribute('aria-label',label(id));
      port.setAttribute('aria-pressed',String(id===selected));
      box.append(port);
    }
    const remove = button('Sil', () => {
      parts = parts.filter(item => item !== part);
      wires = wires.filter(wire => wire.every(pin => pin.slice(0,-1) !== part.id));
      selected = undefined;
      render();
    });
    remove.setAttribute('aria-label',heading.textContent+' bileşenini sil');
    box.append(remove);
    board.append(box);
  }
  drawWires();
}
function add(type,x,y) {
  parts.push({id:'p'+(++next),type,value:catalog[type].value,x,y});
}
function example() {
  parts = []; wires = []; next = 0; selected = undefined;
  add('source',.06,.1); add('resistor',.87,.17); add('led',.64,.64);
  wires = [['p1a','p2a'],['p2b','p3a'],['p3b','p1b']];
  render();
}
get('palette').onclick = ({target}) => {
  const type = target.dataset.add;
  if (!type) return;
  if (parts.length >= 24) { result.textContent = 'En fazla 24 bileşen eklenebilir.'; return; }
  add(type, (next % 3)/2, (Math.floor(next/3)%4)/3);
  render();
};
get('example').onclick = example;
get('run').onclick = () => {
  clear();
  try {
    const list = document.createElement('ul');
    let overloaded = false;
    for (const reading of solve(parts,wires)) {
      const part = parts.find(item => item.id === reading.id);
      const item = document.createElement('li');
      item.textContent = `${catalog[part.type].label} ${part.id.slice(1)} · ${reading.volts.toFixed(2)} V · ${(1000*reading.amps).toFixed(2)} mA`;
      list.append(item);
      if (part.type==='led' && reading.amps>.001) {
        board.querySelector(`[data-part="${part.id}"]`).classList.add('lit');
        overloaded ||= reading.amps > .02;
      }
    }
    if (overloaded) result.append('LED akımı 20 mA üzerinde. Seri direnci kontrol et.');
    result.append(list);
  } catch (error) { result.textContent = error.message; }
};
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
    parts = data.parts; wires = data.wires; next = Math.max(0,...[...ids].map(id=>Number(id.slice(1))));
    selected = undefined;
    render();
  } catch { result.textContent = 'Bu dosya geçerli bir atölye devresi değil.'; }
};
new ResizeObserver(drawWires).observe(board);
example();
