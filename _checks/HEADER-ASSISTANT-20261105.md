# Menü ve asistan güncellemesi

Ana menü 4 başlığa indirildi: Hakkımda, Projeler, Keşfet, İletişim. Keşfet altında laboratuvar, pin rehberi, hesaplayıcılar, Otonom Sistemler, yetkinlikler ve kod arşivi erişilebilir. Metin boyutu masaüstünde 14 px; mobil menüde 21 px. Açılır menü klavye/odak/dışarı tıklama/Escape ile yönetilir. Instagram ana tanıtım alanına ve tüm sayfaların alt bölümüne taşındı.

Sabit hava durumu ve hareket eden örnek telemetri kaldırıldı. Terminal görünümündeki alana gerçek Workers AI modeli kullanan EC Asistan eklendi. Hava durumu yalnızca kullanıcı sorunca sunucudan alınır. TR/EN, mevcut laboratuvar, hesaplayıcılar ve iletişim formu korunur.

45 test geçti: önceki güvenlik ve işlev testleri, yeni menü yapısı, sohbetin yalnızca istek üzerine çalışması, çıktının güvenli düz metin olarak gösterilmesi, hata/kota/temizleme davranışı, backend doğrulama ve kalıcı kota. Modelin gerçek Türkçe yanıtı Cloudflare API'sinden doğrulandı. SVG veya tarayıcı ekran görüntüsüyle yeni düzenin görsel kontrolü yapılmadı.

Üretim backend'i: https://ege-site-asistani.egecoskun-tech.workers.dev/chat

Ağ kısıtı: bu bilgisayardan yapılan doğrudan workers.dev HTTPS testi başarısız oldu; HTTP başlık testinde bir middlebox yönlendirmesi görüldü. Kullanıcı kendi tarayıcısında beklenen Forbidden yanıtını aldı. Üretimde gerçek kullanıcı sohbeti ayrıca kontrol edilmelidir. Ayrıntı: ../_worker/README.md.
