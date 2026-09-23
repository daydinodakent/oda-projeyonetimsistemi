// Kişi — Çekirdek. personel / taşeron işçisi / alt yüklenici işçisi /
// müşteri / ziyaretçi rollerinin TAMAMINI kapsayan tek tablo (bkz.
// CAKISMA_HARITASI.md §7 soru 5: "ayrı bir çekirdek Kişi tablosu" kararı).
//
// Mevcut tb_personel (server/db.js, AdminPanel'in kullandığı) BU tabloyu
// henüz KOPYALAMAZ/ikame ETMEZ — o, İK'ya özel alanları (departman,
// user_role, allocation_percentage) tutmaya devam eder; iki tablonun
// kisi_id ile bağlanması (İK modülü kapsamında, P2+) ayrı bir iştir ve bu
// P1 turunda YAPILMADI (bkz. docs/moduller/CAKISMA_HARITASI.md "P1
// Uygulama Durumu").
import { db } from './db.js';
import * as audit from './audit.js';
import { sifrele, cozul, maskele } from './kripto.js';

const ROLLER = ['personel', 'taseron_iscisi', 'alt_yuklenici_iscisi', 'musteri', 'ziyaretci'];

const stmtInsert = db.prepare(
  `INSERT INTO kisi (ad_soyad, tckn_sifreli, tckn_maske, rol, firma_id, telefon, eposta, santiye_giris_yetkisi, isg_egitim_tarihi, isg_egitim_gecerlilik_tarihi, notes, create_uid)
   VALUES (@ad_soyad, @tckn_sifreli, @tckn_maske, @rol, @firma_id, @telefon, @eposta, @santiye_giris_yetkisi, @isg_egitim_tarihi, @isg_egitim_gecerlilik_tarihi, @notes, @create_uid)`
);
const stmtGet = db.prepare('SELECT * FROM kisi WHERE id = ? AND row_status = 1');
const stmtGetByTcknMaske = db.prepare('SELECT id, tckn_sifreli FROM kisi WHERE row_status = 1');
const stmtList = db.prepare('SELECT * FROM kisi WHERE row_status = 1 ORDER BY ad_soyad');
const stmtListByRol = db.prepare('SELECT * FROM kisi WHERE rol = ? AND row_status = 1 ORDER BY ad_soyad');
const stmtUpdate = db.prepare(
  `UPDATE kisi SET ad_soyad=@ad_soyad, rol=@rol, firma_id=@firma_id, telefon=@telefon, eposta=@eposta,
     santiye_giris_yetkisi=@santiye_giris_yetkisi, isg_egitim_tarihi=@isg_egitim_tarihi,
     isg_egitim_gecerlilik_tarihi=@isg_egitim_gecerlilik_tarihi, notes=@notes, write_uid=@write_uid,
     write_date=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id=@id`
);
const stmtPasifEt = db.prepare("UPDATE kisi SET row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/** API/UI'ya DÜZ TCKN asla dönmez — yalnızca maskeli gösterim. */
function disaAktar(row) {
  if (!row) return row;
  const { tckn_sifreli, ...rest } = row;
  return rest; // tckn_maske zaten satırda var
}

export function listele(rol) {
  return (rol ? stmtListByRol.all(rol) : stmtList.all()).map(disaAktar);
}

export function getir(id) {
  return disaAktar(stmtGet.get(id));
}

function tcknMukerrerMi(tckn) {
  // vkn_tckn gibi düz metin üzerinde UNIQUE kuramadığımızdan (şifreli
  // saklandığı için) mükerrer kontrolü uygulama katmanında, şifre çözerek
  // yapılır. Kişi sayısı (yüzlerce/binlerce mertebe) için bu kabul edilebilir
  // maliyettedir; ölçek büyürse HMAC(tckn) sütunu eklenip onun üzerinde
  // UNIQUE kurulabilir (düz metni ifşa etmeden eşitlik testi).
  return stmtGetByTcknMaske.all().some((r) => cozul(r.tckn_sifreli) === tckn);
}

/** @param {{ad_soyad, tckn, rol, firma_id?, ...}} item tckn DÜZ METİN gelir, burada şifrelenir. */
export function olustur(item, aktor) {
  if (!ROLLER.includes(item.rol)) throw new Error(`Geçersiz rol: ${item.rol}`);
  if (!/^\d{11}$/.test(String(item.tckn))) throw new Error('TCKN 11 haneli olmalıdır.');
  if (tcknMukerrerMi(item.tckn)) throw new Error('Bu TCKN ile zaten kayıtlı bir kişi var — mükerrer kayıt engellendi.');
  const row = {
    ad_soyad: item.ad_soyad,
    tckn_sifreli: sifrele(item.tckn),
    tckn_maske: maskele(item.tckn),
    rol: item.rol,
    firma_id: item.firma_id ?? null,
    telefon: item.telefon ?? null,
    eposta: item.eposta ?? null,
    santiye_giris_yetkisi: item.santiye_giris_yetkisi ? 1 : 0,
    isg_egitim_tarihi: item.isg_egitim_tarihi ?? null,
    isg_egitim_gecerlilik_tarihi: item.isg_egitim_gecerlilik_tarihi ?? null,
    notes: item.notes ?? null,
    create_uid: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('kisi', id, 'OLUSTUR', aktor, { yeni: { ...row, tckn_sifreli: undefined, tckn: '[GİZLİ]' } });
  return getir(id);
}

export function guncelle(id, patch, aktor) {
  const mevcut = stmtGet.get(id);
  if (!mevcut) throw new Error('Kişi bulunamadı');
  const row = {
    id,
    ad_soyad: patch.ad_soyad ?? mevcut.ad_soyad,
    rol: patch.rol ?? mevcut.rol,
    firma_id: patch.firma_id !== undefined ? patch.firma_id : mevcut.firma_id,
    telefon: patch.telefon ?? mevcut.telefon,
    eposta: patch.eposta ?? mevcut.eposta,
    santiye_giris_yetkisi: patch.santiye_giris_yetkisi !== undefined ? (patch.santiye_giris_yetkisi ? 1 : 0) : mevcut.santiye_giris_yetkisi,
    isg_egitim_tarihi: patch.isg_egitim_tarihi ?? mevcut.isg_egitim_tarihi,
    isg_egitim_gecerlilik_tarihi: patch.isg_egitim_gecerlilik_tarihi ?? mevcut.isg_egitim_gecerlilik_tarihi,
    notes: patch.notes ?? mevcut.notes,
    write_uid: aktor ?? null,
  };
  stmtUpdate.run(row);
  audit.kaydet('kisi', id, 'GUNCELLE', aktor, { eski: { ...mevcut, tckn_sifreli: undefined }, yeni: { ...row, tckn_sifreli: undefined } });
  return getir(id);
}

export function pasifEt(id, aktor) {
  stmtPasifEt.run(aktor ?? null, id);
  audit.kaydet('kisi', id, 'IPTAL', aktor, null);
}
