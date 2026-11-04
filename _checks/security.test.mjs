import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'..');
const read=file=>readFileSync(path.join(base,file),'utf8').replaceAll('\r\n','\n');
const context=vm.createContext({TextEncoder,setTimeout,clearTimeout});
context.window=context;
vm.runInContext(read('circuit-state.js'),context);
vm.runInContext(read('arduino-simulator.js'),context);
const safe=context.ECCircuitState,sim=context.ECArduinoSim;
function circuit(){return {format:'ege-circuit-v5',example:'led',parts:[{id:'old-board',type:'arduino',x:70,y:280},{id:'old-led',type:'led',x:800,y:400}],wires:[{id:'wire',from:{part:'old-board',port:'D9'},to:{part:'old-led',port:'A'},color:'#e54c56'}],sketch:'void setup(){} void loop(){}'};}
test('Valid v5 imports get new IDs and preserve endpoint mapping',()=>{
 const data=circuit(),result=safe.normalize(data,true);
 assert.equal(result.parts[0].id,'p1');assert.equal(result.wires[0].from.part,'p1');assert.equal(result.wires[0].to.part,'p2');assert.equal(result.sketch,data.sketch);
 assert.equal(safe.normalize(result).parts.length,2);
});
test('Reject selector-breaking IDs, duplicate IDs, unknown types and malformed parts',()=>{
 for(const mutate of [d=>d.parts[0].id='x"]',d=>d.parts[1].id=d.parts[0].id,d=>d.parts[0].type='__proto__',d=>d.parts[0]=null,d=>d.parts[0].x='70',d=>d.parts[0].x=Infinity]){
  const data=circuit();mutate(data);assert.throws(()=>safe.normalize(data,true));
 }
});
test('Reject dangling, invalid, duplicate and self-connected wire endpoints',()=>{
 for(const mutate of [d=>d.wires[0].from.part='missing',d=>d.wires[0].from.port='D99',d=>d.wires[0].to.port='GND',d=>d.wires.push(d.wires[0]),d=>d.wires[0].to=d.wires[0].from,d=>d.wires[0]=null]){
  const data=circuit();mutate(data);assert.throws(()=>safe.normalize(data,true));
 }
});
test('Enforce file, sketch and collection limits before applying state',()=>{
 assert.throws(()=>safe.parse(' '.repeat(128001)));assert.throws(()=>safe.parse('"'+'ğ'.repeat(65000)+'"'));
 const d=circuit();d.parts=Array(36).fill(d.parts[0]);assert.throws(()=>safe.normalize(d));
 const w=circuit();w.wires=Array(181).fill(w.wires[0]);assert.throws(()=>safe.normalize(w));
 const s=circuit();s.sketch='x'.repeat(14001);assert.throws(()=>safe.normalize(s));
 const bad=circuit();bad.format='other';assert.throws(()=>safe.normalize(bad,true));
});
test('Drafts allow only known examples and never inherit JSON prototype keys',()=>{
 const result=safe.drafts('{"__proto__":{"polluted":true},"constructor":"x","led":"safe"}');
 assert.equal(Object.getPrototypeOf(result),null);assert.deepEqual(Object.keys(result),['led']);
 assert.equal({}.polluted,undefined);assert.throws(()=>safe.drafts('{"led":12}'));assert.throws(()=>safe.drafts('[]'));
});
test('Example Arduino sketches still compile',()=>{
 const source=read('circuit-editor.js');const match=source.match(/const codeSamples=({[\s\S]*?});/);assert.ok(match);
 const samples=vm.runInNewContext('('+match[1]+')');
 for(const [name,sketch] of Object.entries(samples))if(name!=='blank')assert.ok(sim.compile(sketch),name);
});
test('Arduino cannot call browser functions or constructor chains',()=>{
 for(const call of ['alert(1)','fetch("x")','window.alert(1)','constructor.constructor("x")','eval("x")'])assert.throws(()=>sim.compile('void setup(){'+call+';} void loop(){}'));
});
test('Deep blocks and expressions fail with bounded interpreter errors',()=>{
 assert.throws(()=>sim.compile('void setup(){'+'if(1){'.repeat(30)+'digitalWrite(9,1);'+'}'.repeat(30)+'} void loop(){}'),/24/);
 assert.throws(()=>sim.compile('void setup(){'+'if(1) '.repeat(30)+'digitalWrite(9,1);} void loop(){}'),/24/);
 assert.throws(()=>sim.compile('void setup(){int x='+'!'.repeat(300)+'1;} void loop(){}'),/256/);
});
test('Exponential string growth stops before exhausting browser memory',()=>{
 let failure;const p=sim.compile('int x="a"; void setup(){'+'x=x+x;'.repeat(20)+'} void loop(){}');
 const runtime=sim.createRuntime(p,{error:err=>{failure=err;}});runtime.start();runtime.stop();assert.match(failure?.message||'',/Metin uzunluğu/);
});
test('HTML blocks inline script execution, restricts forms, and allows declared data scripts',()=>{
 const pages=[...readdirSync(base).filter(f=>f.endsWith('.html')),...readdirSync(path.join(base,'projeler')).filter(f=>f.endsWith('.html')).map(f=>'projeler/'+f)];
 for(const file of pages){const html=read(file),policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(policy,/object-src 'none'/);assert.match(policy,/base-uri 'none'/);
  if(file==='index.html'){assert.match(policy,/form-action https:\/\/api\.web3forms\.com/);assert.match(policy,/connect-src https:\/\/api\.web3forms\.com/);}
  else{assert.match(policy,/form-action 'none'/);assert.match(policy,/connect-src 'none'/);}
  assert.doesNotMatch(policy,/formsubmit\.co/);assert.doesNotMatch(policy.split(';').find(x=>x.trim().startsWith('script-src ')),/unsafe-inline|unsafe-eval/);
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!m[1].includes('src='))assert.ok(policy.includes('sha256-'+createHash('sha256').update(m[2]).digest('base64')),file);
 }
 assert.match(read('index.html'),/class="h-captcha"/);
 assert.ok(read('laboratuvar.html').indexOf('src="circuit-state.js"')<read('laboratuvar.html').indexOf('src="circuit-editor.js"'));
});
test('Every local script and stylesheet referenced by a page exists',()=>{
 const pages=[...readdirSync(base).filter(f=>f.endsWith('.html')),...readdirSync(path.join(base,'projeler')).filter(f=>f.endsWith('.html')).map(f=>'projeler/'+f)];
 for(const file of pages){const html=read(file),url=new URL(file,'https://egecoskun.tech/');
  for(const m of html.matchAll(/<(script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)){
   if(m[1]==='link'&&!/rel="stylesheet"/.test(m[0]))continue;
   const target=new URL(m[2].replaceAll('&amp;','&'),url);if(target.origin!==url.origin)continue;
   assert.doesNotThrow(()=>readFileSync(path.join(base,decodeURIComponent(target.pathname))),file+': '+m[2]);
  }
 }
});
test('State rejects inherited example names and strips unknown JSON properties',()=>{
 const data=circuit();data.example='constructor';data.extra='untrusted';data.wires[0].from.extra='untrusted';
 const result=safe.normalize(data,true);assert.equal(result.example,'blank');assert.equal(result.extra,undefined);assert.equal(result.wires[0].from.extra,undefined);
});
