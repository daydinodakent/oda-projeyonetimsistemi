// Mal Kabul — GEÇİCİ/minimal (bkz. db.js başındaki AYNI not). Gerçek mal
// kabul (kalite kontrolü, depo lokasyonu, stok girişi) P4 Depo modülünün
// işidir; bu servis yalnızca "sipariş kalemi için X miktar teslim alındı"
// OLAYINI kaydeder — 3'lü eşleştirmenin girdisidir, GERÇEKLEŞEN maliyet
// YAZMAZ, stok hareketi YARATMAZ.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as siparis from './siparis.js';

const stmtInsert = db.prepare(
  `INSERT INTO satinalma_mal_kabul (siparis_kalem_id, miktar, tarih, irsaliye_no, notes, olusturan)
   VALUES (@siparis_kalem_id, @miktar, @tarih, @irsaliye_no, @notes, @olusturan)`
);
const stmtKalemTeslimGuncelle = db.prepare("UPDATE satinalma_siparis_kalem SET teslim_edilen_miktar = teslim_edilen_miktar + ? WHERE id = ?");
const stmtListByKalem = db.prepare('SELECT * FROM satinalma_mal_kabul WHERE siparis_kalem_id = ? ORDER BY tarih');
const stmtSiparisKalemleri = db.prepare('SELECT * FROM satinalma_siparis_kalem WHERE siparis_id = ? AND row_status = 1');

/** @param {{siparis_kalem_id, miktar, tarih, irsaliye_no?}} item */
export function kaydet(item, aktor) {
  const kalem = siparis.kalemGetir(item.siparis_kalem_id);
  if (!kalem) throw new Error('Sipariş kalemi bulunamadı');
  if (item.miktar <= 0) throw new Error('Teslim miktarı sıfırdan büyük olmalıdır.');
  const row = { siparis_kalem_id: item.siparis_kalem_id, miktar: item.miktar, tarih: item.tarih, irsaliye_no: item.irsaliye_no ?? null, notes: item.notes ?? null, olusturan: aktor ?? null };
  const info = stmtInsert.run(row);
  stmtKalemTeslimGuncelle.run(item.miktar, item.siparis_kalem_id);
  audit.kaydet('satinalma_mal_kabul', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });

  // Siparişin genel durumunu, tüm kalemlerin teslimat oranına göre güncelle.
  const guncelKalem = siparis.kalemGetir(item.siparis_kalem_id);
  const tumKalemler = stmtSiparisKalemleri.all(guncelKalem.siparis_id);
  const tamamiTeslimEdildi = tumKalemler.every((k) => k.teslim_edilen_miktar >= k.miktar);
  const kismenTeslimEdildi = tumKalemler.some((k) => k.teslim_edilen_miktar > 0);
  const siparisKaydi = siparis.getir(guncelKalem.siparis_id);
  if (siparisKaydi && siparisKaydi.durum !== 'tamamlandi') {
    if (tamamiTeslimEdildi && siparisKaydi.durum !== 'tamamlandi') siparis.durumDegistir(guncelKalem.siparis_id, 'tamamlandi', aktor);
    else if (kismenTeslimEdildi && siparisKaydi.durum === 'onaylandi') siparis.durumDegistir(guncelKalem.siparis_id, 'kismi_teslim', aktor);
  }
  return { id: info.lastInsertRowid, ...row };
}

export function kalemIcinListele(siparisKalemId) {
  return stmtListByKalem.all(siparisKalemId);
}
