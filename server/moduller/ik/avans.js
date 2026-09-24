// Avans — personel talebi, onay, taksit planı. Maaştan mahsup (bkz.
// bordroDonemi.js#personelHesapla) TAKSİT bazındadır; bekleyenTaksitleriGetir()
// SALT OKUNUR'dur (personelHesapla tekrar tekrar çağrılabilir olmalı —
// Taşeron odemeDonemi.js#hesapla ile AYNI idempotent desen); gerçek mahsup
// İŞARETLEMESİ yalnızca bordroDonemi.js#durumDegistir('onaylandi') anında,
// taksitiMahsupEt() ile YAPILIR.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as personel from './personel.js';

const stmtInsert = db.prepare(
  `INSERT INTO ik_avans (personel_id, tutar_kurus, talep_tarihi, taksit_sayisi, notes, olusturan)
   VALUES (@personel_id, @tutar_kurus, @talep_tarihi, @taksit_sayisi, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM ik_avans WHERE id = ? AND row_status = 1');
const stmtListelePersonel = db.prepare('SELECT * FROM ik_avans WHERE personel_id = ? AND row_status = 1 ORDER BY talep_tarihi DESC');
const stmtDurumGuncelle = db.prepare("UPDATE ik_avans SET durum = ?, onaylayan = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtTaksitInsert = db.prepare('INSERT INTO ik_avans_taksit (avans_id, taksit_no, tutar_kurus) VALUES (?, ?, ?)');
const stmtTaksitListele = db.prepare('SELECT * FROM ik_avans_taksit WHERE avans_id = ? ORDER BY taksit_no');
const stmtTaksitMahsup = db.prepare('UPDATE ik_avans_taksit SET mahsup_edildi_mi = 1, bordro_donemi_id = ? WHERE id = ?');
const stmtBekleyenTaksitler = db.prepare(
  `SELECT t.* FROM ik_avans_taksit t JOIN ik_avans a ON a.id = t.avans_id
   WHERE a.personel_id = ? AND a.durum = 'onaylandi' AND t.mahsup_edildi_mi = 0 ORDER BY t.taksit_no`
);

export function talepEt(item, aktor) {
  if (!personel.getir(item.personel_id)) throw new Error('Personel bulunamadı');
  if (!Number.isInteger(item.tutar_kurus) || item.tutar_kurus <= 0) throw new Error('tutar_kurus pozitif tam sayı (kuruş) olmalıdır.');
  const row = { personel_id: item.personel_id, tutar_kurus: item.tutar_kurus, talep_tarihi: item.talep_tarihi, taksit_sayisi: item.taksit_sayisi || 1, notes: item.notes ?? null, olusturan: aktor ?? null };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('ik_avans', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function personelIcinListele(personelId) {
  return stmtListelePersonel.all(personelId).map((a) => ({ ...a, taksitler: stmtTaksitListele.all(a.id) }));
}

/** Onaylanınca EŞİT taksitlere bölünür (son taksit küsurat farkını alır — kuruş toplamı BOZULMAZ). */
export function onayla(id, onaylayan, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Avans bulunamadı');
  if (mevcut.durum !== 'talep_edildi') throw new Error(`Avans "talep_edildi" durumunda değil (şu an: ${mevcut.durum})`);
  stmtDurumGuncelle.run('onaylandi', onaylayan ?? null, aktor ?? null, id);
  const taksitTutari = Math.floor(mevcut.tutar_kurus / mevcut.taksit_sayisi);
  let kalan = mevcut.tutar_kurus;
  for (let i = 1; i <= mevcut.taksit_sayisi; i++) {
    const tutar = i === mevcut.taksit_sayisi ? kalan : taksitTutari;
    stmtTaksitInsert.run(id, i, tutar);
    kalan -= tutar;
  }
  audit.kaydet('ik_avans', id, 'GUNCELLE', aktor, { durum: 'onaylandi', onaylayan });
  return { ...stmtGet.get(id), taksitler: stmtTaksitListele.all(id) };
}

export function reddet(id, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Avans bulunamadı');
  stmtDurumGuncelle.run('reddedildi', aktor ?? null, aktor ?? null, id);
  audit.kaydet('ik_avans', id, 'GUNCELLE', aktor, { durum: 'reddedildi' });
  return stmtGet.get(id);
}

/** SALT OKUNUR — mahsup İŞARETLEMEZ (bkz. dosya başı not). */
export function bekleyenTaksitleriGetir(personelId) {
  return stmtBekleyenTaksitler.all(personelId);
}

export function taksitiMahsupEt(taksitId, bordroDonemiId, aktor) {
  stmtTaksitMahsup.run(bordroDonemiId, taksitId);
  audit.kaydet('ik_avans_taksit', taksitId, 'GUNCELLE', aktor, { mahsup_edildi_mi: 1, bordro_donemi_id: bordroDonemiId });
}
