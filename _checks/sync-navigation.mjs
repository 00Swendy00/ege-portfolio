import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const home=readFileSync(path.join(root,'index.html'),'utf8');
const shared=home.match(/<header class="site-header"[\s\S]*?<\/header>/)[0];
for(const file of [...readdirSync(root).filter(f=>f.endsWith('.html')&&f!=='index.html'),...readdirSync(path.join(root,'projeler')).filter(f=>f.endsWith('.html')).map(f=>'projeler/'+f)]){
  let nav=shared.replaceAll('href="#','href="/#');
  if(file.startsWith('projeler/'))nav=nav.replace(/href="(?!\/|https?:|#)([^"]+)"/g,'href="../$1"').replaceAll('src="assets/','src="../assets/');
  const full=path.join(root,file),source=readFileSync(full,'utf8');
  writeFileSync(full,source.replace(/<header class="site-header"[\s\S]*?<\/header>/,nav));
}
