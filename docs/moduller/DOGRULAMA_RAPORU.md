# P11 — Entegrasyon Doğrulama Raporu

Kapsam: 9 modülün uçtan uca doğrulaması. Yeni özellik eklenmedi; yalnızca bulunan kusurlar düzeltildi.
Araçlar: `server/moduller/_entegrasyon/senaryo.test.js`, `dogrulama.test.js`, `scripts/sahiplik-denetimi.mjs`, `scripts/yetki-denetimi.mjs`, `scripts/performans-testi.mjs`.
Sonuç: 241/241 test, build temiz, lint yalnız 7 eski hata.

## Bulgu tablosu

| # | Alan | Bulgu | Önem | Durum |
|---|------|-------|------|-------|
| 1 | Senaryo | Kesinti adayı malzeme çıkışı hem depo çıkışında hem taşeron/alt yüklenici hakedişinde maliyete yazılıyordu (çift sayım) | Yüksek | **Düzeltildi** — dönem kapanışı/hakediş onayında negatif GERÇEKLEŞEN (`malzeme-kesinti`) ile dengelenir |
| 2 | Senaryo | P2 sözleşme TAAHHÜT'ü maliyet kodsuz yazılıyordu (WBS raporlarında görünmüyordu) | Yüksek | **Düzeltildi** — WBS kalemi başına, sözleşme tipine göre maliyet koduna bölünür |
| 3 | Sahiplik | `depo/malKabul.projeGunuIcinListele` Satın Alma tablolarını JOIN ile okuyordu | Orta | **Düzeltildi** — `siparis` servisi üzerinden |
| 4 | Sahiplik | Yazma ihlali: 0. `maliyet/kaynak.js` salt-okunur çapraz SQL (drill-down + mutabakat) | Bilgi | Belgelenmiş istisna, kabul edildi |
| 5 | Sahiplik | Modül import döngüleri (depo ↔ satınalma) | Düşük | Açık — çalışma zamanında sorun yok |
| 6 | Tekillik | VKN/TCKN biçimi normalize edilmiyordu (boşluk/noktalı yazım ile mükerrer geçiyordu) | Orta | **Düzeltildi** — `vknNormalle` (yalnız rakam, 10/11 hane) |
| 7 | Tekillik | Tahsilat çift gönderimi (çevrimdışı tekrar) mükerrer kayıt üretebilirdi | Yüksek | **Düzeltildi** — `istemci_kayit_id` + benzersiz indeks |
| 8 | Tekillik | Çift puantaj, çift satış, çift olay maliyeti: mevcut benzersiz indeks/idempotency anahtarları yeterli | — | Test ile doğrulandı |
| 9 | Tekillik | TCKN mükerrer kontrolü tüm kişileri çözerek O(n) | Orta | Açık — öneri: HMAC hash sütunu |
| 10 | Tekillik | TCKN sağlama toplamı (checksum) doğrulanmıyor | Düşük | Açık |
| 11 | Yetki | **Kimlik doğrulama/yetkilendirme katmanı YOK**: başka proje görevi, personel maaşı, tüm kişi/personel listesi, portföy kimliksiz okunabiliyor (5 sızıntı, `yetki-denetimi.mjs`) | **Kritik** | **Açık** — yeni özellik kapsamı dışı; ayrı bir faz olarak (oturum + proje bazlı rol + alan düzeyi maskeleme) planlanmalı |
| 12 | Yetki | TCKN API çıktısında yalnız maskeli; düz/şifreli değer sızmıyor | — | Doğrulandı |
| 13 | Çevrimdışı | Güvensiz bağlamda (http) `crypto.randomUUID` yok → kayıt kimliği üretilemiyordu | Orta | **Düzeltildi** — `yeniKayitId` yedeği |
| 14 | Çevrimdışı | Kalıcı hatalı kayıt kuyruğu sonsuz deniyordu | Orta | **Düzeltildi** — `maksDeneme` ile askıya alma (`askida`, `yenidenDene`) |
| 15 | Çevrimdışı | Günlük rapor toplu gönderimde aynı manuel bölümler tekrar yazılıyordu | Düşük | **Düzeltildi** — özdeş bölüm atlanır |
| 16 | Çevrimdışı | İki cihazdan aynı puantaj / depo çıkışı: tekrar gönderimde çift kayıt ve kayıp yok | — | Test ile doğrulandı |
| 17 | Performans | Mutabakat 10k hareket: **60,5 sn** (30k sorgu; her çağrıda `prepare` + gereksiz zincir çözümü) | Yüksek | **Düzeltildi** — hazır sorgu önbelleği + hafif mod → **0,5 sn** |
| 18 | Performans | Maliyet raporu WBS bilgisini satır başına tekrar okuyordu (O(K²)) | Düşük | **Düzeltildi** |
| 19 | Performans | `puantaj_kaydi (proje_id, tarih)` indeksi yoktu | Düşük | **Düzeltildi** — indeks eklendi |
| 20 | Kural | Dönem kapandıktan sonra eklenen kesinti adayı çıkışı dengelenmiyor | Orta | Açık — kapanış sonrası çıkış kilidi veya düzeltme kaydı gerekir |
| 21 | Kural | Zeyilname (P2) taahhüdü hâlâ kodsuz yazılıyor | Orta | Açık |

## Senaryo (tek proje, 9 modül)
Her adımda beklenen defter kaydı doğrulandı: sözleşme GELİR 1.500.000 TL + tahsilat 300.000 TL; alt yüklenici TAAHHÜT + 2 hakediş GERÇEKLEŞEN (300k/200k); taşeron 28 işçi-günü brüt 28.000 TL (dönem açıkken defter boş); sipariş TAAHHÜT 60.000 TL; kısmi mal kabul ve stoklu fatura defter satırı yazmaz; depo çıkışı 20.000 TL, kesinti sonrası net 5.000 TL, proje toplamı çift sayımsız; bordro 10.000 TL; günlük rapor defter yazmaz; mutabakat temiz.

## Performans (2000 kişi, 200k puantaj, 50k stok, 10k defter, 200 kod)
Tüm raporlar < 350 ms: günlük puantaj 6 ms, stok geçmişi 279 ms, maliyet raporu 75 ms, EVM 54 ms, uyarılar 112 ms, portföy 115 ms, mutabakat 508 ms (düzeltme öncesi 60,5 sn), bordro hesaplama 5 ms.
Not: kişi oluşturma TCKN mükerrer kontrolü (#9) kişi sayısıyla doğrusal büyür.
