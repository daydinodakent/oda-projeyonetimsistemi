// Satış — bağımsız bölüm satışı. Satış sözleşmesi P2'de (tip='musteri_satis')
// OLUŞTURULUR (burada ayrı sözleşme tablosu yok). Onay: aktif ödeme planı
// şartıyla sözleşme imzalı→yürürlükte akışına sokulur; P2 imzada Maliyet
// Defteri'ne GELİR (taahhüt, kaynak_modul='sozlesme') yazar — burada İKİNCİ
// bir taahhüt YAZILMAZ (çift sayım yok). Hisseli satış: birden çok müşteri.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';
import * as kisiSrv from '../_cekirdek/kisi.js';
import * as sozlesme from '../sozlesme/sozlesme.js';
import * as bolum from './bolum.js';
import * as rezervasyon from './rezervasyon.js';
import * as odemePlani from './odemePlani.js';
import * as tahsilat from './tahsilat.js';

const stmtInsert = db.prepare(
  `INSERT INTO satis (proje_id, bolum_id, sozlesme_id, tutar_kurus, para_birimi, kur, kur_tarihi, satis_tarihi, kaparo_kurus, rezervasyon_id, notes, olusturan)
   VALUES (@proje_id, @bolum_id, @sozlesme_id, @tutar_kurus, @para_birimi, @kur, @kur_tarihi, @satis_tarihi, @kaparo_kurus, @rezervasyon_id, @notes, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM satis WHERE id = ? AND row_status = 1');
const stmtListeProje = db.prepare('SELECT * FROM satis WHERE proje_id = ? AND row_status = 1 ORDER BY id DESC');
const stmtDurum = db.prepare("UPDATE satis SET durum = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtMusteriInsert = db.prepare('INSERT INTO satis_musteri (satis_id, kisi_id, firma_id, hisse_yuzde) VALUES (?, ?, ?, ?)');
const stmtMusteriler = db.prepare('SELECT * FROM satis_musteri WHERE satis_id = ?');
const stmtMusteriSatislari = db.prepare("SELECT s.* FROM satis s JOIN satis_musteri m ON m.satis_id = s.id WHERE s.row_status = 1 AND s.durum != 'iptal' AND ((? IS NOT NULL AND m.kisi_id = ?) OR (? IS NOT NULL AND m.firma_id = ?)) ORDER BY s.id DESC");
const stmtAday = db.prepare("UPDATE aday SET asama = ? WHERE id = (SELECT aday_id FROM rezervasyon WHERE id = ?)");

/** Müşteri = Çekirdek Kişi(rol='musteri') veya Firma('musteri' rolü) — referans veren taraf doğrular. */
function musteriDogrula(m) {
  if (m.kisi_id) {
    const k = kisiSrv.getir(m.kisi_id);
    if (!k) throw new Error(`Kişi bulunamadı: ${m.kisi_id}`);
    if (k.rol !== 'musteri') throw new Error(`Kişi "${k.ad_soyad}" müşteri rolünde değil (rol: ${k.rol}).`);
  } else if (m.firma_id) {
    const f = cariFirma.getir(m.firma_id);
    if (!f) throw new Error(`Firma bulunamadı: ${m.firma_id}`);
    if (!f.roller.includes('musteri')) throw new Error(`Firma "${f.unvan}" müşteri rolünde değil.`);
  } else throw new Error('Her müşteri için kisi_id veya firma_id gereklidir.');
}

/**
 * @param {{bolum_id, musteriler:[{kisi_id?|firma_id?, hisse_yuzde?}], tutar_kurus?, para_birimi?, kur?, kur_tarihi?, satis_tarihi, rezervasyon_id?, notes?}} item
 * Arsa sahibi bölümü ve başkasına opsiyonlu/satılmış bölüm REDDEDİLİR. Tutar verilmezse o günkü liste fiyatı.
 */
export function olustur(item, aktor) {
  rezervasyon.suresiDolanlariSerbestBirak(item.satis_tarihi, aktor);
  const b = bolum.getir(item.bolum_id);
  if (!b) throw new Error('Bölüm bulunamadı');
  const kapali = bolum.satisaKapaliNedeni(b);
  if (kapali) throw new Error(kapali);
  let rez = null;
  if (b.durum === 'opsiyonlu') {
    rez = item.rezervasyon_id ? rezervasyon.getir(item.rezervasyon_id) : null;
    if (!rez || rez.bolum_id !== b.id || rez.durum !== 'aktif') throw new Error('Bölüm başka bir opsiyon/satışta — yalnızca kendi aktif rezervasyonunuzla (rezervasyon_id) satış açabilirsiniz.');
  } else if (b.durum !== 'musait') throw new Error(`Bölüm "${b.durum}" durumunda — satılamaz.`);

  const musteriler = item.musteriler || [];
  if (!musteriler.length) throw new Error('En az bir müşteri gereklidir.');
  musteriler.forEach(musteriDogrula);
  const hisseler = musteriler.map((m) => m.hisse_yuzde ?? (musteriler.length === 1 ? 100 : NaN));
  if (hisseler.some(Number.isNaN) || Math.abs(hisseler.reduce((t, x) => t + x, 0) - 100) > 0.01) throw new Error('Hisse yüzdelerinin toplamı %100 olmalıdır.');

  let tutar = item.tutar_kurus; let para = item.para_birimi;
  if (tutar == null) {
    const f = bolum.fiyatGetir(b.id, item.satis_tarihi);
    if (!f) throw new Error('Bu bölüm için geçerli bir liste fiyatı yok — tutar_kurus verin veya fiyat tanımlayın.');
    tutar = f.fiyat_kurus; para = para || f.para_birimi;
  }
  if (!Number.isInteger(tutar) || tutar <= 0) throw new Error('tutar_kurus pozitif tam sayı (kuruş) olmalıdır.');
  para = para || 'TRY';
  const ilk = musteriler[0];

  db.exec('BEGIN');
  try {
    const soz = sozlesme.olustur({
      tip: 'musteri_satis', proje_id: b.proje_id, konu: `Bağımsız bölüm satışı — ${bolum.etiket(b)} (${b.tip})`, bedel_kurus: tutar, para_birimi: para,
      kur: item.kur ?? 1, kur_tarihi: item.kur_tarihi ?? item.satis_tarihi, baslangic_tarihi: item.satis_tarihi,
      taraf_firma_id: ilk.firma_id ?? undefined, taraf_kisi_id: ilk.kisi_id ?? undefined,
    }, aktor);
    const row = {
      proje_id: b.proje_id, bolum_id: b.id, sozlesme_id: soz.id, tutar_kurus: tutar, para_birimi: para, kur: item.kur ?? 1, kur_tarihi: item.kur_tarihi ?? item.satis_tarihi,
      satis_tarihi: item.satis_tarihi, kaparo_kurus: rez?.kaparo_kurus ?? 0, rezervasyon_id: rez?.id ?? null, notes: item.notes ?? null, olusturan: aktor ?? null,
    };
    let info;
    try { info = stmtInsert.run(row); }
    catch (err) {
      if (String(err.message || '').includes('UNIQUE')) throw new Error('Bu bölüm için zaten canlı bir satış var.');
      throw err;
    }
    const id = info.lastInsertRowid;
    musteriler.forEach((m, i) => stmtMusteriInsert.run(id, m.kisi_id ?? null, m.firma_id ?? null, hisseler[i]));
    if (rez) { stmtAday.run('satis', rez.id); rezervasyon.satisaDonustur(rez.id); }
    bolum.durumAyarla(b.id, 'opsiyonlu', aktor); // taslak satış bölümü tutar
    audit.kaydet('satis', id, 'OLUSTUR', aktor, { yeni: row });
    db.exec('COMMIT');
    return getir(id);
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function getir(id) {
  const s = stmtGet.get(id);
  return s ? { ...s, musteriler: stmtMusteriler.all(id) } : undefined;
}
export function projeIcinListele(projeId) { return stmtListeProje.all(projeId).map((s) => ({ ...s, musteriler: stmtMusteriler.all(s.id) })); }
/** Müşteri kartı için: bir kişinin/firmanın (iptal olmayan) satışları. */
export function musteriIcinListele({ kisi_id, firma_id }) {
  const k = kisi_id ?? null; const f = firma_id ?? null;
  return stmtMusteriSatislari.all(k, k, f, f).map((s) => ({ ...s, musteriler: stmtMusteriler.all(s.id) }));
}

/**
 * ONAY: aktif ödeme planı şart; P2 sözleşmesi onayda→imzali→yururlukte'ye
 * taşınır (P2 imzada GELİR taahhüdünü yazar); bölüm 'satildi'; rezervasyondan
 * gelen kaparo İLK TAHSİLAT olarak kaydedilir.
 */
export function onayla(id, aktor) {
  const s = stmtGet.get(id);
  if (!s) throw new Error('Satış bulunamadı');
  if (s.durum !== 'taslak') throw new Error(`Satış "taslak" durumunda değil (şu an: ${s.durum}).`);
  if (!odemePlani.planGetir(id)) throw new Error('Satış onayı için aktif bir ödeme planı gereklidir.');
  db.exec('BEGIN');
  try {
    for (const d of ['onayda', 'imzali', 'yururlukte']) sozlesme.durumDegistir(s.sozlesme_id, d, aktor);
    stmtDurum.run('onayli', aktor ?? null, id);
    bolum.durumAyarla(s.bolum_id, 'satildi', aktor);
    audit.kaydet('satis', id, 'GUNCELLE', aktor, { durum: ['taslak', 'onayli'] });
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  if (s.kaparo_kurus > 0 && !s.kaparo_tahsil_edildi) {
    tahsilat.kaydet({ satis_id: id, tutar_kurus: s.kaparo_kurus, tarih: s.satis_tarihi, yontem: 'kaparo', notes: 'Rezervasyon kaparosu' }, aktor);
    db.prepare('UPDATE satis SET kaparo_tahsil_edildi = 1 WHERE id = ?').run(id);
  }
  return getir(id);
}

/** Yalnızca TASLAK satış iptal edilir (onaylı satışın iptali sözleşme feshi gerektirir — kapsam dışı). */
export function iptalEt(id, aktor) {
  const s = stmtGet.get(id);
  if (!s) throw new Error('Satış bulunamadı');
  if (s.durum !== 'taslak') throw new Error('Onaylı satış bu servisle iptal edilemez (sözleşme feshi gerekir).');
  stmtDurum.run('iptal', aktor ?? null, id);
  bolum.durumAyarla(s.bolum_id, 'musait', aktor);
  audit.kaydet('satis', id, 'IPTAL', aktor, null);
  return getir(id);
}
