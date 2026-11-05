const ORIGINS=new Set(['https://egecoskun.tech','https://www.egecoskun.tech']);
const MODEL='@cf/meta/llama-3.2-3b-instruct';
const KNOWLEDGE=`egecoskun.tech, Hebil Ege Coşkun'un elektronik, ESP32, Arduino, IoT ve web geliştirme portfolyosudur.
Hakkımda: /#about. Projeler: /#projects. Yetkinlikler: /#skills. İletişim: /#contact; form Web3Forms ile mesaj iletir. Instagram: https://instagram.com/00.e.ge00.
Spotify Dot Matrix: Arduino Uno, MAX7219 LED matris ve bilgisayardan seri haberleşme ile Spotify parça bilgisini gösterir. Açıklama, şema, malzemeler, Python ve Arduino kodları, etkileşimli metin demosu: /projeler/spotify-dotmatrix.html.
Servo Radar: Arduino Uno, HC-SR04 ultrasonik sensör ve SG90 servo; mesafe-açı taraması, Processing görselleştirmesi. Proje ve kodlar: /projeler/servo-radar.html.
Sanal Arduino laboratuvarı: /laboratuvar.html. Sürükle-bırak Arduino Uno, breadboard, LED, direnç, buton, sonar, servo, buzzer; kablo bağlantısı kontrolü; kısıtlı Arduino yorumlayıcısı. Eğitim simülasyonudur, gerçek donanım veya SPICE değildir. Taslaklar tarayıcıda saklanır; JSON içe/dışa aktarımı vardır.
ESP32 30 pin DevKit pin rehberi: /esp32-pin-haritasi.html; GPIO/ADC/başlatma pinlerini filtreleme. ESP32 GPIO girişleri 5V toleranslı değildir.
Elektronik hesaplayıcılar: /hesaplayicilar.html#resistor (4/5 bant direnç rengi), #ohm (V=IR ve P=VI), #divider (yük etkili gerilim bölücü), #led (seri LED için direnç ve E24), #battery (pil gerilimi, cihaz tüketimi, verim ve kullanılabilir kapasiteyle tahmini süre).
Otonom Sistemler: /otonom-sistemler.html; Bilgisayar Destekli Devre Tasarımı, Burak Keşkekci malzeme listesi PDF görüntüleme ve indirme.
Site Türkçe/İngilizce ve açık/koyu tema destekler, seçimleri hatırlar. Açık kaynak kodları GitHub 00Swendy00/ege-portfolio deposundadır. Kariyer, adres, özel iletişim veya yayımlanmamış projeler hakkında ek doğrulanmış bilgi yoktur.`;
function headers(origin){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin,'Vary':'Origin'};}
function json(value,status,origin){return new Response(JSON.stringify(value),{status,headers:headers(origin)});}
export function validateMessages(body){
  if(!body || !Array.isArray(body.messages) || body.messages.length<1 || body.messages.length>6)throw Error('invalid');
  const messages=body.messages.map(m=>{
    if(!m || !['user','assistant'].includes(m.role) || typeof m.content!=='string' || !m.content.trim() || m.content.length>800)throw Error('invalid');
    return {role:m.role,content:m.content.trim()};
  });
  if(messages.at(-1).role!=='user' || messages.reduce((n,m)=>n+m.content.length,0)>3000)throw Error('invalid');
  return {messages,language:body.language==='en'?'en':'tr'};
}
async function clientKey(request){
  const day=new Date().toISOString().slice(0,10),ip=request.headers.get('CF-Connecting-IP');
  if(!ip)throw Error('client');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(day+'|'+ip));
  return Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
}
function weatherLabel(code,en){
 const labels=code===0?['Açık','Clear']:code<=3?['Bulutlu','Cloudy']:[45,48].includes(code)?['Sisli','Foggy']:[51,53,55,56,57].includes(code)?['Çisenti','Drizzle']:[61,63,65,66,67,80,81,82].includes(code)?['Yağmurlu','Rainy']:[71,73,75,77,85,86].includes(code)?['Karlı','Snowy']:[95,96,97,99].includes(code)?['Gök gürültülü','Thunderstorms']:['Hava durumu','Weather'];return labels[en?1:0];
}
export async function getWeather(language,fetcher=fetch){
  const url='https://api.open-meteo.com/v1/forecast?latitude=37.7203&longitude=30.2908&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Europe%2FIstanbul&timeformat=unixtime&forecast_days=1';
  const response=await fetcher(url,{signal:AbortSignal.timeout(8000),cf:{cacheTtl:600,cacheEverything:true}});
  if(!response.ok)throw Error('weather');
  const data=await response.json(),c=data.current;
  if(!c || data.current_units?.temperature_2m!=='°C' || !Number.isFinite(c.temperature_2m) || c.temperature_2m< -70 || c.temperature_2m>65 || !Number.isFinite(c.time) || Date.now()-c.time*1000>3600000 || c.time*1000>Date.now()+900000 || !Number.isFinite(c.relative_humidity_2m) || c.relative_humidity_2m<0 || c.relative_humidity_2m>100 || !Number.isInteger(c.weather_code))throw Error('weather');
  const en=language==='en',locale=en?'en-US':'tr-TR',temp=new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(c.temperature_2m),time=new Intl.DateTimeFormat(locale,{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}).format(c.time*1000);
  return {answer:en?`Burdur: ${temp} °C, ${weatherLabel(c.weather_code,true)}. Humidity: ${c.relative_humidity_2m}%. Updated at ${time} (Türkiye time). Based on Open-Meteo weather model data, not a local sensor reading.`:`Burdur: ${temp} °C, ${weatherLabel(c.weather_code,false)}. Nem: %${c.relative_humidity_2m}. Güncelleme: ${time}. Open-Meteo model verisidir; yerel sensör ölçümü değildir.`,links:[{label:'Open-Meteo · CC BY 4.0',url:'https://open-meteo.com/'}],kind:'weather'};
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin') || '';
  if(!ORIGINS.has(origin))return new Response('Forbidden',{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers(origin),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(new URL(request.url).pathname!=='/chat')return json({code:'not_found'},404,origin);
  if(request.method!=='POST')return json({code:'method'},405,origin);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({code:'invalid'},415,origin);
  let input;
  try{
    if(Number(request.headers.get('Content-Length') || 0)>12000)throw Error('invalid');
    const reader=request.body?.getReader();if(!reader)throw Error('invalid');let size=0,chunks=[];
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>12000){await reader.cancel();throw Error('invalid');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    input=validateMessages(JSON.parse(new TextDecoder().decode(bytes)));
  }catch(_){return json({code:'invalid'},400,origin);}
  try{
    if(!env.ASSISTANT_QUOTA || !env.AI)return json({code:'unavailable'},503,origin);
    const key=await clientKey(request),quota=env.ASSISTANT_QUOTA.get(env.ASSISTANT_QUOTA.idFromName('global'));
    const allowed=await quota.fetch('https://quota/check',{method:'POST',body:JSON.stringify({key})});
    if(allowed.status!==200)return json({code:'quota'},429,origin);
    const question=input.messages.at(-1).content;
    if(/hava\s*(durumu|nasıl)|weather|sıcaklık|temperature/i.test(question)){
      try{return json(await getWeather(input.language),200,origin);}catch(_){return json({code:'weather'},503,origin);}
    }
    const system=`Sen EC Asistan, egecoskun.tech sitesinin yapay zekâ yardımcısısın. ${input.language==='en'?'Answer in English.':'Türkçe yanıtla.'} Kısa ve anlaşılır yaz, en fazla 3 kısa paragraf. Site hakkındaki sorularda yalnızca aşağıdaki doğrulanmış bilgileri kullan. Bilmediğin kişisel bilgileri, projeleri, yetkileri veya güncel verileri uydurma. Genel teknoloji ve basit bilgiler hakkında da yardımcı ol. Canlı web araması yapmıyorsun; güncel olay, hava durumu veya fiyat uydurma. Siteye işlem yapamaz, mesaj gönderemez veya dosya değiştiremezsin. Şifre ve anahtar isteme. HTML veya Markdown bağlantı üretme, gerektiğinde ilgili sayfa yolunu düz metin olarak belirt.\nSİTE BİLGİLERİ:\n${KNOWLEDGE}`;
    const output=await env.AI.run(MODEL,{messages:[{role:'system',content:system},...input.messages],max_tokens:350,temperature:.3});
    const answer=typeof output?.response==='string'?output.response.trim():'';
    if(!answer || answer.length>6000)return json({code:'unavailable'},503,origin);
    return json({answer,kind:'ai'},200,origin);
  }catch(_){return json({code:'unavailable'},503,origin);}
 }
};
// SQLite Durable Object: an atomic global daily cap and per-visitor limits.
// Only a daily salted IP hash and counters are stored, never conversation text.
export class AssistantQuota {
 constructor(state){this.state=state;}
 async fetch(request){
  const {key}=await request.json();if(typeof key!=='string' || !/^[a-f0-9]{64}$/.test(key))return new Response('',{status:400});
  const now=Date.now(),day=new Date(now).toISOString().slice(0,10);
  const allowed=await this.state.storage.transaction(async tx=>{
    let data=await tx.get('limits');if(!data || data.day!==day)data={day,total:0,visitors:{}};
    const person=data.visitors[key] || {total:0,last:0};
    if(data.total>=100 || person.total>=20 || now-person.last<5000)return false;
    data.total++;person.total++;person.last=now;data.visitors[key]=person;await tx.put('limits',data);return true;
  });
  return new Response('',{status:allowed?200:429});
 }
}
