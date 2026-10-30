'use strict';
(() => {
  function init() {
    document.querySelectorAll('.copy-code').forEach(button => {
      button.setAttribute('aria-label','Kod bloğunu kopyala');
      button.addEventListener('click', async () => {
        const code=button.closest('.code-block')?.querySelector('code')?.textContent || '';
        if(!code) return;
        let copied=false;
        try {
          if(navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(code);
            copied=true;
          }
        } catch(_) {}
        if(!copied){
          const input=document.createElement('textarea');
          input.value=code;input.style.cssText='position:fixed;opacity:0;left:-10000px;top:0';
          document.body.append(input);input.select();
          try { copied=document.execCommand('copy'); } catch(_) {}
          input.remove();
        }
        button.textContent=copied?'Kopyalandı ✓':'Metni seçerek kopyala';
        if(!copied){
          const selection=window.getSelection();
          const range=document.createRange();range.selectNodeContents(button.closest('.code-block').querySelector('code'));
          selection.removeAllRanges();selection.addRange(range);
        }
        window.setTimeout(()=>{button.textContent='Kopyala';},2100);
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
