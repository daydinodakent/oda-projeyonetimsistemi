// Parametrik oranlar/limitler (KDV, tevkifat, stopaj, SGK, damga vergisi,
// izin günleri vb.) — yürürlük tarihli. Hiçbir oran koda GÖMÜLMEZ; ihtiyaç
// duyan her servis degerAl(kod, tarih) çağırır.
import { db } from './db.js';
import * as audit from './audit.js';

const stmtInsert = db.prepare(
  `INSERT INTO parametre (kod, ad, deger, birim, gecerli_baslangic, gecerli_bitis, notes, create_uid)
   VALUES (@kod, @ad, @deger, @birim, @gecerli_baslangic, @gecerli_bitis, @notes, @create_uid)`
);
const stmtDegerAl = db.prepare(
  `SELECT * FROM parametre WHERE kod = ? AND row_status = 1 AND gecerli_baslangic <= ?
     AND (gecerli_bitis IS NULL OR gecerli_bitis >= ?)
   ORDER BY gecerli_baslangic DESC LIMIT 1`
);
const stmtListeleKod = db.prepare('SELECT * FROM parametre WHERE kod = ? AND row_status = 1 ORDER BY gecerli_baslangic DESC');
const stmtListeleTum = db.prepare('SELECT * FROM parametre WHERE row_status = 1 ORDER BY kod, gecerli_baslangic DESC');
const stmtPasifEt = db.prepare("UPDATE parametre SET row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/** Bir kodun belirli bir tarihte GEÇERLİ olan tek satırını döner (yoksa null). tarih verilmezse bugün kullanılır. */
export function degerAl(kod, tarih) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  return stmtDegerAl.get(kod, t, t) || null;
}

export function listele(kod) {
  return kod ? stmtListeleKod.all(kod) : stmtListeleTum.all();
}

/** Yeni bir yürürlük dönemi ekler — MEVCUT satırlar değiştirilmez (tarihli geçmiş korunur). */
export function olustur(item, aktor) {
  const row = {
    kod: item.kod, ad: item.ad, deger: item.deger, birim: item.birim || 'yuzde',
    gecerli_baslangic: item.gecerli_baslangic, gecerli_bitis: item.gecerli_bitis ?? null,
    notes: item.notes ?? null, create_uid: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('parametre', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, ...row, row_status: 1 };
}

/** Bir yürürlük dönemini soft-delete eder (pasife alır) — silme yok. */
export function pasifEt(id, aktor) {
  stmtPasifEt.run(aktor ?? null, id);
  audit.kaydet('parametre', id, 'IPTAL', aktor, null);
}
