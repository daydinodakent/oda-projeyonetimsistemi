// Sözleşme Şablonu — tip bazlı madde şablonları + değişkenli belge metni.
// E-imza entegrasyonu YOK (görev kapsamı dışı) — yalnızca metin üretimi.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';

const TIPLER = ['musteri_satis', 'alt_yuklenici', 'taseron', 'tedarikci_cerceve', 'kira', 'hizmet', 'arsa_sahibi'];

const stmtInsert = db.prepare(
  `INSERT INTO sozlesme_sablon (tip, ad, madde_sablonlari, belge_metni, olusturan)
   VALUES (@tip, @ad, @madde_sablonlari, @belge_metni, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM sozlesme_sablon WHERE id = ? AND row_status = 1');
const stmtListeleTip = db.prepare('SELECT * FROM sozlesme_sablon WHERE tip = ? AND row_status = 1 ORDER BY ad');
const stmtListeleTum = db.prepare('SELECT * FROM sozlesme_sablon WHERE row_status = 1 ORDER BY tip, ad');
const stmtPasifEt = db.prepare("UPDATE sozlesme_sablon SET row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

export function listele(tip) {
  return tip ? stmtListeleTip.all(tip) : stmtListeleTum.all();
}

export function getir(id) {
  return stmtGet.get(id);
}

/** @param {{tip, ad, madde_sablonlari?, belge_metni}} item */
export function olustur(item, aktor) {
  if (!TIPLER.includes(item.tip)) throw new Error(`Geçersiz sözleşme tipi: ${item.tip}`);
  if (!item.belge_metni) throw new Error('belge_metni zorunludur.');
  const row = {
    tip: item.tip, ad: item.ad, madde_sablonlari: item.madde_sablonlari ? JSON.stringify(item.madde_sablonlari) : null,
    belge_metni: item.belge_metni, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('sozlesme_sablon', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(info.lastInsertRowid);
}

export function pasifEt(id, aktor) {
  stmtPasifEt.run(aktor ?? null, id);
  audit.kaydet('sozlesme_sablon', id, 'IPTAL', aktor, null);
}

/**
 * Şablon metnindeki {{taraf}}, {{bedel}}, {{tarih}}, {{proje}}, {{konu}}
 * gibi değişkenleri verilen değerlerle değiştirir. Bilinmeyen bir
 * {{degisken}} varsa OLDUĞU GİBİ bırakılır (sessizce boşa düşürülmez) —
 * kullanıcı eksik veriyi belgede fark edebilsin diye.
 * @param {number} sablonId
 * @param {Record<string,string>} degiskenler ör. {taraf:'ABC İnşaat', bedel:'1.500.000,00 TL', tarih:'23.09.2026'}
 */
export function belgeUret(sablonId, degiskenler) {
  const sablon = stmtGet.get(sablonId);
  if (!sablon) throw new Error('Şablon bulunamadı');
  const metin = sablon.belge_metni.replace(/\{\{\s*(\w+)\s*\}\}/g, (tam, ad) => (
    Object.prototype.hasOwnProperty.call(degiskenler || {}, ad) ? String(degiskenler[ad]) : tam
  ));
  return { sablon_id: sablonId, metin };
}
