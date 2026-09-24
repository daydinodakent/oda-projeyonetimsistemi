// Maliyet Yönetimi (P10) — bütçe, izleme ve analiz katmanı. KAYNAK VERİ
// ÜRETMEZ (bütçe hariç): gerçekleşen ve taahhüt SADECE Maliyet Defteri'nden
// (Çekirdek maliyetDefteri servisi) okunur. Buradaki tablolar yalnızca
// BÜTÇE (versiyonlu) ve GENEL GİDER DAĞITIM sonuçlarını tutar.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== BÜTÇE VERSİYONU (ilk bütçe, revize-1, ...) ==========
  CREATE TABLE IF NOT EXISTS butce_versiyon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id TEXT NOT NULL,
    versiyon_no INTEGER NOT NULL,
    ad TEXT NOT NULL, -- 'İlk Bütçe', 'Revize-1'
    durum TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak','onayli','arsivlendi')),
    onaylayan TEXT, onay_tarihi TEXT,
    notes TEXT,
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(proje_id, versiyon_no)
  );
  -- Bir bütçe satırı = bir maliyet kodu (WBS × kaynak tipi). tutar bütçenin
  -- kendi para biriminde (kuruş); kur = BÜTÇE KURU (TRY/birim) — "sabit kur" görünümü bunu kullanır.
  CREATE TABLE IF NOT EXISTS butce_satir (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    versiyon_id INTEGER NOT NULL REFERENCES butce_versiyon(id),
    maliyet_kodu_id INTEGER NOT NULL,
    tutar_kurus INTEGER NOT NULL,
    para_birimi TEXT NOT NULL DEFAULT 'TRY',
    kur REAL NOT NULL DEFAULT 1,
    kalan_tahmin_kurus INTEGER, -- opsiyonel elle "taahhüt edilmemiş kalan" tahmini (yoksa bütçeden türetilir); TRY
    notes TEXT,
    UNIQUE(versiyon_id, maliyet_kodu_id)
  );

  -- ========== GENEL GİDER DAĞITIMI ==========
  CREATE TABLE IF NOT EXISTS genel_gider_dagitim (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    havuz_proje_id TEXT NOT NULL,
    donem_baslangic TEXT NOT NULL, donem_bitis TEXT NOT NULL,
    anahtar TEXT NOT NULL CHECK (anahtar IN ('ciro','maliyet','sure')),
    toplam_kurus INTEGER NOT NULL, -- havuzun dönemdeki nominal TL gerçekleşeni
    olusturan INTEGER, olusturma_zamani TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(havuz_proje_id, donem_baslangic, donem_bitis)
  );
  CREATE TABLE IF NOT EXISTS genel_gider_pay (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dagitim_id INTEGER NOT NULL REFERENCES genel_gider_dagitim(id),
    proje_id TEXT NOT NULL,
    oran REAL NOT NULL,
    tutar_kurus INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_gg_pay_proje ON genel_gider_pay (proje_id);
`);

export { db };
