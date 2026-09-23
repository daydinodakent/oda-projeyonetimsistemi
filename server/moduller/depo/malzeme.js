// Malzeme Kartı — P4: Depo'nun KESİN sahipliği (P3'teki geçici sürümden
// GENİŞLETİLDİ — bkz. db.js başındaki sahiplik geçmişi notu).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';

const stmtInsert = db.prepare(
  `INSERT INTO malzeme_karti (kod, ad, birim, kategori, stoklu_mu, grup, demirbas_mi, min_stok, max_stok, fire_toleransi_yuzde, notes, create_uid)
   VALUES (@kod, @ad, @birim, @kategori, @stoklu_mu, @grup, @demirbas_mi, @min_stok, @max_stok, @fire_toleransi_yuzde, @notes, @create_uid)`
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

/** @param {{kod, ad, birim, kategori?, stoklu_mu?, grup?, demirbas_mi?, min_stok?, max_stok?, fire_toleransi_yuzde?}} item */
export function olustur(item, aktor) {
  const row = {
    kod: item.kod, ad: item.ad, birim: item.birim, kategori: item.kategori ?? null,
    stoklu_mu: item.stoklu_mu === false || item.stoklu_mu === 0 ? 0 : 1,
    grup: item.grup ?? null, demirbas_mi: item.demirbas_mi ? 1 : 0,
    min_stok: item.min_stok ?? null, max_stok: item.max_stok ?? null,
    fire_toleransi_yuzde: item.fire_toleransi_yuzde ?? 0,
    notes: item.notes ?? null, create_uid: aktor ?? null,
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

// ---------- Birim Dönüşüm ----------
// "Demir ton alınır kg çıkılır, seramik m² alınır kutu çıkılır" (görev
// metni) — her malzeme, ana biriminden farklı birimlerle hareket görebilir.
const stmtDonusumUpsert = db.prepare(
  `INSERT INTO malzeme_birim_donusum (malzeme_id, birim, katsayi) VALUES (?, ?, ?)
   ON CONFLICT(malzeme_id, birim) DO UPDATE SET katsayi = excluded.katsayi`
);
const stmtDonusumListele = db.prepare('SELECT * FROM malzeme_birim_donusum WHERE malzeme_id = ?');
const stmtDonusumBul = db.prepare('SELECT katsayi FROM malzeme_birim_donusum WHERE malzeme_id = ? AND birim = ?');

/** @param {number} katsayi 1 [birim] = katsayi × [ana birim] */
export function birimDonusumTanimla(malzemeId, birim, katsayi, aktor) {
  if (!getir(malzemeId)) throw new Error('Malzeme bulunamadı');
  if (!(katsayi > 0)) throw new Error('Dönüşüm katsayısı sıfırdan büyük olmalıdır.');
  stmtDonusumUpsert.run(malzemeId, birim, katsayi);
  audit.kaydet('malzeme_birim_donusum', malzemeId, 'GUNCELLE', aktor, { birim, katsayi });
}

export function birimDonusumleriGetir(malzemeId) {
  return stmtDonusumListele.all(malzemeId);
}

/**
 * Verilen miktarı, verilen birimden malzemenin ANA BİRİMİNE çevirir.
 * Birim, malzemenin ana birimiyle AYNIYSA (büyük/küçük harf duyarsız)
 * katsayı 1 varsayılır — ayrıca bir dönüşüm satırı TANIMLANMASI gerekmez.
 */
export function birimeCevir(malzemeId, miktar, birim) {
  const malzeme = getir(malzemeId);
  if (!malzeme) throw new Error('Malzeme bulunamadı');
  if (birim.trim().toLocaleLowerCase('tr') === malzeme.birim.trim().toLocaleLowerCase('tr')) return miktar;
  const donusum = stmtDonusumBul.get(malzemeId, birim);
  if (!donusum) throw new Error(`"${malzeme.ad}" için "${birim}" biriminden ana birime (${malzeme.birim}) bir dönüşüm katsayısı tanımlı değil.`);
  return miktar * donusum.katsayi;
}
