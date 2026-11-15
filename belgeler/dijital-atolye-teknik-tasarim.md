# egecoskun.tech Dijital Atölye teknik tasarımı

İlk sürüm, portföyün ana sayfasındaki **Dijital Atölye** bölümünden açılan üç bağımsız uygulamadan oluşur. Mevcut proje sayfaları, laboratuvar, Arduino taslakları, ESP32 pin haritası, hesaplayıcılar ve iletişim akışı yayın öncesi regresyon kontrolüne dahildir. Yeni araçlar statik dosyalarla çalışır. Hesap, veri tabanı veya uygulama sunucusu gerektirmez.

## Entegrasyon ve modül sınırları

| Modül | Adres | İlk sürüm | Genişletme sınırı |
| --- | --- | --- | --- |
| Elektronik | `/atolye/elektronik.html` | Görsel DC devre, kablolar, ölçüm, JSON ve mevcut Arduino editörüne geçiş | Arduino simülasyonu mevcut eğitim yorumlayıcısında kalır. Tam C++ ve ESP32 emülasyonu ayrı aşamadır. |
| Robot | `/atolye/robot.html` | Tek 3 eksenli model, FK, IK ve poz dizisi | Oryantasyon hedefi, çarpışma, tork, donanım komutu ve 6 eksen ayrı aşamadır. |
| 3D model | `/atolye/model.html` | STEP/STP ve STL, kamera, parça görünürlüğü, ayırma ve yaklaşık ölçüm | Yerel SolidWorks formatı, parametrik geçmiş ve analitik CAD ölçümü ayrı aşamadır. |

Yayın kılavuzu GitHub Pages için `main` dalının kökünü tarif eder. Canlı ayar ve dosya MIME türleri yayın sırasında doğrulanır. Yeni rotalar `atolye/` altında yer alır. Atölye bağlantıları ana sayfanın Türkçe ve İngilizce çeviri listesine dahildir. Atölye ekranları bu sürümde Türkçedir. Mevcut kayıt anahtarlarına yazılmaz ve yeni araçların betikleri portföy girişinde yüklenmez.

Paylaşılan katman, stil dosyası ve WebGL kamera/ışık düzeniyle sınırlıdır. DC çözümü, robot matematiği ve CAD işçisi bağımsızdır. İlk sürümde modüller arasında dosya veya durum aktarımı yoktur. Modelden otomatik robot kinematiği üretmek için eklem eksenleri ve limitleri ayrıca tanımlanmalıdır.

## Ekranlar ve akışlar

### Elektronik laboratuvarı

```text
  Siteye dön    Elektronik    Robot kol    3D model
  Elektronik Laboratuvarı
  ┌ Bileşenler ────┬ Devre çalışma alanı ──┬ Ölçümler ─────┐
  │ Kaynak, LED    │ Kaynak A ── Direnç A │ Devreyi çöz   │
  │ Direnç, anahtar│ Direnç B ── LED A    │ V ve mA       │
  │ Arduino editörü│ Kablo listesi       │ JSON aç/indir │
  └────────────────┴─────────────────────┴───────────────┘
```

Ekran bir LED örneğiyle açılır. Kullanıcı bileşen ekler, başlığını sürükler, iki uca sırayla basarak kablo çizer ve ölçümleri çalıştırır. A ve B, DC kaynağında artı ve eksi, LED'de anot ve katottur. Açık anahtar iletimden çıkar. Kısa devrede çözüm durur. LED akımı 20 mA üstünde uyarı gösterilir. Arduino, breadboard, kod düzenleyici ve seri monitör mevcut laboratuvar adresinden açılır.

Çözümleyici kabloları düğümlere birleştirir ve tek ideal gerilim kaynağı için değiştirilmiş düğüm analizi uygular. LED için eşik ve 10 Ω dinamik direnç kullanan parçalı doğrusal model vardır. Yüzen düğümleri sayısal olarak sabitlemek için küçük referans iletkenliği kullanılır. Yakınsama sağlanmazsa ölçüm yerine açık hata gösterilir. Bu model sabit durum eğitim örnekleri içindir.

```json
{"version":1,"parts":[{"id":"p1","type":"source","value":5,"x":0.06,"y":0.1}],"wires":[]}
```

`type` izinli bileşen kataloğundan gelir. `value` kaynakta V, dirençte Ω, LED'de eşik V ve anahtarda 0/1 anlamına gelir. Konumlar 0–1 aralığındadır. Kablolar `["p1a","p2b"]` biçiminde iki mevcut uçtan oluşur. Yüklenen proje bütünüyle doğrulandıktan sonra çalışma alanına alınır.

### Robot kol simülatörü

```text
  Robot Kol Simülatörü
  ┌ 3D çalışma alanı ───────┬ Eklem kontrolü ────────┐
  │ Izgara, eksen, kol, uç  │ Taban | Omuz | Dirsek  │
  │ Kamera sıfırlama        │ Uç noktası X / Y / Z   │
  │                         │ Hedefe git            │
  │                         │ Poz ekle / oynat      │
  └─────────────────────────┴───────────────────────┘
```

Three.js sahnesindeki eklem grupları aynı kinematik ağacı izler. Taban Y ekseninde, omuz ve dirsek yerel Z ekseninde döner. İlk bağlantı 210 mm, ikinci 170 mm, omuz yüksekliği 80 mm'dir. İleri çözüm eklem açılarını XYZ'ye çevirir. Ters çözüm kosinüs teoremiyle adaylar üretir, limit dışını eler ve mevcut eklem açılarına en yakın adayı seçer. Ulaşılamayan hedef açıları değiştirmez. Hareket dizisinde pozlar arasında eklem uzayında yumuşak geçiş yapılır.

Oturum şeması `{anglesDeg:[taban,omuz,dirsek], posesDeg:[[...]], targetMm:[x,y,z]}` şeklindedir. Sınırlar sırasıyla ±180°, ±135° ve ±155°'dir. Oturum başına 30 poz tutulur. Hedef yalnızca konum belirtir ve pozlar sekme açıkken saklanır.

### 3D model görüntüleyici

```text
  3D Model Görüntüleyici
  ┌ 3D görüntü ─────────────┬ Model aç ──────────────┐
  │ Montaj / seçilen parça  │ STEP / STP / STL       │
  │ Kamera / iki nokta ölç  │ STL birimi ve boyutlar │
  │ Örnek montaj            │ Ayırma sürgüsü         │
  │ Ölçüm sonucu            │ Parça ağacı            │
  └─────────────────────────┴───────────────────────┘
```

SolidWorks'te montaj ağacına ihtiyaç varsa STEP, hızlı yüzey önizlemesi için STL dışa aktarılır. STL birimi kullanıcıdan alınır. STEP verisi OCCT WebAssembly tarafından milimetreye çevrilip üçgenlenir. Ölçüm görünür üçgen ağ üzerinde seçilen iki noktanın Öklid mesafesidir. Ayırma görünümü parçaların ekrandaki konumunu değiştirir. Ayırma ya da parça görünürlüğü değiştiğinde ölçüm seçimleri temizlenir. Parça ağacı ve renkler, STEP içeriğinde taşındıkları ölçüde gösterilir.

İşçi giriş şeması `{buffer:ArrayBuffer}` ve çıkışı `{root,meshes:[{name,color,positions:Float32Array,indices:Uint32Array}]}` biçimindedir. Hata cevabı `{error:string}` taşır. Yüzey dizileri kopyalanmadan ana iş parçacığına devredilir. Kamera yalnızca değişiklikte çizilir. Dosya seçimi değiştiğinde önceki STEP işi sonlandırılır.

## Güvenlik ve performans

- Dosyalar ve robot pozları sunucuya gönderilmez. Atölye sayfaları aynı kökenli betik ve varlıklarla çalışır. WebAssembly yürütme izni model sayfasına özgüdür. Model adları ve hata mesajları metin düğümü olarak yazılır.
- Elektronik yüklemesi 100 kB ve 24 bileşenle sınırlıdır. Bileşen türü, kimlik, uç bağlantısı ve değer aralıkları doğrulanır. Arduino çalıştırma mevcut yorumlayıcının güvenlik sınırlarına tabidir.
- CAD dosya sınırı 25 MiB, ASCII STL için 12 MiB'dir. Sahne en fazla 500.000 üçgen ve STEP için 500 ağ içerir. STEP işçisi 25 saniyede iptal edilir. Önceki geometri ve malzemeler yeni sahne kurulduğunda serbest bırakılır.
- Bir sonraki sürümün ölçüm hedefi referans bir orta sınıf telefonda 100.000 üçgenli sahnede medyan en az 30 FPS ve 10 MB STEP örneğinde ilk görüntü en fazla 10 saniyedir. Bu hedefler ilk sürüm için ölçülmüş sonuçlar olarak değerlendirilmez.

## Aşamalar ve kabul ölçütleri

| Aşama | Kabul |
| --- | --- |
| 1. Entegrasyon | Ana sayfa üç atölye sayfasına bağlanır. Portföy regresyon testleri geçer, eski laboratuvar URL'si ve JSON biçimi korunur. |
| 2. Elektronik | 5 V, 220 Ω ve 2 V LED örneğinde yaklaşık 13,04 mA okunur. Ters LED akımı sıfıra yakındır. Kısa devre hata verir. JSON dışa aktarılıp yeniden açılır. |
| 3. Robot | FK ve IK çevriminde test hedefleri için hata 0,001 mm altındadır. Ulaşılamayan hedef reddedilir. Pozlar uçtan uca oynatılır ve durdurulabilir. |
| 4. CAD | ASCII ve ikili STL ile en az bir STEP örneği açılır. STL birimi boyutları doğru ölçekler. Örnek montajda parça gizleme ve ayırma çalışır. STEP dışa aktarımlarında montaj hiyerarşisi sürüm örnekleriyle genişletilir. |
| 5. Yayın | Canlı üç rota, JS modül MIME türleri ve WASM yükleme kontrol edilir. Yayın problemi halinde yalnızca bu değişiklik seti geri alınır ve ana site rotaları tekrar doğrulanır. |

Tam Arduino derlemesi için sonraki aşama sabit Uno kart profili, izole derleme servisi ve tarayıcı AVR emülasyonudur. Servo, I²C ve ESP32 desteği ayrı çevre birimi testleriyle planlanır. Robot kol için modeli genişletmeden önce eklem geometrileri ve çarpışma gereksinimleri belirlenir. CAD için bir sonraki aşama SolidWorks sürümlerinden gerçek montaj örnekleri, yüzey sapması karşılaştırmaları ve performans testleridir.

## Teknik kaynaklar

- [SolidWorks dışa aktarma ayarları](https://help.solidworks.com/2025/english/SolidWorks/sldworks/t_Exporting_Documents_Setting_Options.htm)
- [SolidWorks STEP ve STL formatları](https://help.solidworks.com/2025/english/SolidWorks/sldworks/c_import_export_file_information.htm)
- [Three.js 0.160.1 kaynak ve lisansı](https://github.com/mrdoob/three.js/tree/r160)
- [occt-import-js 0.0.23 kaynak, derleme ve lisans bilgileri](https://github.com/kovacsv/occt-import-js/tree/0.0.23)
- [Arduino CLI derleme komutu](https://docs.arduino.cc/arduino-cli/commands-reference/arduino-cli_compile) ve [AVR8js](https://github.com/wokwi/avr8js)

Üçüncü taraf lisans metinleri WASM ve JavaScript dosyalarının yanındaki `atolye/vendor/` dizinindedir.
