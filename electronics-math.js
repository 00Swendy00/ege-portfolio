'use strict';
// Pure calculations in SI units. The UI is responsible for formatting and units.
(() => {
  const positive = n => Number.isFinite(n) && n > 0 && n >= 1e-15 && n <= 1e15;
  const requirePositive = (...values) => { if (!values.every(positive)) throw new RangeError('positive'); };
  const finite = result => {
    if (Object.values(result).some(n => typeof n === 'number' && (!Number.isFinite(n) || n < 0 || n > 1e30))) throw new RangeError('range');
    return result;
  };
  const digits = ['black','brown','red','orange','yellow','green','blue','violet','gray','white'];
  const multipliers = Object.fromEntries(digits.map((name,i) => [name,10 ** i]));
  multipliers.gold = .1; multipliers.silver = .01;
  const tolerances = {brown:1,red:2,green:.5,blue:.25,violet:.1,gray:.05,gold:5,silver:10};
  function parse(value) {
    const text = String(value).trim().replace(',', '.');
    if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) throw new RangeError('number');
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0 || n > 1e15 || (n > 0 && n < 1e-15)) throw new RangeError('range');
    return n;
  }
  function resistor(bands) {
    if (!Array.isArray(bands) || ![4,5].includes(bands.length)) throw new RangeError('bands');
    const count = bands.length - 2, nums = bands.slice(0,count).map(c => digits.indexOf(c));
    if (nums.some(n => n < 0) || nums[0] === 0 || !Object.hasOwn(multipliers,bands[count]) || !Object.hasOwn(tolerances,bands[count+1])) throw new RangeError('bands');
    const resistance = Number(nums.join('')) * multipliers[bands[count]], tolerance = tolerances[bands[count+1]];
    return {resistance,tolerance,min:resistance*(1-tolerance/100),max:resistance*(1+tolerance/100)};
  }
  function ohm(mode, a, b) {
    requirePositive(a,b);
    let voltage,current,resistance;
    if (mode === 'voltage') { current=a; resistance=b; voltage=a*b; }
    else if (mode === 'current') { voltage=a; resistance=b; current=a/b; }
    else if (mode === 'resistance') { voltage=a; current=b; resistance=a/b; }
    else throw new RangeError('mode');
    return finite({voltage,current,resistance,power:voltage*current});
  }
  function divider(voltage,r1,r2,load=null) {
    requirePositive(voltage,r1,r2);
    if (load !== null) requirePositive(load);
    const lower=load === null ? r2 : 1/(1/r2+1/load), current=voltage/(r1+lower), output=current*lower;
    return finite({output,unloaded:voltage*r2/(r1+r2),current,powerR1:current*current*r1,powerR2:output*output/r2,loadCurrent:load === null ? 0 : output/load});
  }
  const e24=[1,1.1,1.2,1.3,1.5,1.6,1.8,2,2.2,2.4,2.7,3,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1];
  function nextE24(value) {
    requirePositive(value);
    const decade=10**Math.floor(Math.log10(value));
    return (e24.find(v => v*decade >= value*(1-1e-12)) ?? 10)*decade;
  }
  function led(supply,forward,current,count=1) {
    requirePositive(supply,forward,current);
    if (!Number.isInteger(count) || count<1 || count>100) throw new RangeError('count');
    const drop=supply-count*forward;
    if (drop<=0) throw new RangeError('headroom');
    const resistance=drop/current, recommended=nextE24(resistance), actualCurrent=drop/recommended, power=drop*actualCurrent;
    const rating=[.125,.25,.5,1,2,3,5,10,20,25,50,100].find(p => p>=power*2) ?? null;
    return finite({resistance,recommended,actualCurrent,power,rating});
  }
  function battery(capacity,batteryVoltage,loadVoltage,loadCurrent,usable=80,efficiency=90) {
    requirePositive(capacity,batteryVoltage,loadVoltage,loadCurrent,usable,efficiency);
    if (usable>100 || efficiency>100) throw new RangeError('percent');
    const energy=capacity/1000*batteryVoltage*usable/100, power=loadVoltage*loadCurrent/1000;
    return finite({hours:energy*(efficiency/100)/power,energy,power,batteryCurrent:power/(batteryVoltage*efficiency/100)*1000});
  }
  globalThis.ElectronicsMath=Object.freeze({parse,resistor,ohm,divider,led,battery,nextE24});
})();
