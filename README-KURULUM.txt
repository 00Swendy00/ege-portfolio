EGE COŞKUN — YAYINA HAZIR SİTE (30.10.2026)
===========================================
Bu paket daha önce hazırlanan Apple tarzı portfolyo tasarımının,
GÖNDERDİĞİNİZ ORİJİNAL GÖRSELLERLE güncellenmiş hâlidir.
Yeni logo üretilmedi. Gönderilen görseller birebir dosyalara eklendi.

KURULUM
1) Arşivi WinRAR ile açın. İçeride index.html, style.css ve assets/ klasörü doğrudan bulunur.
2) Bu klasörün İÇİNDEKİ dosya ve klasörleri alan adınızın web köküne
   (genellikle public_html) yükleyin. Üstte ekstra klasör oluşmasın.
3) Eski siteyi önce yedekleyin. index.html dosyasını yeni dosyayla değiştirin.
4) assets/, projeler/, kodlar/ klasörlerini birlikte yükleyin.
5) Tarayıcıda Ctrl+F5 ile önbelleği yenileyin.
6) https://egecoskun.tech/ ve iki proje adresini kontrol edin.

RESİM EŞLEMESİ
 assets/ec-logo.png                Üst menü ve alt menü dairesel EC logo
 assets/logo2.png                  Açılış alanındaki küçültülmüş EGE COŞKUN marka görseli
 assets/spotify.jpg                Spotify Dot Matrix proje kartı ve detay
 assets/servo-radar.jpg            Servo Radar proje kartı ve detay
 assets/bakimda.jpg                Ana sayfa sıradaki proje / bakımda görseli
 assets/arduino-dotmatrix-wiring.png Spotify projesi devre bağlantısı
 assets/radar-sema.png             Servo Radar projesi devre bağlantısı

İÇERİK
 index.html                         Ana sayfa
 style.css, script.js               Ana tasarım / animasyonlar
 project.css, project.js            Proje detay tasarımı / kod kopyalama
 projeler/spotify-dotmatrix.html    Spotify proje sayfası
 projeler/servo-radar.html          Servo Radar proje sayfası
 kodlar/                            Örnek Arduino, Python ve Processing kodları
 robots.txt, sitemap.xml            Temel arama motoru dosyaları

DİKKAT
* İletişim formunda eskiden kullanılan FormSubmit adresi korunmuştur:
  egecoskun065@gmail.com. Çalışması için bu serviste doğrulama yapılmış olmalıdır.
* Spotify Python örneği, resmî Spotify API yerine pencere başlığını okur ve
  COM9 bağlantısı örnektir; bilgisayarda değiştirilmelidir.
* Servo Radar Arduino pinleri, gönderdiğiniz şemadaki D9, D10 ve D11 ile eşleşecek
  şekilde düzenlendi. Eski kodda farklı pinler kullanılıyordu.
* Bu paket canlı sunucuya otomatik yüklenmedi; yüklemeyi hosting panelinizden yapın.
* Bu paket ZIP biçimindedir; WinRAR programıyla açabilirsiniz.

SON DÜZENLEME (30.10.2026): Açılıştaki logo küçültüldü, 01 / BUILD ve EMBEDDED SYSTEMS etiketleri kaldırıldı. Açılış ekranı tam ekran yüksekliğinde; aşağı kaydırınca beyaz Projeler bölümü tüm ekran genişliğinde başlıyor.

SON GÜNCELLEME: Büyük hero logosu kaldırıldı. Yerine örnek ESP32 kod terminali ve statik demo telemetri görseli eklendi. Ana ve proje sayfalarında koyu/açık renk uyumlu, dikkat dağıtmayan hareketli kod arkaplanı eklendi. Görseller, marka logosu (yalnızca navbar/footer), projeler, proje kodları korunmuştur. Hareket azaltma ayarında kod yağmuru statiktir.
