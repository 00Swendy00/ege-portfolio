'use strict';
(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const label = button.querySelector('.contact-button-label');
  const result = document.getElementById('contact-result');
  const fields = ['name', 'email', 'message'].map(name => form.elements.namedItem(name));
  let sending = false;

  function show(message, kind = '') {
    result.textContent = message;
    result.dataset.kind = kind;
  }
  function resetCaptcha() {
    try { window.hcaptcha?.reset(); } catch (_) {}
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const data = new FormData(form);
    const accessKey = String(data.get('access_key') || '').trim();
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(accessKey)) {
      show('Mesaj gönderimi şu anda hazır değil. Lütfen daha sonra tekrar dene.', 'error');
      return;
    }
    if (data.get('botcheck')) {
      show('Gönderim doğrulanamadı. Lütfen formu yeniden kontrol et.', 'error');
      return;
    }
    const captcha = String(data.get('h-captcha-response') || '');
    if (!captcha) {
      show('Lütfen güvenlik doğrulamasını tamamla. Doğrulama görünmüyorsa sayfayı yenile.', 'error');
      return;
    }
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    if (!name || !email || !message || name.length > 100 || email.length > 180 || message.length > 5000) {
      show('Adını, e-posta adresini ve mesajını kontrol et.', 'error');
      return;
    }

    const payload = {
      access_key: accessKey,
      subject: 'Portfolyo üzerinden yeni mesaj',
      from_name: 'Ege Coşkun — Portfolyo',
      name, email, message,
      'h-captcha-response': captcha
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    sending = true;
    button.disabled = true;
    fields.forEach(field => { field.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    label.textContent = 'Gönderiliyor…';
    show('Mesajın gönderiliyor.');
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify(payload),
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error'
      });
      const body = await response.json();
      if (!response.ok || body?.success !== true) {
        if (response.status === 429) show('Çok sık gönderim yapıldı. Biraz bekleyip tekrar dene; mesajın bu sayfada duruyor.', 'error');
        else show('Mesaj gönderilemedi. Lütfen daha sonra tekrar dene; yazdıkların bu sayfada duruyor.', 'error');
        return;
      }
      form.reset();
      show('Mesajın başarıyla iletildi. Teşekkürler!', 'success');
    } catch (_) {
      show('Gönderim doğrulanamadı. Bağlantını kontrol edip tekrar dene; yazdıkların bu sayfada duruyor.', 'error');
    } finally {
      clearTimeout(timeout);
      resetCaptcha();
      sending = false;
      button.disabled = false;
      fields.forEach(field => { field.disabled = false; });
      form.removeAttribute('aria-busy');
      label.textContent = 'Mesaj gönder';
    }
  });
})();
