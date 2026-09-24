// Personel — İK'nın Çekirdek Kişi (rol='personel') üzerine kurduğu özlük
// detayı. Kişi'nin TEKRARI DEĞİL — kisi_id ile REFERANS verir (SAHİPLİK
// kuralı: kimlik/TCKN/iletişim Çekirdek'te kalır, İK yalnızca özlük
// alanlarını [sicil no, departman, unvan, çalışma şekli, işe giriş/çıkış]
// ekler).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as kisi from '../_cekirdek/kisi.js';

const CALISMA_SEKLI = ['tam_zamanli', 'yari_zamanli', 'gecici', 'mevsimlik'];

const stmtInsert = db.prepare(
  `INSERT INTO personel (kisi_id, sicil_no, departman, unvan, calisma_sekli, vardiya_id, ise_giris_tarihi, biyometrik_riza_verildi_mi, biyometrik_riza_tarihi, notes, olusturan)
   VALUES (@kisi_id, @sicil_no, @departman, @unvan, @calisma_sekli, @vardiya_id, @ise_giris_tarihi, @biyometrik_riza_verildi_mi, @biyometrik_riza_tarihi, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM personel WHERE id = ? AND row_status = 1');
const stmtGetAny = db.prepare('SELECT * FROM personel WHERE id = ?');
const stmtGetByKisi = db.prepare('SELECT * FROM personel WHERE kisi_id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM personel WHERE row_status = 1 ORDER BY sicil_no');
const stmtGuncelle = db.prepare(
  `UPDATE personel SET departman=@departman, unvan=@unvan, calisma_sekli=@calisma_sekli, vardiya_id=@vardiya_id,
     biyometrik_riza_verildi_mi=@biyometrik_riza_verildi_mi, biyometrik_riza_tarihi=@biyometrik_riza_tarihi,
     notes=@notes, write_uid=@write_uid, write_date=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id`
);
const stmtCikis = db.prepare("UPDATE personel SET cikis_tarihi = ?, cikis_nedeni = ?, row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/**
 * @param {{kisi_id, sicil_no, departman?, unvan?, calisma_sekli?, vardiya_id?, ise_giris_tarihi, biyometrik_riza_verildi_mi?, biyometrik_riza_tarihi?, notes?}} item
 * Kişi'nin rolü 'personel' OLMALI — referans veren taraf (İK) doğrular.
 */
export function olustur(item, aktor) {
  const kisiKaydi = kisi.getir(item.kisi_id);
  if (!kisiKaydi) throw new Error('Kişi bulunamadı');
  if (kisiKaydi.rol !== 'personel') throw new Error(`Personel yalnızca rol="personel" olan bir Kişi için kurulabilir (bu kişi: "${kisiKaydi.rol}").`);
  if (item.calisma_sekli && !CALISMA_SEKLI.includes(item.calisma_sekli)) throw new Error(`Geçersiz çalışma şekli: ${item.calisma_sekli}`);
  const row = {
    kisi_id: item.kisi_id, sicil_no: item.sicil_no, departman: item.departman ?? null, unvan: item.unvan ?? null,
    calisma_sekli: item.calisma_sekli || 'tam_zamanli', vardiya_id: item.vardiya_id ?? null, ise_giris_tarihi: item.ise_giris_tarihi,
    biyometrik_riza_verildi_mi: item.biyometrik_riza_verildi_mi ? 1 : 0,
    biyometrik_riza_tarihi: item.biyometrik_riza_verildi_mi ? (item.biyometrik_riza_tarihi || new Date().toISOString().slice(0, 10)) : null,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error('Bu sicil no veya bu kişi için zaten bir personel kaydı var.');
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('personel', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function getir(id) { return stmtGet.get(id); }
export function kisiIcinGetir(kisiId) { return stmtGetByKisi.get(kisiId) || null; }
export function listele() { return stmtList.all(); }

export function guncelle(id, patch, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Personel bulunamadı');
  const row = {
    id,
    departman: patch.departman ?? mevcut.departman,
    unvan: patch.unvan ?? mevcut.unvan,
    calisma_sekli: patch.calisma_sekli || mevcut.calisma_sekli,
    vardiya_id: patch.vardiya_id !== undefined ? patch.vardiya_id : mevcut.vardiya_id,
    biyometrik_riza_verildi_mi: patch.biyometrik_riza_verildi_mi !== undefined ? (patch.biyometrik_riza_verildi_mi ? 1 : 0) : mevcut.biyometrik_riza_verildi_mi,
    biyometrik_riza_tarihi: patch.biyometrik_riza_verildi_mi ? (patch.biyometrik_riza_tarihi || new Date().toISOString().slice(0, 10)) : mevcut.biyometrik_riza_tarihi,
    notes: patch.notes ?? mevcut.notes,
    write_uid: aktor ?? null,
  };
  stmtGuncelle.run(row);
  audit.kaydet('personel', id, 'GUNCELLE', aktor, { eski: mevcut, yeni: row });
  return stmtGet.get(id);
}

/**
 * İşten çıkış — soft delete. Kıdem gününü HESAPLAR (kıdem/ihbar TAZMİNATI
 * tutarını DEĞİL — tam hesap motoru bu turun kapsamı dışında, GÖREV METNİ:
 * "çıkışta kıdem/ihbar hesabı gerekebilir" yalnızca HAM VERİYİ hazırlamamızı
 * ister, tazminat formülü dış bordro/İK danışmanlığı işidir).
 */
export function cikisYap(id, tarih, neden, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Personel bulunamadı');
  stmtCikis.run(tarih, neden ?? null, aktor ?? null, id);
  audit.kaydet('personel', id, 'IPTAL', aktor, { cikis_tarihi: tarih, cikis_nedeni: neden });
  const kidemGunu = Math.floor((new Date(tarih).getTime() - new Date(mevcut.ise_giris_tarihi).getTime()) / 86400000);
  return { personel: stmtGetAny.get(id), kidem_gun: kidemGunu, kidem_yil: Number((kidemGunu / 365).toFixed(2)) };
}

// ---------- Vardiya ----------
const stmtVardiyaInsert = db.prepare('INSERT INTO ik_vardiya (ad, baslangic_saati, bitis_saati, olusturan) VALUES (?, ?, ?, ?)');
const stmtVardiyaListele = db.prepare('SELECT * FROM ik_vardiya WHERE row_status = 1 ORDER BY baslangic_saati');

export function vardiyaTanimla(item, aktor) {
  const info = stmtVardiyaInsert.run(item.ad, item.baslangic_saati, item.bitis_saati, aktor ?? null);
  return { id: info.lastInsertRowid, ...item };
}
export function vardiyalariListele() { return stmtVardiyaListele.all(); }

// ---------- Proje Ataması (bilgi amaçlı — MALİYET DAĞITIMI puantajdan hesaplanır, bkz. bordroDonemi.js) ----------
const stmtAtamaInsert = db.prepare(
  `INSERT INTO personel_proje_atama (personel_id, proje_id, baslangic_tarihi, bitis_tarihi, notes, olusturan)
   VALUES (@personel_id, @proje_id, @baslangic_tarihi, @bitis_tarihi, @notes, @olusturan)`
);
const stmtAtamaListele = db.prepare('SELECT * FROM personel_proje_atama WHERE personel_id = ? AND row_status = 1 ORDER BY baslangic_tarihi DESC');
const stmtAtamaKapat = db.prepare('UPDATE personel_proje_atama SET bitis_tarihi = ? WHERE id = ? AND row_status = 1');

/** Yeni atama başlarken önceki AÇIK (bitis_tarihi NULL) atama otomatik kapatılır — aynı anda iki "aktif" proje ataması tutulmaz. */
export function projeyeAta(personelId, item, aktor) {
  if (!stmtGet.get(personelId)) throw new Error('Personel bulunamadı');
  const acikAtama = stmtAtamaListele.all(personelId).find((a) => !a.bitis_tarihi);
  if (acikAtama) stmtAtamaKapat.run(item.baslangic_tarihi, acikAtama.id);
  const row = { personel_id: personelId, proje_id: item.proje_id, baslangic_tarihi: item.baslangic_tarihi, bitis_tarihi: item.bitis_tarihi ?? null, notes: item.notes ?? null, olusturan: aktor ?? null };
  const info = stmtAtamaInsert.run(row);
  audit.kaydet('personel_proje_atama', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, ...row };
}
export function atamalariGetir(personelId) { return stmtAtamaListele.all(personelId); }

// ---------- Ücret Geçmişi (yürürlük tarihli — Çekirdek Parametre/Taşeron Yevmiye ile AYNI desen) ----------
const stmtUcretInsert = db.prepare('INSERT INTO personel_ucret (personel_id, gecerli_baslangic, gecerli_bitis, brut_maas_kurus, odeme_periyodu, olusturan) VALUES (?, ?, ?, ?, ?, ?)');
const stmtUcretListele = db.prepare('SELECT * FROM personel_ucret WHERE personel_id = ? ORDER BY gecerli_baslangic DESC');
const stmtUcretGecerli = db.prepare(
  `SELECT * FROM personel_ucret WHERE personel_id = ? AND gecerli_baslangic <= ?
     AND (gecerli_bitis IS NULL OR gecerli_bitis >= ?) ORDER BY gecerli_baslangic DESC LIMIT 1`
);

export function ucretTanimla(personelId, brutMaasKurus, gecerliBaslangic, aktor, odemePeriyodu = 'aylik') {
  if (!stmtGet.get(personelId)) throw new Error('Personel bulunamadı');
  if (!Number.isInteger(brutMaasKurus)) throw new Error('brut_maas_kurus tam sayı (kuruş) olmalıdır.');
  const info = stmtUcretInsert.run(personelId, gecerliBaslangic, null, brutMaasKurus, odemePeriyodu, aktor ?? null);
  audit.kaydet('personel_ucret', info.lastInsertRowid, 'OLUSTUR', aktor, { personel_id: personelId, brut_maas_kurus: brutMaasKurus, gecerli_baslangic: gecerliBaslangic });
  return { id: info.lastInsertRowid, personel_id: personelId, gecerli_baslangic: gecerliBaslangic, gecerli_bitis: null, brut_maas_kurus: brutMaasKurus, odeme_periyodu: odemePeriyodu };
}
export function ucretGecmisiGetir(personelId) { return stmtUcretListele.all(personelId); }
export function ucretGetir(personelId, tarih) { return stmtUcretGecerli.get(personelId, tarih, tarih) || null; }
