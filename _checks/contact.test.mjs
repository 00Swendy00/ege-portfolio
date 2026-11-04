import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),source=readFileSync(path.join(root,'contact-form.js'),'utf8');
const key='11111111-2222-4333-8444-555555555555';
function setup({values={},valid=true,respond=async()=>({ok:true,status:200,json:async()=>({success:true})})}={}) {
 const fields={access_key:{value:key},subject:{value:'Subject'},from_name:{value:'Site'},botcheck:{checked:false},name:{value:'Ege'},email:{value:'visitor@example.org'},message:{value:'Merhaba'},'h-captcha-response':{value:'captcha-token'}};
 for(const [name,value] of Object.entries(values))if(name==='botcheck')fields[name].checked=value;else fields[name].value=value;
 const handlers={},button={disabled:false,querySelector(){return label;}},label={textContent:'Mesaj gönder'},result={textContent:'',dataset:{}},attributes={};
 const calls=[],timers=new Map();let timerId=0,resets=0,captchaResets=0;
 const form={elements:{namedItem:name=>fields[name]},querySelector:()=>button,addEventListener(type,fn){handlers[type]=fn;},reportValidity:()=>valid,setAttribute(name,value){attributes[name]=value;},removeAttribute(name){delete attributes[name];},reset(){resets++;fields.name.value='';fields.email.value='';fields.message.value='';}};
 class FormData {constructor(){this.get=name=>name==='botcheck'?(fields.botcheck.checked?'on':null):(fields[name]?.value??null);}}
 const context={document:{querySelector:()=>form,getElementById:()=>result},window:{hcaptcha:{reset(){captchaResets++;}}},FormData,AbortController,setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},fetch:async(url,options)=>{calls.push({url,options});return respond(url,options);}};
 vm.runInNewContext(source,context);
 return {fields,button,label,result,calls,attributes,timers,send:()=>handlers.submit({preventDefault(){}}),getResets:()=>resets,getCaptchaResets:()=>captchaResets};
}
test('Valid messages go directly to Web3Forms and clear only after confirmed success',async()=>{
 const ui=setup();await ui.send();assert.equal(ui.calls.length,1);assert.equal(ui.calls[0].url,'https://api.web3forms.com/submit');assert.equal(ui.calls[0].options.method,'POST');
 const payload=JSON.parse(ui.calls[0].options.body);assert.equal(payload.access_key,key);assert.equal(payload.email,'visitor@example.org');assert.equal(payload.message,'Merhaba');assert.equal(payload['h-captcha-response'],'captcha-token');
 assert.equal(ui.calls[0].options.credentials,'omit');assert.equal(ui.calls[0].options.redirect,'error');assert.equal(ui.result.dataset.kind,'success');assert.equal(ui.getResets(),1);assert.equal(ui.button.disabled,false);assert.equal(ui.label.textContent,'Mesaj gönder');
});
test('Server rejection and rate limits preserve the original message',async()=>{
 for(const [ok,status,success] of [[false,400,false],[false,429,false],[true,200,false],[false,500,true]]){
  const ui=setup({respond:async()=>({ok,status,json:async()=>({success})})});await ui.send();assert.equal(ui.result.dataset.kind,'error');assert.equal(ui.fields.message.value,'Merhaba');assert.equal(ui.getResets(),0);assert.equal(ui.button.disabled,false);assert.equal(ui.getCaptchaResets(),1);
 }
});
test('Network errors and invalid JSON never report success or discard the message',async()=>{
 for(const respond of [async()=>{throw Error('Offline');},async()=>({ok:true,status:200,json:async()=>{throw Error('Invalid JSON');}})]){
  const ui=setup({respond});await ui.send();assert.equal(ui.result.dataset.kind,'error');assert.equal(ui.fields.message.value,'Merhaba');assert.equal(ui.getResets(),0);assert.equal(ui.button.disabled,false);
 }
});
test('A timed-out request aborts and restores the form without a mail redirect',async()=>{
 const ui=setup({respond:(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Aborted'))))});
 const pending=ui.send();assert.equal(ui.calls.length,1);assert.equal(ui.button.disabled,true);assert.equal(ui.attributes['aria-busy'],'true');[...ui.timers.values()][0]();await pending;
 assert.equal(ui.result.dataset.kind,'error');assert.equal(ui.fields.message.value,'Merhaba');assert.equal(ui.button.disabled,false);assert.equal(ui.attributes['aria-busy'],undefined);
});
test('Repeated submit clicks share one request and inputs are locked only while sending',async()=>{
 let finish;const ui=setup({respond:()=>new Promise(resolve=>{finish=resolve;})});const first=ui.send();await ui.send();assert.equal(ui.calls.length,1);assert.equal(ui.fields.message.disabled,true);
 finish({ok:true,status:200,json:async()=>({success:true})});await first;assert.equal(ui.fields.message.disabled,false);assert.equal(ui.getResets(),1);
});
test('Invalid input, missing keys and missing CAPTCHA do not call the provider',async()=>{
 for(const options of [{valid:false},{values:{access_key:''}},{values:{'h-captcha-response':''}},{values:{name:' '}},{values:{message:'x'.repeat(5001)}},{values:{botcheck:true}}]){
  const ui=setup(options);await ui.send();assert.equal(ui.calls.length,0);assert.equal(ui.getResets(),0);
 }
});
test('Message content remains plain JSON; provider messages cannot inject HTML',async()=>{
 const message='<img src=x onerror=alert(1)> &cc=other@example.org';
 const ui=setup({values:{message},respond:async()=>({ok:false,status:400,json:async()=>({success:false,message:'<script>alert(1)</script>'})})});await ui.send();
 assert.equal(JSON.parse(ui.calls[0].options.body).message,message);assert.equal(ui.fields.message.value,message);assert.doesNotMatch(ui.result.textContent,/<script>/);
 assert.doesNotMatch(source,/innerHTML|mailto:|mail\.google\.com|window\.open|location\.(?:href|assign|replace)/);
});
test('Production form has a real public access key, CAPTCHA and no email-app fallback',()=>{
 const html=readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/action="https:\/\/api\.web3forms\.com\/submit"/);assert.match(html,/name="access_key" type="hidden" value="[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}"/);
 assert.match(html,/class="h-captcha" data-sitekey="50b2fe65-b00b-4b9e-ad62-3ba471098be2"/);assert.match(html,/js\.hcaptcha\.com\/1\/api\.js/);
 assert.doesNotMatch(html,/formsubmit\.co|contact-email-|contact-fallback\.js|mailto:|mail\.google\.com/);
 assert.match(html,/id="contact-result" role="status" aria-live="polite"/);
});
