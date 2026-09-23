// Sözleşme modülü — şema. TÜM sözleşmelerin TEK kaynağı burasıdır; Alt
// Yüklenici, Satın Alma, Müşteri, Taşeron modülleri kendi sözleşme tablosu
// AÇMAZ, buraya (sozlesme.id) ID ile referans verir (bkz. görev metni).
//
// SAHİPLİK: taraf_firma_id → Çekirdek cari_firma (server/moduller/_cekirdek),
// taraf_kisi_id → Çekirdek kisi, kalem.wbs_gorev_id → mevcut tb_wbs_gorevler
// (server/db.js generic tablo), belge.dokuman_id → mevcut tb_dokumanlar.
// Hiçbiri KOPYALANMAZ, yalnızca ID ile referans verilir.
//
// Aynı fiziksel SQLite bağlantısını (server/db.js'in rawDb()) paylaşır —
// YENİ bağlantı AÇILMAZ.
//
// Para alanları KURALI: tutar_kurus HER ZAMAN tam sayı kuruş (ondalık YOK).
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== SÖZLEŞME ==========
  -- "Her değişiklik versiyon olarak tutulur, orijinal asla ezilmez" kuralı
  -- gereği bedel_kurus burada GÜNCEL toplam bedeldir (orijinal + tüm
  -- zeyilname farkları); orijinal değer ve her zeyilnamenin farkı
  -- sozlesme_versiyon'da AYRI AYRI, değişmez satırlar olarak durur.
  CREATE TABLE IF NOT EXISTS sozlesme (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numara TEXT NOT NULL UNIQUE, -- numaraSerisi ile üretilir (SOZ-2026-0001)
    tip TEXT NOT NULL CHECK (tip IN ('musteri_satis','alt_yuklenici','taseron','tedarikci_cerceve','kira','hizmet','arsa_sahibi')),
    alt_tip TEXT, -- ör. musteri_satis için 'satis_vaadi'|'kat_karsiligi'|'noter_onayli' — serbest metin, servis katmanında tip'e göre doğrulanır
    proje_id TEXT NOT NULL,
    konu TEXT NOT NULL,
    taraf_firma_id INTEGER REFERENCES cari_firma(id), -- Çekirdek'e REFERANS — kopyalanmaz
    taraf_kisi_id INTEGER REFERENCES kisi(id), -- gerçek kişi taraf ise (ör. bazı arsa sahipleri)
    bedel_kurus INTEGER NOT NULL, -- GÜNCEL toplam bedel (bkz. yukarıdaki not)
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT,
    kdv_durumu TEXT NOT NULL DEFAULT 'haric' CHECK (kdv_durumu IN ('dahil','haric','istisna')),
    baslangic_tarihi TEXT NOT NULL,
    bitis_tarihi TEXT,
    odeme_sartlari TEXT,
    durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','onayda','imzali','yururlukte','askida','feshedildi','tamamlandi')),
    -- taahhut_yazildi: Maliyet Defteri'ne TAAHHÜT/GELİR kaydının yazılıp
    -- yazılmadığının hızlı kontrolü (asıl idempotency garantisi
    -- maliyet_hareketi'nin UNIQUE(kaynak_modul,kaynak_id,tur) kısıtıdır —
    -- bu alan yalnızca ikinci bir DB sorgusundan kaçınmak için önbellek).
    taahhut_yazildi INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sozlesme_proje ON sozlesme (proje_id, durum);

  -- ========== VERSİYON / ZEYİLNAME ==========
  -- versiyon_no=1 her zaman ORİJİNAL sözleşmenin değişmez anlık görüntüsüdür
  -- (sozlesme.olustur() tarafından otomatik açılır). Sonraki her zeyilname
  -- YENİ bir satırdır — hiçbir satır UPDATE edilmez.
  CREATE TABLE IF NOT EXISTS sozlesme_versiyon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL REFERENCES sozlesme(id),
    versiyon_no INTEGER NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('orijinal','zeyilname')),
    bedel_farki_kurus INTEGER NOT NULL DEFAULT 0, -- orijinalde = sozlesme.bedel_kurus (başlangıç), zeyilnamede fark (+/-)
    sure_uzatimi_gun INTEGER NOT NULL DEFAULT 0,
    yeni_bitis_tarihi TEXT,
    aciklama TEXT NOT NULL,
    degisiklik TEXT, -- JSON: serbest formatlı ek alan değişiklikleri
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(sozlesme_id, versiyon_no)
  );

  -- ========== SÖZLEŞME KALEMİ ==========
  -- "Yürürlükteki sözleşmenin kalemi değişemez; sadece zeyilname ile" kuralı
  -- servis katmanında (sozlesme.js) uygulanır (bkz. kalemEkle/kalemGuncelle).
  CREATE TABLE IF NOT EXISTS sozlesme_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL REFERENCES sozlesme(id),
    wbs_gorev_id TEXT, -- tb_wbs_gorevler'e REFERANS (opsiyonel — basit taşeron sözleşmelerinde WBS eşlemesi olmayabilir)
    aciklama TEXT NOT NULL,
    birim TEXT NOT NULL,
    miktar REAL NOT NULL,
    birim_fiyat_kurus INTEGER NOT NULL,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sozlesme_kalem_sozlesme ON sozlesme_kalem (sozlesme_id);

  -- ========== YÜKÜMLÜLÜK / MADDE ==========
  CREATE TABLE IF NOT EXISTS sozlesme_madde (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL REFERENCES sozlesme(id),
    tur TEXT NOT NULL CHECK (tur IN ('ceza','teminat','avans','fiyat_farki','sigorta','isg','gizlilik','diger')),
    parametreler TEXT, -- JSON, ör. {"gunluk_ceza_parametre_kodu":"sozlesme_gunluk_ceza_orani"} — oran koda GÖMÜLMEZ, parametre tablosundan okunur
    sorumlu_taraf TEXT NOT NULL DEFAULT 'yuklenici' CHECK (sorumlu_taraf IN ('yuklenici','isveren','her_iki_taraf')),
    kontrol_tarihi TEXT, -- kritik tarih takibi bu alandan beslenir (opsiyon süresi, fiyat farkı dönemi vb.)
    aciklama TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sozlesme_madde_kontrol ON sozlesme_madde (kontrol_tarihi);

  -- ========== TEMİNAT ==========
  CREATE TABLE IF NOT EXISTS sozlesme_teminat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL REFERENCES sozlesme(id),
    tur TEXT NOT NULL CHECK (tur IN ('nakit','teminat_mektubu','cek_senet')),
    banka TEXT,
    tutar_kurus INTEGER NOT NULL,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    bitis_tarihi TEXT, -- kritik tarih takibi bu alandan beslenir
    iade_durumu TEXT NOT NULL DEFAULT 'serbest' CHECK (iade_durumu IN ('serbest','iade_edildi','irat_kaydedildi')),
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sozlesme_teminat_bitis ON sozlesme_teminat (bitis_tarihi);

  -- ========== BELGE BAĞLANTISI ==========
  -- Çekirdek "Belge" ortak servisi HENÜZ YAZILMADI (bkz. CAKISMA_HARITASI.md
  -- P1 bölümü — ertelendi). Bu yüzden burada YENİ bir belge deposu
  -- AÇILMIYOR; mevcut generic tb_dokumanlar tablosuna (server/db.js) yalnızca
  -- ID ile bağlanılıyor.
  CREATE TABLE IF NOT EXISTS sozlesme_belge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL REFERENCES sozlesme(id),
    dokuman_id TEXT NOT NULL, -- tb_dokumanlar.id'ye REFERANS
    rol TEXT NOT NULL DEFAULT 'ek' CHECK (rol IN ('ek','imzali_nusha','teklif','diger')),
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(sozlesme_id, dokuman_id)
  );

  -- ========== ŞABLON ==========
  -- Tip bazlı madde şablonları + değişkenli ({{taraf}}, {{bedel}}, {{tarih}})
  -- belge metni. E-imza entegrasyonu YOK (görev kapsam dışı) — yalnızca
  -- metin üretimi (bkz. sablon.js#belgeUret).
  CREATE TABLE IF NOT EXISTS sozlesme_sablon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tip TEXT NOT NULL CHECK (tip IN ('musteri_satis','alt_yuklenici','taseron','tedarikci_cerceve','kira','hizmet','arsa_sahibi')),
    ad TEXT NOT NULL,
    madde_sablonlari TEXT, -- JSON dizi: [{tur, sorumlu_taraf, aciklama_sablonu}]
    belge_metni TEXT NOT NULL, -- değişkenli tam belge şablonu ({{taraf}}, {{bedel}}, {{tarih}}, {{proje}}, {{konu}})
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sozlesme_sablon_tip ON sozlesme_sablon (tip);
`);

export { db };
