// Bağımsız Bölüm + tarihli Fiyat Listesi. Kat karşılığı: arsa sahibine ait
// bölümler stokta görünür ama SATIŞA KAPALIDIR; paylaşım listesi Sözleşme'den
// (P2, tip='arsa_sahibi' sözleşmesinin kalemleri) gelir — burada kopyalanmaz,
// yalnızca bölümlerin sahiplik işareti ve sözleşme ID'si tutulur.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as sozlesme from '../sozlesme/sozlesme.js';

const stmtInsert = db.prepare(
  `INSERT INTO bagimsiz_bolum (proje_id, blok, kat, kapi_no, tip, brut_m2, net_m2, cephe, eklentiler, geometri_ref, olusturan)
   VALUES (@proje_id, @blok, @kat, @kapi_no, @tip, @brut_m2, @net_m2, @cephe, @eklentiler, @geometri_ref, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM bagimsiz_bolum WHERE id = ? AND row_status = 1');
const stmtListe = db.prepare('SELECT * FROM bagimsiz_bolum WHERE proje_id = ? AND row_status = 1 ORDER BY blok, CAST(kat AS INTEGER), kat, kapi_no');
const stmtDurum = db.prepare("UPDATE bagimsiz_bolum SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtArsa = db.prepare("UPDATE bagimsiz_bolum SET sahiplik = 'arsa_sahibi', arsa_sozlesme_id = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtFiyatInsert = db.prepare('INSERT INTO bolum_fiyat (bolum_id, gecerli_baslangic, fiyat_kurus, para_birimi, olusturan) VALUES (?, ?, ?, ?, ?)');
const stmtFiyatGecerli = db.prepare('SELECT * FROM bolum_fiyat WHERE bolum_id = ? AND gecerli_baslangic <= ? ORDER BY gecerli_baslangic DESC, id DESC LIMIT 1');
const stmtFiyatGecmis = db.prepare('SELECT * FROM bolum_fiyat WHERE bolum_id = ? ORDER BY gecerli_baslangic DESC, id DESC');

export const etiket = (b) => `${b.blok}-${b.kat}-${b.kapi_no}`;

/** @param {{proje_id, blok, kat, kapi_no, tip, brut_m2?, net_m2?, cephe?, eklentiler?, geometri_ref?}} item */
export function olustur(item, aktor) {
  const row = {
    proje_id: item.proje_id, blok: String(item.blok), kat: String(item.kat), kapi_no: String(item.kapi_no), tip: item.tip,
    brut_m2: item.brut_m2 ?? null, net_m2: item.net_m2 ?? null, cephe: item.cephe ?? null,
    eklentiler: item.eklentiler ? JSON.stringify(item.eklentiler) : null, geometri_ref: item.geometri_ref ?? null, olusturan: aktor ?? null,
  };
  let info;
  try { info = stmtInsert.run(row); }
  catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error(`Bu projede ${row.blok}-${row.kat}-${row.kapi_no} numaralı bölüm zaten var.`);
    throw err;
  }
  audit.kaydet('bagimsiz_bolum', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return getir(info.lastInsertRowid);
}

function ac(b) { return b ? { ...b, eklentiler: b.eklentiler ? JSON.parse(b.eklentiler) : null } : b; }
export function getir(id) { return ac(stmtGet.get(id)); }
export function listele(projeId) { return stmtListe.all(projeId).map(ac); }

/** İç kullanım (rezervasyon/satis servisleri): durum geçişini doğrular. */
export function durumAyarla(id, yeniDurum, aktor) {
  const b = stmtGet.get(id);
  if (!b) throw new Error('Bölüm bulunamadı');
  if (b.durum === yeniDurum) return ac(b);
  stmtDurum.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('bagimsiz_bolum', id, 'GUNCELLE', aktor, { durum: [b.durum, yeniDurum] });
  return getir(id);
}

/** Bölüm satışa AÇIK mı? (sahiplik firma olmalı) — kapalıysa neden mesajı döner. */
export function satisaKapaliNedeni(b) {
  if (b.sahiplik === 'arsa_sahibi') return 'Bu bağımsız bölüm ARSA SAHİBİNE aittir (kat karşılığı) — satılamaz/opsiyonlanamaz.';
  return null;
}

// ---------- Fiyat Listesi (tarihli, insert-only) ----------
export function fiyatTanimla(bolumId, fiyatKurus, gecerliBaslangic, paraBirimi = 'TRY', aktor) {
  if (!stmtGet.get(bolumId)) throw new Error('Bölüm bulunamadı');
  if (!Number.isInteger(fiyatKurus) || fiyatKurus <= 0) throw new Error('fiyat_kurus pozitif tam sayı (kuruş) olmalıdır.');
  const info = stmtFiyatInsert.run(bolumId, gecerliBaslangic, fiyatKurus, paraBirimi, aktor ?? null);
  audit.kaydet('bolum_fiyat', info.lastInsertRowid, 'OLUSTUR', aktor, { bolum_id: bolumId, fiyat_kurus: fiyatKurus, gecerli_baslangic: gecerliBaslangic });
  return { id: info.lastInsertRowid, bolum_id: bolumId, fiyat_kurus: fiyatKurus, para_birimi: paraBirimi, gecerli_baslangic: gecerliBaslangic };
}
export function fiyatGetir(bolumId, tarih) { return stmtFiyatGecerli.get(bolumId, tarih || new Date().toISOString().slice(0, 10)) || null; }
export function fiyatGecmisi(bolumId) { return stmtFiyatGecmis.all(bolumId); }

// ---------- Arsa sahibi payı (kat karşılığı) ----------
/** Tek bölümü arsa sahibine ayırır. Sözleşme tip='arsa_sahibi' ve aynı proje olmalı; satılmış/opsiyonlu bölüm ayrılamaz. */
export function arsaSahibineAyir(bolumId, arsaSozlesmeId, aktor) {
  const b = stmtGet.get(bolumId);
  if (!b) throw new Error('Bölüm bulunamadı');
  const s = sozlesme.getir(arsaSozlesmeId);
  if (!s || s.tip !== 'arsa_sahibi') throw new Error('arsa_sozlesme_id, tip="arsa_sahibi" olan bir sözleşmeye işaret etmelidir.');
  if (s.proje_id !== b.proje_id) throw new Error('Arsa sahibi sözleşmesi bu bölümün projesine ait değil.');
  if (b.durum !== 'musait') throw new Error(`"${b.durum}" durumundaki bölüm arsa sahibine ayrılamaz.`);
  stmtArsa.run(arsaSozlesmeId, aktor ?? null, bolumId);
  audit.kaydet('bagimsiz_bolum', bolumId, 'GUNCELLE', aktor, { sahiplik: ['firma', 'arsa_sahibi'], arsa_sozlesme_id: arsaSozlesmeId });
  return getir(bolumId);
}

/**
 * Paylaşım listesi P2'den gelir: arsa sahibi sözleşmesinin KALEMLERİ, açıklama
 * alanında bölüm etiketini (BLOK-KAT-KAPI, ör. "A-3-12") taşır (virgül/;
 * ile birden çok olabilir). Eşleşenler arsa sahibine ayrılır; eşleşmeyen etiketler döner.
 */
export function paylasimListesiUygula(arsaSozlesmeId, aktor) {
  const s = sozlesme.getir(arsaSozlesmeId);
  if (!s || s.tip !== 'arsa_sahibi') throw new Error('Sözleşme bulunamadı veya tip="arsa_sahibi" değil.');
  const bolumler = new Map(listele(s.proje_id).map((b) => [etiket(b), b]));
  const ayrilan = []; const bulunamayan = []; const atlanan = [];
  for (const kalem of sozlesme.kalemleriGetir(arsaSozlesmeId)) {
    for (const e of String(kalem.aciklama).split(/[;,]/).map((x) => x.trim()).filter(Boolean)) {
      const b = bolumler.get(e);
      if (!b) { bulunamayan.push(e); continue; }
      if (b.sahiplik === 'arsa_sahibi') { atlanan.push(e); continue; }
      try { arsaSahibineAyir(b.id, arsaSozlesmeId, aktor); ayrilan.push(e); } catch (err) { atlanan.push(`${e} (${err.message})`); }
    }
  }
  return { ayrilan, bulunamayan, atlanan };
}

/** Satış tablosu ızgarası: blok → kat → bölümler (güncel liste fiyatı ile). */
export function izgara(projeId, tarih) {
  const bloklar = {};
  for (const b of listele(projeId)) {
    const f = fiyatGetir(b.id, tarih);
    bloklar[b.blok] ??= {};
    (bloklar[b.blok][b.kat] ??= []).push({ ...b, etiket: etiket(b), liste_fiyati_kurus: f?.fiyat_kurus ?? null, para_birimi: f?.para_birimi ?? null, satisa_kapali: b.sahiplik === 'arsa_sahibi' });
  }
  return bloklar;
}
