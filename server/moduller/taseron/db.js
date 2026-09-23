// Taşeron — Ekip, Metraj Kaydı, Ödeme Dönemi'nin TEK sahibi.
//
// TANIM AYRIMI (P5'teki notla AYNI, bkz. CAKISMA_HARITASI.md): Taşeron =
// sahada ekip olarak çalışan, puantaj/yevmiye veya basit metraj ile ödenen
// usta başı/ekip (çoğu zaman şahıs); Alt Yüklenici (P5) = tüzel kişilikli,
// iş kalemi/metraj üzerinden HAKEDİŞ alan firma. Ölçüt Sözleşme'nin `tip`
// alanıdır — bu modül yalnızca sozlesme.tip='taseron' sözleşmeler için
// çalışır (bkz. ekip.js#olustur).
//
// PUANTAJ: AYRI bir tablo AÇILMADI (görev metninin açık isteği) — Çekirdek
// `puantaj_kaydi`yı (server/moduller/_cekirdek/puantaj.js) DOĞRUDAN
// kullanır; bu modül yalnızca o servisin ÜZERİNE (SGK/İSG kontrolü, dönem
// kilidi, ekip bazlı toplu giriş) ince bir katman ekler.
//
// Sözleşme, Firma/Kişi, malzeme kesintisi/zimmet (P4) yalnızca ID ile
// REFERANS alınır — KOPYALANMAZ.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== TAŞERON EKİBİ ==========
  CREATE TABLE IF NOT EXISTS taseron_ekip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sozlesme_id INTEGER NOT NULL, -- sozlesme(id)'ye REFERANS — tip='taseron' olmalı (servis katmanında doğrulanır)
    proje_id TEXT NOT NULL,
    ekip_basi_kisi_id INTEGER REFERENCES kisi(id),
    is_kolu TEXT,
    odeme_tipi TEXT NOT NULL DEFAULT 'yevmiye' CHECK (odeme_tipi IN ('yevmiye','metraj','goturu','karma')),
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_taseron_ekip_sozlesme ON taseron_ekip (sozlesme_id);

  -- ========== EKİP ÜYESİ ==========
  -- sgk_giris_bildirge_tarihi: "Sahaya giren her taşeron işçisinin SGK işe
  -- giriş bildirgesi... kontrol edilmeden puantaja yazılamamalı" (görev
  -- metni) — bu kontrolün veri kaynağı.
  CREATE TABLE IF NOT EXISTS ekip_uye (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ekip_id INTEGER NOT NULL REFERENCES taseron_ekip(id),
    kisi_id INTEGER NOT NULL REFERENCES kisi(id), -- Çekirdek Kişi, rol='taseron_iscisi'
    rol_saha TEXT NOT NULL DEFAULT 'duz_isci' CHECK (rol_saha IN ('usta_basi','usta','kalfa','duz_isci')),
    sgk_giris_bildirge_tarihi TEXT,
    baslangic_tarihi TEXT NOT NULL,
    bitis_tarihi TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(ekip_id, kisi_id)
  );

  -- ========== EKİP ÜYESİ YEVMİYESİ (yürürlük tarihli — "ücret değişiklikleri tarihli") ==========
  CREATE TABLE IF NOT EXISTS ekip_uye_yevmiye (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ekip_uye_id INTEGER NOT NULL REFERENCES ekip_uye(id),
    gecerli_baslangic TEXT NOT NULL,
    gecerli_bitis TEXT,
    yevmiye_kurus INTEGER NOT NULL,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ekip_uye_yevmiye ON ekip_uye_yevmiye (ekip_uye_id, gecerli_baslangic);

  -- ========== METRAJ KAYDI ==========
  -- "Metraj bazlı ödemede puantaj yine tutulur (verimlilik) ama ödeme
  -- hesabına GİRMEZ" — bu tablo yalnızca metraj/götürü ödeme tipli
  -- ekiplerin HAKEDİŞ miktarını taşır, puantajdan bağımsızdır.
  CREATE TABLE IF NOT EXISTS taseron_metraj (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ekip_id INTEGER NOT NULL REFERENCES taseron_ekip(id),
    sozlesme_kalem_id INTEGER NOT NULL, -- sozlesme_kalem(id)'ye REFERANS — kopyalanmaz
    proje_id TEXT NOT NULL,
    tarih TEXT NOT NULL,
    miktar REAL NOT NULL, -- beyan edilen
    sef_onay_miktar REAL,
    sef_onayli_mi INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_taseron_metraj_ekip ON taseron_metraj (ekip_id, tarih);

  -- ========== ÖDEME DÖNEMİ ==========
  -- "Dönem kapanışı: şef onayı → proje müdürü onayı → Maliyet Defteri
  -- GERÇEKLEŞEN + Ödeme Talimatı. Kapanmış dönem puantajı değiştirilemez."
  CREATE TABLE IF NOT EXISTS odeme_donemi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numara TEXT NOT NULL UNIQUE,
    ekip_id INTEGER NOT NULL REFERENCES taseron_ekip(id),
    proje_id TEXT NOT NULL,
    donem_baslangic TEXT NOT NULL,
    donem_bitis TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','sef_onayi','proje_muduru_onayi','kapandi')),
    brut_tutar_kurus INTEGER NOT NULL DEFAULT 0,
    kesintiler_toplam_kurus INTEGER NOT NULL DEFAULT 0,
    net_tutar_kurus INTEGER NOT NULL DEFAULT 0,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    taahhut_dusuldu_mu INTEGER NOT NULL DEFAULT 0,
    odeme_talimati_olusturuldu_mu INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(ekip_id, donem_baslangic, donem_bitis)
  );
  CREATE INDEX IF NOT EXISTS idx_odeme_donemi_ekip ON odeme_donemi (ekip_id, donem_baslangic);

  CREATE TABLE IF NOT EXISTS odeme_donemi_kesinti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    odeme_donemi_id INTEGER NOT NULL REFERENCES odeme_donemi(id),
    tur TEXT NOT NULL CHECK (tur IN ('avans','yemek','barinma','malzeme_fire','alet_kaybi','ceza','diger')),
    tutar_kurus INTEGER NOT NULL,
    aciklama TEXT,
    kaynak_modul TEXT,
    kaynak_id TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_odeme_donemi_kesinti ON odeme_donemi_kesinti (odeme_donemi_id);
`);

export { db };
