import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const source=readFileSync(path.join(root,'contact-fallback.js'),'utf8');
function setup(values={},clipboard='allowed') {
 const listeners=new Map(),elements={name:{value:values.name||''},email:{value:values.email||''},message:{value:values.message||''}};
 const node=()=>({href:'',hidden:true,textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}});
 const email=node(),gmail=node(),copy=node(),status=node();let copied='';
 const selectors={'[data-contact-email]':email,'[data-contact-gmail]':gmail,'[data-contact-copy]':copy,'[data-contact-status]':status};
 const form={elements:{namedItem(name){return elements[name];}},querySelector(selector){return selectors[selector];},addEventListener(type,fn){listeners.set(type,fn);}};
 const navigator=clipboard==='missing'?{}:{clipboard:{async writeText(text){if(clipboard==='denied')throw Error('Denied');copied=text;}}};
 vm.runInNewContext(source,{document:{querySelector(){return form;}},URL,URLSearchParams,navigator});
 return {email,gmail,copy,status,elements,listeners,getCopied:()=>copied};
}
test('Email alternatives compose to the intended recipient with the complete message',()=>{
 const values={name:'Ege Coşkun',email:'visitor@example.org',message:'Merhaba, Arduino için görüşelim.'};
 const ui=setup(values),mail=new URL(ui.email.href),gmail=new URL(ui.gmail.href);
 assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'egecoskun065@gmail.com');assert.match(mail.searchParams.get('body'),/Arduino için/);
 assert.equal(gmail.origin,'https://mail.google.com');assert.equal(gmail.searchParams.get('to'),'egecoskun065@gmail.com');assert.equal(gmail.searchParams.get('body'),mail.searchParams.get('body'));
 assert.equal(ui.elements.message.value,values.message);assert.equal(ui.status.textContent,'');
});
test('Message content cannot inject recipients or executable links',()=>{
 const text='&cc=other@example.org\r\n<script>alert(1)</script> ? # + 你好';
 const ui=setup({name:'Name',email:'visitor@example.org',message:text}),mail=new URL(ui.email.href),gmail=new URL(ui.gmail.href);
 assert.equal(mail.searchParams.has('cc'),false);assert.equal(gmail.searchParams.has('cc'),false);assert.ok(mail.searchParams.get('body').includes(text));assert.ok(gmail.searchParams.get('body').includes(text));
});
test('Alternatives track field changes and never claim an unsent message was sent',()=>{
 const ui=setup();ui.elements.message.value='Yeni içerik';ui.listeners.get('input')();
 assert.match(new URL(ui.gmail.href).searchParams.get('body'),/Yeni içerik/);
 ui.gmail.handlers.click();assert.match(ui.status.textContent,/henüz gönderilmedi/);assert.equal(ui.elements.message.value,'Yeni içerik');
 ui.email.handlers.click();assert.match(ui.status.textContent,/henüz gönderilmedi/);
});
test('Long messages remain complete in Gmail and clipboard without an oversized mailto link',async()=>{
 const message='Ö'.repeat(5000),ui=setup({message});
 assert.ok(ui.email.href.length<1800);assert.equal(new URL(ui.email.href).searchParams.has('body'),false);assert.ok(new URL(ui.gmail.href).searchParams.get('body').endsWith(message));
 await ui.copy.handlers.click();assert.ok(ui.getCopied().endsWith(message));assert.match(ui.status.textContent,/kopyalandı/);assert.equal(ui.elements.message.value,message);
});
test('A rejected clipboard operation leaves the text in place and reports the failure',async()=>{
 const ui=setup({message:'Kalıcı metin'},'denied');await ui.copy.handlers.click();assert.match(ui.status.textContent,/izni verilmedi/);assert.equal(ui.elements.message.value,'Kalıcı metin');
 assert.equal(setup({},'missing').copy.hidden,true);
});
test('Malformed Unicode does not break the alternative links',()=>{
 const ui=setup({message:'Merhaba\uD800'});assert.equal(new URL(ui.gmail.href).searchParams.get('to'),'egecoskun065@gmail.com');
});
test('Native form keeps CAPTCHA, the source URL and drafts on the current page',()=>{
 const html=readFileSync(path.join(root,'index.html'),'utf8'),form=html.match(/<form\b[^>]*class="contact-form reveal"[^>]*>/)[0];
 assert.match(form,/action="https:\/\/formsubmit.co\/egecoskun065@gmail.com"/);assert.match(form,/target="_blank"/);assert.match(form,/rel="noopener"/);
 assert.match(html,/name="_captcha"[^>]+value="true"/);assert.match(html,/name="_url"[^>]+value="https:\/\/egecoskun.tech\/"/);assert.match(html,/data-contact-email/);assert.match(html,/data-contact-gmail/);
 assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\b|\binnerHTML\b/);
});
