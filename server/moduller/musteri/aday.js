// Aday / Fırsat (satış hunisi) + Etkileşim kaydı. Huni: aday → görüşme →
// rezervasyon → satış (kayıp her aşamadan). Müşteriye dönüşünce Çekirdek
// Kişi/Firma'ya (rol: musteri) REFERANS verilir — kopyalanmaz.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as kisiSrv from '../_cekirdek/kisi.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';

const ASAMALAR = ['aday', 'gorusme', 'rezervasyon', 'satis', 'kayip'];
const stmtInsert = db.prepare('INSERT INTO aday (proje_id, ad_soyad, telefon, eposta, kaynak, ilgilendigi_bolum_id, notes, olusturan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const stmtGet = db.prepare('SELECT * FROM aday WHERE id = ? AND row_status = 1');
const stmtListe = db.prepare('SELECT * FROM aday WHERE proje_id = ? AND row_status = 1 ORDER BY id DESC');
const stmtAsama = db.prepare("UPDATE aday SET asama = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtDonustur = db.prepare('UPDATE aday SET kisi_id = ?, firma_id = ? WHERE id = ?');
const stmtEtk = db.prepare('INSERT INTO etkilesim (aday_id, tur, tarih, ozet, olusturan) VALUES (?, ?, ?, ?, ?)');
const stmtEtkListe = db.prepare('SELECT * FROM etkilesim WHERE aday_id = ? ORDER BY tarih DESC, id DESC');

export function olustur(item, aktor) {
  const info = stmtInsert.run(item.proje_id, item.ad_soyad, item.telefon ?? null, item.eposta ?? null, item.kaynak ?? null, item.ilgilendigi_bolum_id ?? null, item.notes ?? null, aktor ?? null);
  audit.kaydet('aday', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  return stmtGet.get(info.lastInsertRowid);
}
export function getir(id) { const a = stmtGet.get(id); return a ? { ...a, etkilesimler: stmtEtkListe.all(id) } : undefined; }
export function listele(projeId) { return stmtListe.all(projeId); }

export function asamaDegistir(id, asama, aktor) {
  const a = stmtGet.get(id);
  if (!a) throw new Error('Aday bulunamadı');
  if (!ASAMALAR.includes(asama)) throw new Error(`Geçersiz aşama: ${asama}`);
  if (a.asama === 'satis') throw new Error('Satışa dönüşmüş adayın aşaması değiştirilemez.');
  stmtAsama.run(asama, aktor ?? null, id);
  audit.kaydet('aday', id, 'GUNCELLE', aktor, { asama: [a.asama, asama] });
  return stmtGet.get(id);
}

export function etkilesimEkle(adayId, item, aktor) {
  if (!stmtGet.get(adayId)) throw new Error('Aday bulunamadı');
  const info = stmtEtk.run(adayId, item.tur, item.tarih, item.ozet, aktor ?? null);
  const a = stmtGet.get(adayId);
  if (a.asama === 'aday' && item.tur !== 'not') stmtAsama.run('gorusme', aktor ?? null, adayId); // ilk gerçek temas → görüşme
  return { id: info.lastInsertRowid, aday_id: adayId, ...item };
}

/** Aday, Çekirdek'te müşteri rolündeki bir Kişi/Firma ile eşlenir (varlığı ve rolü doğrulanır). */
export function musteriyeBagla(adayId, { kisi_id, firma_id }, aktor) {
  if (!stmtGet.get(adayId)) throw new Error('Aday bulunamadı');
  if (kisi_id) { const k = kisiSrv.getir(kisi_id); if (!k || k.rol !== 'musteri') throw new Error('Kişi bulunamadı veya müşteri rolünde değil.'); }
  else if (firma_id) { const f = cariFirma.getir(firma_id); if (!f || !f.roller.includes('musteri')) throw new Error('Firma bulunamadı veya müşteri rolünde değil.'); }
  else throw new Error('kisi_id veya firma_id gereklidir.');
  stmtDonustur.run(kisi_id ?? null, firma_id ?? null, adayId);
  audit.kaydet('aday', adayId, 'GUNCELLE', aktor, { kisi_id, firma_id });
  return stmtGet.get(adayId);
}

/** Huni özeti: aşama başına aday sayısı. */
export function huni(projeId) {
  const sayim = Object.fromEntries(ASAMALAR.map((a) => [a, 0]));
  for (const a of stmtListe.all(projeId)) sayim[a.asama] += 1;
  return sayim;
}
