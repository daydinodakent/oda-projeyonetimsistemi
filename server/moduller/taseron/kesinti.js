// Ödeme Dönemi Kesintileri — avans (sık ve düzensiz), yemek, barınma, ceza
// MANUEL; malzeme/fire aşımı P4'ten OTOMATİK toplanır (Alt Yüklenici/P5'teki
// AYNI desen — kaynak hareketi bazında, mükerrer kesin eşleşmeyle önlenir).
// Alet kaybı (P4 zimmet): P4'ün zimmet kaydında PARASAL bir değer alanı
// YOK (bkz. server/moduller/depo/db.js zimmet tablosu) — bu yüzden
// otomatik TUTAR hesaplanamıyor; kayipZimmetleriGetir() yalnızca BİLGİ
// amaçlı listeler, kullanıcı tutarı manuel girer (ekle() ile, tur='alet_kaybi').
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as stok from '../depo/stok.js';
import * as zimmetSrv from '../depo/zimmet.js';
import * as ekip from './ekip.js';

const TURLER = ['avans', 'yemek', 'barinma', 'malzeme_fire', 'alet_kaybi', 'ceza', 'diger'];

const stmtInsert = db.prepare(
  `INSERT INTO odeme_donemi_kesinti (odeme_donemi_id, tur, tutar_kurus, aciklama, kaynak_modul, kaynak_id, olusturan)
   VALUES (@odeme_donemi_id, @tur, @tutar_kurus, @aciklama, @kaynak_modul, @kaynak_id, @olusturan)`
);
const stmtListele = db.prepare('SELECT * FROM odeme_donemi_kesinti WHERE odeme_donemi_id = ? ORDER BY id');
const stmtKaynakVarMi = db.prepare(
  `SELECT 1 FROM odeme_donemi_kesinti k JOIN odeme_donemi d ON d.id = k.odeme_donemi_id
   WHERE d.ekip_id = ? AND k.kaynak_modul = ? AND k.kaynak_id = ? LIMIT 1`
);

/** @param {{tur, tutar_kurus, aciklama?, kaynak_modul?, kaynak_id?}} item */
export function ekle(donemId, item, aktor) {
  if (!TURLER.includes(item.tur)) throw new Error(`Geçersiz kesinti türü: ${item.tur}`);
  if (!Number.isInteger(item.tutar_kurus)) throw new Error('tutar_kurus tam sayı (kuruş) olmalıdır.');
  const row = {
    odeme_donemi_id: donemId, tur: item.tur, tutar_kurus: item.tutar_kurus, aciklama: item.aciklama ?? null,
    kaynak_modul: item.kaynak_modul ?? null, kaynak_id: item.kaynak_id ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('odeme_donemi_kesinti', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, ...row };
}

export function listele(donemId) {
  return stmtListele.all(donemId);
}

/** P5 kesinti.js#malzemeKesintisiEkle ile AYNI mantık — HER stok hareketi kendi satırı, mükerrer kesin eşleşmeyle önlenir. */
export function malzemeFireKesintisiEkle(donemId, sozlesmeId, aktor) {
  const donem = db.prepare('SELECT ekip_id FROM odeme_donemi WHERE id = ?').get(donemId);
  const adaylar = stok.kesintiAdaylariniListele().filter((h) => h.sozlesme_id === sozlesmeId);
  const eklenenler = [];
  for (const hareket of adaylar) {
    if (stmtKaynakVarMi.get(donem.ekip_id, 'depo_stok_hareketi', String(hareket.id))) continue;
    eklenenler.push(ekle(donemId, {
      tur: 'malzeme_fire', tutar_kurus: hareket.toplam_maliyet_kurus, aciklama: `Depo çıkışı #${hareket.id} (P4)`,
      kaynak_modul: 'depo_stok_hareketi', kaynak_id: String(hareket.id),
    }, aktor));
  }
  return eklenenler;
}

/** Ekip üyelerine ait "kayıp" işaretli zimmetleri BİLGİ amaçlı listeler — tutarı kullanıcı manuel girer (P4 zimmet kaydında parasal değer yok). */
export function kayipZimmetleriGetir(ekipId) {
  const kisiIdler = new Set(ekip.ekipUyeleriGetir(ekipId).map((u) => u.kisi_id));
  return zimmetSrv.listele().filter((z) => z.durum === 'kayip' && z.zimmet_alan_kisi_id && kisiIdler.has(z.zimmet_alan_kisi_id));
}
