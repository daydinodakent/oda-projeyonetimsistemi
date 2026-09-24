// Ödeme katmanı (ince) — Ödeme Talimatı → Onay → Ödeme Kaydı. Muhasebe
// programına entegrasyon YAPILMADI (görev metninde açıkça istenmedi);
// yalnızca disaAktarimNoktasi() adında, entegrasyon eklenene kadar
// ödenmemiş kayıtları döndüren bir uç nokta bırakıldı.
import { db } from './db.js';
import * as audit from './audit.js';
import { sonraki } from './numaraSerisi.js';

const stmtInsertTalimat = db.prepare(
  `INSERT INTO odeme_talimati (proje_id, numara, firma_id, aciklama, kaynak_belge_modul, kaynak_belge_id, vade_tarihi, tutar_kurus, para_birimi, kesintiler_kurus, kesintiler, notes, olusturan)
   VALUES (@proje_id, @numara, @firma_id, @aciklama, @kaynak_belge_modul, @kaynak_belge_id, @vade_tarihi, @tutar_kurus, @para_birimi, @kesintiler_kurus, @kesintiler, @notes, @olusturan)`
);
const stmtGetTalimat = db.prepare('SELECT * FROM odeme_talimati WHERE id = ?');
const stmtListTalimat = db.prepare('SELECT * FROM odeme_talimati WHERE proje_id = ? ORDER BY vade_tarihi');
const stmtDurumGuncelle = db.prepare("UPDATE odeme_talimati SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

const stmtInsertOdeme = db.prepare(
  `INSERT INTO odeme (odeme_talimati_id, tutar_kurus, para_birimi, kur, kur_tarihi, odeme_tarihi, odeme_yontemi, referans_no, olusturan)
   VALUES (@odeme_talimati_id, @tutar_kurus, @para_birimi, @kur, @kur_tarihi, @odeme_tarihi, @odeme_yontemi, @referans_no, @olusturan)`
);
const stmtListOdeme = db.prepare('SELECT * FROM odeme WHERE odeme_talimati_id = ? AND row_status = 1');
const stmtDisaAktarilmamis = db.prepare('SELECT * FROM odeme WHERE disa_aktarildi = 0 AND row_status = 1');
const stmtDisaAktarildiIsaretle = db.prepare('UPDATE odeme SET disa_aktarildi = 1 WHERE id = ?');

const AKIS = {
  TASLAK: ['ONAY_BEKLIYOR', 'IPTAL'],
  ONAY_BEKLIYOR: ['ONAYLANDI', 'REDDEDILDI'],
  ONAYLANDI: ['ODENDI', 'IPTAL'],
};

/** @param {{proje_id, firma_id, aciklama, vade_tarihi, tutar_kurus, ...}} item */
export function talimatOlustur(item, aktor) {
  if (!Number.isInteger(item.tutar_kurus)) throw new Error('tutar_kurus tam sayı (kuruş) olmalıdır.');
  const numara = sonraki('ODM');
  const row = {
    proje_id: item.proje_id, numara, firma_id: item.firma_id, aciklama: item.aciklama,
    kaynak_belge_modul: item.kaynak_belge_modul ?? null, kaynak_belge_id: item.kaynak_belge_id ?? null,
    vade_tarihi: item.vade_tarihi, tutar_kurus: item.tutar_kurus, para_birimi: item.para_birimi || 'TRY',
    kesintiler_kurus: item.kesintiler_kurus ?? 0, kesintiler: item.kesintiler ? JSON.stringify(item.kesintiler) : null,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsertTalimat.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('odeme_talimati', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGetTalimat.get(id);
}

/** Durum makinesi: TASLAK→ONAY_BEKLIYOR→ONAYLANDI→ODENDI (ya da REDDEDILDI/IPTAL). Geçersiz geçişte hata fırlatır. */
export function durumDegistir(id, yeniDurum, aktor) {
  const mevcut = stmtGetTalimat.get(id);
  if (!mevcut) throw new Error('Ödeme talimatı bulunamadı');
  const izinliler = AKIS[mevcut.durum] || [];
  if (!izinliler.includes(yeniDurum)) {
    throw new Error(`Geçersiz durum geçişi: ${mevcut.durum} -> ${yeniDurum}`);
  }
  stmtDurumGuncelle.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('odeme_talimati', id, 'GUNCELLE', aktor, { durum: [mevcut.durum, yeniDurum] });
  return stmtGetTalimat.get(id);
}

export function talimatlariListele(projeId) {
  return stmtListTalimat.all(projeId);
}

/** Yalnızca ONAYLANDI durumundaki bir talimat için ödeme kaydı açılabilir. */
export function odemeKaydet(item, aktor) {
  const talimat = stmtGetTalimat.get(item.odeme_talimati_id);
  if (!talimat) throw new Error('Ödeme talimatı bulunamadı');
  if (talimat.durum !== 'ONAYLANDI') throw new Error(`Talimat ONAYLANDI durumunda değil (şu an: ${talimat.durum})`);
  const row = {
    odeme_talimati_id: item.odeme_talimati_id, tutar_kurus: item.tutar_kurus, para_birimi: item.para_birimi || talimat.para_birimi,
    kur: item.kur ?? 1, kur_tarihi: item.kur_tarihi || item.odeme_tarihi, odeme_tarihi: item.odeme_tarihi,
    odeme_yontemi: item.odeme_yontemi ?? null, referans_no: item.referans_no ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsertOdeme.run(row);
  stmtDurumGuncelle.run('ODENDI', aktor ?? null, item.odeme_talimati_id);
  audit.kaydet('odeme', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, ...row };
}

export function odemeleriListele(talimatId) {
  return stmtListOdeme.all(talimatId);
}

/**
 * Dışa aktarma NOKTASI — gerçek bir muhasebe entegrasyonu YAPILMADI (görev
 * metninde istenmedi). Bu fonksiyon, henüz dışa aktarılmamış ödemeleri
 * döner; ileride bir entegrasyon eklenince bunları okuyup
 * disaAktarildiIsaretle() ile işaretleyecektir.
 */
export function disaAktarimNoktasi() {
  return stmtDisaAktarilmamis.all();
}

export function disaAktarildiIsaretle(odemeId) {
  stmtDisaAktarildiIsaretle.run(odemeId);
}

// ---------- Tahsilat (GELEN yön) ----------
const stmtInsertTahsilat = db.prepare(
  `INSERT INTO tahsilat (proje_id, kaynak_modul, kaynak_id, kisi_id, firma_id, tutar_kurus, para_birimi, kur, kur_tarihi, tarih, yontem, referans_no, notes, olusturan)
   VALUES (@proje_id, @kaynak_modul, @kaynak_id, @kisi_id, @firma_id, @tutar_kurus, @para_birimi, @kur, @kur_tarihi, @tarih, @yontem, @referans_no, @notes, @olusturan)`
);
const stmtGetTahsilat = db.prepare('SELECT * FROM tahsilat WHERE id = ?');
const stmtListTahsilatKaynak = db.prepare('SELECT * FROM tahsilat WHERE kaynak_modul = ? AND kaynak_id = ? AND iptal = 0 ORDER BY tarih, id');

/** @param {{proje_id, kaynak_modul, kaynak_id, kisi_id?, firma_id?, tutar_kurus, para_birimi?, kur?, kur_tarihi?, tarih, yontem?, referans_no?, notes?}} item */
export function tahsilatKaydet(item, aktor) {
  if (!Number.isInteger(item.tutar_kurus) || item.tutar_kurus <= 0) throw new Error('tutar_kurus pozitif tam sayı (kuruş) olmalıdır.');
  const row = {
    proje_id: item.proje_id, kaynak_modul: item.kaynak_modul, kaynak_id: String(item.kaynak_id), kisi_id: item.kisi_id ?? null, firma_id: item.firma_id ?? null,
    tutar_kurus: item.tutar_kurus, para_birimi: item.para_birimi || 'TRY', kur: item.kur ?? 1, kur_tarihi: item.kur_tarihi || item.tarih, tarih: item.tarih,
    yontem: item.yontem ?? null, referans_no: item.referans_no ?? null, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsertTahsilat.run(row);
  audit.kaydet('tahsilat', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtGetTahsilat.get(info.lastInsertRowid);
}
export function tahsilatGetir(id) { return stmtGetTahsilat.get(id); }
export function tahsilatlariKaynagaGore(kaynakModul, kaynakId) { return stmtListTahsilatKaynak.all(kaynakModul, String(kaynakId)); }
