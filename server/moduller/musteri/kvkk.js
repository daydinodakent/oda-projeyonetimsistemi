// KVKK — aydınlatma metni kaydı ve pazarlama için AYRI açık rıza. Kayıtlar
// silinmez: rıza verilince satır eklenir, geri çekilince o satıra
// geri_cekildi_tarihi yazılır (tarihçe korunur). Pazarlama izni yalnızca
// geri çekilmemiş rıza satırı varsa vardır.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';

const stmtInsert = db.prepare('INSERT INTO kvkk_riza (ilgili_tip, ilgili_id, tur, metin_versiyon, verildi_tarihi, kanal, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?)');
const stmtGet = db.prepare('SELECT * FROM kvkk_riza WHERE id = ?');
const stmtListe = db.prepare('SELECT * FROM kvkk_riza WHERE ilgili_tip = ? AND ilgili_id = ? ORDER BY id DESC');
const stmtGeriCek = db.prepare('UPDATE kvkk_riza SET geri_cekildi_tarihi = ? WHERE id = ?');

/** @param {{ilgili_tip:'kisi'|'aday', ilgili_id, tur:'aydinlatma'|'pazarlama', metin_versiyon, verildi_tarihi, kanal?}} item */
export function rizaKaydet(item, aktor) {
  if (!['kisi', 'aday'].includes(item.ilgili_tip)) throw new Error('ilgili_tip "kisi" veya "aday" olmalıdır.');
  if (!['aydinlatma', 'pazarlama'].includes(item.tur)) throw new Error('tur "aydinlatma" veya "pazarlama" olmalıdır.');
  if (!item.metin_versiyon) throw new Error('Hangi metin versiyonuna rıza verildiği (metin_versiyon) zorunludur.');
  const info = stmtInsert.run(item.ilgili_tip, item.ilgili_id, item.tur, item.metin_versiyon, item.verildi_tarihi, item.kanal ?? null, aktor ?? null);
  audit.kaydet('kvkk_riza', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  return stmtGet.get(info.lastInsertRowid);
}
export function geriCek(id, tarih, aktor) {
  const r = stmtGet.get(id);
  if (!r) throw new Error('Rıza kaydı bulunamadı');
  if (r.geri_cekildi_tarihi) throw new Error('Bu rıza zaten geri çekilmiş.');
  stmtGeriCek.run(tarih, id);
  audit.kaydet('kvkk_riza', id, 'GUNCELLE', aktor, { geri_cekildi_tarihi: tarih });
  return stmtGet.get(id);
}
export function listele(ilgiliTip, ilgiliId) { return stmtListe.all(ilgiliTip, ilgiliId); }
export function durum(ilgiliTip, ilgiliId) {
  const l = stmtListe.all(ilgiliTip, ilgiliId);
  const aktif = (tur) => l.some((r) => r.tur === tur && !r.geri_cekildi_tarihi);
  return { aydinlatma: aktif('aydinlatma'), pazarlama: aktif('pazarlama') };
}
/** Pazarlama iletişimi (kampanya SMS/e-posta) göndermeden ÖNCE çağrılmalı. İşlemsel hatırlatmalar (vade) bu izni gerektirmez. */
export function pazarlamaIzniVarMi(ilgiliTip, ilgiliId) { return durum(ilgiliTip, ilgiliId).pazarlama; }
