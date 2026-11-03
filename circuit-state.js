/* Shared validation for untrusted imports and browser storage. */
(function (global) {
  'use strict';
  const examples = ['blank', 'led', 'button', 'sonar', 'servo', 'buzzer'];
  const sizes = {arduino:[470,290],breadboard:[450,264],led:[126,145],resistor:[186,112],button:[146,136],sonar:[232,148],servo:[176,178],buzzer:[138,136]};
  const colors = ['#e54c56','#222d3c','#2b82e9','#13b98e','#ffd04d','#b27de8','#f59f4b'];
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const fail = () => { throw new Error('Geçersiz devre verisi'); };
  function parse(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > 128000) fail();
    return JSON.parse(text);
  }
  function validPort(type, port) {
    if (typeof port !== 'string') return false;
    if (type === 'arduino') return /^(D(?:[0-9]|1[0-3])|A[0-5]|IOREF|RESET|3V3|5V|GND|VIN)$/.test(port);
    if (type === 'breadboard') return /^(?:[PN][0-9]|[TB][0-9][0-4])$/.test(port);
    const ports = {led:['A','K'],resistor:['L','R'],button:['1','2'],sonar:['VCC','TRIG','ECHO','GND'],servo:['VCC','GND','SIG'],buzzer:['P','N']};
    return own(ports,type) && ports[type].includes(port);
  }
  function normalize(data, requireFormat = false) {
    if (!object(data) || (requireFormat && data.format !== 'ege-circuit-v5') ||
        !Array.isArray(data.parts) || !Array.isArray(data.wires) || data.parts.length > 35 || data.wires.length > 180) fail();
    const ids = new Map();
    const parts = data.parts.map((p, index) => {
      if (!object(p) || !own(sizes,p.type) || typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(p.id) || ids.has(p.id) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) fail();
      const id = 'p' + (index + 1).toString(36);
      ids.set(p.id,{id,type:p.type});
      if (p.type === 'resistor' && p.value != null && !Number.isFinite(p.value)) fail();
      return {id,type:p.type,x:Math.round(Math.max(0,Math.min(1160-sizes[p.type][0],p.x))),y:Math.round(Math.max(0,Math.min(720-sizes[p.type][1],p.y))),value:p.type==='resistor'?Math.max(100,Math.min(10000,p.value??220)):null};
    });
    const connections = new Set();
    const wires = data.wires.map((w,index) => {
      if (!object(w) || !object(w.from) || !object(w.to)) fail();
      const a=ids.get(w.from.part), b=ids.get(w.to.part);
      if (!a || !b || !validPort(a.type,w.from.port) || !validPort(b.type,w.to.port)) fail();
      const ends=[a.id+':'+w.from.port,b.id+':'+w.to.port].sort();
      const key=ends.join('|');
      if (ends[0]===ends[1] || connections.has(key)) fail();
      connections.add(key);
      return {id:'w'+(index+1).toString(36),from:{part:a.id,port:w.from.port},to:{part:b.id,port:w.to.port},color:colors.includes(w.color)?w.color:colors[2]};
    });
    if (data.sketch !== undefined && (typeof data.sketch !== 'string' || data.sketch.length > 14000)) fail();
    const result={parts,wires,example:examples.includes(data.example)?data.example:'blank'};
    if (typeof data.sketch === 'string') result.sketch=data.sketch;
    return result;
  }
  function drafts(text) {
    const result=Object.create(null), data=parse(text);
    if (!object(data)) fail();
    for (const name of examples) if (own(data,name)) {
      if (typeof data[name] !== 'string' || data[name].length>14000) fail();
      result[name]=data[name];
    }
    return result;
  }
  global.ECCircuitState=Object.freeze({parse,normalize,drafts});
})(typeof window === 'undefined' ? globalThis : window);
