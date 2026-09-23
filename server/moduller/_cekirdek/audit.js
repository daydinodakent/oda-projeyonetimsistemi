// Denetim izi (audit log) — tüm çekirdek servisler create/update/iptal
// işlemlerinde bunu çağırır. Bu modülün DIŞINDA audit_log'a asla doğrudan
// yazılmaz (tek giriş noktası).
import { db } from './db.js';

const stmtInsert = db.prepare(
  'INSERT INTO audit_log (varlik, varlik_id, eylem, aktor, degisiklik) VALUES (?, ?, ?, ?, ?)'
);
const stmtList = db.prepare(
  'SELECT * FROM audit_log WHERE varlik = ? AND varlik_id = ? ORDER BY id DESC'
);

/**
 * @param {string} varlik ör. 'cari_firma'
 * @param {string|number} varlikId
 * @param {'OLUSTUR'|'GUNCELLE'|'IPTAL'} eylem
 * @param {number|null} aktor kullanıcı id'si (bilinmiyorsa null)
 * @param {object|null} degisiklik {alan: [eski, yeni]} şeklinde bir fark nesnesi
 */
export function kaydet(varlik, varlikId, eylem, aktor, degisiklik) {
  stmtInsert.run(varlik, String(varlikId), eylem, aktor ?? null, degisiklik ? JSON.stringify(degisiklik) : null);
}

export function listele(varlik, varlikId) {
  return stmtList.all(varlik, String(varlikId)).map((r) => ({ ...r, degisiklik: r.degisiklik ? JSON.parse(r.degisiklik) : null }));
}
