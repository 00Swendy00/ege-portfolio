# EC Asistan — ücretsiz plan kurulumu

Sunucu Cloudflare Workers + Workers AI üzerinde; ana site GitHub Pages üzerinde çalışır. Model `@cf/meta/llama-3.2-3b-instruct` kullanılır. `site-assistant-config.js` yalnızca herkese açık `/chat` adresini içerir. Tarayıcıya, GitHub deposuna veya bu klasöre gizli anahtar eklenmez.

## Kurulum ve yayın

Bu klasörde `npm ci` ardından `npm run deploy` çalıştırılır. İlk kurulumda yetkili hesapla `npm run login` gerekir. Kullanılan sınırlı kapsamlar: `account:read`, `user:read`, `workers_scripts:write`, `ai:write`. OAuth oturumu Windows kimlik bilgileri deposundaki anahtarla şifreli saklanır; depoya eklenmez.

Sitenin adresi değişirse `assistant-worker.mjs` içindeki izinli origin listesi de güncellenir. Backend adresi değiştiğinde kökteki `site-assistant-config.js` ve ardından `node _checks/update-security.mjs` ile CSP güncellenir. Dosyalar GitHub'a gönderilir.

## Ücretsiz kullanım ve veri

Cloudflare Workers Free planında kalınır. Workers AI günlük ücretsiz kota sunar; ücretli plana yükseltilmez. Ek uygulama sınırları: site genelinde 100 istek/gün, bir günlük IP özeti için 20 istek/gün ve en az 5 saniye aralık. Gün UTC 00:00'da sıfırlanır. Yanıt en fazla 350 model token'ıdır. Bu sayaçlar SQLite Durable Object içinde atomik tutulur. Kotalar, sağlayıcı ücretsiz kotasına ek sınırdır.

Konuşmalar sayfada bellekte tutulur; sayfa yenilenince kaybolur. Yanıt üretimi için son birkaç mesaj Cloudflare'a gönderilir. Sunucu konuşma metinlerini kaydetmez. Yalnızca günlük tarih ve IP üzerinden oluşturulmuş SHA-256 özeti ile kullanım sayaçları saklanır; sonraki gün yenilenir. IP özeti anonimlik garantisi değildir. Uygulama log kaydı etkin değildir.

Site hakkındaki sabit bilgiler modelin sunucu tarafındaki bağlamına eklenir. Model yanıtları doğruluk garantisi taşımaz. Hava durumu sorularında Burdur'un güncel Open-Meteo model verisi alınır ve kaynak belirtilir; veri alınamazsa hava durumu uydurulmaz. Diğer şehirlerin hava durumu henüz desteklenmez.

## Doğrulama

Kökten `npm ci --prefix _checks --ignore-scripts` ve `node --test _checks/*.test.mjs` çalıştırılır. Testler dışarı gerçek soru göndermez. `wrangler deploy --dry-run` sunucu paketini doğrular.

Gerçek model, yetkili Cloudflare API'si üzerinden bir site sorusuna Türkçe cevap vererek doğrulandı. Kullanıcının tarayıcısında yayın adresinin beklenen `Forbidden` yanıtına erişildiği doğrulandı. Bu çalışma ortamındaki ağ filtresi `workers.dev` adresine doğrudan HTTPS isteklerini engellediğinden, üretim `/chat` uçtan uca HTTP doğrulaması bu ortamdan tamamlanamadı.

Kaynaklar: https://developers.cloudflare.com/workers-ai/platform/pricing/ · https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/ · https://open-meteo.com/en/docs
