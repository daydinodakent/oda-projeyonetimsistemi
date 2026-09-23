// Mal Kabul — P4: Depo'nun KESİN sahipliği (P3'teki
// server/moduller/satinalma/malKabul.js GEÇİCİ sürümünün yerini alır —
// KALDIRILDI, bkz. server/moduller/satinalma/db.js'teki not).
//
// Sipariş kalemine (Satın Alma'nın tablosu) yalnızca ID ile REFERANS
// verilir — varlığı, RAW tabloya değil Satın Alma'nın KENDİ servisine
// (`siparis.kalemGetir`) sorularak doğrulanır; kabul edilen miktar da AYNI
// şekilde Satın Alma'nın `teslimIlerlemesiGuncelle()` servisi ÇAĞRILARAK
// bildirilir — Depo, satinalma_siparis_kalem'e DOĞRUDAN yazmaz.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as malzeme from './malzeme.js';
import * as stok from './stok.js';
import * as siparis from '../satinalma/siparis.js';

const stmtInsert = db.prepare(
  `INSERT INTO mal_kabul (siparis_kalem_id, depo_id, gelen_miktar, kabul_miktar, red_miktar, red_nedeni, fotograf_url, irsaliye_no, tarih, notes, olusturan)
   VALUES (@siparis_kalem_id, @depo_id, @gelen_miktar, @kabul_miktar, @red_miktar, @red_nedeni, @fotograf_url, @irsaliye_no, @tarih, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM mal_kabul WHERE id = ?');
const stmtStokHareketiIsaretle = db.prepare('UPDATE mal_kabul SET stok_hareketi_id = ? WHERE id = ?');
const stmtListByKalem = db.prepare('SELECT * FROM mal_kabul WHERE siparis_kalem_id = ? ORDER BY tarih');

/**
 * @param {{siparis_kalem_id, depo_id?, gelen_miktar, kabul_miktar, red_miktar?, red_nedeni?, fotograf_url?, irsaliye_no?, tarih, notes?}} item
 * Stoklu bir malzemenin kabul edilen miktarı OTOMATİK olarak bir stok
 * GİRİŞİ oluşturur (depo_id bu durumda ZORUNLUDUR). Reddedilen miktar
 * stoka hiç girmez. "Mal kabulde fark/red → Satın Alma'ya ve tedarikçi
 * karnesine olay" (görev metni): Satın Alma'ya bildirim
 * teslimIlerlemesiGuncelle() ile (yalnızca KABUL miktarı ilerler — red
 * miktarı sipariş üzerinde "eksik teslim" olarak görünür kalır, bu da
 * fatura eşleştirmenin zaten yakaladığı bir durumdur); tedarikçi karnesi
 * bu tabloyu DOĞRUDAN okuyarak (bkz. satinalma/tedarikciKarnesi.js) kalite
 * red oranını hesaplar — ayrı bir "olay" tablosu AÇILMADI.
 */
export function kaydet(item, aktor) {
  const kalem = siparis.kalemGetir(item.siparis_kalem_id);
  if (!kalem) throw new Error('Sipariş kalemi bulunamadı');
  const kabulMiktar = item.kabul_miktar ?? 0;
  const redMiktar = item.red_miktar ?? 0;
  if (kabulMiktar < 0 || redMiktar < 0 || item.gelen_miktar < 0) throw new Error('Miktarlar negatif olamaz.');
  if (kabulMiktar + redMiktar > item.gelen_miktar) throw new Error('Kabul + red miktarı, gelen miktarı aşamaz.');

  const row = {
    siparis_kalem_id: item.siparis_kalem_id, depo_id: item.depo_id ?? null, gelen_miktar: item.gelen_miktar,
    kabul_miktar: kabulMiktar, red_miktar: redMiktar, red_nedeni: item.red_nedeni ?? null,
    fotograf_url: item.fotograf_url ?? null, irsaliye_no: item.irsaliye_no ?? null, tarih: item.tarih,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;

  const malzemeKaydi = kalem.malzeme_id ? malzeme.getir(kalem.malzeme_id) : null;
  if (malzemeKaydi && malzemeKaydi.stoklu_mu && kabulMiktar > 0) {
    if (!item.depo_id) throw new Error('Stoklu bir malzemenin mal kabulünde depo_id zorunludur.');
    const siparisKaydi = siparis.getir(kalem.siparis_id);
    const girisSonucu = stok.giris({
      depo_id: item.depo_id, malzeme_id: kalem.malzeme_id, miktar: kabulMiktar, birim: kalem.birim,
      birim_maliyet_kurus: kalem.birim_fiyat_kurus, proje_id: siparisKaydi.proje_id,
      kaynak_belge_modul: 'depo_mal_kabul', kaynak_belge_id: String(id),
    }, aktor);
    stmtStokHareketiIsaretle.run(girisSonucu.kayit.id, id);
  }

  if (kabulMiktar > 0) siparis.teslimIlerlemesiGuncelle(item.siparis_kalem_id, kabulMiktar, aktor);

  audit.kaydet('mal_kabul', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function kalemIcinListele(siparisKalemId) {
  return stmtListByKalem.all(siparisKalemId);
}
