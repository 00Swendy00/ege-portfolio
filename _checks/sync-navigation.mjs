import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const home=readFileSync(path.join(root,'index.html'),'utf8');
const shared=home.match(/<div class="nav-links"[^>]*>[\s\S]*?<\/div>/)[0];
for(const file of [...readdirSync(root).filter(f=>f.endsWith('.html')&&f!=='index.html'),...readdirSync(path.join(root,'projeler')).filter(f=>f.endsWith('.html')).map(f=>'projeler/'+f)]){
  let nav=shared.replaceAll('href="#','href="/#');
  if(file.startsWith('projeler/'))nav=nav.replace(/href="(?!\/|https?:|#)([^"]+)"/g,'href="../$1"');
  const full=path.join(root,file),source=readFileSync(full,'utf8');
  writeFileSync(full,source.replace(/<div class="nav-links"[^>]*>[\s\S]*?<\/div>/,nav));
}
