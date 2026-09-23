// Malzeme Kartı — GEÇİCİ/MİNİMAL sahiplik (bkz. db.js başındaki not). P4'te
// Depo modülü kurulunca bu servis genişletilecek (stok hareketi, lokasyon,
// zimmet), TAŞINMAYACAK/yeniden yazılmayacak — dosya yolu ve tablo aynı kalır.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';

const stmtInsert = db.prepare(
  `INSERT INTO malzeme_karti (kod, ad, birim, kategori, stoklu_mu, notes, create_uid)
   VALUES (@kod, @ad, @birim, @kategori, @stoklu_mu, @notes, @create_uid)`
);
const stmtGet = db.prepare('SELECT * FROM malzeme_karti WHERE id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM malzeme_karti WHERE row_status = 1 ORDER BY ad');
const stmtPasifEt = db.prepare("UPDATE malzeme_karti SET row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

export function listele() {
  return stmtList.all();
}

export function getir(id) {
  return stmtGet.get(id);
}

/** @param {{kod, ad, birim, kategori?, stoklu_mu?}} item */
export function olustur(item, aktor) {
  const row = {
    kod: item.kod, ad: item.ad, birim: item.birim, kategori: item.kategori ?? null,
    stoklu_mu: item.stoklu_mu === false || item.stoklu_mu === 0 ? 0 : 1, notes: item.notes ?? null, create_uid: aktor ?? null,
  };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error(`Bu malzeme kodu (${item.kod}) zaten kayıtlı.`);
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('malzeme_karti', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function pasifEt(id, aktor) {
  stmtPasifEt.run(aktor ?? null, id);
  audit.kaydet('malzeme_karti', id, 'IPTAL', aktor, null);
}
