// Depo — P4: Malzeme Kartı, Stok, Mal Kabul ve Zimmet'in TEK sahibi.
//
// SAHİPLİK GEÇMİŞİ: malzeme_karti P3'te GEÇİCİ/minimal olarak burada
// (server/moduller/depo/) açılmıştı (görev metni: "Depo'nun malzeme kartı
// arayüzünü minimal şekilde... kur ve P4'te Depo'ya devret"). Tablo zaten
// doğru dosyada olduğundan bir "taşıma" gerekmedi — burada GENİŞLETİLDİ
// (yeni sütunlar + birim dönüşüm tablosu). Mal Kabul de aynı şekilde: P3'te
// server/moduller/satinalma/malKabul.js'te GEÇİCİ/minimal duruyordu; o dosya
// ve `satinalma_mal_kabul` tablosu KALDIRILDI, gerçek (zengin) Mal Kabul
// burada kuruldu (bkz. malKabul.js). Satın Alma artık yalnızca
// satinalma.siparis.teslimIlerlemesiGuncelle() üzerinden BİLGİLENDİRİLİR —
// kendi tablosuna Depo'dan DOĞRUDAN yazılmaz (sahiplik kuralı).
//
// Firma/Kişi/Maliyet Kodu'na yalnızca ID ile REFERANS verilir — KOPYALANMAZ.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== MALZEME KARTI ==========
  -- stoklu_mu: MALİYET KURALI'nın kalbi (bkz. server/moduller/satinalma/db.js
  -- başı VE aşağıdaki stok_hareketi notu). "birim" sütunu = ANA BİRİM (ör.
  -- 'ton'); farklı birimlerle giriş/çıkış yapılabilmesi için
  -- malzeme_birim_donusum tablosundaki katsayılarla buna çevrilir.
  CREATE TABLE IF NOT EXISTS malzeme_karti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod TEXT NOT NULL UNIQUE,
    ad TEXT NOT NULL,
    birim TEXT NOT NULL,
    kategori TEXT,
    stoklu_mu INTEGER NOT NULL DEFAULT 1,
    grup TEXT,
    demirbas_mi INTEGER NOT NULL DEFAULT 0,
    min_stok REAL,
    max_stok REAL,
    fire_toleransi_yuzde REAL NOT NULL DEFAULT 0,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    create_uid INTEGER, create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
`);

// P3'te oluşturulmuş, eski-şema bir malzeme_karti zaten varsa (grup/
// demirbas_mi/min_stok/max_stok/fire_toleransi_yuzde sütunları yok) — bu
// sütunları SONRADAN eklemek için savunmacı ALTER TABLE'lar. SQLite "ADD
// COLUMN IF NOT EXISTS" desteklemediğinden, sütun zaten varsa fırlayan
// hatayı YOK SAYIYORUZ (standart SQLite idiomu).
for (const alter of [
  'ALTER TABLE malzeme_karti ADD COLUMN grup TEXT',
  'ALTER TABLE malzeme_karti ADD COLUMN demirbas_mi INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE malzeme_karti ADD COLUMN min_stok REAL',
  'ALTER TABLE malzeme_karti ADD COLUMN max_stok REAL',
  "ALTER TABLE malzeme_karti ADD COLUMN fire_toleransi_yuzde REAL NOT NULL DEFAULT 0",
]) {
  try { db.exec(alter); } catch { /* sütun zaten var — sorun değil */ }
}

db.exec(`
  -- ========== BİRİM DÖNÜŞÜM ==========
  -- "Demir ton alınır kg çıkılır, seramik m² alınır kutu çıkılır" — her
  -- malzeme, ana biriminden farklı birimlerle de hareket görebilir. katsayi:
  -- 1 [birim] = katsayi × [ana birim]. Ana birimin kendisi için satır GEREKMEZ
  -- (katsayi=1 varsayılır, bkz. malzeme.js#birimeCevir).
  CREATE TABLE IF NOT EXISTS malzeme_birim_donusum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    malzeme_id INTEGER NOT NULL REFERENCES malzeme_karti(id),
    birim TEXT NOT NULL,
    katsayi REAL NOT NULL,
    UNIQUE(malzeme_id, birim)
  );

  -- ========== DEPO (merkez/şantiye/açık saha/konteyner) ==========
  CREATE TABLE IF NOT EXISTS depo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT, -- NULL = merkez depo (projeden bağımsız)
    ad TEXT NOT NULL,
    tur TEXT NOT NULL DEFAULT 'santiye' CHECK (tur IN ('merkez','santiye','acik_saha','konteyner')),
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- ========== STOK BAKİYE (depo × malzeme, ANLIK) ==========
  -- Her giriş/çıkışta stok.js tarafından güncellenir. agirlikli_ortalama_
  -- maliyet_kurus, maliyetlendirme yöntemidir (PARAMETRİK — görev metni:
  -- "ağırlıklı ortalama; FIFO'ya geçilebilir olsun" — bkz. stok.js başı).
  CREATE TABLE IF NOT EXISTS stok_bakiye (
    depo_id INTEGER NOT NULL REFERENCES depo(id),
    malzeme_id INTEGER NOT NULL REFERENCES malzeme_karti(id),
    mevcut_miktar REAL NOT NULL DEFAULT 0, -- ANA BİRİMDE
    agirlikli_ortalama_maliyet_kurus REAL NOT NULL DEFAULT 0,
    guncelleme_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY (depo_id, malzeme_id)
  );

  -- ========== STOK HAREKETİ (append-only) ==========
  -- MALİYET KURALI: yalnızca ÇIKIŞ (cikis) hareketleri, emanet_mi=0 ise
  -- Maliyet Defteri'ne GERÇEKLEŞEN yazar (bkz. stok.js#cikis). Giriş
  -- yalnızca stok_bakiye'yi (miktar + ağırlıklı ortalama) günceller — henüz
  -- tüketilmediği için maliyetlendirilmez.
  -- istemci_kayit_id: çevrimdışı kuyruktan (mobil hızlı çıkış/giriş) senkron
  -- edilirken idempotency anahtarı — AYNI kayıt İKİNCİ kez gönderilirse
  -- mükerrer hareket OLUŞMAZ (bkz. stok.js#cikis / #giris).
  CREATE TABLE IF NOT EXISTS stok_hareketi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    depo_id INTEGER NOT NULL REFERENCES depo(id),
    malzeme_id INTEGER NOT NULL REFERENCES malzeme_karti(id),
    tur TEXT NOT NULL CHECK (tur IN ('giris','cikis','transfer_cikis','transfer_giris','iade','sayim_farki','fire')),
    miktar REAL NOT NULL, -- ANA BİRİMDE, her zaman pozitif (yön 'tur' ile belirlenir)
    girilen_birim TEXT NOT NULL, -- kullanıcının GİRDİĞİ birim (gösterim/iz için — miktar zaten ana birime çevrilmiş hâldedir)
    girilen_miktar REAL NOT NULL,
    birim_maliyet_kurus REAL NOT NULL DEFAULT 0, -- çıkışta: hareket anındaki ağırlıklı ortalama; girişte: girişin kendi birim maliyeti
    toplam_maliyet_kurus INTEGER NOT NULL DEFAULT 0,
    proje_id TEXT, -- merkez depo hareketlerinde (proje bağımsız) NULL olabilir; sayim_farki depo.proje_id'yi devralır
    maliyet_kodu_id INTEGER REFERENCES maliyet_kodu(id), -- ÇIKIŞTA ZORUNLU (servis katmanında doğrulanır)
    teslim_alan_tipi TEXT CHECK (teslim_alan_tipi IN ('personel','taseron_ekibi','alt_yuklenici','sarf')),
    teslim_alan_aciklama TEXT, -- serbest metin (ekip adı) veya Çekirdek kisi/firma id'sinin insan-okunur karşılığı
    teslim_alan_kisi_id INTEGER REFERENCES kisi(id),
    teslim_alan_firma_id INTEGER REFERENCES cari_firma(id), -- taşeron/alt yüklenici EKİBİ değil, sözleşmeli FİRMA ise
    emanet_mi INTEGER NOT NULL DEFAULT 0, -- 1 ise: stokta görünür ama maliyete GİRMEZ (müşteri/alt yüklenici malı)
    kesinti_adayi_mi INTEGER NOT NULL DEFAULT 0, -- taşeron/alt yükleniciye MALİYETİMİZ DIŞI (hakedişten kesilecek) çıkışta 1
    sozlesme_id INTEGER, -- Sözleşme modülüne REFERANS (kesinti hangi sözleşmeden düşülecek)
    kaynak_belge_modul TEXT, -- ör. 'depo_mal_kabul', 'depo_transfer', 'depo_sayim'
    kaynak_belge_id TEXT,
    istemci_kayit_id TEXT UNIQUE,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_stok_hareketi_depo_malzeme ON stok_hareketi (depo_id, malzeme_id, olusturma_zamani);
  CREATE INDEX IF NOT EXISTS idx_stok_hareketi_kesinti ON stok_hareketi (kesinti_adayi_mi);

  -- ========== MAL KABUL ==========
  -- Sipariş kalemine REFERANS verir (Satın Alma'nın tablosu) — kopyalamaz.
  -- gelen/kabul/red miktarları AYRI tutulur (görev metni). fotograf_url
  -- gerçek bir dosya yükleme sistemi olmadığından yalnızca bir URL/yol
  -- alanıdır (kapsam dışı: dosya depolama altyapısı).
  CREATE TABLE IF NOT EXISTS mal_kabul (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    siparis_kalem_id INTEGER NOT NULL, -- satinalma_siparis_kalem.id'ye REFERANS
    depo_id INTEGER REFERENCES depo(id), -- stoklu malzemede ZORUNLU (hangi depoya girdiği)
    gelen_miktar REAL NOT NULL,
    kabul_miktar REAL NOT NULL,
    red_miktar REAL NOT NULL DEFAULT 0,
    red_nedeni TEXT,
    fotograf_url TEXT,
    irsaliye_no TEXT,
    tarih TEXT NOT NULL,
    stok_hareketi_id INTEGER REFERENCES stok_hareketi(id), -- kabul_miktar > 0 VE malzeme stoklu ise oluşturulan GİRİŞ hareketi
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_mal_kabul_siparis_kalem ON mal_kabul (siparis_kalem_id);

  -- ========== ZİMMET (demirbaş/KKD — tüketilmez, geri döner) ==========
  -- Stok hareketleriyle İZLENMEZ (ağırlıklı ortalama maliyetlendirme
  -- tüketilen malzemeler içindir) — kendi başına bir zimmet/iade akışıdır.
  -- kkd_mi: P8 (Şantiye/İSG) modülünün okuyabileceği işaret (görev metni) —
  -- P8 henüz kurulmadı, bu yüzden burada yalnızca ALAN olarak hazır.
  CREATE TABLE IF NOT EXISTS zimmet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    malzeme_id INTEGER NOT NULL REFERENCES malzeme_karti(id),
    depo_id INTEGER REFERENCES depo(id),
    miktar REAL NOT NULL DEFAULT 1,
    zimmet_alan_tipi TEXT NOT NULL CHECK (zimmet_alan_tipi IN ('personel','taseron_ekibi','alt_yuklenici_ekibi')),
    zimmet_alan_kisi_id INTEGER REFERENCES kisi(id),
    zimmet_alan_aciklama TEXT,
    kkd_mi INTEGER NOT NULL DEFAULT 0,
    zimmet_tarihi TEXT NOT NULL,
    beklenen_iade_tarihi TEXT,
    iade_tarihi TEXT,
    durum TEXT NOT NULL DEFAULT 'zimmette' CHECK (durum IN ('zimmette','iade_edildi','kayip')),
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_zimmet_durum ON zimmet (durum, beklenen_iade_tarihi);

  -- ========== SAYIM ==========
  CREATE TABLE IF NOT EXISTS sayim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    depo_id INTEGER NOT NULL REFERENCES depo(id),
    tarih TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'acik' CHECK (durum IN ('acik','tamamlandi')),
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS sayim_kalem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sayim_id INTEGER NOT NULL REFERENCES sayim(id),
    malzeme_id INTEGER NOT NULL REFERENCES malzeme_karti(id),
    sistem_miktar REAL NOT NULL, -- sayım BAŞLARKEN stok_bakiye'den okunan anlık değer
    sayilan_miktar REAL,
    UNIQUE(sayim_id, malzeme_id)
  );

  -- ========== TRANSFER (depolar arası — "yoldaki stok" ayrıca izlenir) ==========
  CREATE TABLE IF NOT EXISTS transfer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kaynak_depo_id INTEGER NOT NULL REFERENCES depo(id),
    hedef_depo_id INTEGER NOT NULL REFERENCES depo(id),
    malzeme_id INTEGER NOT NULL REFERENCES malzeme_karti(id),
    miktar REAL NOT NULL, -- ANA BİRİMDE
    birim_maliyet_kurus REAL NOT NULL,
    durum TEXT NOT NULL DEFAULT 'yolda' CHECK (durum IN ('yolda','tamamlandi','iptal')),
    kaynak_hareket_id INTEGER REFERENCES stok_hareketi(id),
    hedef_hareket_id INTEGER REFERENCES stok_hareketi(id),
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    teslim_alma_zamani TEXT
  );
`);

export { db };
