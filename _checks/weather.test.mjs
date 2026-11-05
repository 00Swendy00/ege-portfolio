import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={window:{},document:{getElementById:()=>null}};
vm.runInNewContext(readFileSync(new URL('../weather.js',import.meta.url),'utf8'),context);
const api=context.window.BurdurWeather,now=Date.now();
const sample=()=>({current:{time:Math.floor(now/1000),temperature_2m:12.4,relative_humidity_2m:72,weather_code:3,wind_speed_10m:8.5},current_units:{temperature_2m:'°C',relative_humidity_2m:'%',wind_speed_10m:'km/h'}});
test('Burdur weather uses fixed city coordinates and no secret or visitor location',()=>{
 const url=new URL(api.endpoint);assert.equal(url.hostname,'api.open-meteo.com');assert.equal(url.searchParams.get('latitude'),'37.7203');assert.equal(url.searchParams.get('timezone'),'Europe/Istanbul');assert.equal(url.searchParams.has('apikey'),false);
});
test('Only plausible recent readings with correct units are accepted',()=>{
 assert.equal(api.normalize(sample(),now).temperature,12.4);
 for(const mutate of [d=>d.current.temperature_2m=null,d=>d.current.temperature_2m='12',d=>d.current.temperature_2m=80,d=>d.current.relative_humidity_2m=101,d=>d.current.time-=7200,d=>d.current.time+=7200,d=>d.current.wind_speed_10m=-1,d=>d.current_units.temperature_2m='°F',d=>d.current_units.wind_speed_10m='mph']){const d=sample();mutate(d);assert.throws(()=>api.normalize(d,now));}
 assert.throws(()=>api.normalize({error:true},now));
});
test('Weather interpretation handles WMO conditions without conflating electronics ON/OFF',()=>{
 assert.equal(api.condition(0)[1],'Açık hava');assert.equal(api.condition(3)[1],'Tamamen bulutlu');
 assert.equal(api.condition(63)[1],'Yağmurlu');assert.equal(api.condition(75)[1],'Karlı');assert.equal(api.condition(95)[1],'Gök gürültülü');assert.equal(api.condition(999)[1],'Hava durumu');
});
