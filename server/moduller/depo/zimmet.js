// Zimmet — demirbaş (matkap, iskele, kalıp) ve KKD (baret, yelek, ayakkabı).
// Stok hareketleriyle İZLENMEZ (tüketilmez, geri döner) — kendi başına bir
// ver/iade akışıdır. kkd_mi: P8 (Şantiye/İSG) modülünün okuyabileceği işaret
// (görev metni) — P8 henüz kurulmadı, alan hazır bekliyor.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as malzeme from './malzeme.js';

const TIPLER = ['personel', 'taseron_ekibi', 'alt_yuklenici_ekibi'];

const stmtInsert = db.prepare(
  `INSERT INTO zimmet (malzeme_id, depo_id, miktar, zimmet_alan_tipi, zimmet_alan_kisi_id, zimmet_alan_aciklama, kkd_mi, zimmet_tarihi, beklenen_iade_tarihi, notes, olusturan)
   VALUES (@malzeme_id, @depo_id, @miktar, @zimmet_alan_tipi, @zimmet_alan_kisi_id, @zimmet_alan_aciklama, @kkd_mi, @zimmet_tarihi, @beklenen_iade_tarihi, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM zimmet WHERE id = ? AND row_status = 1');
const stmtListeAcik = db.prepare("SELECT * FROM zimmet WHERE row_status = 1 AND durum = 'zimmette' ORDER BY beklenen_iade_tarihi");
const stmtListeTum = db.prepare('SELECT * FROM zimmet WHERE row_status = 1 ORDER BY zimmet_tarihi DESC');
const stmtIadeEt = db.prepare("UPDATE zimmet SET durum = 'iade_edildi', iade_tarihi = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtKayipIsaretle = db.prepare("UPDATE zimmet SET durum = 'kayip', write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/** @param {{malzeme_id, depo_id?, miktar?, zimmet_alan_tipi, zimmet_alan_kisi_id?, zimmet_alan_aciklama?, zimmet_tarihi, beklenen_iade_tarihi?, notes?}} item */
export function ver(item, aktor) {
  const malzemeKaydi = malzeme.getir(item.malzeme_id);
  if (!malzemeKaydi) throw new Error('Malzeme bulunamadı');
  if (!TIPLER.includes(item.zimmet_alan_tipi)) throw new Error(`Geçersiz zimmet_alan_tipi: ${item.zimmet_alan_tipi}`);
  const row = {
    malzeme_id: item.malzeme_id, depo_id: item.depo_id ?? null, miktar: item.miktar ?? 1,
    zimmet_alan_tipi: item.zimmet_alan_tipi, zimmet_alan_kisi_id: item.zimmet_alan_kisi_id ?? null,
    zimmet_alan_aciklama: item.zimmet_alan_aciklama ?? null, kkd_mi: item.kkd_mi ? 1 : 0,
    zimmet_tarihi: item.zimmet_tarihi, beklenen_iade_tarihi: item.beklenen_iade_tarihi ?? null,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('zimmet', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function getir(id) {
  return stmtGet.get(id);
}

/** @param {boolean} [sadeceAcik] true ise yalnızca hâlâ "zimmette" olanları döner. */
export function listele(sadeceAcik) {
  return sadeceAcik ? stmtListeAcik.all() : stmtListeTum.all();
}

export function iadeEt(id, tarih, aktor) {
  const z = stmtGet.get(id);
  if (!z) throw new Error('Zimmet kaydı bulunamadı');
  if (z.durum !== 'zimmette') throw new Error(`Bu zimmet "${z.durum}" durumunda — yalnızca "zimmette" olanlar iade edilebilir.`);
  stmtIadeEt.run(tarih, aktor ?? null, id);
  audit.kaydet('zimmet', id, 'GUNCELLE', aktor, { durum: 'iade_edildi', iade_tarihi: tarih });
  return stmtGet.get(id);
}

export function kayipIsaretle(id, aktor) {
  stmtKayipIsaretle.run(aktor ?? null, id);
  audit.kaydet('zimmet', id, 'GUNCELLE', aktor, { durum: 'kayip' });
  return stmtGet.get(id);
}
