// Talep — şantiyeden gelir, çoğu zaman acil ve eksik tanımlıdır. Form basit
// tutulur; satınalmacı sonradan netleştirir (malzeme_id'siz kalem kabul
// edilir, bkz. talepKalemEkle).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { sonraki } from '../_cekirdek/numaraSerisi.js';

const AKIS = {
  taslak: ['onay_bekliyor', 'iptal'],
  onay_bekliyor: ['onaylandi', 'reddedildi'],
};

const stmtInsert = db.prepare(
  `INSERT INTO satinalma_talep (numara, proje_id, maliyet_kodu_id, talep_eden_kisi_id, ihtiyac_tarihi, teslim_yeri, min_teklif_istisna, istisna_gerekcesi, aciklama, notes, olusturan)
   VALUES (@numara, @proje_id, @maliyet_kodu_id, @talep_eden_kisi_id, @ihtiyac_tarihi, @teslim_yeri, @min_teklif_istisna, @istisna_gerekcesi, @aciklama, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM satinalma_talep WHERE id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM satinalma_talep WHERE proje_id = ? AND row_status = 1 ORDER BY olusturma_zamani DESC');
const stmtDurumGuncelle = db.prepare("UPDATE satinalma_talep SET durum = ?, istisna_onaylayan = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtAcikOtomatikTalep = db.prepare(
  `SELECT t.id FROM satinalma_talep t JOIN satinalma_talep_kalem k ON k.talep_id = t.id
   WHERE t.proje_id = ? AND t.row_status = 1 AND t.durum IN ('taslak','onay_bekliyor')
     AND t.aciklama LIKE '[OTOMATIK-MIN-STOK]%' AND k.malzeme_id = ? AND k.row_status = 1 LIMIT 1`
);

export function listele(projeId) {
  return stmtList.all(projeId);
}

export function getir(id) {
  return stmtGet.get(id);
}

/** @param {{proje_id, ihtiyac_tarihi, maliyet_kodu_id?, talep_eden_kisi_id?, teslim_yeri?, min_teklif_istisna?, istisna_gerekcesi?, aciklama?}} item */
export function olustur(item, aktor) {
  if (item.min_teklif_istisna && !item.istisna_gerekcesi) {
    throw new Error('min. teklif istisnası işaretlendiyse istisna_gerekcesi zorunludur.');
  }
  const numara = sonraki('TLP');
  const row = {
    numara, proje_id: item.proje_id, maliyet_kodu_id: item.maliyet_kodu_id ?? null,
    talep_eden_kisi_id: item.talep_eden_kisi_id ?? null, ihtiyac_tarihi: item.ihtiyac_tarihi,
    teslim_yeri: item.teslim_yeri ?? null, min_teklif_istisna: item.min_teklif_istisna ? 1 : 0,
    istisna_gerekcesi: item.istisna_gerekcesi ?? null, aciklama: item.aciklama ?? null,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('satinalma_talep', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function durumDegistir(id, yeniDurum, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Talep bulunamadı');
  const izinliler = AKIS[mevcut.durum] || [];
  if (!izinliler.includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${mevcut.durum} -> ${yeniDurum}`);
  const istisnaOnaylayan = yeniDurum === 'onaylandi' && mevcut.min_teklif_istisna ? (aktor ?? null) : mevcut.istisna_onaylayan;
  stmtDurumGuncelle.run(yeniDurum, istisnaOnaylayan, aktor ?? null, id);
  audit.kaydet('satinalma_talep', id, 'GUNCELLE', aktor, { durum: [mevcut.durum, yeniDurum] });
  return stmtGet.get(id);
}

// ---------- Kalem ----------
const stmtKalemInsert = db.prepare(
  `INSERT INTO satinalma_talep_kalem (talep_id, malzeme_id, aciklama, miktar, birim, tahmini_birim_fiyat_kurus, olusturan)
   VALUES (@talep_id, @malzeme_id, @aciklama, @miktar, @birim, @tahmini_birim_fiyat_kurus, @olusturan)`
);
const stmtKalemListele = db.prepare('SELECT * FROM satinalma_talep_kalem WHERE talep_id = ? AND row_status = 1 ORDER BY id');
const stmtKalemGet = db.prepare('SELECT * FROM satinalma_talep_kalem WHERE id = ?');

/** @param {{malzeme_id?, aciklama, miktar, birim, tahmini_birim_fiyat_kurus?}} item */
export function kalemEkle(talepId, item, aktor) {
  if (!stmtGet.get(talepId)) throw new Error('Talep bulunamadı');
  const row = {
    talep_id: talepId, malzeme_id: item.malzeme_id ?? null, aciklama: item.aciklama,
    miktar: item.miktar, birim: item.birim, tahmini_birim_fiyat_kurus: item.tahmini_birim_fiyat_kurus ?? null, olusturan: aktor ?? null,
  };
  const info = stmtKalemInsert.run(row);
  audit.kaydet('satinalma_talep_kalem', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtKalemGet.get(info.lastInsertRowid);
}

export function kalemleriGetir(talepId) {
  return stmtKalemListele.all(talepId);
}

/**
 * Depo'nun (server/moduller/depo/stok.js) "min stok altına düşünce otomatik
 * talep taslağı" tetikleyicisi için idempotency kontrolü — aynı proje +
 * malzeme için zaten AÇIK (taslak/onay_bekliyor) bir otomatik talep varsa
 * true döner, böylece her çıkışta tekrar tekrar talep OLUŞTURULMAZ.
 */
export function acikOtomatikTalepVarMi(projeId, malzemeId) {
  return !!stmtAcikOtomatikTalep.get(projeId, malzemeId);
}
