// Sipariş — mukayese sonrası İNSAN seçimiyle açılır (teklif_id) veya
// doğrudan bir çerçeve sözleşmeden (sozlesme_id) çağrılabilir. Onaylanınca
// Maliyet Defteri'ne TEK SEFERLİK TAAHHUT yazılır (bkz. db.js başı MALİYET
// KURALI notu).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { sonraki } from '../_cekirdek/numaraSerisi.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as talep from './talep.js';
import * as teklif from './teklif.js';

const AKIS = {
  taslak: ['onaylandi', 'iptal'],
  onaylandi: ['kismi_teslim', 'tamamlandi', 'iptal'],
  kismi_teslim: ['tamamlandi', 'iptal'],
};
const MIN_TEKLIF_SAYISI = 3;

const stmtInsert = db.prepare(
  `INSERT INTO satinalma_siparis (numara, proje_id, talep_id, teklif_id, sozlesme_id, maliyet_kodu_id, firma_id, teslim_tarihi, para_birimi, kur, kur_tarihi, notes, olusturan)
   VALUES (@numara, @proje_id, @talep_id, @teklif_id, @sozlesme_id, @maliyet_kodu_id, @firma_id, @teslim_tarihi, @para_birimi, @kur, @kur_tarihi, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM satinalma_siparis WHERE id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM satinalma_siparis WHERE proje_id = ? AND row_status = 1 ORDER BY olusturma_zamani DESC');
const stmtDurumGuncelle = db.prepare("UPDATE satinalma_siparis SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtTaahhutIsaretle = db.prepare('UPDATE satinalma_siparis SET taahhut_yazildi = 1 WHERE id = ?');
const stmtToplamGuncelle = db.prepare("UPDATE satinalma_siparis SET toplam_tutar_kurus = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

export function listele(projeId) {
  return stmtList.all(projeId);
}

export function getir(id) {
  return stmtGet.get(id);
}

/**
 * @param {{proje_id, firma_id, talep_id?, teklif_id?, sozlesme_id?, maliyet_kodu_id?, para_birimi?, kur?, kur_tarihi?}} item
 * min. 3 teklif kuralı: talep_id verildiyse, o talebe "geldi/kazandi"
 * durumunda EN AZ 3 teklif YOKSA, talep üzerinde min_teklif_istisna+gerekçe
 * işaretlenmiş olmalıdır (aksi hâlde reddedilir).
 */
export function olustur(item, aktor) {
  if (!cariFirma.getir(item.firma_id)) throw new Error(`Firma bulunamadı: ${item.firma_id}`);
  if (item.talep_id) {
    const t = talep.getir(item.talep_id);
    if (!t) throw new Error('Talep bulunamadı');
    const gecerliTeklifSayisi = teklif.talepIcinListele(item.talep_id).filter((tk) => tk.durum === 'geldi' || tk.durum === 'kazandi').length;
    if (gecerliTeklifSayisi < MIN_TEKLIF_SAYISI && !t.min_teklif_istisna) {
      throw new Error(`En az ${MIN_TEKLIF_SAYISI} teklif toplanmalı (şu an: ${gecerliTeklifSayisi}) — veya talepte istisna gerekçesi + üst onay gereklidir.`);
    }
  }
  const numara = sonraki('SAT');
  const row = {
    numara, proje_id: item.proje_id, talep_id: item.talep_id ?? null, teklif_id: item.teklif_id ?? null,
    sozlesme_id: item.sozlesme_id ?? null, maliyet_kodu_id: item.maliyet_kodu_id ?? null, firma_id: item.firma_id,
    teslim_tarihi: item.teslim_tarihi ?? null, para_birimi: item.para_birimi || 'TRY', kur: item.kur ?? 1, kur_tarihi: item.kur_tarihi ?? null,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  if (item.teklif_id) teklif.kazandiIsaretle(item.teklif_id, aktor);
  audit.kaydet('satinalma_siparis', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

/** Durum makinesi: taslak→onaylandi→(kismi_teslim)→tamamlandi. Onaylanınca TEK SEFERLİK TAAHHUT yazılır. */
export function durumDegistir(id, yeniDurum, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Sipariş bulunamadı');
  const izinliler = AKIS[mevcut.durum] || [];
  if (!izinliler.includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${mevcut.durum} -> ${yeniDurum}`);
  stmtDurumGuncelle.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('satinalma_siparis', id, 'GUNCELLE', aktor, { durum: [mevcut.durum, yeniDurum] });
  if (yeniDurum === 'onaylandi' && !mevcut.taahhut_yazildi) {
    const guncel = stmtGet.get(id);
    const { tekrarGonderim } = maliyetDefteri.yaz({
      proje_id: guncel.proje_id, maliyet_kodu_id: guncel.maliyet_kodu_id ?? undefined, tur: 'TAAHHUT',
      tutar_kurus: guncel.toplam_tutar_kurus, para_birimi: guncel.para_birimi, kur: guncel.kur,
      kur_tarihi: guncel.kur_tarihi || new Date().toISOString().slice(0, 10), tarih: new Date().toISOString().slice(0, 10),
      kaynak_modul: 'satinalma_siparis', kaynak_id: String(id), notes: `Sipariş ${guncel.numara} onay taahhüdü`,
    }, aktor);
    if (!tekrarGonderim) stmtTaahhutIsaretle.run(id);
  }
  return stmtGet.get(id);
}

// ---------- Kalem ----------
const stmtKalemInsert = db.prepare(
  `INSERT INTO satinalma_siparis_kalem (siparis_id, malzeme_id, aciklama, birim, miktar, birim_fiyat_kurus, kdv_orani, olusturan)
   VALUES (@siparis_id, @malzeme_id, @aciklama, @birim, @miktar, @birim_fiyat_kurus, @kdv_orani, @olusturan)`
);
const stmtKalemListele = db.prepare('SELECT * FROM satinalma_siparis_kalem WHERE siparis_id = ? AND row_status = 1 ORDER BY id');
const stmtKalemGet = db.prepare('SELECT * FROM satinalma_siparis_kalem WHERE id = ?');

function toplamiYenidenHesapla(siparisId) {
  const kalemler = stmtKalemListele.all(siparisId);
  const toplam = kalemler.reduce((t, k) => t + Math.round(k.birim_fiyat_kurus * (1 + k.kdv_orani / 100) * k.miktar), 0);
  stmtToplamGuncelle.run(toplam, siparisId);
}

/** @param {{malzeme_id?, aciklama, birim, miktar, birim_fiyat_kurus, kdv_orani?}} item */
export function kalemEkle(siparisId, item, aktor) {
  const siparis = stmtGet.get(siparisId);
  if (!siparis) throw new Error('Sipariş bulunamadı');
  if (siparis.durum !== 'taslak') throw new Error('Yalnızca "taslak" durumundaki siparişe kalem eklenebilir.');
  if (!Number.isInteger(item.birim_fiyat_kurus)) throw new Error('birim_fiyat_kurus tam sayı (kuruş) olmalıdır.');
  const row = {
    siparis_id: siparisId, malzeme_id: item.malzeme_id ?? null, aciklama: item.aciklama, birim: item.birim,
    miktar: item.miktar, birim_fiyat_kurus: item.birim_fiyat_kurus, kdv_orani: item.kdv_orani ?? 20, olusturan: aktor ?? null,
  };
  const info = stmtKalemInsert.run(row);
  toplamiYenidenHesapla(siparisId);
  audit.kaydet('satinalma_siparis_kalem', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtKalemGet.get(info.lastInsertRowid);
}

export function kalemleriGetir(siparisId) {
  return stmtKalemListele.all(siparisId);
}

export function kalemGetir(kalemId) {
  return stmtKalemGet.get(kalemId);
}

// ---------- Teslim ilerlemesi (Depo'nun Mal Kabul servisinden çağrılır) ----------
// SAHİPLİK: Depo (server/moduller/depo/malKabul.js) kendi mal_kabul olayını
// kaydettikten SONRA, Satın Alma'nın KENDİ tablosunu güncellemesi için bu
// fonksiyonu çağırır — Depo, satinalma_siparis_kalem'e DOĞRUDAN yazmaz.
const stmtKalemTeslimGuncelle = db.prepare('UPDATE satinalma_siparis_kalem SET teslim_edilen_miktar = teslim_edilen_miktar + ? WHERE id = ?');

/** @param {number} kabulEdilenMiktar Mal kabulde KABUL edilen (reddedilen hariç) miktar — bkz. depo/malKabul.js. */
export function teslimIlerlemesiGuncelle(kalemId, kabulEdilenMiktar, aktor) {
  const kalem = stmtKalemGet.get(kalemId);
  if (!kalem) throw new Error('Sipariş kalemi bulunamadı');
  stmtKalemTeslimGuncelle.run(kabulEdilenMiktar, kalemId);

  const guncelKalem = stmtKalemGet.get(kalemId);
  const tumKalemler = stmtKalemListele.all(guncelKalem.siparis_id);
  const tamamiTeslimEdildi = tumKalemler.every((k) => k.teslim_edilen_miktar >= k.miktar);
  const kismenTeslimEdildi = tumKalemler.some((k) => k.teslim_edilen_miktar > 0);
  const siparisKaydi = stmtGet.get(guncelKalem.siparis_id);
  if (siparisKaydi && siparisKaydi.durum !== 'tamamlandi') {
    if (tamamiTeslimEdildi) durumDegistir(guncelKalem.siparis_id, 'tamamlandi', aktor);
    else if (kismenTeslimEdildi && siparisKaydi.durum === 'onaylandi') durumDegistir(guncelKalem.siparis_id, 'kismi_teslim', aktor);
  }
  return guncelKalem;
}
