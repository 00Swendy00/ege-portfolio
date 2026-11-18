'use strict';
(() => {
 const form=document.getElementById('assistant-form');if(!form)return;
 const input=document.getElementById('assistant-question'),log=document.getElementById('assistant-messages'),status=document.getElementById('assistant-status');
 const topics=window.SiteAssistantConfig?.topics||[];
 const t=text=>window.SiteI18n?.t(text)??text;
 const normalize=text=>text.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim();
 let lastTopic;
 function bubble(text,role){
   const item=document.createElement('div');item.className='assistant-message assistant-message-'+role;
   if(role==='user')item.dataset.i18nSkip='';
   const label=document.createElement('span');label.className='assistant-message-label';label.textContent=role==='user'?t('Sen'):'EC';
   const body=document.createElement('p');body.textContent=text;item.append(label,body);log.append(item);
   while(log.children.length>20)log.firstElementChild.remove();
   return item;
 }
 function ask(question){
   question=question.trim();if(!question||question.length>600){status.textContent=t('Sorunu 1–600 karakter arasında yaz.');return;}
   const query=normalize(question);
   bubble(question,'user');
   const scores=topics.map(topic=>({topic,score:topic.words.reduce((sum,word)=>sum+(query.includes(normalize(word))?word.length:0),0)})).sort((a,b)=>b.score-a.score);
   const specific=scores[0]?.score>0?scores[0].topic:null;
   const topic=specific||(/nasil|how|kullan|nerede|where/.test(query)?lastTopic:null);
   const answer=topic?.answer||'Bu rehber sitedeki projeler ve araçlar hakkında yardımcı olur. Robot kol, Arduino, elektronik laboratuvarı, 3D modeller veya iletişim hakkında sorabilirsin.';
   const item=bubble(t(answer),'assistant');
   if(topic){
     lastTopic=topic;
     const link=document.createElement('a');link.href=topic.url;link.textContent=t(topic.label)+' ↗';item.append(link);
   }
   input.value='';status.textContent=t('Başka bir şey sorabilirsin.');
   window.SiteI18n?.apply(item);log.scrollTop=log.scrollHeight;
 }
 form.addEventListener('submit',event=>{event.preventDefault();ask(input.value);});
 document.querySelectorAll('[data-assistant-prompt]').forEach(button=>button.onclick=()=>ask(t(button.dataset.assistantPrompt)));
 document.getElementById('assistant-clear').onclick=()=>{
   lastTopic=undefined;log.replaceChildren();input.value='';status.textContent=t('Yeni bir sohbet başlatabilirsin.');input.focus();
 };
})();
