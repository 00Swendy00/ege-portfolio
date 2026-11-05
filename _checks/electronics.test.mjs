import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const scope={};vm.runInNewContext(readFileSync(new URL('../electronics-math.js',import.meta.url),'utf8'),scope);
const m=scope.ElectronicsMath,close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-12,Math.abs(b)*1e-10),`${a} != ${b}`);
test('Decimal comma, dot and scientific input parse; invalid, empty and non-finite input is rejected',()=>{
 close(m.parse(' 3,3 '),3.3);close(m.parse('1e-3'),.001);assert.equal(m.parse('0'),0);
 for(const value of ['', ' ', '1,000.2', 'NaN', 'Infinity', '-3', '1e999', '<img>', '0x10', '1 000','1e-20'])assert.throws(()=>m.parse(value),value);
});
test('Four/five band decoding includes fractional multipliers and tolerance bounds',()=>{
 let r=m.resistor(['red','red','brown','gold']);close(r.resistance,220);close(r.min,209);close(r.max,231);
 r=m.resistor(['brown','black','black','red','brown']);close(r.resistance,10000);close(r.tolerance,1);
 close(m.resistor(['yellow','violet','silver','silver']).resistance,.47);
 close(m.resistor(['brown','black','gold','green']).resistance,1);
 for(const bands of [[],['black','red','brown','gold'],['red','red','oops','gold'],['red','red','black','black'],['red','red','brown']])assert.throws(()=>m.resistor(bands));
});
test('Ohm calculations agree across all three solve modes and return power in watts',()=>{
 const v=m.ohm('voltage',.02,220),i=m.ohm('current',4.4,220),r=m.ohm('resistance',4.4,.02);
 for(const data of [v,i,r]){close(data.voltage,4.4);close(data.current,.02);close(data.resistance,220);close(data.power,.088);}
 for(const value of [0,-1,NaN,Infinity])assert.throws(()=>m.ohm('current',5,value));
 assert.throws(()=>m.ohm('power',1,1));
});
test('Loaded voltage divider reduces output and conserves input power',()=>{
 const unloaded=m.divider(5,10000,20000),loaded=m.divider(5,10000,20000,20000);
 close(unloaded.output,10/3);close(loaded.output,2.5);close(loaded.loadCurrent,.000125);
 close(loaded.powerR1+loaded.powerR2+loaded.output*loaded.loadCurrent,5*loaded.current);
 assert.ok(loaded.output<unloaded.output);assert.throws(()=>m.divider(5,10,20,0));
});
test('LED suggestions round upward to E24, bound current, and provide >=2x power margin',()=>{
 const r=m.led(5,2,.02);close(r.resistance,150);close(r.recommended,150);close(r.power,.06);close(r.rating,.125);
 const rounded=m.led(5,2.1,.02);close(rounded.resistance,145);close(rounded.recommended,150);assert.ok(rounded.actualCurrent<=.02);assert.ok(rounded.rating>=rounded.power*2);
 close(m.led(12,2,.02,3).resistance,300);
 for(const args of [[5,3,.02,2],[2,2,.02,1],[5,2,0,1],[5,2,.02,1.5],[5,2,.02,101]])assert.throws(()=>m.led(...args));
 for(let v=1e-6;v<1e9;v*=1.79)assert.ok(m.nextE24(v)>=v*(1-1e-12));
});
test('Battery energy accounts for voltage conversion, usable capacity, efficiency and average current',()=>{
 close(m.battery(2000,3.7,3.7,100,100,100).hours,20);
 const r=m.battery(2000,3.7,3.3,100,80,90);close(r.hours,16.14545454545);close(r.energy,5.92);close(r.power,.33);
 close(m.battery(2000,3.7,3.3,200,80,90).hours,r.hours/2);
 for(const args of [[2000,3.7,3.3,0,80,90],[2000,3.7,3.3,100,101,90],[2000,3.7,3.3,100,80,0],[2000,3.7,3.3,100,80,101]])assert.throws(()=>m.battery(...args));
});
