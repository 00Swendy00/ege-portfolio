import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'..');
const source=readFileSync(path.join(base,'theme-init.js'),'utf8');
function visit(address,{denyHistory=false}={}) {
 const location=new URL(address),state={scroll:42},calls=[];
 const document={documentElement:{dataset:{}}};
 const history={state,replaceState(nextState,title,url){if(denyHistory)throw Error('History unavailable');calls.push({state:nextState,url});}};
 vm.runInNewContext(source,{window:{location,history},document,localStorage:{getItem:()=>'dark'}});
 return {calls,state,theme:document.documentElement.dataset.theme};
}
test('Old homepage addresses preserve section, search and navigation state',()=>{
 const result=visit('https://egecoskun.tech/index.html?ref=menu#projects');
 assert.equal(result.calls.length,1);assert.equal(result.calls[0].url,'/?ref=menu#projects');assert.equal(result.calls[0].state,result.state);assert.equal(result.theme,'dark');
});
test('Index filenames disappear for both root and directory landing pages',()=>{
 assert.equal(visit('https://egecoskun.tech/index.html').calls[0].url,'/');
 assert.equal(visit('https://egecoskun.tech/example/index.html#top').calls[0].url,'/example/#top');
});
test('Other pages, clean addresses and local file previews keep their address',()=>{
 for(const url of ['https://egecoskun.tech/#projects','https://egecoskun.tech/otonom-sistemler.html','https://egecoskun.tech/projeler/servo-radar.html','file:///C:/site/index.html'])assert.equal(visit(url).calls.length,0,url);
});
test('An unavailable history API does not prevent theme initialization',()=>{
 assert.equal(visit('https://egecoskun.tech/index.html',{denyHistory:true}).theme,'dark');
});
test('Every page links to the homepage without an explicit index filename',()=>{
 const pages=[...readdirSync(base).filter(f=>f.endsWith('.html')),...readdirSync(path.join(base,'projeler')).filter(f=>f.endsWith('.html')).map(f=>'projeler/'+f)];
 for(const file of pages){
  const html=readFileSync(path.join(base,file),'utf8');
  for(const link of html.matchAll(/\bhref="([^"]+)"/g))assert.doesNotMatch(link[1],/index\.html/i,file+': '+link[1]);
  assert.match(html,/src="(?:\.\.\/)?theme-init\.js\?v=20261104-urls"/);
 }
});
