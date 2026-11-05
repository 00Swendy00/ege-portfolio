'use strict';
(() => {
  const math=window.ElectronicsMath;
  if (!math || !document.querySelector('.tools-page')) return;
  const $=id=>document.getElementById(id), t=s=>window.SiteI18n?.t(s) ?? s;
  const locale=()=>window.SiteI18n?.getLanguage()==='en'?'en-US':'tr-TR';
  function num(value,precision=4) {
    return new Intl.NumberFormat(locale(),{maximumSignificantDigits:precision}).format(value);
  }
  function si(value,unit) {
    const scales=[[1e9,'G'],[1e6,'M'],[1e3,'k'],[1,''],[1e-3,'m'],[1e-6,'µ'],[1e-9,'n'],[1e-12,'p']];
    const [factor,prefix]=scales.find(([factor])=>value>=factor) || [1,''];
    return num(value/factor)+' '+prefix+unit;
  }
  function result(id,caption,main,rows) {
    const box=$(id+'-result');box.replaceChildren();box.hidden=false;
    const cap=document.createElement('span');cap.className='result-caption';cap.textContent=t(caption);
    const big=document.createElement('strong');big.className='result-main';big.textContent=main;
    const list=document.createElement('div');list.className='result-rows';
    rows.forEach(([label,value])=>{const row=document.createElement('div');row.className='result-row';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=t(label);b.textContent=value;row.append(a,b);list.append(row);});
    box.append(cap,big,list);$(id+'-error').textContent='';
  }
  function input(form,name,scale=1) {
    const field=form.elements.namedItem(name);
    try {const value=math.parse(field.value)*scale;field.removeAttribute('aria-invalid');return value;}
    catch(error){field.setAttribute('aria-invalid','true');throw error;}
  }
  function handle(id,calculate) {
    const form=$(id+'-form');
    const run=()=>{
      form.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
      try {calculate(form);}
      catch(error){$(id+'-result').hidden=true;$(id+'-result').replaceChildren();const messages={headroom:'Besleme gerilimi, seri LED’lerin toplam ileri geriliminden büyük olmalı.',count:'Seri LED sayısı 1 ile 100 arasında bir tam sayı olmalı.',percent:'Kapasite payı ve verim %0’dan büyük, en fazla %100 olmalı.',bands:'Lütfen geçerli direnç bantlarını seç.',range:'Değer hesaplama aralığının dışında. Daha uygun bir değer veya birim seç.'};$(id+'-error').textContent=t(messages[error.message] || 'Tüm alanlara geçerli, sıfırdan büyük sayılar gir. Ondalık için virgül veya nokta kullan.');}
    };
    form.addEventListener('submit',event=>{event.preventDefault();run();});form.addEventListener('input',run);form.addEventListener('change',run);
    document.addEventListener('site:languagechange',run);run();
  }
  const colors={black:['Siyah','#161b24'],brown:['Kahverengi','#854f32'],red:['Kırmızı','#e64e5a'],orange:['Turuncu','#f59b3b'],yellow:['Sarı','#f1d74e'],green:['Yeşil','#36ac78'],blue:['Mavi','#448ce1'],violet:['Mor','#a06cdb'],gray:['Gri','#929ba9'],white:['Beyaz','#edf2f8'],gold:['Altın','#cba754'],silver:['Gümüş','#bac5d2']};
  let bandCount=0;
  function buildBands() {
    const count=Number($('resistor-form').elements.bandCount.value);
    if(count===bandCount)return;
    bandCount=count;const fields=$('resistor-selects');fields.replaceChildren();
    const digitNames=Object.keys(colors).slice(0,10),tolerance=['brown','red','green','blue','violet','gray','gold','silver'];
    const defaults=count===4?['red','red','brown','gold']:['brown','black','black','red','brown'];
    defaults.forEach((value,i)=>{
      const label=document.createElement('label');label.className='tool-field';const span=document.createElement('span');
      const title=i<count-2?(i+1)+'. rakam':i===count-2?'Çarpan':'Tolerans';span.textContent=t(title);
      const select=document.createElement('select');select.name='band'+i;select.dataset.band=String(i);
      (i<count-2?digitNames.slice(i===0?1:0):i===count-2?Object.keys(colors):tolerance).forEach(name=>{const option=document.createElement('option');option.value=name;option.textContent=t(colors[name][0]);select.append(option);});
      select.value=value;label.append(span,select);fields.append(label);
    });
  }
  $('resistor-form').elements.bandCount.addEventListener('change',buildBands);buildBands();
  handle('resistor',form=>{
    buildBands();const bands=[...form.querySelectorAll('[data-band]')].map(x=>x.value),data=math.resistor(bands);
    const g=$('resistor-bands');g.replaceChildren();
    bands.forEach((name,i)=>{const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',String((bands.length===4?[281,321,381,474]:[276,309,342,389,474])[i]));rect.setAttribute('y','72');rect.setAttribute('width','18');rect.setAttribute('height','76');rect.setAttribute('fill',colors[name][1]);g.append(rect);});
    result('resistor','NOMİNAL DİRENÇ',si(data.resistance,'Ω'),[['Tolerans','±'+num(data.tolerance)+'%'],['Alt sınır',si(data.min,'Ω')],['Üst sınır',si(data.max,'Ω')]]);
  });
  const units={voltage:[['V',1],['mV',.001]],current:[['A',1],['mA',.001],['µA',.000001]],resistance:[['Ω',1],['kΩ',1000],['MΩ',1000000]]};
  let lastMode='';
  function ohmFields() {
    const form=$('ohm-form'),mode=form.elements.mode.value;
    const keys=mode==='voltage'?['current','resistance']:mode==='resistance'?['voltage','current']:['voltage','resistance'];
    keys.forEach((key,i)=>{
      const name=i===0?'a':'b';$('ohm-'+name+'-label').textContent=t({voltage:'Gerilim',current:'Akım',resistance:'Direnç'}[key]);
      if(mode!==lastMode){const select=form.elements[name+'Unit'];select.replaceChildren();units[key].forEach(([label,value])=>{const o=document.createElement('option');o.textContent=label;o.value=String(value);select.append(o);});form.elements[name].value=key==='current'?'0.02':key==='voltage'?'5':'220';}
    });lastMode=mode;
  }
  $('ohm-form').elements.mode.addEventListener('change',ohmFields);document.addEventListener('site:languagechange',ohmFields);ohmFields();
  handle('ohm',form=>{
    ohmFields();const data=math.ohm(form.elements.mode.value,input(form,'a',Number(form.elements.aUnit.value)),input(form,'b',Number(form.elements.bUnit.value)));
    const mode=form.elements.mode.value;
    result('ohm',{voltage:'GERİLİM',current:'AKIM',resistance:'DİRENÇ'}[mode],si(data[mode],{voltage:'V',current:'A',resistance:'Ω'}[mode]),[['Gerilim',si(data.voltage,'V')],['Akım',si(data.current,'A')],['Direnç',si(data.resistance,'Ω')],['Güç',si(data.power,'W')]]);
  });
  handle('divider',form=>{
    const unit=Number(form.elements.unit.value),data=math.divider(input(form,'voltage'),input(form,'r1',unit),input(form,'r2',unit),form.elements.load.value.trim()?input(form,'load',unit):null);
    result('divider','ÇIKIŞ GERİLİMİ',si(data.output,'V'),[['Yüksüz çıkış',si(data.unloaded,'V')],['Giriş akımı',si(data.current,'A')],['Yük akımı',si(data.loadCurrent,'A')],['R1 güç kaybı',si(data.powerR1,'W')],['R2 güç kaybı',si(data.powerR2,'W')]]);
  });
  handle('led',form=>{
    const data=math.led(input(form,'supply'),input(form,'forward'),input(form,'current',.001),input(form,'count'));
    result('led','ÖNERİLEN E24 DİRENÇ',si(data.recommended,'Ω'),[['Hesaplanan minimum',si(data.resistance,'Ω')],['Önerilen dirençle akım',si(data.actualCurrent,'A')],['Dirençte güç kaybı',si(data.power,'W')],['Önerilen güç sınıfı (2× pay)',data.rating===null?t('100 W üzerinde; özel güç direnci gerekir.'):si(data.rating,'W')]]);
  });
  handle('battery',form=>{
    const data=math.battery(...['capacity','batteryVoltage','loadVoltage','loadCurrent','usable','efficiency'].map(name=>input(form,name)));
    const duration=data.hours>=24?num(data.hours/24)+' '+t('gün'):data.hours<1?num(data.hours*60)+' '+t('dakika'):num(data.hours)+' '+t('saat');
    result('battery','TAHMİNİ ÇALIŞMA SÜRESİ','≈ '+duration,[['Saat cinsinden',num(data.hours)+' h'],['Kullanılabilir pil enerjisi',num(data.energy)+' Wh'],['Cihazın ortalama gücü',si(data.power,'W')],['Pilden çekilen ortalama akım',si(data.batteryCurrent/1000,'A')]]);
  });
  document.addEventListener('site:languagechange',()=>{
    const labels=[...$('resistor-selects').querySelectorAll('.tool-field')];labels.forEach((label,i)=>label.querySelector('span').textContent=t(i<bandCount-2?(i+1)+'. rakam':i===bandCount-2?'Çarpan':'Tolerans'));
    $('resistor-selects').querySelectorAll('option').forEach(o=>o.textContent=t(colors[o.value][0]));
  });
  const nav=document.querySelector('.tools-nav'),tabs=[...nav.querySelectorAll('[data-tool]')];nav.setAttribute('role','tablist');
  function show(id) {
    if(!tabs.some(tab=>tab.dataset.tool===id))id='resistor';
    tabs.forEach(tab=>{const active=tab.dataset.tool===id,panel=$(tab.dataset.tool);tab.setAttribute('role','tab');tab.id='tool-tab-'+tab.dataset.tool;tab.setAttribute('aria-controls',panel.id);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;panel.hidden=!active;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);});
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',event=>{event.preventDefault();show(tab.dataset.tool);try{history.replaceState(history.state,'','#'+tab.dataset.tool);}catch(_){}});
    tab.addEventListener('keydown',event=>{let next;if(['ArrowRight','ArrowDown'].includes(event.key))next=(i+1)%tabs.length;else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].click();tabs[next].focus();});
  });
  window.addEventListener('hashchange',()=>show(location.hash.slice(1)));show(location.hash.slice(1));
})();
