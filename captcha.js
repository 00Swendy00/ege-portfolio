'use strict';
// Define the readiness callback before loading hCaptcha's asynchronous script.
(() => {
  let widget=null,renderedLanguage='';
  function render() {
    const container=document.querySelector('.h-captcha'),api=window.hcaptcha;
    if(!container || !api || !api.render || document.querySelector('.contact-form')?.getAttribute('aria-busy')==='true')return;
    const language=window.SiteI18n?.getLanguage() || document.documentElement.lang || 'tr';
    if(widget!==null && language===renderedLanguage)return;
    try{
      if(widget!==null)api.remove(widget);
      widget=api.render(container,{sitekey:container.dataset.sitekey,size:'compact',hl:language});renderedLanguage=language;
    }catch(_){widget=null;renderedLanguage='';}
  }
  window.siteCaptchaReady=render;
  window.SiteCaptcha=Object.freeze({getId:()=>widget,render});
  document.addEventListener('site:languagechange',render);
  document.addEventListener('site:contactcomplete',render);
})();
