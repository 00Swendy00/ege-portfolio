'use strict';
(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const emailLink = form.querySelector('[data-contact-email]');
  const gmailLink = form.querySelector('[data-contact-gmail]');
  const copyButton = form.querySelector('[data-contact-copy]');
  const status = form.querySelector('[data-contact-status]');
  const recipient = 'egecoskun065@gmail.com';
  const subject = 'Portfolyo üzerinden yeni mesaj';
  let body = '';
  let longMessage = false;

  function update() {
    const name = form.elements.namedItem('name').value.trim().slice(0, 100);
    const email = form.elements.namedItem('email').value.trim().slice(0, 180);
    const message = form.elements.namedItem('message').value.trim().slice(0, 5000);
    body = 'Ad: ' + name + '\nE-posta: ' + email + '\n\n' + message;
    const mailQuery = new URLSearchParams({subject, body}).toString().replaceAll('+', '%20');
    const mailto = 'mailto:' + recipient + '?' + mailQuery;
    // Some desktop mail apps reject long URLs. Keep the complete message available to copy.
    longMessage = mailto.length > 1800;
    emailLink.href = longMessage ? 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) : mailto;
    const gmail = new URL('https://mail.google.com/mail/');
    gmail.search = new URLSearchParams({view: 'cm', fs: '1', to: recipient, su: subject, body}).toString();
    gmailLink.href = gmail.href;
    status.textContent = longMessage ? 'Uzun mesajlar için Gmail’i kullanabilir veya mesajı kopyalayıp açılan e-postaya yapıştırabilirsin.' : '';
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  emailLink.addEventListener('click', () => {
    update();
    if (!longMessage) status.textContent = 'E-posta uygulaması açılmazsa Gmail’i kullanabilir veya mesajını kopyalayabilirsin. Mesaj henüz gönderilmedi.';
  });
  gmailLink.addEventListener('click', () => {
    update();
    status.textContent = 'Gmail’de açılan taslağı kontrol edip “Gönder”e bas. Mesaj henüz gönderilmedi.';
  });
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      update();
      try {
        await navigator.clipboard.writeText(body);
        status.textContent = 'Mesaj kopyalandı. E-postana yapıştırıp gönderebilirsin.';
      } catch (_) {
        status.textContent = 'Kopyalama izni verilmedi. Mesaj alanındaki metni seçip kopyalayabilirsin.';
      }
    });
  }
  update();
})();
