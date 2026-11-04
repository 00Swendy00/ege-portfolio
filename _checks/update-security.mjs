import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'..');
function edit(file,fn){const full=path.join(base,file);writeFileSync(full,fn(readFileSync(full,'utf8').replaceAll('\r\n','\n')));}
const policy="default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action https://formsubmit.co; frame-src 'none'";
const pages=[...readdirSync(base).filter(f=>f.endsWith('.html')),...readdirSync(path.join(base,'projeler')).filter(f=>f.endsWith('.html')).map(f=>'projeler/'+f)];
for(const file of pages)edit(file,html=>{
 const prefix=file.startsWith('projeler/')?'../':'';
 html=html.replace(/<script>try\s*\{[\s\S]*?dataset\.theme[\s\S]*?<\/script>/g,`<script src="${prefix}theme-init.js"></script>`);
 html=html.replace(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>\s*/gi,'').replace(/<meta name="referrer"[^>]*>\s*/gi,'');
 const hashes=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src=')).map(m=>"'sha256-"+createHash('sha256').update(m[2]).digest('base64')+"'");
 const csp=policy.replace("script-src 'self'", "script-src 'self' "+hashes.join(' '));
 html=html.replace(/(<meta\s+charset=[^>]+\/?>)/i,`$1\n<meta http-equiv="Content-Security-Policy" content="${csp.trim()}"/>\n<meta name="referrer" content="strict-origin-when-cross-origin"/>`);
 if(file==='index.html')html=html.replace('<input name="_captcha" type="hidden" value="false"/>','<input name="_captcha" type="hidden" value="true"/>');
 if(file==='laboratuvar.html'){
  if(!html.includes('src="circuit-state.js"'))html=html.replace('<script defer src="circuit-editor.js">','<script defer src="circuit-state.js"></script><script defer src="circuit-editor.js">');
  html=html.replace(/(<textarea\b[^>]*id="cs-code"[^>]*)(>)/,(_,start,end)=>start.includes('maxlength=')?start+end:start+' maxlength="14000"'+end);
  if(!html.includes('Taslaklar bu tarayıcıda'))html=html.replace('<strong>Nasıl kullanılır?</strong>','<p>Taslaklar bu tarayıcıda saklanır. Koduna şifre, erişim anahtarı veya kişisel veri ekleme.</p><strong>Nasıl kullanılır?</strong>');
 }
 return html;
});
console.log('Sayfa güvenlik politikaları güncellendi.');
