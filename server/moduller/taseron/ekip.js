// Taşeron Ekibi — ekip başı + ustalar + kalfalar + düz işçiler.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as sozlesme from '../sozlesme/sozlesme.js';
import * as kisi from '../_cekirdek/kisi.js';

const ROL_SAHA_LISTESI = ['usta_basi', 'usta', 'kalfa', 'duz_isci'];

const stmtInsert = db.prepare(
  `INSERT INTO taseron_ekip (sozlesme_id, proje_id, ekip_basi_kisi_id, is_kolu, odeme_tipi, notes, olusturan)
   VALUES (@sozlesme_id, @proje_id, @ekip_basi_kisi_id, @is_kolu, @odeme_tipi, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM taseron_ekip WHERE id = ? AND row_status = 1');
const stmtListeleProje = db.prepare('SELECT * FROM taseron_ekip WHERE proje_id = ? AND row_status = 1 ORDER BY olusturma_zamani DESC');

/** @param {{sozlesme_id, ekip_basi_kisi_id?, is_kolu?, odeme_tipi?, notes?}} item */
export function olustur(item, aktor) {
  const sozlesmeKaydi = sozlesme.getir(item.sozlesme_id);
  if (!sozlesmeKaydi) throw new Error('Sözleşme bulunamadı');
  if (sozlesmeKaydi.tip !== 'taseron') {
    throw new Error(`Ekip yalnızca "taseron" tipi sözleşmeler için kurulabilir (bu sözleşme: "${sozlesmeKaydi.tip}" — bkz. CAKISMA_HARITASI.md TANIM AYRIMI: iş kalemi/hakediş bazlı çalışan firmalar Alt Yüklenici/P5'in işidir).`);
  }
  const row = {
    sozlesme_id: item.sozlesme_id, proje_id: sozlesmeKaydi.proje_id, ekip_basi_kisi_id: item.ekip_basi_kisi_id ?? null,
    is_kolu: item.is_kolu ?? null, odeme_tipi: item.odeme_tipi || 'yevmiye', notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('taseron_ekip', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function getir(id) {
  return stmtGet.get(id);
}

export function projeIcinListele(projeId) {
  return stmtListeleProje.all(projeId);
}

// ---------- Ekip Üyesi ----------
const stmtUyeInsert = db.prepare(
  `INSERT INTO ekip_uye (ekip_id, kisi_id, rol_saha, sgk_giris_bildirge_tarihi, baslangic_tarihi, notes, olusturan)
   VALUES (@ekip_id, @kisi_id, @rol_saha, @sgk_giris_bildirge_tarihi, @baslangic_tarihi, @notes, @olusturan)`
);
const stmtUyeGet = db.prepare('SELECT * FROM ekip_uye WHERE id = ? AND row_status = 1');
const stmtUyeListele = db.prepare('SELECT * FROM ekip_uye WHERE ekip_id = ? AND row_status = 1 ORDER BY rol_saha');
const stmtUyeGuncelle = db.prepare("UPDATE ekip_uye SET sgk_giris_bildirge_tarihi = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtUyeAyrilis = db.prepare("UPDATE ekip_uye SET bitis_tarihi = ?, row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/** @param {{kisi_id, rol_saha?, sgk_giris_bildirge_tarihi?, baslangic_tarihi, notes?}} item */
export function uyeEkle(ekipId, item, aktor) {
  if (!stmtGet.get(ekipId)) throw new Error('Ekip bulunamadı');
  if (!kisi.getir(item.kisi_id)) throw new Error('Kişi bulunamadı');
  if (item.rol_saha && !ROL_SAHA_LISTESI.includes(item.rol_saha)) throw new Error(`Geçersiz rol_saha: ${item.rol_saha}`);
  const row = {
    ekip_id: ekipId, kisi_id: item.kisi_id, rol_saha: item.rol_saha || 'duz_isci',
    sgk_giris_bildirge_tarihi: item.sgk_giris_bildirge_tarihi ?? null, baslangic_tarihi: item.baslangic_tarihi,
    notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  let info;
  try {
    info = stmtUyeInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error('Bu kişi zaten bu ekipte kayıtlı.');
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('ekip_uye', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtUyeGet.get(id);
}

export function uyeGetir(id) {
  return stmtUyeGet.get(id);
}

export function ekipUyeleriGetir(ekipId) {
  return stmtUyeListele.all(ekipId);
}

export function sgkBildirgesiGuncelle(ekipUyeId, tarih, aktor) {
  stmtUyeGuncelle.run(tarih, aktor ?? null, ekipUyeId);
  audit.kaydet('ekip_uye', ekipUyeId, 'GUNCELLE', aktor, { sgk_giris_bildirge_tarihi: tarih });
  return stmtUyeGet.get(ekipUyeId);
}

export function uyeAyril(ekipUyeId, tarih, aktor) {
  stmtUyeAyrilis.run(tarih, aktor ?? null, ekipUyeId);
  audit.kaydet('ekip_uye', ekipUyeId, 'IPTAL', aktor, { bitis_tarihi: tarih });
}

// ---------- Yevmiye (yürürlük tarihli) ----------
const stmtYevmiyeInsert = db.prepare('INSERT INTO ekip_uye_yevmiye (ekip_uye_id, gecerli_baslangic, gecerli_bitis, yevmiye_kurus, olusturan) VALUES (?, ?, ?, ?, ?)');
const stmtYevmiyeListele = db.prepare('SELECT * FROM ekip_uye_yevmiye WHERE ekip_uye_id = ? ORDER BY gecerli_baslangic DESC');
const stmtYevmiyeGecerli = db.prepare(
  `SELECT * FROM ekip_uye_yevmiye WHERE ekip_uye_id = ? AND gecerli_baslangic <= ?
     AND (gecerli_bitis IS NULL OR gecerli_bitis >= ?) ORDER BY gecerli_baslangic DESC LIMIT 1`
);

/** Yeni bir yürürlük dönemi ekler — MEVCUT satırlar değiştirilmez (tarihli geçmiş korunur, Çekirdek Parametre ile AYNI desen). */
export function yevmiyeTanimla(ekipUyeId, yevmiyeKurus, gecerliBaslangic, aktor) {
  if (!stmtUyeGet.get(ekipUyeId)) throw new Error('Ekip üyesi bulunamadı');
  if (!Number.isInteger(yevmiyeKurus)) throw new Error('yevmiye_kurus tam sayı (kuruş) olmalıdır.');
  const info = stmtYevmiyeInsert.run(ekipUyeId, gecerliBaslangic, null, yevmiyeKurus, aktor ?? null);
  audit.kaydet('ekip_uye_yevmiye', info.lastInsertRowid, 'OLUSTUR', aktor, { ekip_uye_id: ekipUyeId, yevmiye_kurus: yevmiyeKurus, gecerli_baslangic: gecerliBaslangic });
  return { id: info.lastInsertRowid, ekip_uye_id: ekipUyeId, gecerli_baslangic: gecerliBaslangic, yevmiye_kurus: yevmiyeKurus };
}

export function yevmiyeGecmisiGetir(ekipUyeId) {
  return stmtYevmiyeListele.all(ekipUyeId);
}

/** Bir tarihte GEÇERLİ yevmiyeyi döner (yoksa null — koda gömülü varsayılan YOK, ÇALIŞMA KURALLARI). */
export function yevmiyeGetir(ekipUyeId, tarih) {
  return stmtYevmiyeGecerli.get(ekipUyeId, tarih, tarih) || null;
}
