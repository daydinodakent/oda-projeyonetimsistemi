// Metraj Kaydı — metraj/götürü ödeme tipli ekipler için. "Metraj bazlı
// ödemede puantaj yine tutulur (verimlilik) ama ödeme hesabına GİRMEZ" —
// bu tablo yalnızca HAKEDİŞ miktarını taşır.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as ekip from './ekip.js';
import * as sozlesme from '../sozlesme/sozlesme.js';

const stmtInsert = db.prepare(
  `INSERT INTO taseron_metraj (ekip_id, sozlesme_kalem_id, proje_id, tarih, miktar, notes, olusturan)
   VALUES (@ekip_id, @sozlesme_kalem_id, @proje_id, @tarih, @miktar, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM taseron_metraj WHERE id = ? AND row_status = 1');
const stmtListele = db.prepare('SELECT * FROM taseron_metraj WHERE ekip_id = ? AND row_status = 1 ORDER BY tarih DESC');
const stmtOnayla = db.prepare("UPDATE taseron_metraj SET sef_onay_miktar = ?, sef_onayli_mi = 1 WHERE id = ?");

/** @param {{sozlesme_kalem_id, tarih, miktar, notes?}} item */
export function kaydet(ekipId, item, aktor) {
  const ekipKaydi = ekip.getir(ekipId);
  if (!ekipKaydi) throw new Error('Ekip bulunamadı');
  if (!sozlesme.kalemGetir(item.sozlesme_kalem_id)) throw new Error('Sözleşme kalemi bulunamadı');
  const row = {
    ekip_id: ekipId, sozlesme_kalem_id: item.sozlesme_kalem_id, proje_id: ekipKaydi.proje_id,
    tarih: item.tarih, miktar: item.miktar, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('taseron_metraj', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function ekipIcinListele(ekipId) {
  return stmtListele.all(ekipId);
}

/** Şef onayı — beyan edilen miktardan FARKLI olabilir (Alt Yüklenici/P5'teki beyan/onay ayrımıyla AYNI mantık). */
export function sefOnayiVer(id, onayMiktari, aktor) {
  const kayit = stmtGet.get(id);
  if (!kayit) throw new Error('Metraj kaydı bulunamadı');
  stmtOnayla.run(onayMiktari, id);
  audit.kaydet('taseron_metraj', id, 'GUNCELLE', aktor, { sef_onay_miktar: onayMiktari });
  return stmtGet.get(id);
}
