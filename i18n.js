'use strict';
(() => {
  const catalogue=window.SiteTranslations || {exact:{},patterns:[]};
  const exact=catalogue.exact, patterns=catalogue.patterns.map(p=>({...p,regex:new RegExp(p.source,p.flags || 'u')}));
  const normalize=s=>String(s).replace(/\s+/g,' ').trim();
  const reverse=new Map(Object.entries(exact).map(([tr,en])=>[en,tr]));
  const sourceFor=value=>language==='en' && reverse.has(normalize(value)) ? value.match(/^\s*/)[0]+reverse.get(normalize(value))+value.match(/\s*$/)[0] : value;
  let language=document.documentElement.lang==='en'?'en':'tr';
  const textState=new WeakMap(),attrState=new WeakMap();
  const attributes=['aria-label','aria-description','title','alt','placeholder','data-caption'];
  const excluded='script,style,code,pre,textarea,.dev-code-lines,.code-lines,.h-captcha,[data-i18n-skip]';
  const prefixes=['Kod hatası:','Çalışma zamanı hatası:','Kod çalıştırma hatası:','Çalıştırma hatası:','Simülasyon durdu:','✕','[Simülasyon durdu:'];
  function translate(value,lang=language,depth=0) {
    if(lang!=='en' || depth>5)return String(value);
    const original=String(value),key=normalize(original);
    let translated=Object.hasOwn(exact,key)?exact[key]:undefined;
    if(translated===undefined && original.includes('\n'))translated=original.trim().split('\n').map(line=>translate(line,'en',depth+1)).join('\n');
    if(translated===undefined){
      for(const prefix of prefixes)if(key.startsWith(prefix+' ')){
        let body=key.slice(prefix.length).trim();const bracket=prefix.startsWith('[') && body.endsWith(']');if(bracket)body=body.slice(0,-1);
        translated=(prefix==='[Simülasyon durdu:'?'[Simulation stopped:':(exact[prefix] || prefix))+' '+translate(body,'en',depth+1)+(bracket?']':'');break;
      }
    }
    if(translated===undefined)for(const p of patterns)if(p.regex.test(key)){translated=key.replace(p.regex,p.replacement);break;}
    if(translated===undefined)return original;
    translated=translated.replace(/\bBUTON ([12])\b/g,'BUTTON $1');
    return original.match(/^\s*/)[0]+translated+original.match(/\s*$/)[0];
  }
  const skipped=element=>!element || !!element.closest(excluded);
  function text(node) {
    if(skipped(node.parentElement) || !node.nodeValue.trim())return;
    const current=node.nodeValue;
    let state=textState.get(node);
    if(!state || current!==state.output)state={source:sourceFor(current),output:current};
    const output=translate(state.source);
    state.output=output;textState.set(node,state);
    if(current!==output)node.nodeValue=output;
  }
  function attribute(element,name) {
    const current=element.getAttribute(name);
    if(current===null || !current.trim())return;
    let states=attrState.get(element);if(!states){states={};attrState.set(element,states);}
    let state=states[name];if(!state || current!==state.output)state={source:sourceFor(current),output:current};
    state.output=translate(state.source);states[name]=state;
    if(current!==state.output)element.setAttribute(name,state.output);
  }
  function apply(node=document.documentElement) {
    if(node.nodeType===3){text(node);return;}
    if(node.nodeType!==1 && node.nodeType!==9 && node.nodeType!==11)return;
    const visit=el=>{if(el.closest('script,style,.h-captcha,[data-i18n-skip]'))return;attributes.forEach(name=>attribute(el,name));if(el.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]'))attribute(el,'content');};
    if(node.nodeType===1)visit(node);
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let child;while((child=walker.nextNode()))if(child.nodeType===3)text(child);else visit(child);
  }
  function setLanguage(value,{persist=true}={}) {
    language=value==='en'?'en':'tr';document.documentElement.lang=language;document.documentElement.dataset.language=language;
    if(persist)try{localStorage.setItem('ege-language',language);}catch(_){}
    apply();document.querySelectorAll('.language-select').forEach(select=>select.value=language);
    const og=document.querySelector('meta[property="og:locale"]');if(og)og.content=language==='en'?'en_US':'tr_TR';
    document.dispatchEvent(new CustomEvent('site:languagechange',{detail:{language}}));
  }
  window.SiteI18n=Object.freeze({t:translate,apply,getLanguage:()=>language,setLanguage});
  document.querySelectorAll('.language-select').forEach(select=>select.addEventListener('change',()=>setLanguage(select.value)));
  const observer=new MutationObserver(records=>{
    const roots=new Set();
    for(const record of records){
      if(record.type==='attributes')attribute(record.target,record.attributeName);
      else if(record.type==='characterData')text(record.target);
      else record.addedNodes.forEach(node=>roots.add(node));
    }
    roots.forEach(node=>apply(node));
  });
  setLanguage(language,{persist:false});
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...attributes,'content']});
  window.addEventListener('storage',event=>{if(event.key==='ege-language')setLanguage(event.newValue,{persist:false});});
})();
