// Numara serileri (ör. "SAT-2026-0001"). Tek writer'lı (Node tek-thread,
// senkron node:sqlite çağrısı) bir süreçte SELECT+UPDATE arası bir başka
// isteğin araya girmesi mümkün değildir — bu yüzden ayrı bir transaction/
// kilit mekanizmasına gerek yoktur (server/db.js'in geri kalanı da aynı
// varsayımla senkron çalışır).
import { db } from './db.js';

const stmtGet = db.prepare('SELECT son_no FROM numara_serisi WHERE seri_kodu = ? AND yil = ?');
const stmtInsert = db.prepare('INSERT INTO numara_serisi (seri_kodu, yil, son_no) VALUES (?, ?, 1)');
const stmtUpdate = db.prepare('UPDATE numara_serisi SET son_no = ? WHERE seri_kodu = ? AND yil = ?');

/**
 * Bir seri için sıradaki numarayı üretir ve kalıcı olarak ilerletir.
 * @param {string} seriKodu ör. 'SAT', 'ODM'
 * @param {number} [yil] verilmezse içinde bulunulan yıl
 * @returns {string} ör. 'SAT-2026-0001'
 */
export function sonraki(seriKodu, yil) {
  const y = yil || new Date().getFullYear();
  const mevcut = stmtGet.get(seriKodu, y);
  const sonNo = mevcut ? mevcut.son_no + 1 : 1;
  if (mevcut) stmtUpdate.run(sonNo, seriKodu, y);
  else stmtInsert.run(seriKodu, y);
  return `${seriKodu}-${y}-${String(sonNo).padStart(4, '0')}`;
}
