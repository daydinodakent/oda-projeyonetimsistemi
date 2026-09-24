// Ortak Çekirdek (Shared Kernel) — şema.
//
// SAHİPLİK: Bu dosyadaki tablolar, docs/moduller/CAKISMA_HARITASI.md'deki
// "Çekirdek" satırlarının (Firma, Kişi, Maliyet Kodu, Maliyet Hareketi,
// Ödeme, Puantaj, Audit Log) karşılığıdır. Hiçbiri mevcut server/db.js
// tablolarını (tb_projeler, tb_wbs_gorevler, tb_personel, ...) KOPYALAMAZ —
// gerektiğinde onlara yalnızca ID ile referans verir (bkz. maliyetKodu.js'in
// wbs_gorev_id doğrulaması, server/db.js'in generic getRecord()'unu çağırır).
//
// Aynı fiziksel dosyayı (server/data/oda_pys.gpkg) paylaşır — server/db.js'in
// zaten oluşturduğu node:sqlite bağlantısı (rawDb()) yeniden kullanılır, YENİ
// bir bağlantı AÇILMAZ (aynı SQLite dosyasına iki ayrı yazma bağlantısı WAL
// modunda bile kilitlenme riskini artırır).
//
// Para alanları KURALI: tutar alanları HER ZAMAN tam sayı KURUŞ olarak
// saklanır (ör. 1.234,56 TL -> 123456), asla REAL/float DEĞİL — yuvarlama
// hatası birikmesin diye. Kur (exchange rate) bir ORAN olduğundan (tutar
// değil) REAL saklanır — muhasebe tutarı değil, çevrim katsayısıdır.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== FİRMA (CARİ) ==========
  -- Bir firma birden fazla role sahip olabilir (aynı firma hem taşeron hem
  -- tedarikçi olabilir) — bu yüzden roller AYRI bir tabloda (cari_firma_rol),
  -- cari_firma'da TEK bir 'firma tipi' sütunu YOK (bkz. CAKISMA_HARITASI.md
  -- §7 soru 4: "tek tablo + rol alanı" kararı).
  CREATE TABLE IF NOT EXISTS cari_firma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unvan TEXT NOT NULL,
    vkn_tckn TEXT NOT NULL UNIQUE, -- mükerrer kayıt engeli burada (UNIQUE)
    vergi_dairesi TEXT,
    adres TEXT,
    iban_listesi TEXT, -- JSON dizi: [{iban, banka, aciklama}]
    yetkili_kisiler TEXT, -- JSON dizi: [{ad_soyad, telefon, eposta, unvan}]
    e_fatura_mukellefi INTEGER NOT NULL DEFAULT 0,
    kep_adresi TEXT,
    sgk_isyeri_sicil_no TEXT, -- alt işveren (taşeron/alt yüklenici) için
    kara_liste INTEGER NOT NULL DEFAULT 0,
    kara_liste_notu TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    create_uid INTEGER, create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE TABLE IF NOT EXISTS cari_firma_rol (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firma_id INTEGER NOT NULL REFERENCES cari_firma(id) ON DELETE CASCADE,
    rol TEXT NOT NULL CHECK (rol IN ('musteri','tedarikci','alt_yuklenici','taseron','arsa_sahibi','danisman')),
    row_status INTEGER NOT NULL DEFAULT 1,
    create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(firma_id, rol)
  );

  -- ========== KİŞİ ==========
  -- TCKN şifreli saklanır (bkz. kripto.js) — bu tabloda YALNIZCA şifreli
  -- blob (tckn_sifreli) ve maskeli gösterim (tckn_maske, ör. "123*****80")
  -- bulunur; düz metin TCKN hiçbir zaman diske yazılmaz (KVKK).
  CREATE TABLE IF NOT EXISTS kisi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_soyad TEXT NOT NULL,
    tckn_sifreli TEXT NOT NULL UNIQUE,
    tckn_maske TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('personel','taseron_iscisi','alt_yuklenici_iscisi','musteri','ziyaretci')),
    firma_id INTEGER REFERENCES cari_firma(id), -- taşeron/alt yüklenici işçisi ise bağlı olduğu firma
    telefon TEXT,
    eposta TEXT,
    santiye_giris_yetkisi INTEGER NOT NULL DEFAULT 0,
    isg_egitim_tarihi TEXT, -- asıl işveren sahadaki HERKESTEN (taşeron işçisi dahil) sorumlu olduğundan tüm roller için tutulur
    isg_egitim_gecerlilik_tarihi TEXT,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    create_uid INTEGER, create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );

  -- ========== PARAMETRE (yürürlük tarihli oranlar/limitler) ==========
  -- KDV, tevkifat, stopaj, SGK, damga vergisi, izin günleri vb. TEK bir
  -- generic tabloda — her oran türü için ayrı tablo AÇILMAZ (bkz.
  -- ÇALIŞMA KURALLARI). Aynı kod için birden fazla satır olabilir (tarih
  -- aralıkları farklı olduğu sürece); o kod+tarihte GEÇERLİ satır
  -- parametre.js#degerAl() ile bulunur.
  CREATE TABLE IF NOT EXISTS parametre (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod TEXT NOT NULL, -- ör. 'kdv_genel', 'sgk_isveren_orani', 'yillik_izin_gun'
    ad TEXT NOT NULL,
    deger REAL NOT NULL, -- oran (%) veya gün sayısı gibi ondalıksız/ondalıklı katsayı — TUTAR değil, bu yüzden float uygundur
    birim TEXT NOT NULL DEFAULT 'yuzde', -- 'yuzde' | 'gun' | 'sabit_kurus' | 'adet'
    gecerli_baslangic TEXT NOT NULL,
    gecerli_bitis TEXT, -- NULL = hâlâ yürürlükte
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    create_uid INTEGER, create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_parametre_kod ON parametre (kod, gecerli_baslangic);

  -- ========== NUMARA SERİLERİ (SAT-2026-0001 gibi) ==========
  CREATE TABLE IF NOT EXISTS numara_serisi (
    seri_kodu TEXT NOT NULL, -- ör. 'SAT', 'ODM', 'HAK'
    yil INTEGER NOT NULL,
    son_no INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (seri_kodu, yil)
  );

  -- ========== MALİYET KODU (WBS × Kaynak Tipi) ==========
  -- wbs_gorev_id, tb_wbs_gorevler'in (server/db.js generic 'records'
  -- tablosu) id'sine REFERANS verir — o kaydı KOPYALAMAZ. Varlığı
  -- maliyetKodu.js#olustur() içinde generic getRecord('tb_wbs_gorevler', ...)
  -- ile doğrulanır (bkz. server/db.js).
  CREATE TABLE IF NOT EXISTS maliyet_kodu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    wbs_gorev_id TEXT NOT NULL,
    kaynak_tipi TEXT NOT NULL CHECK (kaynak_tipi IN ('malzeme','iscilik_kadro','iscilik_taseron','alt_yuklenici','makine_ekipman','genel_gider')),
    kod TEXT NOT NULL UNIQUE, -- ör. 'WBS-21.MLZ' — insan-okunur birleşik anahtar
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    create_uid INTEGER, create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT,
    UNIQUE(wbs_gorev_id, kaynak_tipi)
  );

  -- ========== MALİYET DEFTERİ ==========
  -- Diğer modüller bu tabloya DOĞRUDAN yazmaz — SADECE maliyetDefteri.js'in
  -- yaz(olay) fonksiyonunu çağırır (bkz. görev metnindeki
  -- "maliyetDefteri.yaz(olay)" sözleşmesi). UNIQUE(kaynak_modul, kaynak_id,
  -- tur) ile AYNI olay iki kez yazılamaz (idempotent). Silme YOK — iptal,
  -- ters işaretli YENİ bir satırdır (bkz. maliyetDefteri.js#iptalEt).
  CREATE TABLE IF NOT EXISTS maliyet_hareketi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    maliyet_kodu_id INTEGER REFERENCES maliyet_kodu(id),
    tur TEXT NOT NULL CHECK (tur IN ('BUTCE','TAAHHUT','GERCEKLESEN','GELIR')),
    tutar_kurus INTEGER NOT NULL, -- ondalık YOK — bkz. dosya başı not
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT NOT NULL,
    tarih TEXT NOT NULL,
    kaynak_modul TEXT NOT NULL, -- ör. 'satin_alma', 'alt_yuklenici', 'ik'
    kaynak_id TEXT NOT NULL,
    iptal_edildi INTEGER NOT NULL DEFAULT 0,
    ters_kayit_id INTEGER REFERENCES maliyet_hareketi(id), -- bu satır bir iptal-ters-kaydıysa, iptal ettiği orijinali gösterir
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(kaynak_modul, kaynak_id, tur)
  );
  CREATE INDEX IF NOT EXISTS idx_maliyet_hareketi_proje ON maliyet_hareketi (proje_id, maliyet_kodu_id);

  -- ========== ÖDEME (ince finans katmanı) ==========
  CREATE TABLE IF NOT EXISTS odeme_talimati (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    numara TEXT NOT NULL UNIQUE, -- numaraSerisi.js ile üretilir (ör. ODM-2026-0001)
    firma_id INTEGER NOT NULL REFERENCES cari_firma(id),
    aciklama TEXT NOT NULL, -- "ne için"
    kaynak_belge_modul TEXT, -- hangi modülün belgesi (ör. 'satin_alma')
    kaynak_belge_id TEXT,
    vade_tarihi TEXT NOT NULL,
    tutar_kurus INTEGER NOT NULL,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kesintiler_kurus INTEGER NOT NULL DEFAULT 0, -- stopaj/tevkifat vb. toplamı (ayrıntı: kesintiler JSON)
    kesintiler TEXT, -- JSON dizi: [{parametre_kodu, tutar_kurus}]
    durum TEXT NOT NULL DEFAULT 'TASLAK' CHECK (durum IN ('TASLAK','ONAY_BEKLIYOR','ONAYLANDI','REDDEDILDI','ODENDI','IPTAL')),
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE TABLE IF NOT EXISTS odeme (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    odeme_talimati_id INTEGER NOT NULL REFERENCES odeme_talimati(id),
    tutar_kurus INTEGER NOT NULL,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT NOT NULL,
    odeme_tarihi TEXT NOT NULL,
    odeme_yontemi TEXT, -- 'havale','eft','cek', vb.
    referans_no TEXT, -- banka dekont no vb.
    disa_aktarildi INTEGER NOT NULL DEFAULT 0, -- muhasebe programına aktarım işareti (bkz. odeme.js#disaAktarimNoktasi)
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== PUANTAJ (ortak yapı — İK=personel, Taşeron=ekip) ==========
  -- istemci_kayit_id: çevrimdışı kuyruktan (bkz. src/moduller/_cekirdek/
  -- offlineQueue.ts) senkron edilirken AYNI kaydın iki kez yazılmasını
  -- engelleyen istemci-üretimli idempotency anahtarı (UNIQUE).
  CREATE TABLE IF NOT EXISTS puantaj_kaydi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    kisi_id INTEGER NOT NULL REFERENCES kisi(id),
    tarih TEXT NOT NULL,
    giris_saati TEXT,
    cikis_saati TEXT,
    gun_degeri REAL NOT NULL CHECK (gun_degeri IN (0, 0.5, 1)),
    fazla_mesai_saat REAL NOT NULL DEFAULT 0,
    -- gun_tipi: P6 (Taşeron) görev metni — "hava muhalefeti (yağmur → yarım
    -- gün/iptal)" gibi nedenleri gun_degeri'nden AYRI, raporlanabilir bir
    -- etiket olarak tutar; gun_degeri'nin YERİNE GEÇMEZ.
    gun_tipi TEXT DEFAULT 'tam' CHECK (gun_tipi IN ('tam','yarim','hava_muhalefeti','iptal')),
    bayram_pazar_mi INTEGER NOT NULL DEFAULT 0,
    maliyet_kodu_id INTEGER REFERENCES maliyet_kodu(id),
    durum TEXT NOT NULL DEFAULT 'TASLAK' CHECK (durum IN ('TASLAK','ONAYLANDI','REDDEDILDI')),
    kaynak TEXT NOT NULL DEFAULT 'manuel' CHECK (kaynak IN ('pdks','manuel','mobil')),
    istemci_kayit_id TEXT UNIQUE,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_puantaj_kisi_tarih ON puantaj_kaydi (kisi_id, tarih);
  -- "Aynı kişi aynı gün iki yere puantaj alamaz (başka şantiye/ekip veya İK
  -- personeli olarak)" (P6 görev metni) — bu kural İK/Taşeron/Alt Yüklenici
  -- HANGİ modülden çağrılırsa çağrılsın AYNI paylaşılan tablo üzerinden,
  -- burada, ÇEKİRDEK SEVİYESİNDE zorlanır (tek bir yerde, tekrarsız). Bu
  -- UNIQUE INDEX, eski-şema tablolarla uyum için exec() bloğunun ALTINDA,
  -- savunmacı olarak (ayrıca) oluşturulur — bkz. dosya sonu.

  -- ========== BELGE (genel doküman metadata) ==========
  -- Üç ayrı doküman modelinin (bkz. CAKISMA_HARITASI.md §4.1 "Belge, Onay
  -- Akışı..." satırı) yerini alacak TEK Çekirdek doküman kaydı. Gerçek dosya
  -- YÜKLEME altyapısı (multer disk depolama) bu turda EKLENMEDİ (görev
  -- metninde istenmedi) — yalnızca METADATA (tür, dosya adı, geçerlilik
  -- tarihi) tutulur; ilgili_tip/ilgili_id ile herhangi bir varlığa (şimdilik
  -- yalnızca 'kisi') REFERANS verir, o varlığı KOPYALAMAZ.
  CREATE TABLE IF NOT EXISTS belge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ilgili_tip TEXT NOT NULL,
    ilgili_id TEXT NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('is_sozlesmesi','kimlik','ikametgah','diploma','ehliyet','src_operator','mesleki_yeterlilik','saglik_raporu','isg_sertifikasi','diger')),
    dosya_adi TEXT NOT NULL,
    gecerlilik_baslangic TEXT,
    gecerlilik_bitis TEXT, -- NULL = süresiz geçerli
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    create_uid INTEGER, create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_belge_ilgili ON belge (ilgili_tip, ilgili_id);

  -- ========== TAHSİLAT (ödeme katmanının GELEN yönü) ==========
  -- odeme/odeme_talimati GİDEN yöndür (firma_id NOT NULL, talimat onayı şart);
  -- müşteriden gelen para için AYRI, ince bir tablo. Hangi belgeye (ör.
  -- musteri_satis) ait olduğu kaynak_modul/kaynak_id ile tutulur — o belgeyi
  -- KOPYALAMAZ. Tutar HER ZAMAN kaynak belgenin para biriminde (kuruş), kur =
  -- TRY karşılık katsayısı. Silme yok; iptal ters kayıt mantığıyla (iptal=1).
  CREATE TABLE IF NOT EXISTS tahsilat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    kaynak_modul TEXT NOT NULL,
    kaynak_id TEXT NOT NULL,
    kisi_id INTEGER REFERENCES kisi(id),
    firma_id INTEGER REFERENCES cari_firma(id),
    tutar_kurus INTEGER NOT NULL CHECK (tutar_kurus > 0),
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kur_tarihi TEXT NOT NULL,
    tarih TEXT NOT NULL,
    yontem TEXT, -- 'havale','eft','nakit','cek','senet','kredi','takas'
    referans_no TEXT,
    iptal INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tahsilat_kaynak ON tahsilat (kaynak_modul, kaynak_id);

  -- ========== AUDIT LOG ==========
  -- CAKISMA_HARITASI.md'de eksik olarak işaretlenen gerçek denetim izi.
  -- Her çekirdek servis create/update/iptal işleminde audit.js#kaydet()
  -- çağırır; bu tablo asla update/delete EDİLMEZ, yalnızca INSERT alır.
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    varlik TEXT NOT NULL, -- ör. 'cari_firma', 'maliyet_hareketi'
    varlik_id TEXT NOT NULL,
    eylem TEXT NOT NULL CHECK (eylem IN ('OLUSTUR','GUNCELLE','IPTAL')),
    aktor INTEGER,
    degisiklik TEXT, -- JSON: {alan: [eski, yeni]}
    zaman TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_audit_varlik ON audit_log (varlik, varlik_id);
`);

// P1'de oluşturulmuş, eski-şema bir puantaj_kaydi zaten varsa (gun_tipi/
// bayram_pazar_mi/maliyet_kodu_id sütunları yok) — P6 (Taşeron) için
// SONRADAN eklemek üzere savunmacı ALTER TABLE'lar (bkz. depo/db.js'teki
// AYNI idiom). Sütun zaten varsa fırlayan hata YOK SAYILIR.
for (const alter of [
  "ALTER TABLE puantaj_kaydi ADD COLUMN gun_tipi TEXT DEFAULT 'tam'",
  'ALTER TABLE puantaj_kaydi ADD COLUMN bayram_pazar_mi INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE puantaj_kaydi ADD COLUMN maliyet_kodu_id INTEGER REFERENCES maliyet_kodu(id)',
]) {
  try { db.exec(alter); } catch { /* sütun zaten var — sorun değil */ }
}
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_puantaj_kisi_tarih_tekil ON puantaj_kaydi (kisi_id, tarih) WHERE row_status = 1');
} catch { /* eski veride mükerrer (kisi_id,tarih) satırı varsa index oluşmaz — geliştirme ortamında veri yok, göz ardı edilir */ }

export { db };
