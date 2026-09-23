// Teklif — TEK bir kayıt hem "tedarikçiye talep gönderimi" (durum='istendi')
// hem "gelen teklif girişi"ni (durum='geldi', kalemler dolunca) kapsar.
// Mukayese, DB'ye YAZILMAYAN bir hesaplama: en uygun teklifi otomatik
// işaretler ama SEÇİM insanın işidir (siparis.js#olustur, teklif_id parametresi).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';
import * as talep from './talep.js';

const stmtInsert = db.prepare(
  `INSERT INTO satinalma_teklif (talep_id, firma_id, gecerlilik_tarihi, para_birimi, kur, vade_gun, teslim_suresi_gun, nakliye_dahil, notes, olusturan)
   VALUES (@talep_id, @firma_id, @gecerlilik_tarihi, @para_birimi, @kur, @vade_gun, @teslim_suresi_gun, @nakliye_dahil, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM satinalma_teklif WHERE id = ? AND row_status = 1');
const stmtListByTalep = db.prepare('SELECT * FROM satinalma_teklif WHERE talep_id = ? AND row_status = 1');
const stmtDurumGuncelle = db.prepare("UPDATE satinalma_teklif SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/** "Tedarikçiye talep gönderimi" — teklif kaydı durum='istendi' ile açılır. @param {{talep_id, firma_id, gecerlilik_tarihi?, para_birimi?, kur?, vade_gun?, teslim_suresi_gun?, nakliye_dahil?}} item */
export function talepGonder(item, aktor) {
  if (!talep.getir(item.talep_id)) throw new Error('Talep bulunamadı');
  if (!cariFirma.getir(item.firma_id)) throw new Error(`Firma bulunamadı: ${item.firma_id}`);
  const row = {
    talep_id: item.talep_id, firma_id: item.firma_id, gecerlilik_tarihi: item.gecerlilik_tarihi ?? null,
    para_birimi: item.para_birimi || 'TRY', kur: item.kur ?? 1, vade_gun: item.vade_gun ?? null,
    teslim_suresi_gun: item.teslim_suresi_gun ?? null, nakliye_dahil: item.nakliye_dahil ? 1 : 0,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error('Bu firmaya bu talep için zaten bir teklif isteği gönderilmiş.');
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('satinalma_teklif', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function getir(id) {
  return stmtGet.get(id);
}

export function talepIcinListele(talepId) {
  return stmtListByTalep.all(talepId);
}

// ---------- Teklif kalemleri ("gelen teklif girişi") ----------
const stmtKalemUpsert = db.prepare(
  `INSERT INTO satinalma_teklif_kalem (teklif_id, talep_kalem_id, miktar, birim_fiyat_kurus, kdv_orani, olusturan)
   VALUES (@teklif_id, @talep_kalem_id, @miktar, @birim_fiyat_kurus, @kdv_orani, @olusturan)
   ON CONFLICT(teklif_id, talep_kalem_id) DO UPDATE SET miktar = excluded.miktar, birim_fiyat_kurus = excluded.birim_fiyat_kurus, kdv_orani = excluded.kdv_orani`
);
const stmtKalemListele = db.prepare('SELECT * FROM satinalma_teklif_kalem WHERE teklif_id = ? AND row_status = 1');

/** Gelen teklifin kalem fiyatlarını girer/günceller ve teklifi 'geldi' durumuna taşır. @param {{talep_kalem_id, miktar, birim_fiyat_kurus, kdv_orani?}[]} kalemler */
export function teklifiGir(teklifId, kalemler, aktor) {
  const teklif = stmtGet.get(teklifId);
  if (!teklif) throw new Error('Teklif bulunamadı');
  for (const k of kalemler) {
    if (!Number.isInteger(k.birim_fiyat_kurus)) throw new Error('birim_fiyat_kurus tam sayı (kuruş) olmalıdır.');
    stmtKalemUpsert.run({ teklif_id: teklifId, talep_kalem_id: k.talep_kalem_id, miktar: k.miktar, birim_fiyat_kurus: k.birim_fiyat_kurus, kdv_orani: k.kdv_orani ?? 20, olusturan: aktor ?? null });
  }
  stmtDurumGuncelle.run('geldi', aktor ?? null, teklifId);
  audit.kaydet('satinalma_teklif', teklifId, 'GUNCELLE', aktor, { durum: [teklif.durum, 'geldi'], kalemSayisi: kalemler.length });
  return stmtGet.get(teklifId);
}

export function kalemleriGetir(teklifId) {
  return stmtKalemListele.all(teklifId);
}

export function elemeIsaretle(teklifId, aktor) {
  stmtDurumGuncelle.run('elendi', aktor ?? null, teklifId);
  audit.kaydet('satinalma_teklif', teklifId, 'GUNCELLE', aktor, { durum: 'elendi' });
}

/** Sipariş bu teklif üzerinden açıldığında (siparis.js#olustur) çağrılır. */
export function kazandiIsaretle(teklifId, aktor) {
  stmtDurumGuncelle.run('kazandi', aktor ?? null, teklifId);
  audit.kaydet('satinalma_teklif', teklifId, 'GUNCELLE', aktor, { durum: 'kazandi' });
}

/**
 * MUKAYESE — bir talebe gelen ("geldi" durumundaki) tüm tekliflerin
 * kalem bazında yan yana karşılaştırması. Her talep kalemi için en düşük
 * KDV DAHİL toplam fiyatlı teklif "onerilenTeklifId" olarak İŞARETLENİR —
 * bu yalnızca bir ÖNERİDİR, DB'ye yazılmaz; nihai seçim insanın işidir
 * (bkz. siparis.js#olustur'a verilen teklif_id parametresi).
 */
export function mukayeseSonucu(talepId) {
  const kalemler = talep.kalemleriGetir(talepId);
  const teklifler = stmtListByTalep.all(talepId).filter((t) => t.durum === 'geldi' || t.durum === 'kazandi');
  const teklifKalemleriMap = new Map(teklifler.map((t) => [t.id, new Map(stmtKalemListele.all(t.id).map((k) => [k.talep_kalem_id, k]))]));

  const kalemSatirlari = kalemler.map((talepKalemi) => {
    const teklifFiyatlari = teklifler.map((t) => {
      const tk = teklifKalemleriMap.get(t.id)?.get(talepKalemi.id);
      if (!tk) return { teklif_id: t.id, firma_id: t.firma_id, girildi: false };
      const kdvliBirim = Math.round(tk.birim_fiyat_kurus * (1 + tk.kdv_orani / 100));
      return { teklif_id: t.id, firma_id: t.firma_id, girildi: true, birim_fiyat_kurus: tk.birim_fiyat_kurus, kdv_orani: tk.kdv_orani, kdv_dahil_toplam_kurus: kdvliBirim * tk.miktar };
    });
    const gecerliOlanlar = teklifFiyatlari.filter((f) => f.girildi);
    const enUygun = gecerliOlanlar.length ? gecerliOlanlar.reduce((a, b) => (b.kdv_dahil_toplam_kurus < a.kdv_dahil_toplam_kurus ? b : a)) : null;
    return { talep_kalem_id: talepKalemi.id, aciklama: talepKalemi.aciklama, miktar: talepKalemi.miktar, birim: talepKalemi.birim, teklifler: teklifFiyatlari, onerilenTeklifId: enUygun ? enUygun.teklif_id : null };
  });

  return { talep_id: talepId, teklifSayisi: teklifler.length, teklifler: teklifler.map((t) => ({ id: t.id, firma_id: t.firma_id, durum: t.durum, vade_gun: t.vade_gun, teslim_suresi_gun: t.teslim_suresi_gun, nakliye_dahil: t.nakliye_dahil })), kalemler: kalemSatirlari };
}
