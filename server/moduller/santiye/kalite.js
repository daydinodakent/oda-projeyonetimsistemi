// Kalite — Uygunsuzluk (NCR), Beton Döküm + Numune (7/28 gün kırım) ve
// Görev/NCR için ortak "sorumlu" doğrulaması (kişi / taşeron ekibi / alt
// yüklenici — KOPYALANMAZ, ID ile referans; varlığı sahibinin servisine sorulur).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as kisiSrv from '../_cekirdek/kisi.js';
import * as taseronEkip from '../taseron/ekip.js';
import * as sozlesme from '../sozlesme/sozlesme.js';
import * as performans from '../altyuklenici/performans.js';

export function sorumluDogrula(tip, id) {
  if (tip === 'kisi' && !kisiSrv.getir(id)) throw new Error('Sorumlu kişi bulunamadı');
  if (tip === 'taseron_ekibi' && !taseronEkip.getir(id)) throw new Error('Sorumlu taşeron ekibi bulunamadı');
  if (tip === 'alt_yuklenici') {
    const s = sozlesme.getir(id);
    if (!s || s.tip !== 'alt_yuklenici') throw new Error('Sorumlu alt yüklenici sözleşmesi bulunamadı (tip="alt_yuklenici" olmalı)');
  }
  if (!['kisi', 'taseron_ekibi', 'alt_yuklenici'].includes(tip)) throw new Error(`Geçersiz sorumlu tipi: ${tip}`);
}

// ---------- NCR ----------
const stmtNcrInsert = db.prepare(
  `INSERT INTO ncr (proje_id, baslik, aciklama, sorumlu_tipi, sorumlu_id, wbs_gorev_id, lat, lon, foto_url, acilis_tarihi, olusturan)
   VALUES (@proje_id, @baslik, @aciklama, @sorumlu_tipi, @sorumlu_id, @wbs_gorev_id, @lat, @lon, @foto_url, @acilis_tarihi, @olusturan)`
);
const stmtNcrGet = db.prepare('SELECT * FROM ncr WHERE id = ? AND row_status = 1');
const stmtNcrListe = db.prepare('SELECT * FROM ncr WHERE proje_id = ? AND row_status = 1 ORDER BY acilis_tarihi DESC');
const stmtNcrDuzelt = db.prepare("UPDATE ncr SET durum = 'duzeltildi', duzeltme_notu = ? WHERE id = ?");
const stmtNcrKapat = db.prepare("UPDATE ncr SET durum = 'kapali', kapanis_tarihi = ? WHERE id = ?");

/** Sorumlu alt yükleniciyse P5 performans kartına 'ncr' olayı gönderilir (mükerrer AÇMAZ). */
export function ncrAc(item, aktor) {
  sorumluDogrula(item.sorumlu_tipi, item.sorumlu_id);
  const row = {
    proje_id: item.proje_id, baslik: item.baslik, aciklama: item.aciklama ?? null, sorumlu_tipi: item.sorumlu_tipi, sorumlu_id: item.sorumlu_id,
    wbs_gorev_id: item.wbs_gorev_id ?? null, lat: item.lat ?? null, lon: item.lon ?? null, foto_url: item.foto_url ?? null,
    acilis_tarihi: item.acilis_tarihi || new Date().toISOString().slice(0, 10), olusturan: aktor ?? null,
  };
  const info = stmtNcrInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('ncr', id, 'OLUSTUR', aktor, { yeni: row });
  if (row.sorumlu_tipi === 'alt_yuklenici') performans.olayGonder(row.sorumlu_id, 'ncr', 'santiye_ncr', id, row.acilis_tarihi, row.baslik);
  return stmtNcrGet.get(id);
}
export function ncrGetir(id) { return stmtNcrGet.get(id); }
export function ncrListele(projeId) { return stmtNcrListe.all(projeId); }

/** Akış: acik -> duzeltildi (düzeltme notu zorunlu) -> kapali. */
export function ncrDuzelt(id, duzeltmeNotu, aktor) {
  const n = stmtNcrGet.get(id);
  if (!n) throw new Error('NCR bulunamadı');
  if (n.durum !== 'acik') throw new Error(`NCR "acik" durumunda değil (şu an: ${n.durum})`);
  if (!duzeltmeNotu) throw new Error('Düzeltme notu zorunludur.');
  stmtNcrDuzelt.run(duzeltmeNotu, id);
  audit.kaydet('ncr', id, 'GUNCELLE', aktor, { durum: ['acik', 'duzeltildi'] });
  return stmtNcrGet.get(id);
}
export function ncrKapat(id, tarih, aktor) {
  const n = stmtNcrGet.get(id);
  if (!n) throw new Error('NCR bulunamadı');
  if (n.durum !== 'duzeltildi') throw new Error('NCR kapatılmadan önce düzeltilmiş olmalıdır (acik -> duzeltildi -> kapali).');
  stmtNcrKapat.run(tarih || new Date().toISOString().slice(0, 10), id);
  audit.kaydet('ncr', id, 'GUNCELLE', aktor, { durum: ['duzeltildi', 'kapali'] });
  return stmtNcrGet.get(id);
}

// ---------- Beton Döküm + Numune ----------
const stmtDokumInsert = db.prepare('INSERT INTO beton_dokum (proje_id, tarih, eleman, beton_sinifi, miktar_m3, wbs_gorev_id, lat, lon, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const stmtDokumGet = db.prepare('SELECT * FROM beton_dokum WHERE id = ?');
const stmtDokumListe = db.prepare('SELECT * FROM beton_dokum WHERE proje_id = ? AND row_status = 1 ORDER BY tarih DESC');
const stmtNumuneInsert = db.prepare('INSERT INTO beton_numune (dokum_id, numune_kodu, kirim_gun, planlanan_kirim_tarihi) VALUES (?, ?, ?, ?)');
const stmtNumuneListe = db.prepare('SELECT * FROM beton_numune WHERE dokum_id = ? ORDER BY kirim_gun, numune_kodu');
const stmtNumuneGet = db.prepare('SELECT * FROM beton_numune WHERE id = ?');
const stmtNumuneSonuc = db.prepare('UPDATE beton_numune SET sonuc_mpa = ?, sonuc_tarihi = ? WHERE id = ?');
const stmtBekleyen = db.prepare(
  `SELECT n.*, d.proje_id, d.eleman, d.beton_sinifi FROM beton_numune n JOIN beton_dokum d ON d.id = n.dokum_id
   WHERE d.proje_id = ? AND n.sonuc_mpa IS NULL AND n.planlanan_kirim_tarihi <= ? ORDER BY n.planlanan_kirim_tarihi`
);

function gunEkle(tarih, gun) { const d = new Date(tarih); d.setDate(d.getDate() + gun); return d.toISOString().slice(0, 10); }

/** @param {{proje_id, tarih, eleman, beton_sinifi, miktar_m3, numune_adedi?}} item Her numune için 7 VE 28 günlük kırım planı otomatik açılır. */
export function dokumEkle(item, aktor) {
  const info = stmtDokumInsert.run(item.proje_id, item.tarih, item.eleman, item.beton_sinifi, item.miktar_m3, item.wbs_gorev_id ?? null, item.lat ?? null, item.lon ?? null, aktor ?? null);
  const id = info.lastInsertRowid;
  audit.kaydet('beton_dokum', id, 'OLUSTUR', aktor, { yeni: item });
  const adet = item.numune_adedi ?? 2;
  for (let i = 1; i <= adet; i++) {
    for (const gun of [7, 28]) stmtNumuneInsert.run(id, `N${i}`, gun, gunEkle(item.tarih, gun));
  }
  return { ...stmtDokumGet.get(id), numuneler: stmtNumuneListe.all(id) };
}
export function dokumleriListele(projeId) { return stmtDokumListe.all(projeId).map((d) => ({ ...d, numuneler: stmtNumuneListe.all(d.id) })); }
export function numuneSonucGir(numuneId, sonucMpa, tarih, aktor) {
  if (!stmtNumuneGet.get(numuneId)) throw new Error('Numune bulunamadı');
  if (!(sonucMpa > 0)) throw new Error('Kırım sonucu (MPa) pozitif olmalıdır.');
  stmtNumuneSonuc.run(sonucMpa, tarih || new Date().toISOString().slice(0, 10), numuneId);
  audit.kaydet('beton_numune', numuneId, 'GUNCELLE', aktor, { sonuc_mpa: sonucMpa });
  return stmtNumuneGet.get(numuneId);
}
/** Kırım tarihi gelmiş/geçmiş ama sonucu girilmemiş numuneler (hatırlatma). */
export function kirimiBekleyenler(projeId, tarih) { return stmtBekleyen.all(projeId, tarih || new Date().toISOString().slice(0, 10)); }
