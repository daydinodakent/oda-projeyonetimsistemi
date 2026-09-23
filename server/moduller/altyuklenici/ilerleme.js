// İlerleme Kaydı — WBS bazlı planlanan vs gerçekleşen %.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { getRecord } from '../../db.js';

const stmtInsert = db.prepare(
  `INSERT INTO ilerleme_kaydi (sozlesme_id, wbs_gorev_id, tarih, planlanan_yuzde, gerceklesen_yuzde, notes, olusturan)
   VALUES (@sozlesme_id, @wbs_gorev_id, @tarih, @planlanan_yuzde, @gerceklesen_yuzde, @notes, @olusturan)`
);
const stmtListele = db.prepare('SELECT * FROM ilerleme_kaydi WHERE sozlesme_id = ? ORDER BY tarih DESC');

/** @param {{wbs_gorev_id, tarih, planlanan_yuzde, gerceklesen_yuzde, notes?}} item */
export function kaydet(sozlesmeId, item, aktor) {
  if (!getRecord('tb_wbs_gorevler', item.wbs_gorev_id)) throw new Error(`WBS görevi bulunamadı: ${item.wbs_gorev_id}`);
  const row = {
    sozlesme_id: sozlesmeId, wbs_gorev_id: String(item.wbs_gorev_id), tarih: item.tarih,
    planlanan_yuzde: item.planlanan_yuzde, gerceklesen_yuzde: item.gerceklesen_yuzde, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('ilerleme_kaydi', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, ...row };
}

export function listele(sozlesmeId) {
  return stmtListele.all(sozlesmeId);
}

/** Gecikme = planlanan - gerçekleşen (pozitifse GERİDE). */
export function gecikmeOzeti(sozlesmeId) {
  const kayitlar = stmtListele.all(sozlesmeId);
  const sonKayitlar = new Map();
  for (const k of kayitlar) if (!sonKayitlar.has(k.wbs_gorev_id)) sonKayitlar.set(k.wbs_gorev_id, k); // ilk görülen = en yeni (DESC sıralı)
  return [...sonKayitlar.values()].map((k) => ({ ...k, gecikmeYuzde: Number((k.planlanan_yuzde - k.gerceklesen_yuzde).toFixed(1)) }));
}
