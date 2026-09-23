// Satın Alma — şema. Akış: Talep → Onay → Teklif → Mukayese → Sipariş →
// Mal Kabul (GEÇİCİ/minimal burada — P4'te Depo'ya devredilecek) → Fatura →
// 3'lü eşleştirme → Ödeme Talimatı (Çekirdek).
//
// MALİYET KURALI (çift sayımı önler — CAKISMA_HARITASI.md'de de belgelenir):
//   1) Sipariş ONAYLANINCA  → Maliyet Defteri'ne TAAHHUT yazılır (siparis.js).
//   2) STOKLU malzeme (malzeme_karti.stoklu_mu=1): GERÇEKLEŞEN maliyet
//      FATURADA YAZILMAZ — depoya girer, gerçek tüketim P4'te Depo çıkışında
//      GERÇEKLEŞEN olarak yazılacak. Bu modül o kaydı YAZMAZ (mükerrer
//      sayımı önlemek için bilinçli boşluk).
//   3) STOKLU OLMAYAN (doğrudan sarf/hizmet/nakliye, stoklu_mu=0 veya
//      malzeme_id NULL): GERÇEKLEŞEN maliyet FATURA KAYDEDİLİNCE yazılır
//      (fatura.js#kaydet).
//
// Firma/Kişi/Maliyet Kodu/Sözleşme'ye yalnızca ID ile REFERANS verilir —
// KOPYALANMAZ (sahiplik kuralı).
import { rawDb } from '../../db.js';
// Yalnızca yan etki (tablo oluşturma) için — aşağıdaki CREATE TABLE'lar
// malzeme_karti(id)'ye REFERANS verir; bu import, o tablonun bu dosyadaki
// db.exec()'ten ÖNCE var olmasını garanti eder (aksi hâlde node:sqlite,
// FK hedefi henüz yokken hazırlanan INSERT ifadelerinde "no such table"
// hatası verir — CREATE TABLE'ın kendisi sessizce izin verse de).
import '../depo/db.js';

const db = rawDb();

db.exec(`
  -- ========== TALEP (şantiyeden gelir) ==========
  CREATE TABLE IF NOT EXISTS satinalma_talep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numara TEXT NOT NULL UNIQUE,
    proje_id TEXT NOT NULL,
    maliyet_kodu_id INTEGER REFERENCES maliyet_kodu(id),
    talep_eden_kisi_id INTEGER REFERENCES kisi(id),
    ihtiyac_tarihi TEXT NOT NULL,
    teslim_yeri TEXT,
    durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','onay_bekliyor','onaylandi','reddedildi','iptal')),
    -- "min. 3 teklif" kuralının istisnası — acil alımda üst onayla atlanabilir.
    min_teklif_istisna INTEGER NOT NULL DEFAULT 0,
    istisna_gerekcesi TEXT,
    istisna_onaylayan INTEGER,
    aciklama TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_satinalma_talep_proje ON satinalma_talep (proje_id, durum);

  CREATE TABLE IF NOT EXISTS satinalma_talep_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    talep_id INTEGER NOT NULL REFERENCES satinalma_talep(id),
    malzeme_id INTEGER REFERENCES malzeme_karti(id), -- opsiyonel: talep çoğu zaman eksik tanımlıdır (bkz. görev metni "2 kamyon kum")
    aciklama TEXT NOT NULL,
    miktar REAL NOT NULL,
    birim TEXT NOT NULL,
    tahmini_birim_fiyat_kurus INTEGER,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== TEKLİF ==========
  -- Bir kayıt hem "tedarikçiye talep gönderimi" (durum='istendi') hem "gelen
  -- teklif girişi" (durum='geldi', kalemler doldurulunca) için kullanılır —
  -- iki ayrı tablo YOK, tek kaydın durumu ilerler.
  CREATE TABLE IF NOT EXISTS satinalma_teklif (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    talep_id INTEGER NOT NULL REFERENCES satinalma_talep(id),
    firma_id INTEGER NOT NULL REFERENCES cari_firma(id),
    durum TEXT NOT NULL DEFAULT 'istendi' CHECK (durum IN ('istendi','geldi','elendi','kazandi')),
    gecerlilik_tarihi TEXT,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    vade_gun INTEGER,
    teslim_suresi_gun INTEGER,
    nakliye_dahil INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(talep_id, firma_id)
  );

  CREATE TABLE IF NOT EXISTS satinalma_teklif_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teklif_id INTEGER NOT NULL REFERENCES satinalma_teklif(id),
    talep_kalem_id INTEGER NOT NULL REFERENCES satinalma_talep_kalem(id),
    miktar REAL NOT NULL,
    birim_fiyat_kurus INTEGER NOT NULL,
    kdv_orani REAL NOT NULL DEFAULT 20,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(teklif_id, talep_kalem_id)
  );

  -- ========== SİPARİŞ ==========
  CREATE TABLE IF NOT EXISTS satinalma_siparis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numara TEXT NOT NULL UNIQUE,
    proje_id TEXT NOT NULL,
    talep_id INTEGER REFERENCES satinalma_talep(id), -- NULL olabilir: çerçeve sözleşmeden doğrudan çağrı
    teklif_id INTEGER REFERENCES satinalma_teklif(id), -- seçilen kazanan teklif (mukayese sonrası İNSAN seçimi)
    sozlesme_id INTEGER, -- Sözleşme modülüne (server/moduller/sozlesme) REFERANS — çerçeve anlaşma bazlı sipariş
    maliyet_kodu_id INTEGER REFERENCES maliyet_kodu(id),
    firma_id INTEGER NOT NULL REFERENCES cari_firma(id),
    teslim_tarihi TEXT, -- planlanan teslim tarihi (teslim planı) — tedarikciKarnesi.js'in "zamanında teslim %" hesabının kıyas noktası
    durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','onaylandi','kismi_teslim','tamamlandi','iptal')),
    taahhut_yazildi INTEGER NOT NULL DEFAULT 0,
    toplam_tutar_kurus INTEGER NOT NULL DEFAULT 0,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_satinalma_siparis_proje ON satinalma_siparis (proje_id, durum);

  CREATE TABLE IF NOT EXISTS satinalma_siparis_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siparis_id INTEGER NOT NULL REFERENCES satinalma_siparis(id),
    malzeme_id INTEGER REFERENCES malzeme_karti(id),
    aciklama TEXT NOT NULL,
    birim TEXT NOT NULL,
    miktar REAL NOT NULL,
    birim_fiyat_kurus INTEGER NOT NULL,
    kdv_orani REAL NOT NULL DEFAULT 20,
    -- Aşağıdaki iki alan kümülatif ilerler (mal kabul / fatura kaydedildikçe) —
    -- 3'lü eşleştirmenin (kısmi teslim, fazla faturalama tespiti) temelidir.
    teslim_edilen_miktar REAL NOT NULL DEFAULT 0,
    faturalanan_miktar REAL NOT NULL DEFAULT 0,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- MAL KABUL: P3'te burada GEÇİCİ/minimal bir tablo vardı; P4'te Depo
  -- modülü gerçek (zengin) Mal Kabul'ü kurduğundan KALDIRILDI (bkz.
  -- server/moduller/depo/db.js "mal_kabul" tablosu ve #teslimIlerlemesiGuncelle
  -- — Depo, kabul ettiği miktarı bu fonksiyon üzerinden Satın Alma'ya bildirir).

  -- ========== FATURA ==========
  CREATE TABLE IF NOT EXISTS satinalma_fatura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siparis_id INTEGER NOT NULL REFERENCES satinalma_siparis(id),
    firma_id INTEGER NOT NULL REFERENCES cari_firma(id),
    fatura_no TEXT NOT NULL,
    fatura_tarihi TEXT NOT NULL,
    vade_tarihi TEXT NOT NULL,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT,
    tutar_kurus INTEGER NOT NULL, -- KDV hariç mal/hizmet toplamı
    kdv_tutari_kurus INTEGER NOT NULL DEFAULT 0,
    tevkifat_orani REAL NOT NULL DEFAULT 0, -- PARAMETRİK oran servis katmanında parametre tablosundan doğrulanır/okunur, koda gömülmez
    tevkifat_tutari_kurus INTEGER NOT NULL DEFAULT 0,
    genel_toplam_kurus INTEGER NOT NULL, -- tutar + kdv - tevkifat
    durum TEXT NOT NULL DEFAULT 'kaydedildi' CHECK (durum IN ('kaydedildi','eslestirildi','eslesme_istisna','odeme_talimati_olusturuldu')),
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(firma_id, fatura_no) -- mükerrer fatura girişini engeller
  );

  CREATE TABLE IF NOT EXISTS satinalma_fatura_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fatura_id INTEGER NOT NULL REFERENCES satinalma_fatura(id),
    siparis_kalem_id INTEGER REFERENCES satinalma_siparis_kalem(id), -- NULL = sipariş kalemiyle eşleşmeyen (istisna)
    aciklama TEXT,
    miktar REAL NOT NULL,
    birim_fiyat_kurus INTEGER NOT NULL,
    kdv_orani REAL NOT NULL DEFAULT 20,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== 3'LÜ EŞLEŞTİRME İSTİSNALARI ==========
  CREATE TABLE IF NOT EXISTS satinalma_eslesme_istisna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fatura_id INTEGER NOT NULL REFERENCES satinalma_fatura(id),
    fatura_kalem_id INTEGER NOT NULL REFERENCES satinalma_fatura_kalem(id),
    tur TEXT NOT NULL CHECK (tur IN ('siparis_bulunamadi','miktar_asimi','fiyat_sapmasi','teslim_alinmamis')),
    detay TEXT, -- JSON: {beklenen, gelen, sapmaYuzdesi, ...}
    cozuldu_mu INTEGER NOT NULL DEFAULT 0,
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_satinalma_eslesme_fatura ON satinalma_eslesme_istisna (fatura_id);
`);

export { db };
