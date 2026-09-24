// Rezervasyon / Opsiyon — süreli, kaparolu. "Aynı bölüm aynı anda iki
// opsiyona/satışa giremez": kilit veritabanında partial UNIQUE INDEX
// (idx_rezervasyon_aktif_tekil) + bölüm durumu; SÜRE DOLUNCA otomatik
// serbest bırakma her rezervasyon/satış/ızgara okumasında ve
// suresiDolanlariSerbestBirak() ile yapılır (zamanlayıcı gerekmez).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as bolum from './bolum.js';

const stmtInsert = db.prepare(
  `INSERT INTO rezervasyon (bolum_id, aday_id, kisi_id, firma_id, kaparo_kurus, baslangic_tarihi, bitis_tarihi, notes, olusturan)
   VALUES (@bolum_id, @aday_id, @kisi_id, @firma_id, @kaparo_kurus, @baslangic_tarihi, @bitis_tarihi, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM rezervasyon WHERE id = ?');
const stmtListeProje = db.prepare('SELECT r.* FROM rezervasyon r JOIN bagimsiz_bolum b ON b.id = r.bolum_id WHERE b.proje_id = ? ORDER BY r.id DESC');
const stmtDurum = db.prepare('UPDATE rezervasyon SET durum = ? WHERE id = ?');
const stmtSuresiGecen = db.prepare("SELECT * FROM rezervasyon WHERE durum = 'aktif' AND bitis_tarihi < ?");
const stmtAday = db.prepare("UPDATE aday SET asama = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND asama != 'satis'");

/** Süresi dolan AKTİF rezervasyonları kapatır ve bölümü serbest bırakır. */
export function suresiDolanlariSerbestBirak(tarih, aktor) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const serbest = [];
  for (const r of stmtSuresiGecen.all(t)) {
    stmtDurum.run('suresi_doldu', r.id);
    const b = bolum.getir(r.bolum_id);
    if (b && b.durum === 'opsiyonlu') bolum.durumAyarla(r.bolum_id, 'musait', aktor);
    audit.kaydet('rezervasyon', r.id, 'GUNCELLE', aktor, { durum: ['aktif', 'suresi_doldu'] });
    serbest.push(r.id);
  }
  return serbest;
}

/** @param {{bolum_id, aday_id?, kisi_id?, firma_id?, kaparo_kurus?, baslangic_tarihi, bitis_tarihi, notes?}} item */
export function olustur(item, aktor) {
  suresiDolanlariSerbestBirak(item.baslangic_tarihi, aktor);
  const b = bolum.getir(item.bolum_id);
  if (!b) throw new Error('Bölüm bulunamadı');
  const kapali = bolum.satisaKapaliNedeni(b);
  if (kapali) throw new Error(kapali);
  if (b.durum !== 'musait') throw new Error(`Bölüm "${b.durum}" durumunda — aynı bölüm aynı anda iki opsiyona/satışa giremez.`);
  if (item.bitis_tarihi < item.baslangic_tarihi) throw new Error('Opsiyon bitişi başlangıçtan önce olamaz.');
  const row = {
    bolum_id: item.bolum_id, aday_id: item.aday_id ?? null, kisi_id: item.kisi_id ?? null, firma_id: item.firma_id ?? null,
    kaparo_kurus: item.kaparo_kurus ?? 0, baslangic_tarihi: item.baslangic_tarihi, bitis_tarihi: item.bitis_tarihi, notes: item.notes ?? null, olusturan: aktor ?? null,
  };
  let info;
  try { info = stmtInsert.run(row); }
  catch (err) {
    if (String(err.message || '').includes('UNIQUE')) throw new Error('Bu bölüm için zaten AKTİF bir opsiyon var.');
    throw err;
  }
  bolum.durumAyarla(item.bolum_id, 'opsiyonlu', aktor);
  if (item.aday_id) stmtAday.run('rezervasyon', item.aday_id);
  audit.kaydet('rezervasyon', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(info.lastInsertRowid);
}

export function getir(id) { return stmtGet.get(id); }
export function projeIcinListele(projeId) { return stmtListeProje.all(projeId); }

export function iptalEt(id, aktor) {
  const r = stmtGet.get(id);
  if (!r) throw new Error('Rezervasyon bulunamadı');
  if (r.durum !== 'aktif') throw new Error(`Rezervasyon "${r.durum}" durumunda — yalnızca aktif iptal edilir.`);
  stmtDurum.run('iptal', id);
  bolum.durumAyarla(r.bolum_id, 'musait', aktor);
  audit.kaydet('rezervasyon', id, 'IPTAL', aktor, { kaparo_kurus: r.kaparo_kurus });
  return stmtGet.get(id);
}

/** İç kullanım (satis.js): rezervasyonu satışa dönüştü işaretler; bölüm durumunu satış yönetir. */
export function satisaDonustur(id) { stmtDurum.run('satisa_donustu', id); }
