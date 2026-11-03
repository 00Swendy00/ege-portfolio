# Güvenlik güncellemesi — 3 Kasım 2026

## Yerelde tamamlananlar

- Değişiklik öncesi sürüm ZIP olarak çalışma deposunun dışında yedeklendi.
- JSON içe aktarma ve localStorage için ortak, boyut sınırı olan doğrulama eklendi.
- Parça kimlikleri yeniden üretiliyor; tekrarlar, bozuk kimlikler, geçersiz portlar,
  eksik uçlar, tekrar ve kendi kendine kablolar reddediliyor.
- Taslaklar yalnızca izin verilen örnek adlarından oluşan prototipsiz nesnede saklanıyor.
- Kullanıcı kaynaklı CSS seçici değerleri kaçırılıyor.
- Arduino ayrıştırma karmaşıklığı, iç içe bloklar, ifade işlemleri ve metin büyümesi sınırlandırıldı.
- FormSubmit CAPTCHA açıldı; honeypot korundu.
- Bütün HTML sayfalarına meta CSP ve referrer politikası eklendi.
  Betik politikası unsafe-inline veya unsafe-eval içermiyor. Google Fonts ve FormSubmit korunuyor.
- Gizli dosya ve yedekler için .gitignore; GitHub Pages/Jekyll için yayın dışı dosya listesi eklendi.
- Güvenlik testleri için salt okunur izinlerle CI iş akışı hazırlandı.
- Ana dalın indirilen 97 commit'indeki değişen metin dosyaları bilinen anahtar/özel anahtar
  kalıpları ve sır atamaları açısından tarandı; eşleşme bulunmadı. Bu kalıp taraması
  bütün sırları yakalama garantisi vermez ve herhangi bir anahtarın geçerliliği sorgulanmadı.
- 12 yerel güvenlik testi ve JavaScript sözdizimi kontrolleri geçti.
- GitHub cihaz girişi kullanıcı tarafından tamamlandı; 00Swendy00 hesabının gönderim erişimi doğrulandı.
- GitHub Pages yapılandırması API üzerinden doğrulandı: yayın kaynağı main dalı / kök klasör;
  Enforce HTTPS açık. Güncel yayın ve test sonucu deponun Actions kayıtlarından izlenebilir.

## Henüz tamamlanmayanlar

- Canlı yayın bu güncellemenin main dalına gönderilmesiyle tetiklenir; başarılı dağıtım
  ve canlı dosya eşleşmesi ayrıca doğrulanmalıdır.
- Tarayıcı testi: yerel önizleme izni reddedildi. Otomatik testler tarayıcı testi yerine geçmez.
- GitHub ve alan adı hesabının incelemesi: Opera uygulama erişimi onaylı değil.
- Diğer dallar, release ve Actions artefaktlarında sır taraması.
- FormSubmit teslimatı ve CAPTCHA akışının kullanıcı tarafından gerçek tarayıcıda doğrulanması.
- HTTP başlıkları: meta CSP, frame-ancestors veya HSTS yerine geçmez.

## Hesap sahibinin tamamlaması gerekenler

1. GitHub ve e-posta hesabında passkey veya iki aşamalı doğrulamayı açın;
   kurtarma kodlarını çevrimdışı saklayın. Parola/OTP/kurtarma kodlarını sohbete yazmayın.
2. GitHub Settings → Pages ekranında egecoskun.tech alan adını doğrulayın.
   GitHub'ın verdiği TXT kaydını DNS'e ekleyin; doğruladıktan sonra silmeyin.
3. Depo Settings → Pages bölümünde doğru ana dal/klasörü ve Enforce HTTPS'i kontrol edin.
4. Security and quality bölümündeki secret scanning uyarılarını kontrol edin;
   kullanılabilir push protection'ı etkinleştirin. Sızan sır varsa önce iptal edin/yenileyin.
5. Depo yazma yetkilerini ve bağlı uygulamaları daraltın. Dal korumasında bu CI kontrolünü
   zorunlu kılın; tek bakımcıysanız tamamlayamayacağınız ikinci kişi onayı koymayın.
6. Alan adı hesabında 2FA, transfer kilidi ve otomatik yenilemeyi açın.
   Gereksiz wildcard ve artık kullanılmayan DNS kayıtlarını inceleyin.
7. HSTS ve çerçeveleme koruması için yanıt başlıklarını destekleyen bir hosting/proxy
   planlayın. Mevcut DNS/MX kayıtlarını yedeklemeden taşıma yapmayın.

Önerilen HTTP politikaları, hosting üzerinde doğrulanarak uygulanmalı:

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()
```

HTTP Content-Security-Policy kullanıldığında HTML'deki politikayı aynen esas alın;
ek olarak `frame-ancestors 'none'` tanımlayın. HSTS önce kısa süreyle test edilmeli;
alt alan adları kontrol edilmeden includeSubDomains veya preload açılmamalı.

## Yayın öncesi kontrol

- `node --test _checks/security.test.mjs`
- Ana sayfa, tema, proje görselleri/kopyalama/indirmeler ve laboratuvarı tarayıcıda deneyin.
- Beş örnek devreyi çalıştırın; JSON dışa/içe aktarma ve sayfa yenilemesini kontrol edin.
- CAPTCHA'nın göründüğünü ve iletişim mesajının ulaştığını hesap sahibi doğrulasın.
- Yayından sonra CSP'yi, HTTPS yönlendirmesini ve canlı JS sürümünü yeniden kontrol edin.

Bu güncelleme tam güvenlik garantisi değildir. Kaynak kodu gizleme veya lisans seçimi yapılmadı.
