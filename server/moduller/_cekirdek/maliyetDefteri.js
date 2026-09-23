// Maliyet Defteri — GÖREV METNİNDEKİ sözleşme: "Servis: maliyetDefteri.yaz(olay)
// — diğer modüller sadece bunu çağırır." Hiçbir modül maliyet_hareketi
// tablosuna DOĞRUDAN INSERT/UPDATE yapmaz.
import { db } from './db.js';
import * as audit from './audit.js';

const stmtInsert = db.prepare(
  `INSERT INTO maliyet_hareketi (proje_id, maliyet_kodu_id, tur, tutar_kurus, para_birimi, kur, kur_tarihi, tarih, kaynak_modul, kaynak_id, notes, olusturan)
   VALUES (@proje_id, @maliyet_kodu_id, @tur, @tutar_kurus, @para_birimi, @kur, @kur_tarihi, @tarih, @kaynak_modul, @kaynak_id, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM maliyet_hareketi WHERE id = ?');
const stmtGetByKaynak = db.prepare('SELECT * FROM maliyet_hareketi WHERE kaynak_modul = ? AND kaynak_id = ? AND tur = ?');
const stmtListByProje = db.prepare('SELECT * FROM maliyet_hareketi WHERE proje_id = ? ORDER BY tarih DESC, id DESC');
// NOT: iptal_edildi'ye göre filtrelenmez — iptal edilen bir satır (orijinal)
// ile onun ters-kayıt satırı (bkz. iptalEt) TOPLAMDA birbirini götürür;
// filtrelemek bu iptal mekanizmasını BOZAR (aynı tutarı iki kez düşürür).
// iptal_edildi alanı yalnızca UI'da "bu satır iptal edildi" göstermek içindir.
const stmtListByMaliyetKodu = db.prepare('SELECT * FROM maliyet_hareketi WHERE maliyet_kodu_id = ? ORDER BY tarih DESC');
const stmtIptalEt = db.prepare('UPDATE maliyet_hareketi SET iptal_edildi = 1 WHERE id = ?');

const TURLER = ['BUTCE', 'TAAHHUT', 'GERCEKLESEN', 'GELIR'];

/**
 * Bir maliyet olayını deftere yazar. (kaynak_modul, kaynak_id, tur) üçlüsü
 * UNIQUE olduğundan AYNI olay tekrar gönderilirse (ör. ağ hatası sonrası
 * yeniden deneme) hata FIRLATMAZ, MEVCUT satırı döner — idempotent.
 *
 * @param {{proje_id, maliyet_kodu_id?, tur, tutar_kurus, para_birimi?, kur?, kur_tarihi?, tarih, kaynak_modul, kaynak_id, notes?}} olay
 */
export function yaz(olay, aktor) {
  if (!TURLER.includes(olay.tur)) throw new Error(`Geçersiz maliyet hareketi türü: ${olay.tur}`);
  if (!Number.isInteger(olay.tutar_kurus)) throw new Error('tutar_kurus tam sayı (kuruş) olmalıdır — ondalık/float kabul edilmez.');
  const mevcut = stmtGetByKaynak.get(olay.kaynak_modul, String(olay.kaynak_id), olay.tur);
  if (mevcut) return { kayit: mevcut, tekrarGonderim: true };
  const row = {
    proje_id: olay.proje_id,
    maliyet_kodu_id: olay.maliyet_kodu_id ?? null,
    tur: olay.tur,
    tutar_kurus: olay.tutar_kurus,
    para_birimi: olay.para_birimi || 'TRY',
    kur: olay.kur ?? 1,
    kur_tarihi: olay.kur_tarihi || olay.tarih,
    tarih: olay.tarih,
    kaynak_modul: olay.kaynak_modul,
    kaynak_id: String(olay.kaynak_id),
    notes: olay.notes ?? null,
    olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('maliyet_hareketi', id, 'OLUSTUR', aktor, { yeni: row });
  return { kayit: stmtGet.get(id), tekrarGonderim: false };
}

/** Silme YOK — iptal, orijinali işaretleyip TERS işaretli yeni bir satır ekler. */
export function iptalEt(hareketId, aktor, notes) {
  const orijinal = stmtGet.get(hareketId);
  if (!orijinal) throw new Error('Maliyet hareketi bulunamadı');
  if (orijinal.iptal_edildi) throw new Error('Bu hareket zaten iptal edilmiş');
  stmtIptalEt.run(hareketId);
  const tersRow = {
    proje_id: orijinal.proje_id,
    maliyet_kodu_id: orijinal.maliyet_kodu_id,
    tur: orijinal.tur,
    tutar_kurus: -orijinal.tutar_kurus,
    para_birimi: orijinal.para_birimi,
    kur: orijinal.kur,
    kur_tarihi: orijinal.kur_tarihi,
    tarih: new Date().toISOString().slice(0, 10),
    kaynak_modul: orijinal.kaynak_modul,
    kaynak_id: `${orijinal.kaynak_id}:IPTAL`,
    notes: notes || `#${hareketId} numaralı hareketin iptali`,
    olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(tersRow);
  db.prepare('UPDATE maliyet_hareketi SET ters_kayit_id = ? WHERE id = ?').run(info.lastInsertRowid, hareketId);
  audit.kaydet('maliyet_hareketi', hareketId, 'IPTAL', aktor, { ters_kayit_id: info.lastInsertRowid });
  return stmtGet.get(info.lastInsertRowid);
}

export function projeIcinListele(projeId) {
  return stmtListByProje.all(projeId);
}

/** Bir maliyet kodu için tür bazında toplamları (BÜTÇE/TAAHHÜT/GERÇEKLEŞEN/GELİR) döner. */
export function ozet(maliyetKoduId) {
  const kayitlar = stmtListByMaliyetKodu.all(maliyetKoduId);
  const toplam = { BUTCE: 0, TAAHHUT: 0, GERCEKLESEN: 0, GELIR: 0 };
  for (const k of kayitlar) toplam[k.tur] += k.tutar_kurus;
  return toplam;
}
