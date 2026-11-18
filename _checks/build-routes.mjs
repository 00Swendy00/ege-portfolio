import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const pages=['index.html','laboratuvar.html','hesaplayicilar.html','esp32-pin-haritasi.html','otonom-sistemler.html','servo-radar.html','spotify-dotmatrix.html','projeler/servo-radar.html','projeler/spotify-dotmatrix.html','atolye/elektronik.html','atolye/robot.html','atolye/model.html'];
const refreshed=new Set(['theme-init.js','i18n-catalog.js','i18n.js','site-assistant.js','site-assistant-config.js','circuit-editor.js','circuit-editor.css','circuit-state.js','home-showcase.js','home-showcase.css','atolye.css','elektronik.mjs','robot.mjs','model.mjs']);
function clean(url){
  return url.replace(/\/index\.html(?=[?#]|$)/g,'/').replace(/\.html(?=[?#]|$)/g,'/');
}
function asset(value,file){
  if(!value||/^(?:#|data:|blob:|mailto:|tel:|javascript:)/i.test(value))return value;
  const url=new URL(value.replaceAll('&amp;','&'),'https://egecoskun.tech/'+file);
  if(url.origin!=='https://egecoskun.tech')return value;
  if(refreshed.has(url.pathname.split('/').at(-1)))url.search='?v=20261118-r2';
  return clean(url.pathname+url.search+url.hash).replaceAll('&','&amp;');
}
for(const file of pages){
  let html=await readFile(path.join(root,file),'utf8');
  html=html.replace(/\b(href|src|action)="([^"]*)"/g,(_,key,value)=>key+'="'+asset(value,file)+'"');
  html=html.replace(/\bsrcset="([^"]+)"/g,(_,value)=>'srcset="'+value.split(',').map(item=>{
    const [url,...descriptor]=item.trim().split(/\s+/);return [asset(url,file),...descriptor].join(' ');
  }).join(', ')+'"');
  html=html.replace(/https:\/\/egecoskun\.tech\/[^"'<\s]+\.html/g,clean);
  const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(match=>!/\bsrc=/.test(match[1]));
  html=html.replace(/script-src ([^;]+)/,(_,policy)=>{
    const base=policy.replace(/'sha256-[^']+'\s*/g,'').trim();
    const hashes=inline.map(match=>"'sha256-"+createHash('sha256').update(match[2]).digest('base64')+"'");
    return 'script-src '+[base,...hashes].join(' ');
  });
  await writeFile(path.join(root,file),html);
  if(file!=='index.html'){
    const target=path.join(root,file.slice(0,-5),'index.html');
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,html);
  }
}
let sitemap=await readFile(path.join(root,'sitemap.xml'),'utf8');
sitemap=sitemap.replace(/https:\/\/egecoskun\.tech\/[^<]+\.html/g,clean);
await writeFile(path.join(root,'sitemap.xml'),sitemap);
let config=await readFile(path.join(root,'site-assistant-config.js'),'utf8');
config=config.replace(/(url:')([^']+\.html)(')/g,(_,a,url,b)=>a+clean(url)+b);
await writeFile(path.join(root,'site-assistant-config.js'),config);
console.log('Published clean directory routes for '+pages.length+' pages.');

