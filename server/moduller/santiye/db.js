// Şantiye — Görev, Günlük Rapor, İSG kayıtları, Kalite (NCR/Beton), İş
// Programı ve Ekipman'ın TEK sahibi (bkz. CAKISMA_HARITASI.md §4.1).
//
// KOPYALANMAZ: kişi sayıları/kim-nerede bilgisi (Çekirdek puantaj — İK P7 ve
// Taşeron P6 yazar), gelen malzeme (Depo mal kabul), KKD zimmeti (Depo),
// alt yüklenici çalışan/ilerleme (P5), kira birim fiyatı (Sözleşme P2).
// Bunlar yalnızca sahiplerinin SERVİSLERİ çağrılarak OKUNUR.
//
// İSG EĞİTİM KAYDI'nın SAHİBİ burasıdır (P7 görev metni). Kişi'deki
// isg_egitim_* alanları ARTIK türev/önbellektir — egitim.js eğitim
// eklendiğinde onları günceller ki P6'nın SGK/İSG kontrolü çalışmaya devam etsin.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== GÜNLÜK RAPOR (+ bölümler) ==========
  CREATE TABLE IF NOT EXISTS gunluk_rapor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    tarih TEXT NOT NULL,
    hava_durumu TEXT, -- 'gunesli','bulutlu','yagmurlu','karli','ruzgarli'
    sicaklik_c REAL,
    sorunlar TEXT,
    durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','onayli')),
    son_istemci_kayit_id TEXT, -- çevrimdışı kuyruktan toplu kayıt idempotency anahtarı
    resmi_defter_taslagi TEXT, -- iç rapordan üretilen resmi şantiye defteri TASLAĞI (resmi defterin yerine geçmez)
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(proje_id, tarih)
  );
  -- tur: 'calisan' (firma/ekip bazlı sayı), 'makine', 'is' (WBS'li), 'malzeme', 'fotograf'
  -- otomatik_sayi: puantajdan/mal kabulden gelen; sayi: şefin DÜZELTTİĞİ (yoksa otomatik_sayi kullanılır)
  CREATE TABLE IF NOT EXISTS gunluk_rapor_bolum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rapor_id INTEGER NOT NULL REFERENCES gunluk_rapor(id),
    tur TEXT NOT NULL CHECK (tur IN ('calisan','makine','is','malzeme','fotograf')),
    etiket TEXT NOT NULL,
    otomatik_sayi REAL,
    sayi REAL,
    wbs_gorev_id TEXT,
    ref_modul TEXT, ref_id TEXT,
    lat REAL, lon REAL, dosya_url TEXT,
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_gr_bolum ON gunluk_rapor_bolum (rapor_id, tur);

  -- ========== GÖREV ==========
  CREATE TABLE IF NOT EXISTS gorev (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    baslik TEXT NOT NULL,
    aciklama TEXT,
    sorumlu_tipi TEXT NOT NULL CHECK (sorumlu_tipi IN ('kisi','taseron_ekibi','alt_yuklenici')),
    sorumlu_id INTEGER NOT NULL, -- kisi.id / taseron_ekip.id / sozlesme.id (KOPYALANMAZ)
    wbs_gorev_id TEXT,
    konum_blok TEXT, konum_kat TEXT, konum_daire TEXT,
    lat REAL, lon REAL,
    son_tarih TEXT,
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','devam','kapali','iptal')),
    kapanis_foto_url TEXT,
    kapanis_tarihi TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE TABLE IF NOT EXISTS gorev_yorum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gorev_id INTEGER NOT NULL REFERENCES gorev(id),
    metin TEXT NOT NULL, foto_url TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== İŞ PROGRAMI ==========
  CREATE TABLE IF NOT EXISTS is_programi_aktivite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    wbs_gorev_id TEXT,
    ad TEXT NOT NULL,
    plan_baslangic TEXT NOT NULL,
    plan_bitis TEXT NOT NULL,
    gerceklesen_yuzde REAL NOT NULL DEFAULT 0,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_is_programi ON is_programi_aktivite (proje_id);

  -- ========== İSG ==========
  CREATE TABLE IF NOT EXISTS isg_egitim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kisi_id INTEGER NOT NULL,
    egitim_tipi TEXT NOT NULL, -- 'ise_baslama','yuksekte_calisma','ilk_yardim',...
    tarih TEXT NOT NULL,
    gecerlilik_bitis TEXT NOT NULL,
    egitmen TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_isg_egitim_kisi ON isg_egitim (kisi_id, egitim_tipi);

  CREATE TABLE IF NOT EXISTS isg_risk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL, tehlike TEXT NOT NULL, risk TEXT,
    olasilik INTEGER NOT NULL CHECK (olasilik BETWEEN 1 AND 5),
    siddet INTEGER NOT NULL CHECK (siddet BETWEEN 1 AND 5),
    risk_skoru INTEGER NOT NULL, -- olasilik * siddet
    onlem TEXT, sorumlu_kisi_id INTEGER,
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','kontrol_altinda','kapali')),
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS isg_is_izni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('yuksekte_calisma','sicak_calisma','kazi','kapali_alan')),
    aciklama TEXT, konum TEXT,
    talep_eden_kisi_id INTEGER, onaylayan TEXT,
    baslangic TEXT NOT NULL, bitis TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'talep' CHECK (durum IN ('talep','onayli','kapali','iptal')),
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS isg_denetim_sablon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    periyot TEXT NOT NULL CHECK (periyot IN ('gunluk','haftalik')),
    maddeler TEXT NOT NULL, -- JSON dizi: ["Baret kullanımı","Korkuluk..."]
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS isg_denetim_yanit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sablon_id INTEGER NOT NULL REFERENCES isg_denetim_sablon(id),
    proje_id TEXT NOT NULL, tarih TEXT NOT NULL,
    yanitlar TEXT NOT NULL, -- JSON: [{madde, uygun:boolean, not}]
    uygunsuz_sayisi INTEGER NOT NULL DEFAULT 0,
    denetleyen TEXT,
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS isg_ramak_kala (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL, tarih TEXT NOT NULL, aciklama TEXT NOT NULL,
    anonim_mi INTEGER NOT NULL DEFAULT 0,
    bildiren_kisi_id INTEGER, -- anonimse NULL saklanır (kimlik hiç yazılmaz)
    lat REAL, lon REAL,
    olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS isg_olay (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('is_kazasi','meslek_hastaligi','yaralanmasiz_olay')),
    tarih TEXT NOT NULL, aciklama TEXT NOT NULL,
    kisi_id INTEGER, ilgili_alt_yuklenici_sozlesme_id INTEGER,
    lat REAL, lon REAL,
    yasal_bildirim_son_tarih TEXT, -- parametrik süreden hesaplanır (isg_kaza_bildirim_gun)
    bildirim_yapildi_mi INTEGER NOT NULL DEFAULT 0,
    bildirim_tarihi TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS isg_duzeltici_faaliyet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    kaynak_tipi TEXT NOT NULL CHECK (kaynak_tipi IN ('olay','denetim','risk','ramak_kala','ncr','diger')),
    kaynak_id TEXT,
    aciklama TEXT NOT NULL, sorumlu_kisi_id INTEGER, son_tarih TEXT,
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','tamamlandi','iptal')),
    kapanis_notu TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== KALİTE ==========
  CREATE TABLE IF NOT EXISTS ncr (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL, baslik TEXT NOT NULL, aciklama TEXT,
    sorumlu_tipi TEXT NOT NULL CHECK (sorumlu_tipi IN ('kisi','taseron_ekibi','alt_yuklenici')),
    sorumlu_id INTEGER NOT NULL,
    wbs_gorev_id TEXT, lat REAL, lon REAL, foto_url TEXT,
    duzeltme_notu TEXT,
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','duzeltildi','kapali')),
    acilis_tarihi TEXT NOT NULL, kapanis_tarihi TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS beton_dokum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL, tarih TEXT NOT NULL,
    eleman TEXT NOT NULL, beton_sinifi TEXT NOT NULL, miktar_m3 REAL NOT NULL,
    wbs_gorev_id TEXT, lat REAL, lon REAL,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS beton_numune (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dokum_id INTEGER NOT NULL REFERENCES beton_dokum(id),
    numune_kodu TEXT NOT NULL,
    kirim_gun INTEGER NOT NULL CHECK (kirim_gun IN (7, 28)),
    planlanan_kirim_tarihi TEXT NOT NULL,
    sonuc_mpa REAL, sonuc_tarihi TEXT,
    UNIQUE(dokum_id, numune_kodu, kirim_gun)
  );

  -- ========== EKİPMAN ==========
  CREATE TABLE IF NOT EXISTS ekipman (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    ad TEXT NOT NULL, plaka_seri TEXT,
    sahiplik TEXT NOT NULL CHECK (sahiplik IN ('kiralik','oz_mal')),
    kira_sozlesme_id INTEGER, -- sozlesme(id) (tip='kira') — birim fiyat ORADAN okunur
    ozmal_saat_maliyeti_kurus INTEGER, -- öz mal için opsiyonel (sözleşme yok)
    sayac_saat REAL NOT NULL DEFAULT 0,
    durum TEXT NOT NULL DEFAULT 'aktif' CHECK (durum IN ('aktif','arizali','pasif')),
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS ekipman_calisma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ekipman_id INTEGER NOT NULL REFERENCES ekipman(id),
    proje_id TEXT NOT NULL, tarih TEXT NOT NULL,
    calisma_saat REAL NOT NULL, yakit_litre REAL, ariza_notu TEXT,
    operator_kisi_id INTEGER, -- operatör belgesi (SRC) İK/Çekirdek Belge'den kontrol edilir
    maliyet_kodu_id INTEGER,
    tutar_kurus INTEGER,
    istemci_kayit_id TEXT UNIQUE,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== ŞANTİYE GİRİŞ KAYDI (turnike/manuel kontrol sonucu) ==========
  CREATE TABLE IF NOT EXISTS santiye_giris (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL, kisi_id INTEGER NOT NULL, tarih TEXT NOT NULL,
    uygun_mu INTEGER NOT NULL, uyarilar TEXT, -- JSON dizi
    yetkili_onayi_mi INTEGER NOT NULL DEFAULT 0, gerekce TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
`);

export { db };
