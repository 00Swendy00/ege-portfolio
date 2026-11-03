EGECOSKUN.TECH — Arduino Devre Tasarımcısı V6.2

Yeni özellikler
• Devre çalışma alanı üzerinde fare tekerleği ile imlece odaklı yakınlaştırma ve uzaklaştırma (%45–%250).
• Sağdaki Kod sekmesinde düzenlenebilir Arduino .ino editörü.
• Kodu kontrol et: desteklenen sözdizimi ve komutları denetler.
• Kodu çalıştır: eğitim amaçlı güvenli Arduino komut yorumlayıcısında kodun davranışını görselleştirir.
• Seri monitör çıktısı, hata mesajları, kod ve devre kaydı.
• Kod taslakları tarayıcıda saklanır. Dışa aktarılan devre JSON'u kodu da içerir.
• Önceki V6.1 devre özellikleri ve eski yerel devre kayıtları korunur.

Desteklenen komutlar
void setup(), void loop(), temel sayısal değişkenler, if/else, aritmetik ve karşılaştırmalar,
pinMode, digitalWrite, digitalRead, analogWrite, analogRead (örnek değer), delay,
delayMicroseconds, Serial.begin / print / println, pulseIn (örnek HC-SR04 mesafe),
millis, Servo.attach / write, tone / noTone, min, max, map, constrain, abs.

Önemli sınırlar
BU BİR TAM ARDUINO C++ DERLEYİCİSİ VEYA ELEKTRONİK DEVRE ÇÖZÜMLEYİCİSİ DEĞİLDİR.
for/while gibi genel döngüler, keyfî kütüphaneler, pointer ve sınıf tanımları gibi
C++ özellikleri desteklenmez. Kod güvenli, sınırlı bir JavaScript yorumlayıcısı
ile çalıştırılır. pinMode/digitalWrite ve benzeri işlemler tanınır; çıkış yalnızca
uygun bağlanmış örnek donanım üzerinde simüle edilir. Ölçümler örnek veridir.

GitHub Pages güncelleme
• Yalnızca laboratuvar güncelleme paketindeki dosyaları yollarını koruyarak yükle:
  laboratuvar.html, circuit-editor.css, circuit-editor.js, arduino-simulator.js.
• Tam site paketinde CNAME ve mevcut görseller/projeler de bulunur.
• .nojekyll ve CNAME dosyalarını silme.
• ZIP dosyasını doğrudan GitHub'a koymak yerine içindekileri yükle.

Kullanım
1. Laboratuvar → Bileşenler → devre seç veya parçaları sürükle ve bağla.
2. Çalışma alanında tekerlek yukarı: büyüt, aşağı: küçült.
3. Kod sekmesini seç, kod yaz, 'Kodu kontrol et' seç.
4. 'Kodu çalıştır' ile devredeki durumları ve seri çıktılarını izle.
5. .ino indir ile kodu, Kaydet ile devre + kodu dışa aktar.
