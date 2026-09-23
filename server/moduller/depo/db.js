// Depo — MİNİMAL, GEÇİCİ malzeme kartı şeması.
//
// SAHİPLİK NOTU (P3 görev metninden): "Malzeme kartını Depo sahiplenir (P4);
// bu modül henüz yoksa Depo'nun malzeme kartı arayüzünü minimal şekilde
// çekirdek-bağımsız kur ve P4'te Depo'ya devret." Depo modülü henüz
// kurulmadığından, bu dosya P4'e kadar malzeme kartının TEK ve GEÇİCİ
// sahibidir. P4'te Depo modülü kurulduğunda bu tablo (stok hareketi,
// lokasyon, zimmet vb. ile) GENİŞLETİLECEK — YENİ bir malzeme tablosu
// AÇILMAYACAK (aksi hâlde iki ayrı malzeme tablosu oluşur, bkz. görev
// metnindeki açık uyarı).
//
// Satın Alma modülü (server/moduller/satinalma/) bu tabloya yalnızca ID ile
// REFERANS verir, satırı KOPYALAMAZ.
import { rawDb } from '../../db.js';

const db = rawDb();

db.exec(`
  -- ========== MALZEME KARTI (geçici/minimal — P4'te Depo'ya devredilecek) ==========
  -- stoklu_mu: MALİYET KURALI'nın kalbi (bkz. CAKISMA_HARITASI.md P3 notu).
  -- 1 (stoklu): malzeme depoya girer, GERÇEKLEŞEN maliyet depo ÇIKIŞINDA
  --   (tüketimde) yazılır — bu, P4 Depo modülünün işidir, P3 faturada YAZMAZ.
  -- 0 (stoklu değil / doğrudan sarf, hizmet, nakliye): depoya hiç girmez,
  --   GERÇEKLEŞEN maliyet FATURADA yazılır (bkz. satinalma/fatura.js).
  CREATE TABLE IF NOT EXISTS malzeme_karti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kod TEXT NOT NULL UNIQUE,
    ad TEXT NOT NULL,
    birim TEXT NOT NULL,
    kategori TEXT,
    stoklu_mu INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    row_status INTEGER NOT NULL DEFAULT 1,
    create_uid INTEGER, create_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    write_uid INTEGER, write_date TEXT
  );
`);

export { db };
