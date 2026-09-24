// Alt Yüklenici — Hakediş'in TEK sahibi.
//
// TANIM AYRIMI (görev metninden, Taşeron/P6 ile çakışmayı önler):
//   ALT YÜKLENİCİ = tüzel kişilikli, kendi personeli ve SGK işyeri kaydı
//     olan, iş kalemi/metraj üzerinden hakediş alan firma (elektrik,
//     mekanik, cephe, asansör...).
//   TAŞERON (P6) = sahada ekip olarak çalışan, puantaj/yevmiye veya basit
//     metraj ile ödenen usta başı/ekip (çoğu zaman şahıs).
//   Ölçüt SÖZLEŞME TİPİ VE ÖDEME YÖNTEMİDİR — sınıf Firma'da DEĞİL,
//   Sözleşme'de (server/moduller/sozlesme) tutulur; bu modül yalnızca
//   sozlesme.tip='alt_yuklenici' olan sözleşmeler için hakediş açar (bkz.
//   hakedis.js#olustur). Aynı firma zamanla sınıf değiştirebilir (bir
//   projede alt yüklenici, başka bir projede taşeron sözleşmesiyle
//   çalışabilir) — bu tasarım bunu doğal olarak destekler.
//
// Sözleşme (P2), Firma/Kişi (Çekirdek), malzeme kesintisi (P4 stok_hareketi.
// kesinti_adayi_mi) yalnızca ID ile REFERANS alınır — KOPYALANMAZ.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== HAKEDİŞ ==========
  CREATE TABLE IF NOT EXISTS hakedis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numara TEXT NOT NULL UNIQUE,
    sozlesme_id INTEGER NOT NULL, -- sozlesme(id)'ye REFERANS — tip='alt_yuklenici' olmalı (servis katmanında doğrulanır)
    proje_id TEXT NOT NULL,
    hakedis_no INTEGER NOT NULL, -- sözleşme başına 1'den başlayan sıra no
    donem_baslangic TEXT NOT NULL,
    donem_bitis TEXT NOT NULL,
    son_hakedis_mi INTEGER NOT NULL DEFAULT 0, -- "son hakedişte ilişiksizlik zorunlu tutulabilmeli" kuralını tetikler
    durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','alt_yuklenici_beyani','santiye_onayi','teknik_ofis','onayli','reddedildi')),
    brut_tutar_kurus INTEGER NOT NULL DEFAULT 0,
    kesintiler_toplam_kurus INTEGER NOT NULL DEFAULT 0,
    net_tutar_kurus INTEGER NOT NULL DEFAULT 0,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT,
    -- Blokaj: evrak eksik/süresi geçmiş alt yüklenicinin hakedişi bu bayrakla işaretlenir.
    blokaj_mi INTEGER NOT NULL DEFAULT 0,
    blokaj_nedeni TEXT,
    blokaj_asildi_mi INTEGER NOT NULL DEFAULT 0,
    blokaj_asan_aktor INTEGER,
    blokaj_asma_gerekcesi TEXT, -- "yetkili aşabilir, gerekçe audit'e yazılır" — burada da tutulur, audit_log ayrıca yazılır
    taahhut_dusuldu_mu INTEGER NOT NULL DEFAULT 0, -- onaylanınca Maliyet Defteri GERÇEKLEŞEN yazıldı mı (idempotency önbelleği)
    odeme_talimati_olusturuldu_mu INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(sozlesme_id, hakedis_no)
  );
  CREATE INDEX IF NOT EXISTS idx_hakedis_sozlesme ON hakedis (sozlesme_id, hakedis_no);

  -- ========== HAKEDİŞ KALEMİ ==========
  -- "Metrajda anlaşmazlık olağandır: alt yüklenicinin beyan ettiği metraj
  -- ile şantiye şefinin onayladığı AYRI tutulmalı" — bu_donem_beyan_miktar
  -- ve bu_donem_onay_miktar İKİ AYRI sütundur; ödemeye giren HER ZAMAN
  -- onay miktarıdır.
  CREATE TABLE IF NOT EXISTS hakedis_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hakedis_id INTEGER NOT NULL REFERENCES hakedis(id),
    sozlesme_kalem_id INTEGER NOT NULL, -- sozlesme_kalem(id)'ye REFERANS — kopyalanmaz
    birim_fiyat_kurus INTEGER NOT NULL, -- oluşturma anında sözleşme kaleminden ALINAN ANLIK KOPYA (geçmiş hakediş fiyatı sonradan değişmesin diye — bu istisnai bir "kopyalama" değil, tarihsel bir anlık görüntüdür)
    onceki_kumulatif_miktar REAL NOT NULL DEFAULT 0,
    bu_donem_beyan_miktar REAL,
    bu_donem_onay_miktar REAL,
    kumulatif_miktar REAL NOT NULL DEFAULT 0, -- onceki_kumulatif_miktar + bu_donem_onay_miktar
    tutar_kurus INTEGER NOT NULL DEFAULT 0, -- bu_donem_onay_miktar × birim_fiyat_kurus
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_hakedis_kalem_hakedis ON hakedis_kalem (hakedis_id);

  -- ========== KESİNTİ SATIRLARI ==========
  -- Oranlar (teminat kesintisi %, stopaj, KDV tevkifatı) PARAMETRİK —
  -- Çekirdek parametre tablosundan okunur, koda GÖMÜLMEZ (ÇALIŞMA KURALLARI).
  CREATE TABLE IF NOT EXISTS hakedis_kesinti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hakedis_id INTEGER NOT NULL REFERENCES hakedis(id),
    tur TEXT NOT NULL CHECK (tur IN ('avans_mahsubu','teminat_kesintisi','malzeme_kesintisi','ceza','sgk_bekletme','stopaj','kdv_tevkifati','diger')),
    parametre_kodu TEXT, -- oranın okunduğu Çekirdek parametre kodu (varsa)
    oran_yuzde REAL,
    tutar_kurus INTEGER NOT NULL,
    aciklama TEXT,
    kaynak_modul TEXT, -- ör. 'depo_stok_hareketi' (malzeme kesintisi kaynağı)
    kaynak_id TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_hakedis_kesinti_hakedis ON hakedis_kesinti (hakedis_id);

  -- ========== İLERLEME KAYDI (WBS bazlı %) ==========
  CREATE TABLE IF NOT EXISTS ilerleme_kaydi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL,
    wbs_gorev_id TEXT NOT NULL, -- tb_wbs_gorevler'e REFERANS
    tarih TEXT NOT NULL,
    planlanan_yuzde REAL NOT NULL,
    gerceklesen_yuzde REAL NOT NULL,
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ilerleme_sozlesme ON ilerleme_kaydi (sozlesme_id, tarih);

  -- ========== PERFORMANS KARTI ==========
  -- Ağırlıklar PARAMETRİK (Çekirdek parametre: altyuklenici_performans_agirlik_*).
  -- NCR (uygunsuzluk) sayısı/süresi ve İSG ihlalleri bu geçişte MANUEL
  -- girilir — otomatik hesap için Kalite Kontrol/İSG modülü (P8+) gerekir.
  CREATE TABLE IF NOT EXISTS performans_karti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL,
    donem TEXT NOT NULL, -- ör. '2026-Q3'
    zaman_puani REAL NOT NULL,
    kalite_puani REAL NOT NULL,
    isg_puani REAL NOT NULL,
    belge_puani REAL NOT NULL,
    ncr_acik_sayisi INTEGER NOT NULL DEFAULT 0,
    ncr_ortalama_kapanma_gun REAL,
    isg_ihlal_sayisi INTEGER NOT NULL DEFAULT 0,
    toplam_puan REAL NOT NULL DEFAULT 0, -- ağırlıklı ortalama (bkz. performans.js#hesapla)
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(sozlesme_id, donem)
  );

  -- ========== EVRAK KONTROL LİSTESİ ==========
  -- Çekirdek "Belge" ortak servisi HENÜZ YOK (P1'den beri ertelendi) — bu
  -- yüzden burada YENİ bir belge deposu AÇILMADI; dokuman_id yalnızca
  -- mevcut generic tb_dokumanlar'a (varsa) opsiyonel bir REFERANSTIR.
  CREATE TABLE IF NOT EXISTS evrak_kontrol (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('sgk_isyeri_sicili','sigorta','isg_uzmani_atamasi','calisan_listesi','iliskiksizlik_belgesi')),
    gecerlilik_baslangic TEXT,
    gecerlilik_bitis TEXT,
    dokuman_id TEXT, -- tb_dokumanlar'a opsiyonel REFERANS
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(sozlesme_id, tur)
  );

  -- ========== PERFORMANS OLAYI (P8 Şantiye'den gelen NCR/İSG ihlali) ==========
  -- Görev metni: "NCR sorumlusu alt yükleniciyse P5 performans kartına olay
  -- gönderilir; İSG ihlali de aynı şekilde." Kaynak kayıt (kaynak_modul+id)
  -- başına TEK olay (idempotent).
  CREATE TABLE IF NOT EXISTS performans_olay (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('ncr','isg_ihlali')),
    kaynak_modul TEXT NOT NULL,
    kaynak_id TEXT NOT NULL,
    tarih TEXT NOT NULL,
    aciklama TEXT,
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(kaynak_modul, kaynak_id, tur)
  );
`);

export { db };
