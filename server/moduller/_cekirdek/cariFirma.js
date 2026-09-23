// Firma (Cari) — Çekirdek sahipliğinde tek tablo + çoklu rol (bkz. db.js
// başındaki not ve CAKISMA_HARITASI.md §7 soru 4).
import { db } from './db.js';
import * as audit from './audit.js';

const ROLLER = ['musteri', 'tedarikci', 'alt_yuklenici', 'taseron', 'arsa_sahibi', 'danisman'];

const stmtInsert = db.prepare(
  `INSERT INTO cari_firma (unvan, vkn_tckn, vergi_dairesi, adres, iban_listesi, yetkili_kisiler, e_fatura_mukellefi, kep_adresi, sgk_isyeri_sicil_no, notes, create_uid)
   VALUES (@unvan, @vkn_tckn, @vergi_dairesi, @adres, @iban_listesi, @yetkili_kisiler, @e_fatura_mukellefi, @kep_adresi, @sgk_isyeri_sicil_no, @notes, @create_uid)`
);
const stmtGet = db.prepare('SELECT * FROM cari_firma WHERE id = ? AND row_status = 1');
const stmtList = db.prepare('SELECT * FROM cari_firma WHERE row_status = 1 ORDER BY unvan');
const stmtUpdate = db.prepare(
  `UPDATE cari_firma SET unvan=@unvan, vergi_dairesi=@vergi_dairesi, adres=@adres, iban_listesi=@iban_listesi,
     yetkili_kisiler=@yetkili_kisiler, e_fatura_mukellefi=@e_fatura_mukellefi, kep_adresi=@kep_adresi,
     sgk_isyeri_sicil_no=@sgk_isyeri_sicil_no, notes=@notes, write_uid=@write_uid,
     write_date=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id=@id`
);
const stmtPasifEt = db.prepare("UPDATE cari_firma SET row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtKaraListe = db.prepare("UPDATE cari_firma SET kara_liste = ?, kara_liste_notu = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

const stmtRolEkle = db.prepare('INSERT OR IGNORE INTO cari_firma_rol (firma_id, rol) VALUES (?, ?)');
const stmtRolKaldir = db.prepare('UPDATE cari_firma_rol SET row_status = 0 WHERE firma_id = ? AND rol = ?');
const stmtRolListele = db.prepare("SELECT rol FROM cari_firma_rol WHERE firma_id = ? AND row_status = 1");

function rollerle(firma) {
  if (!firma) return firma;
  const roller = stmtRolListele.all(firma.id).map((r) => r.rol);
  return { ...firma, roller };
}

export function listele() {
  return stmtList.all().map(rollerle);
}

export function getir(id) {
  return rollerle(stmtGet.get(id));
}

/** @param {{unvan, vkn_tckn, roller: string[], ...}} item */
export function olustur(item, aktor) {
  for (const r of item.roller || []) {
    if (!ROLLER.includes(r)) throw new Error(`Geçersiz rol: ${r}`);
  }
  const row = {
    unvan: item.unvan,
    vkn_tckn: item.vkn_tckn,
    vergi_dairesi: item.vergi_dairesi ?? null,
    adres: item.adres ?? null,
    iban_listesi: item.iban_listesi ? JSON.stringify(item.iban_listesi) : null,
    yetkili_kisiler: item.yetkili_kisiler ? JSON.stringify(item.yetkili_kisiler) : null,
    e_fatura_mukellefi: item.e_fatura_mukellefi ? 1 : 0,
    kep_adresi: item.kep_adresi ?? null,
    sgk_isyeri_sicil_no: item.sgk_isyeri_sicil_no ?? null,
    notes: item.notes ?? null,
    create_uid: aktor ?? null,
  };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      throw new Error(`Bu VKN/TCKN (${item.vkn_tckn}) ile zaten kayıtlı bir firma var — mükerrer kayıt engellendi.`);
    }
    throw err;
  }
  const id = info.lastInsertRowid;
  for (const r of item.roller || []) stmtRolEkle.run(id, r);
  audit.kaydet('cari_firma', id, 'OLUSTUR', aktor, { yeni: row });
  return getir(id);
}

export function guncelle(id, patch, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Firma bulunamadı');
  const row = {
    id,
    unvan: patch.unvan ?? mevcut.unvan,
    vergi_dairesi: patch.vergi_dairesi ?? mevcut.vergi_dairesi,
    adres: patch.adres ?? mevcut.adres,
    iban_listesi: patch.iban_listesi ? JSON.stringify(patch.iban_listesi) : mevcut.iban_listesi,
    yetkili_kisiler: patch.yetkili_kisiler ? JSON.stringify(patch.yetkili_kisiler) : mevcut.yetkili_kisiler,
    e_fatura_mukellefi: patch.e_fatura_mukellefi !== undefined ? (patch.e_fatura_mukellefi ? 1 : 0) : mevcut.e_fatura_mukellefi,
    kep_adresi: patch.kep_adresi ?? mevcut.kep_adresi,
    sgk_isyeri_sicil_no: patch.sgk_isyeri_sicil_no ?? mevcut.sgk_isyeri_sicil_no,
    notes: patch.notes ?? mevcut.notes,
    write_uid: aktor ?? null,
  };
  stmtUpdate.run(row);
  if (patch.roller) {
    const oncekiler = stmtRolListele.all(id).map((r) => r.rol);
    for (const r of patch.roller) if (!oncekiler.includes(r)) stmtRolEkle.run(id, r);
    for (const r of oncekiler) if (!patch.roller.includes(r)) stmtRolKaldir.run(id, r);
  }
  audit.kaydet('cari_firma', id, 'GUNCELLE', aktor, { eski: mevcut, yeni: row });
  return getir(id);
}

/** Soft delete — silme yok, pasife alma var. */
export function pasifEt(id, aktor) {
  stmtPasifEt.run(aktor ?? null, id);
  audit.kaydet('cari_firma', id, 'IPTAL', aktor, null);
}

export function karaListeIsaretle(id, kara, notu, aktor) {
  stmtKaraListe.run(kara ? 1 : 0, notu ?? null, aktor ?? null, id);
  audit.kaydet('cari_firma', id, 'GUNCELLE', aktor, { kara_liste: kara, kara_liste_notu: notu });
  return getir(id);
}
