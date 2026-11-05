import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const root=path.resolve(import.meta.dirname,'..'),read=f=>readFileSync(path.join(root,f),'utf8');
const pages=[...readdirSync(root).filter(f=>f.endsWith('.html')),...readdirSync(path.join(root,'projeler')).filter(f=>f.endsWith('.html')).map(f=>'projeler/'+f)];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function open(file,{language='tr',response=null}={}) {
  const dom=new JSDOM(read(file),{url:'https://egecoskun.tech/'+(file==='index.html'?'':file),runScripts:'outside-only'}),w=dom.window;
  w.localStorage.setItem('ege-language',language);
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
  w.ResizeObserver=class{observe(){}disconnect(){}};w.CSS={escape:s=>String(s).replace(/[^a-z0-9_-]/gi,'')};
  const canvasLabels=[];const gradient=()=>({addColorStop(){}});const context=new Proxy({measureText:()=>({width:20}),createLinearGradient:gradient,createRadialGradient:gradient,createConicGradient:gradient,fillText:s=>canvasLabels.push(s)},{get:(target,key)=>key in target?target[key]:(()=>{})});
  w.HTMLCanvasElement.prototype.getContext=()=>context;
  const outbound=[];w.fetch=async(url,options)=>{outbound.push({url,options});if(response)return response(url,options);throw Error('Offline test');};
  w.confirm=()=>false;w.AbortController=AbortController;
  const intervals=[];w.setInterval=fn=>{intervals.push(fn);return intervals.length;};w.clearInterval=()=>{};
  for(const script of w.document.querySelectorAll('script[src]')){
    const url=new URL(script.getAttribute('src'),w.location.href);if(url.origin!==w.location.origin)continue;
    vm.runInContext(read(decodeURIComponent(url.pathname).slice(1)),dom.getInternalVMContext(),{filename:url.pathname});
  }
  await settle();return {dom,w,d:w.document,outbound,canvasLabels,intervals,close:()=>w.close()};
}
test('Every page has a working language selector, metadata, Instagram and calculator navigation',async()=>{
  for(const file of pages){const ui=await open(file,{language:'en'});try{
    assert.equal(ui.d.documentElement.lang,'en',file);assert.equal(ui.d.querySelector('.language-select').value,'en',file);
    assert.ok(ui.d.querySelector('.nav-instagram[href="https://instagram.com/00.e.ge00"]'),file);
    assert.ok([...ui.d.querySelectorAll('.nav-links a')].some(a=>a.textContent==='Calculators'),file);
    assert.equal(ui.d.querySelector('.skip-link').textContent,'Skip to content',file);
    assert.equal(ui.d.querySelector('.theme-toggle').getAttribute('aria-label'),'Switch to dark theme',file);
    ui.w.SiteI18n.setLanguage('tr');await settle();assert.equal(ui.d.querySelector('.skip-link').textContent,'İçeriğe geç',file);
    assert.equal(ui.w.localStorage.getItem('ege-language'),'tr',file);
  }finally{ui.close();}}
});
test('English pages contain no untranslated Turkish UI except personal names and unchanged program code',async()=>{
  const leftovers=[];
  for(const file of pages){const ui=await open(file,{language:'en'});try{
    const walker=ui.d.createTreeWalker(ui.d.documentElement,ui.w.NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){
      if(node.parentElement.closest('script,style,pre,code,textarea,.dev-code-lines,.code-lines,.h-captcha'))continue;
      const value=node.nodeValue.replace(/Hebil Ege Coşkun|Ege Coşkun|Coşkun|Burak Keşkekci|Keşkekci/g,'');
      if(/[çğıöşüİ]/i.test(value))leftovers.push(file+': '+value.trim());
    }
    for(const el of ui.d.querySelectorAll('[aria-label],[alt],[placeholder],[title],meta[name="description"]'))for(const attr of ['aria-label','alt','placeholder','title','content']){
      const value=(el.getAttribute(attr)||'').replace(/Hebil Ege Coşkun|Ege Coşkun|Coşkun|Burak Keşkekci|Keşkekci/g,'');
      if(/[çğıöşüİ]/i.test(value))leftovers.push(file+' '+attr+': '+value);
    }
  }finally{ui.close();}}
  assert.deepEqual(leftovers,[]);
});
test('Repeated language switching preserves contact inputs, source code, handlers and original Turkish text',async()=>{
  const ui=await open('index.html');try{
    const field=ui.d.querySelector('#contact-message');field.value='Kullanıcının özgün mesajı <b>test</b>';
    const originalTitle=ui.d.querySelector('h1').textContent;
    for(let i=0;i<3;i++){ui.w.SiteI18n.setLanguage('en');await settle();assert.match(ui.d.querySelector('h1').textContent,/From idea/);ui.w.SiteI18n.setLanguage('tr');await settle();assert.equal(ui.d.querySelector('h1').textContent,originalTitle);}
    assert.equal(field.value,'Kullanıcının özgün mesajı <b>test</b>');
    ui.d.querySelector('.menu-toggle').click();await settle();assert.equal(ui.d.querySelector('.menu-toggle').getAttribute('aria-expanded'),'true');
    ui.w.SiteI18n.setLanguage('en');await settle();assert.equal(ui.d.querySelector('.menu-toggle').getAttribute('aria-label'),'Close menu');
    assert.equal(ui.outbound.filter(call=>call.options?.method==='POST').length,0);
  }finally{ui.close();}
});
test('Calculator forms convert units, preserve values across languages, reject bad input and support keyboard tabs',async()=>{
  const ui=await open('hesaplayicilar.html');try{
    const change=element=>element.dispatchEvent(new ui.w.Event('change',{bubbles:true}));
    const form=ui.d.getElementById('ohm-form');form.elements.a.value='5';form.elements.b.value='2,2';form.elements.bUnit.value='1000';change(form.elements.b);
    assert.match(ui.d.querySelector('#ohm-result .result-main').textContent,/2,273 mA/);
    ui.w.SiteI18n.setLanguage('en');await settle();assert.equal(form.elements.b.value,'2,2');assert.match(ui.d.querySelector('#ohm-result .result-main').textContent,/2.273 mA/);
    const bands=ui.d.querySelector('#resistor-form').elements.bandCount;bands.value='5';change(bands);await settle();assert.equal(ui.d.querySelectorAll('[data-band]').length,5);assert.match(ui.d.querySelector('#resistor-result .result-main').textContent,/10 kΩ/);
    form.elements.b.value='0';change(form.elements.b);assert.equal(ui.d.querySelector('#ohm-result').hidden,true);assert.match(ui.d.querySelector('#ohm-error').textContent,/greater than zero/);
    const led=ui.d.getElementById('led-form');led.elements.supply.value='1';change(led.elements.supply);assert.equal(ui.d.querySelector('#led-result').hidden,true);assert.match(ui.d.querySelector('#led-error').textContent,/supply voltage/i);
    const first=ui.d.querySelector('[data-tool="resistor"]');first.dispatchEvent(new ui.w.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(ui.d.querySelector('[data-tool="battery"]').getAttribute('aria-selected'),'true');assert.equal(ui.d.querySelector('#battery').hidden,false);
  }finally{ui.close();}
});
test('Lab English search, confirmations, diagnostics and language switching preserve user sketches and raw serial output',async()=>{
  const ui=await open('laboratuvar.html',{language:'en'});try{
    const search=ui.d.querySelector('#cs-search');search.value='resistor';search.dispatchEvent(new ui.w.Event('input',{bubbles:true}));await settle();assert.equal([...ui.d.querySelectorAll('.cs-palette-item')].filter(el=>!el.hidden).length,1);
    let confirmation='';ui.w.confirm=message=>{confirmation=message;return false;};ui.d.querySelector('#cs-clear').click();assert.match(confirmation,/Delete all/);
    const code=ui.d.querySelector('#cs-code');code.value='void setup(){Serial.begin(9600);Serial.println("Türkçe kullanıcı çıktısı");} void loop(){delay(9999);}';
    ui.d.querySelector('#cs-code-run').click();await settle();assert.match(ui.d.querySelector('#cs-serial').textContent,/Türkçe kullanıcı çıktısı/);assert.match(ui.d.querySelector('#cs-serial').textContent,/simulation started/);
    ui.w.SiteI18n.setLanguage('tr');await settle();assert.match(ui.d.querySelector('#cs-serial').textContent,/simülasyonu başlatıldı/);assert.match(ui.d.querySelector('#cs-serial').textContent,/Türkçe kullanıcı çıktısı/);assert.match(code.value,/Türkçe kullanıcı çıktısı/);
    ui.d.querySelector('#cs-code-stop').click();ui.w.SiteI18n.setLanguage('en');code.value='void setup(){oops();} void loop(){}';ui.d.querySelector('#cs-code-verify').click();await settle();assert.match(ui.d.querySelector('#cs-code-result').textContent,/Unsupported/);assert.doesNotMatch(ui.d.querySelector('#cs-code-result').textContent,/Desteklenmeyen/);
  }finally{ui.close();}
});
test('Weather shows current model data, translates conditions and keeps simulated GPIO separate',async()=>{
  const now=Math.floor(Date.now()/1000);const data={current:{time:now,temperature_2m:13.2,relative_humidity_2m:70,weather_code:0,wind_speed_10m:8},current_units:{temperature_2m:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h'}};
  const ui=await open('index.html',{response:async()=>({ok:true,json:async()=>data})});try{
    assert.equal(ui.d.getElementById('live-temp').textContent,'13,2 °C');assert.match(ui.d.getElementById('weather-summary').textContent,/Burdur/);assert.equal(ui.d.getElementById('burdur-weather').dataset.state,'ready');
    ui.w.SiteI18n.setLanguage('en');await settle();assert.equal(ui.d.getElementById('live-temp').textContent,'13.2 °C');assert.match(ui.d.getElementById('weather-summary').textContent,/Clear/);assert.match(ui.d.getElementById('weather-meta').textContent,/Humidity/);
    assert.equal(ui.outbound.length,1);assert.equal(ui.outbound[0].options.credentials,'omit');
  }finally{ui.close();}
});
test('Weather failure never shows a fabricated temperature; cached data is explicitly marked after failure',async()=>{
  const ui=await open('index.html');try{assert.equal(ui.d.getElementById('live-temp').textContent,'— °C');assert.equal(ui.d.getElementById('burdur-weather').dataset.state,'error');assert.equal(ui.d.getElementById('weather-retry').disabled,false);}finally{ui.close();}
});
test('hCaptcha renders and rerenders in selected language without reloading or clearing the contact form',async()=>{
  const ui=await open('index.html');try{
    const renders=[],removals=[];ui.w.hcaptcha={render:(el,options)=>{renders.push(options);return renders.length;},remove:id=>removals.push(id)};
    ui.w.siteCaptchaReady();assert.equal(renders[0].hl,'tr');ui.d.querySelector('#contact-name').value='Ege';
    ui.w.SiteI18n.setLanguage('en');assert.equal(renders[1].hl,'en');assert.deepEqual(removals,[1]);assert.equal(ui.d.querySelector('#contact-name').value,'Ege');
  }finally{ui.close();}
});
