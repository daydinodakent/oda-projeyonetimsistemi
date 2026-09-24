// Müşteri — Bağımsız Bölüm, Fiyat Listesi, Aday/Fırsat, Rezervasyon, Satış,
// Ödeme Planı (+versiyon), Teslim, Satış Sonrası Talep ve KVKK Rıza'nın TEK
// sahibi. Müşteri = Çekirdek Firma/Kişi (rol: musteri) — KOPYALANMAZ.
// Satış sözleşmesi P2'de (tip='musteri_satis') oluşturulur; tahsilat
// Çekirdek `tahsilat` tablosundadır (yön: gelen). Eksik listesi P8 Görev'e
// dönüşür; talep yönlendirme P8 Görev / P5 alt yükleniciyedir.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== BAĞIMSIZ BÖLÜM ==========
  CREATE TABLE IF NOT EXISTS bagimsiz_bolum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    blok TEXT NOT NULL, kat TEXT NOT NULL, kapi_no TEXT NOT NULL,
    tip TEXT NOT NULL, -- '1+1','3+1','dukkan'
    brut_m2 REAL, net_m2 REAL, cephe TEXT,
    eklentiler TEXT, -- JSON: {"bahce":true,"otopark":1,"depo":"D-12"}
    -- kat karşılığı: 'arsa_sahibi' bölümler stokta görünür ama SATIŞA KAPALIDIR
    sahiplik TEXT NOT NULL DEFAULT 'firma' CHECK (sahiplik IN ('firma','arsa_sahibi')),
    arsa_sozlesme_id INTEGER, -- sozlesme(id), tip='arsa_sahibi' (P2) — KOPYALANMAZ
    durum TEXT NOT NULL DEFAULT 'musait' CHECK (durum IN ('musait','opsiyonlu','satildi','teslim_edildi')),
    geometri_ref TEXT, -- ODA harita geometri kimliği (opsiyonel)
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(proje_id, blok, kat, kapi_no)
  );

  -- ========== FİYAT LİSTESİ (tarihli — insert-only) ==========
  CREATE TABLE IF NOT EXISTS bolum_fiyat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bolum_id INTEGER NOT NULL REFERENCES bagimsiz_bolum(id),
    gecerli_baslangic TEXT NOT NULL,
    fiyat_kurus INTEGER NOT NULL,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bolum_fiyat ON bolum_fiyat (bolum_id, gecerli_baslangic);

  -- ========== ADAY / FIRSAT + ETKİLEŞİM ==========
  CREATE TABLE IF NOT EXISTS aday (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    ad_soyad TEXT NOT NULL, telefon TEXT, eposta TEXT, kaynak TEXT,
    asama TEXT NOT NULL DEFAULT 'aday' CHECK (asama IN ('aday','gorusme','rezervasyon','satis','kayip')),
    kisi_id INTEGER, firma_id INTEGER, -- müşteriye dönüşünce Çekirdek Kişi/Firma referansı
    ilgilendigi_bolum_id INTEGER,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE TABLE IF NOT EXISTS etkilesim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aday_id INTEGER NOT NULL REFERENCES aday(id),
    tur TEXT NOT NULL CHECK (tur IN ('arama','gorusme','toplanti','eposta','sms','not')),
    tarih TEXT NOT NULL, ozet TEXT NOT NULL,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== REZERVASYON / OPSİYON (süreli, kaparolu) ==========
  CREATE TABLE IF NOT EXISTS rezervasyon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bolum_id INTEGER NOT NULL REFERENCES bagimsiz_bolum(id),
    aday_id INTEGER REFERENCES aday(id),
    kisi_id INTEGER, firma_id INTEGER,
    kaparo_kurus INTEGER NOT NULL DEFAULT 0,
    baslangic_tarihi TEXT NOT NULL,
    bitis_tarihi TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'aktif' CHECK (durum IN ('aktif','satisa_donustu','iptal','suresi_doldu')),
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  -- "Aynı bölüm aynı anda iki opsiyona girmez" — kilit VERİTABANI seviyesinde.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_rezervasyon_aktif_tekil ON rezervasyon (bolum_id) WHERE durum = 'aktif';

  -- ========== SATIŞ (+ hisseli müşteriler) ==========
  CREATE TABLE IF NOT EXISTS satis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    bolum_id INTEGER NOT NULL REFERENCES bagimsiz_bolum(id),
    sozlesme_id INTEGER NOT NULL, -- P2 sozlesme(id), tip='musteri_satis'
    tutar_kurus INTEGER NOT NULL,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT,
    satis_tarihi TEXT NOT NULL,
    kaparo_kurus INTEGER NOT NULL DEFAULT 0, -- rezervasyondan devralınan kaparo; onayda ilk tahsilat olur
    kaparo_tahsil_edildi INTEGER NOT NULL DEFAULT 0,
    rezervasyon_id INTEGER,
    durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','onayli','iptal')),
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  -- Bir bölüm için aynı anda TEK canlı (iptal olmayan) satış.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_satis_bolum_tekil ON satis (bolum_id) WHERE durum != 'iptal';
  CREATE TABLE IF NOT EXISTS satis_musteri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    satis_id INTEGER NOT NULL REFERENCES satis(id),
    kisi_id INTEGER, firma_id INTEGER, -- Çekirdek referansı (rol: musteri)
    hisse_yuzde REAL NOT NULL DEFAULT 100
  );

  -- ========== ÖDEME PLANI (versiyonlu) + TAKSİT ==========
  CREATE TABLE IF NOT EXISTS odeme_plani (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    satis_id INTEGER NOT NULL REFERENCES satis(id),
    versiyon INTEGER NOT NULL,
    durum TEXT NOT NULL DEFAULT 'aktif' CHECK (durum IN ('aktif','eski')),
    revizyon_nedeni TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(satis_id, versiyon)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_aktif_tekil ON odeme_plani (satis_id) WHERE durum = 'aktif';
  CREATE TABLE IF NOT EXISTS taksit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL REFERENCES odeme_plani(id),
    sira INTEGER NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('pesinat','taksit','ara_odeme','senet','kredi','takas')),
    vade_tarihi TEXT NOT NULL,
    tutar_kurus INTEGER NOT NULL, -- satışın para biriminde
    kredi_onay_durumu TEXT CHECK (kredi_onay_durumu IN ('bekliyor','onaylandi','reddedildi')), -- yalnız tur='kredi'
    endeksli_mi INTEGER NOT NULL DEFAULT 0,
    aciklama TEXT, -- takas: araç/eski ev tanımı
    UNIQUE(plan_id, sira)
  );

  -- Tahsilatın taksitlere dağılımı (Çekirdek tahsilat satırı DEĞİŞMEZ; plan
  -- revizyonunda eski dağılım TARİHÇE olarak kalır, yenisi eklenir).
  CREATE TABLE IF NOT EXISTS tahsilat_dagilim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tahsilat_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL REFERENCES odeme_plani(id),
    taksit_id INTEGER NOT NULL REFERENCES taksit(id),
    tutar_kurus INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_dagilim_taksit ON tahsilat_dagilim (taksit_id);
  CREATE INDEX IF NOT EXISTS idx_dagilim_tahsilat ON tahsilat_dagilim (tahsilat_id);

  -- ========== HATIRLATMA KUYRUĞU (gönderim entegrasyonu KAPSAM DIŞI) ==========
  CREATE TABLE IF NOT EXISTS hatirlatma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    taksit_id INTEGER NOT NULL REFERENCES taksit(id),
    ofset_gun INTEGER NOT NULL, -- vadeye göre (-3 = 3 gün önce, +7 = 7 gün sonra)
    planlanan_tarih TEXT NOT NULL,
    kanal TEXT NOT NULL DEFAULT 'sms' CHECK (kanal IN ('sms','eposta')),
    sablon TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor','gonderildi','iptal')),
    UNIQUE(taksit_id, ofset_gun, kanal)
  );

  -- ========== TESLİM ==========
  CREATE TABLE IF NOT EXISTS teslim_tutanagi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    satis_id INTEGER NOT NULL REFERENCES satis(id),
    bolum_id INTEGER NOT NULL REFERENCES bagimsiz_bolum(id),
    tarih TEXT NOT NULL,
    teslim_alan TEXT,
    odeme_yuzdesi REAL NOT NULL, -- teslim anındaki tahsilat oranı
    istisna_onayi_mi INTEGER NOT NULL DEFAULT 0,
    istisna_gerekcesi TEXT,
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(satis_id)
  );
  CREATE TABLE IF NOT EXISTS eksik_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tutanak_id INTEGER NOT NULL REFERENCES teslim_tutanagi(id),
    aciklama TEXT NOT NULL,
    gorev_id INTEGER, -- P8 gorev(id) — dönüştürülünce dolar
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== SATIŞ SONRASI TALEP ==========
  CREATE TABLE IF NOT EXISTS satis_sonrasi_talep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    satis_id INTEGER NOT NULL REFERENCES satis(id),
    bolum_id INTEGER NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('ariza','sikayet','talep')),
    aciklama TEXT NOT NULL,
    wbs_gorev_id TEXT, -- hangi iş kalemi → hangi alt yüklenici bulunur
    garanti_kapsaminda_mi INTEGER, -- talep anında teslim+garanti süresine göre hesaplanır (NULL = teslim yok)
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','yonlendirildi','kapali')),
    yonlendirilen_sozlesme_id INTEGER, -- P5 alt yüklenici (sozlesme id)
    gorev_id INTEGER, -- P8 gorev(id)
    talep_tarihi TEXT NOT NULL,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== KVKK RIZA (append-only; geri çekme ayrı alanla) ==========
  CREATE TABLE IF NOT EXISTS kvkk_riza (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ilgili_tip TEXT NOT NULL CHECK (ilgili_tip IN ('kisi','aday')),
    ilgili_id INTEGER NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('aydinlatma','pazarlama')),
    metin_versiyon TEXT NOT NULL,
    verildi_tarihi TEXT NOT NULL,
    geri_cekildi_tarihi TEXT,
    kanal TEXT, -- 'yazili','elektronik','sozlu_kayit'
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_kvkk ON kvkk_riza (ilgili_tip, ilgili_id, tur);
`);

export { db };
