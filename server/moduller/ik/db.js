// İK — Personel, Vardiya, PDKS meta, İzin, Avans, Bordro Dönemi'nin TEK
// sahibi. Kişi, Puantaj, Belge, Maliyet Kodu/Defteri YALNIZCA ID ile
// REFERANS alınır (Çekirdek'ten KOPYALANMAZ — bkz. server/moduller/
// _cekirdek/db.js başındaki AYNI sahiplik kuralı).
//
// PUANTAJ: AYRI bir tablo AÇILMADI (P6/Taşeron ile AYNI karar) — Çekirdek
// puantaj_kaydi DOĞRUDAN kullanılır (bkz. ../_cekirdek/puantaj.js); bu
// modül yalnızca PDKS YÖNTEM detayını (ik_pdks_meta) ekler.
//
// İSG eğitim kayıtları: GÖREV METNİ "sahibi P8'dir; İK özlük dosyasında
// SADECE OKUR" der — P8 henüz kurulmadığından, İK bu turda Çekirdek
// Kişi.isg_egitim_tarihi/isg_egitim_gecerlilik_tarihi alanlarını (P1'den
// beri var) SALT OKUNUR gösterir; buraya YENİ bir İSG tablosu AÇILMADI.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== VARDİYA ==========
  CREATE TABLE IF NOT EXISTS ik_vardiya (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    baslangic_saati TEXT NOT NULL, -- 'HH:MM'
    bitis_saati TEXT NOT NULL,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== PERSONEL (Çekirdek Kişi'nin İK'ya özel uzantısı) ==========
  CREATE TABLE IF NOT EXISTS personel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kisi_id INTEGER NOT NULL UNIQUE, -- kisi(id)'ye REFERANS — rol='personel' olmalı (servis katmanında doğrulanır)
    sicil_no TEXT NOT NULL UNIQUE,
    departman TEXT,
    unvan TEXT,
    calisma_sekli TEXT NOT NULL DEFAULT 'tam_zamanli' CHECK (calisma_sekli IN ('tam_zamanli','yari_zamanli','gecici','mevsimlik')),
    vardiya_id INTEGER REFERENCES ik_vardiya(id),
    ise_giris_tarihi TEXT NOT NULL,
    cikis_tarihi TEXT,
    cikis_nedeni TEXT,
    -- KVKK md.6: biyometrik veri özel nitelikli — PDKS'te 'biyometrik' yöntemi
    -- yalnızca AÇIK RIZA varsa kullanılabilir (bkz. pdks.js#kaydet).
    biyometrik_riza_verildi_mi INTEGER NOT NULL DEFAULT 0,
    biyometrik_riza_tarihi TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );

  -- ========== PERSONEL PROJE ATAMASI (bilgi amaçlı — MALİYET DAĞITIMI puantajdan hesaplanır, bkz. bordroDonemi.js) ==========
  CREATE TABLE IF NOT EXISTS personel_proje_atama (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personel_id INTEGER NOT NULL REFERENCES personel(id),
    proje_id TEXT NOT NULL,
    baslangic_tarihi TEXT NOT NULL,
    bitis_tarihi TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_personel_proje_atama ON personel_proje_atama (personel_id, baslangic_tarihi);

  -- ========== ÜCRET GEÇMİŞİ (yürürlük tarihli — Çekirdek Parametre/Taşeron Yevmiye ile AYNI desen) ==========
  CREATE TABLE IF NOT EXISTS personel_ucret (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personel_id INTEGER NOT NULL REFERENCES personel(id),
    gecerli_baslangic TEXT NOT NULL,
    gecerli_bitis TEXT,
    brut_maas_kurus INTEGER NOT NULL,
    odeme_periyodu TEXT NOT NULL DEFAULT 'aylik' CHECK (odeme_periyodu IN ('aylik','haftalik','gunluk')),
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_personel_ucret ON personel_ucret (personel_id, gecerli_baslangic);

  -- ========== PDKS META (yöntem/geofence — Çekirdek puantaj_kaydi'nı GENİŞLETMEZ) ==========
  CREATE TABLE IF NOT EXISTS ik_pdks_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puantaj_kaydi_id INTEGER NOT NULL UNIQUE, -- Çekirdek puantaj_kaydi(id)'ye REFERANS
    yontem TEXT NOT NULL CHECK (yontem IN ('kartli','qr','mobil_gps','manuel_sef','biyometrik')),
    geofence_icinde_mi INTEGER, -- mobil_gps için; point-in-polygon hesaplaması KAPSAM DIŞI (bkz. CAKISMA_HARITASI.md P7 notu) — bilgi olarak taşınır
    konum_lat REAL, konum_lon REAL,
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== İZİN HAKKI TABLOSU (kıdem bazlı taban gün, yürürlük tarihli) ==========
  CREATE TABLE IF NOT EXISTS ik_izin_hakki_tablosu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kidem_yil_min INTEGER NOT NULL,
    kidem_yil_max INTEGER, -- NULL = üst sınır yok
    yillik_izin_gun INTEGER NOT NULL,
    gecerli_baslangic TEXT NOT NULL,
    gecerli_bitis TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== İZİN BAKİYESİ (yıl bazlı — devreder) ==========
  CREATE TABLE IF NOT EXISTS ik_izin_bakiye (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personel_id INTEGER NOT NULL REFERENCES personel(id),
    yil INTEGER NOT NULL,
    hak_edilen_gun REAL NOT NULL,
    devreden_gun REAL NOT NULL DEFAULT 0,
    kullanilan_gun REAL NOT NULL DEFAULT 0,
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(personel_id, yil)
  );

  -- ========== İZİN TALEBİ ==========
  CREATE TABLE IF NOT EXISTS ik_izin_talebi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personel_id INTEGER NOT NULL REFERENCES personel(id),
    tur TEXT NOT NULL CHECK (tur IN ('yillik','mazeret','ucretsiz','rapor')),
    baslangic_tarihi TEXT NOT NULL,
    bitis_tarihi TEXT NOT NULL,
    gun_sayisi REAL NOT NULL,
    aciklama TEXT,
    durum TEXT NOT NULL DEFAULT 'talep_edildi' CHECK (durum IN ('talep_edildi','onaylandi','reddedildi','iptal')),
    onaylayan INTEGER,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_ik_izin_talebi ON ik_izin_talebi (personel_id, baslangic_tarihi);

  -- ========== AVANS (+ TAKSİT PLANI) ==========
  CREATE TABLE IF NOT EXISTS ik_avans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    personel_id INTEGER NOT NULL REFERENCES personel(id),
    tutar_kurus INTEGER NOT NULL,
    talep_tarihi TEXT NOT NULL,
    taksit_sayisi INTEGER NOT NULL DEFAULT 1,
    durum TEXT NOT NULL DEFAULT 'talep_edildi' CHECK (durum IN ('talep_edildi','onaylandi','reddedildi','kapandi')),
    onaylayan INTEGER,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE TABLE IF NOT EXISTS ik_avans_taksit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    avans_id INTEGER NOT NULL REFERENCES ik_avans(id),
    taksit_no INTEGER NOT NULL,
    tutar_kurus INTEGER NOT NULL,
    mahsup_edildi_mi INTEGER NOT NULL DEFAULT 0,
    bordro_donemi_id INTEGER,
    UNIQUE(avans_id, taksit_no)
  );

  -- ========== BORDRO DÖNEMİ (ÖN HAZIRLIK — tam hesaplama motoru DEĞİL) ==========
  -- GÖREV METNİ: "Bordroyu tam hesaplamak yerine önce bordro ön hazırlık +
  -- dış bordro programına aktarım yaklaşımı" — SGK primi/gelir vergisi/damga
  -- vergisi burada HESAPLANMAZ; yalnızca gün/mesai/izin/avans TOPLANIR ve
  -- proje bazlı dağıtım (Maliyet Defteri GERÇEKLEŞEN) yapılır.
  CREATE TABLE IF NOT EXISTS ik_bordro_donemi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numara TEXT NOT NULL UNIQUE,
    donem_yil INTEGER NOT NULL,
    donem_ay INTEGER NOT NULL,
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','onaylandi','disa_aktarildi')),
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(donem_yil, donem_ay)
  );
  CREATE TABLE IF NOT EXISTS ik_bordro_satiri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bordro_donemi_id INTEGER NOT NULL REFERENCES ik_bordro_donemi(id),
    personel_id INTEGER NOT NULL REFERENCES personel(id),
    brut_maas_kurus INTEGER NOT NULL,
    calisilan_gun REAL NOT NULL DEFAULT 0,
    fazla_mesai_saat REAL NOT NULL DEFAULT 0, -- BİLGİ amaçlı — mesai ücreti bu ön hazırlıkta parasallaştırılmaz (dış bordro programı hesaplar)
    izinli_gun REAL NOT NULL DEFAULT 0,
    ucretsiz_izin_gun REAL NOT NULL DEFAULT 0,
    avans_kesinti_kurus INTEGER NOT NULL DEFAULT 0,
    gerceklesen_yazildi_mi INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    UNIQUE(bordro_donemi_id, personel_id)
  );
  CREATE TABLE IF NOT EXISTS ik_bordro_dagitim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bordro_satiri_id INTEGER NOT NULL REFERENCES ik_bordro_satiri(id),
    proje_id TEXT,
    maliyet_kodu_id INTEGER, -- NULL = WBS'siz/dağıtılamamış (Taşeron'daki "maliyet_kodu_id yoksa atlanır" kuralıyla AYNI)
    gun_sayisi REAL NOT NULL,
    tutar_kurus INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ik_bordro_dagitim ON ik_bordro_dagitim (bordro_satiri_id);
`);

export { db };
