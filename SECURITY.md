# Güvenlik

Bu statik siteye ve örnek kodlara parola, Wi-Fi şifresi, API anahtarı veya kişisel veri eklemeyin.
Tarayıcıya gönderilen HTML, CSS, JavaScript ve indirilebilir proje kodları herkese açıktır.
localStorage taslakları aynı tarayıcı profilinde tutulur; şifreli kasa değildir.

Güvenlik bildirimi için sitedeki iletişim formunu kullanın. Herkese açık issue içine
erişim anahtarı, kişisel veri veya çalışan istismar örneği koymayın.

Yerel kontroller: `node --test _checks/security.test.mjs`

HTML içindeki veri betiklerini değiştirirseniz CSP özetlerini
`node _checks/update-security.mjs` ile güncelleyin ve testleri çalıştırın.

GitHub Pages üzerinde meta CSP uygulanır. HSTS, X-Content-Type-Options,
Permissions-Policy ve CSP frame-ancestors gibi HTTP yanıt başlıkları bu dosyayla
veya bir _headers dosyası eklemekle etkinleşmez. Bunlar için başlık desteği sunan
barındırma/proxy katmanı ayrıca yapılandırılmalıdır.
