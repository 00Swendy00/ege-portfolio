'use strict';
(() => {
  const form=document.getElementById('assistant-form');if(!form)return;
  const input=document.getElementById('assistant-question'),log=document.getElementById('assistant-messages'),status=document.getElementById('assistant-status'),send=form.querySelector('button[type="submit"]'),clear=document.getElementById('assistant-clear');
  const prompts=[...document.querySelectorAll('[data-assistant-prompt]')],t=s=>window.SiteI18n?.t(s) ?? s;
  let turns=[],pending=false,controller=null,sequence=0;
  function state(text){status.textContent=t(text);}
  function bubble(text,role){const item=document.createElement('div');item.className='assistant-message assistant-message-'+role;item.dataset.i18nSkip='';const label=document.createElement('span');label.className='assistant-message-label';label.textContent=role==='user'?t('Sen'):'EC';const body=document.createElement('p');body.textContent=text;item.append(label,body);log.append(item);while(log.children.length>20)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;return item;}
  function links(item,list){
    if(!Array.isArray(list))return;
    for(const link of list.slice(0,3))try{
      const url=new URL(link.url,location.origin);if(url.protocol!=='https:' || ![location.origin,'https://open-meteo.com'].includes(url.origin))continue;
      const a=document.createElement('a');a.href=url.href;a.textContent=String(link.label).slice(0,80)+' ↗';a.target='_blank';a.rel='noopener noreferrer';item.append(a);
    }catch(_){}
  }
  function lock(value){pending=value;input.disabled=value;send.disabled=value;prompts.forEach(p=>p.disabled=value);form.setAttribute('aria-busy',String(value));}
  async function ask(question){
    if(pending)return;question=question.trim();if(!question || question.length>600){state('Sorunu 1–600 karakter arasında yaz.');return;}
    let endpoint;
    try{endpoint=new URL(window.SiteAssistantConfig?.endpoint);if(endpoint.protocol!=='https:' || !endpoint.hostname.endsWith('.workers.dev') || endpoint.pathname!=='/chat')throw Error();}
    catch(_){state('Asistan bağlantısı henüz hazır değil. Lütfen daha sonra tekrar dene.');return;}
    const requestId=++sequence;controller=new AbortController();lock(true);state('Yanıt hazırlanıyor…');bubble(question,'user');input.value='';
    const messages=[...turns.slice(-4),{role:'user',content:question}].map(m=>({role:m.role,content:m.content.slice(0,600)}));
    const timeout=setTimeout(()=>controller?.abort(),30000);
    try{
      const response=await fetch(endpoint.href,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({messages,language:window.SiteI18n?.getLanguage() || 'tr'}),credentials:'omit',redirect:'error',signal:controller.signal});
      const data=await response.json();if(requestId!==sequence)return;
      if(!response.ok){const error=new Error(response.status===429?'quota':data?.code==='weather'?'weather':'unavailable');throw error;}
      if(typeof data.answer!=='string' || !data.answer.trim() || data.answer.length>6000)throw Error('unavailable');
      const item=bubble(data.answer,'assistant');links(item,data.links);turns=[...messages,{role:'assistant',content:data.answer}].slice(-6);
      state('Başka bir şey sorabilirsin.');
    }catch(error){
      if(requestId!==sequence)return;
      const message=error.message==='quota'?'Ücretsiz kullanım sınırına ulaşıldı. Bir süre sonra yeniden dene.':error.message==='weather'?'Hava durumu şu anda alınamıyor. Lütfen daha sonra yeniden dene.':'Yanıt alınamadı. Bağlantını kontrol edip tekrar dene.';
      state(message);input.value=question;
    }finally{clearTimeout(timeout);if(requestId===sequence){lock(false);controller=null;input.focus();}}
  }
  form.addEventListener('submit',event=>{event.preventDefault();void ask(input.value);});
  prompts.forEach(button=>button.addEventListener('click',()=>void ask(t(button.dataset.assistantPrompt))));
  clear.addEventListener('click',()=>{sequence++;controller?.abort();controller=null;turns=[];log.replaceChildren();input.value='';lock(false);state('Yeni bir sohbet başlatabilirsin.');input.focus();});
})();
