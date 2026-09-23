// Kesinti satırları — avans mahsubu, teminat kesintisi (%), malzeme
// kesintisi (P4'ten), ceza, SGK bekletme, stopaj, KDV tevkifatı. Oranlar
// (teminat/stopaj/tevkifat) PARAMETRİK — Çekirdek parametre tablosundan
// okunur, koda GÖMÜLMEZ.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as stok from '../depo/stok.js';

const TURLER = ['avans_mahsubu', 'teminat_kesintisi', 'malzeme_kesintisi', 'ceza', 'sgk_bekletme', 'stopaj', 'kdv_tevkifati', 'diger'];

const stmtInsert = db.prepare(
  `INSERT INTO hakedis_kesinti (hakedis_id, tur, parametre_kodu, oran_yuzde, tutar_kurus, aciklama, kaynak_modul, kaynak_id, olusturan)
   VALUES (@hakedis_id, @tur, @parametre_kodu, @oran_yuzde, @tutar_kurus, @aciklama, @kaynak_modul, @kaynak_id, @olusturan)`
);
const stmtListele = db.prepare('SELECT * FROM hakedis_kesinti WHERE hakedis_id = ? ORDER BY id');
const stmtKaynakVarMi = db.prepare(
  `SELECT 1 FROM hakedis_kesinti hk JOIN hakedis h ON h.id = hk.hakedis_id
   WHERE h.sozlesme_id = ? AND hk.kaynak_modul = ? AND hk.kaynak_id = ? LIMIT 1`
);

/** Manuel kesinti satırı (avans mahsubu, ceza, SGK bekletme, diğer). @param {{tur, tutar_kurus, aciklama?, oran_yuzde?}} item */
export function ekle(hakedisId, item, aktor) {
  if (!TURLER.includes(item.tur)) throw new Error(`Geçersiz kesinti türü: ${item.tur}`);
  if (!Number.isInteger(item.tutar_kurus)) throw new Error('tutar_kurus tam sayı (kuruş) olmalıdır.');
  const row = {
    hakedis_id: hakedisId, tur: item.tur, parametre_kodu: item.parametre_kodu ?? null, oran_yuzde: item.oran_yuzde ?? null,
    tutar_kurus: item.tutar_kurus, aciklama: item.aciklama ?? null, kaynak_modul: item.kaynak_modul ?? null,
    kaynak_id: item.kaynak_id ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('hakedis_kesinti', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return { id: info.lastInsertRowid, ...row };
}

export function listele(hakedisId) {
  return stmtListele.all(hakedisId);
}

/**
 * Teminat kesintisi / stopaj / KDV tevkifatı — brüt tutar üzerinden,
 * PARAMETRE tablosundan (yürürlük tarihli) okunan oranla otomatik hesaplanır.
 * Parametre tanımlı değilse o kesinti satırı hiç oluşturulmaz (0 varsayımı
 * koda GÖMÜLMEZ — parametre yoksa "oran yok" demektir, "oran %0" demek
 * DEĞİLDİR).
 */
export function parametrikKesintiEkle(hakedisId, tur, parametreKodu, brutTutarKurus, tarih, aktor) {
  const p = parametre.degerAl(parametreKodu, tarih);
  if (!p) return null;
  const tutar = Math.round(brutTutarKurus * p.deger / 100);
  return ekle(hakedisId, { tur, parametre_kodu: parametreKodu, oran_yuzde: p.deger, tutar_kurus: tutar, aciklama: `${p.ad} (%${p.deger})` }, aktor);
}

/**
 * Malzeme kesintisi — P4 Depo'nun "kesinti adayı" işaretli çıkışlarını
 * (bkz. depo/stok.js#kesintiAdaylariniListele) bu sözleşme için toplar.
 * HER stok hareketi KENDİ satırı olarak eklenir (kaynak_id = tek hareket
 * id'si) — böylece AYNI hareket, bu sözleşmenin BAŞKA bir hakedişinde DAHA
 * ÖNCE kesintiye konu edilmişse (kaynak_modul+kaynak_id ile TÜM hakedişler
 * taranarak) kesin bir eşleşmeyle tespit edilip TEKRAR EKLENMEZ (mükerrer
 * kesinti önlenir — birleştirilmiş/toplu bir satırda bu kontrol güvenilir
 * yapılamazdı).
 */
export function malzemeKesintisiEkle(hakedisId, sozlesmeId, aktor) {
  const adaylar = stok.kesintiAdaylariniListele().filter((h) => h.sozlesme_id === sozlesmeId);
  const eklenenler = [];
  for (const hareket of adaylar) {
    if (stmtKaynakVarMi.get(sozlesmeId, 'depo_stok_hareketi', String(hareket.id))) continue; // zaten kesintiye konu edilmiş
    eklenenler.push(ekle(hakedisId, {
      tur: 'malzeme_kesintisi', tutar_kurus: hareket.toplam_maliyet_kurus, aciklama: `Depo çıkışı #${hareket.id} (P4)`,
      kaynak_modul: 'depo_stok_hareketi', kaynak_id: String(hareket.id),
    }, aktor));
  }
  return eklenenler;
}
