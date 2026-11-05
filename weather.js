'use strict';
(() => {
  const endpoint='https://api.open-meteo.com/v1/forecast?latitude=37.7203&longitude=30.2908&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe%2FIstanbul&timeformat=unixtime&forecast_days=1';
  const ttl=10*60*1000, maxAge=60*60*1000, key='ege-burdur-weather-v1';
  function normalize(data,now=Date.now()) {
    const c=data?.current;
    if (!c || data.current_units?.temperature_2m!=='°C' || data.current_units?.wind_speed_10m!=='km/h' || data.current_units?.relative_humidity_2m!=='%' || !Number.isFinite(c.time) || c.time*1000>now+15*60*1000 || now-c.time*1000>maxAge || !Number.isFinite(c.temperature_2m) || c.temperature_2m < -70 || c.temperature_2m > 65 || !Number.isFinite(c.relative_humidity_2m) || c.relative_humidity_2m<0 || c.relative_humidity_2m>100 || !Number.isInteger(c.weather_code) || !Number.isFinite(c.wind_speed_10m) || c.wind_speed_10m<0 || c.wind_speed_10m>500) throw new Error('weather-data');
    return {time:c.time,temperature:c.temperature_2m,humidity:c.relative_humidity_2m,code:c.weather_code,wind:c.wind_speed_10m};
  }
  function condition(code) {
    if(code===0)return ['☀','Açık hava'];if(code===1)return ['☀','Çoğunlukla açık'];if(code===2)return ['⛅','Parçalı bulutlu'];if(code===3)return ['☁','Tamamen bulutlu'];
    if([45,48].includes(code))return ['≋','Sisli'];if([51,53,55,56,57].includes(code))return ['☂','Çisenti'];if([61,63,65,66,67,80,81,82].includes(code))return ['☂','Yağmurlu'];
    if([71,73,75,77,85,86].includes(code))return ['❄','Karlı'];if([95,96,97,99].includes(code))return ['ϟ','Gök gürültülü'];return ['◌','Hava durumu'];
  }
  window.BurdurWeather=Object.freeze({normalize,condition,endpoint});
  const temp=document.getElementById('live-temp'),box=document.getElementById('burdur-weather');
  if(!temp || !box)return;
  const summary=document.getElementById('weather-summary'),meta=document.getElementById('weather-meta'),retry=document.getElementById('weather-retry');
  const t=s=>window.SiteI18n?.t(s) ?? s;
  const locale=()=>window.SiteI18n?.getLanguage()==='en'?'en-US':'tr-TR';
  let last=null,received=0,pending=false,failed=false;
  function render() {
    const stale=failed || (last && Date.now()-last.time*1000>maxAge);
    box.dataset.state=pending?'loading':last?(stale?'stale':'ready'):'error';
    if(last){
      temp.textContent=new Intl.NumberFormat(locale(),{maximumFractionDigits:1}).format(last.temperature)+' °C';
      const [icon,label]=condition(last.code);
      summary.textContent=icon+' Burdur · '+t(label);
      const time=new Intl.DateTimeFormat(locale(),{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(last.time*1000);
      meta.textContent=t(stale?'Son alınan veri':'Güncelleme')+': '+time+' · '+t('Nem')+' '+last.humidity+'% · '+t('Rüzgâr')+' '+new Intl.NumberFormat(locale(),{maximumFractionDigits:1}).format(last.wind)+' km/h';
    }else{
      temp.textContent='— °C';summary.textContent='Burdur · '+t(pending?'Yükleniyor…':'Veri alınamadı');meta.textContent=t(pending?'Güncel hava durumu alınıyor.':'Bağlantı kurulamadı. Yeniden deneyebilirsin.');
    }
    retry.disabled=pending;retry.textContent=t(pending?'Yükleniyor…':'Yenile');
  }
  async function update(force=false) {
    if(pending || (!force && last && Date.now()-received<ttl && Date.now()-last.time*1000<=maxAge))return;
    pending=true;render();const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
    try{
      const response=await fetch(endpoint,{signal:abort.signal,credentials:'omit',redirect:'error',cache:'no-store'});
      if(!response.ok)throw new Error('weather-http');
      const data=await response.json();last=normalize(data);received=Date.now();failed=false;
      try{sessionStorage.setItem(key,JSON.stringify({received,data}));}catch(_){}
    }catch(_){failed=true;}finally{clearTimeout(timer);pending=false;render();}
  }
  try{const cached=JSON.parse(sessionStorage.getItem(key)||'null');if(cached && Number.isFinite(cached.received) && cached.received<=Date.now() && Date.now()-cached.received<ttl){last=normalize(cached.data);received=cached.received;}}catch(_){}
  render();void update();retry.addEventListener('click',()=>void update(true));
  document.addEventListener('site:languagechange',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void update();});
  window.addEventListener('online',()=>void update(true));
  setInterval(()=>{if(!document.hidden)void update();},ttl);
})();
