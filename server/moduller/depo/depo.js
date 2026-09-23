// Depo (fiziksel konum) — merkez/şantiye/açık saha/konteyner.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';

const TURLER = ['merkez', 'santiye', 'acik_saha', 'konteyner'];

const stmtInsert = db.prepare('INSERT INTO depo (proje_id, ad, tur, notes, olusturan) VALUES (?, ?, ?, ?, ?)');
const stmtGet = db.prepare('SELECT * FROM depo WHERE id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM depo WHERE row_status = 1 AND (proje_id = ? OR proje_id IS NULL) ORDER BY tur, ad');
const stmtPasifEt = db.prepare('UPDATE depo SET row_status = 0 WHERE id = ?');

/** @param {{proje_id?, ad, tur?}} item proje_id verilmezse MERKEZ depo (projeden bağımsız) kabul edilir. */
export function olustur(item, aktor) {
  if (item.tur && !TURLER.includes(item.tur)) throw new Error(`Geçersiz depo türü: ${item.tur}`);
  const info = stmtInsert.run(item.proje_id ?? null, item.ad, item.tur || 'santiye', item.notes ?? null, aktor ?? null);
  const id = info.lastInsertRowid;
  audit.kaydet('depo', id, 'OLUSTUR', aktor, { yeni: item });
  return stmtGet.get(id);
}

export function getir(id) {
  return stmtGet.get(id);
}

/** Bir projenin görebileceği depolar: kendi şantiye depoları + TÜM merkez depolar (proje_id NULL). */
export function listele(projeId) {
  return stmtList.all(projeId ?? null);
}

export function pasifEt(id, aktor) {
  stmtPasifEt.run(id);
  audit.kaydet('depo', id, 'IPTAL', aktor, null);
}
