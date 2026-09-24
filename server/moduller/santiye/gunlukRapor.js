// Günlük Şantiye Raporu (iç rapor). Çalışan sayıları Çekirdek puantajdan
// (İK P7 / Taşeron P6 / Alt Yüklenici işçileri AYNI tabloyu yazar), gelen
// malzeme Depo mal kabulünden, makine çalışması Ekipman kayıtlarından
// OTOMATİK gelir; şef yalnızca DÜZELTİR (otomatik_sayi korunur, sayi ezer).
// Onaylanan rapor kilitlenir. İç rapordan resmi şantiye defteri TASLAĞI
// üretilir — resmi defterin (yapı denetim) yerine GEÇMEZ.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as cekirdekPuantaj from '../_cekirdek/puantaj.js';
import * as kisiSrv from '../_cekirdek/kisi.js';
import * as cariFirma from '../_cekirdek/cariFirma.js';
import * as malzemeSrv from '../depo/malzeme.js';
import * as malKabul from '../depo/malKabul.js';
import * as ekipman from './ekipman.js';
import { getRecord } from '../../db.js';

const stmtInsert = db.prepare('INSERT INTO gunluk_rapor (proje_id, tarih, hava_durumu, sicaklik_c, sorunlar, olusturan) VALUES (?, ?, ?, ?, ?, ?)');
const stmtGet = db.prepare('SELECT * FROM gunluk_rapor WHERE id = ? AND row_status = 1');
const stmtGetGun = db.prepare('SELECT * FROM gunluk_rapor WHERE proje_id = ? AND tarih = ? AND row_status = 1');
const stmtListe = db.prepare('SELECT * FROM gunluk_rapor WHERE proje_id = ? AND row_status = 1 ORDER BY tarih DESC');
const stmtGuncelle = db.prepare('UPDATE gunluk_rapor SET hava_durumu = ?, sicaklik_c = ?, sorunlar = ?, write_uid = ?, write_date = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?');
const stmtOnay = db.prepare("UPDATE gunluk_rapor SET durum = 'onayli', write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtTaslak = db.prepare('UPDATE gunluk_rapor SET resmi_defter_taslagi = ? WHERE id = ?');
const stmtBolumInsert = db.prepare(
  `INSERT INTO gunluk_rapor_bolum (rapor_id, tur, etiket, otomatik_sayi, sayi, wbs_gorev_id, ref_modul, ref_id, lat, lon, dosya_url, notes)
   VALUES (@rapor_id, @tur, @etiket, @otomatik_sayi, @sayi, @wbs_gorev_id, @ref_modul, @ref_id, @lat, @lon, @dosya_url, @notes)`
);
const stmtBolumGet = db.prepare('SELECT * FROM gunluk_rapor_bolum WHERE id = ?');
const stmtBolumListe = db.prepare('SELECT * FROM gunluk_rapor_bolum WHERE rapor_id = ? ORDER BY tur, id');
const stmtBolumSayi = db.prepare('UPDATE gunluk_rapor_bolum SET sayi = ? WHERE id = ?');
const stmtOtomatikSil = db.prepare('DELETE FROM gunluk_rapor_bolum WHERE rapor_id = ? AND otomatik_sayi IS NOT NULL AND sayi IS NULL');
const stmtDuzeltilmisEtiketler = db.prepare('SELECT tur, etiket FROM gunluk_rapor_bolum WHERE rapor_id = ? AND otomatik_sayi IS NOT NULL AND sayi IS NOT NULL');

const HAVA_ETIKET = { gunesli: 'Güneşli', bulutlu: 'Bulutlu', yagmurlu: 'Yağmurlu', karli: 'Karlı', ruzgarli: 'Rüzgarlı' };

function kilitKontrol(r) { if (r.durum === 'onayli') throw new Error('Onaylanmış günlük rapor değiştirilemez.'); }

function bolumRow(rapor_id, o) {
  return { rapor_id, tur: o.tur, etiket: o.etiket, otomatik_sayi: o.otomatik_sayi ?? null, sayi: o.sayi ?? null, wbs_gorev_id: o.wbs_gorev_id ?? null, ref_modul: o.ref_modul ?? null, ref_id: o.ref_id ?? null, lat: o.lat ?? null, lon: o.lon ?? null, dosya_url: o.dosya_url ?? null, notes: o.notes ?? null };
}

/** Otomatik bölümleri (çalışan/malzeme/makine) kaynak modüllerden hesaplar — DB'ye YAZMAZ. */
export function otomatikBolumler(projeId, tarih) {
  const sonuc = [];
  const gruplar = new Map();
  for (const p of cekirdekPuantaj.projeGunuListele(projeId, tarih)) {
    if (!(p.gun_degeri > 0)) continue;
    const k = kisiSrv.getir(p.kisi_id);
    if (!k) continue;
    let etiket;
    if (k.rol === 'personel') etiket = 'İK Personeli';
    else {
      const f = k.firma_id ? cariFirma.getir(k.firma_id) : null;
      etiket = `${k.rol === 'taseron_iscisi' ? 'Taşeron' : k.rol === 'alt_yuklenici_iscisi' ? 'Alt Yüklenici' : 'Diğer'}: ${f?.unvan ?? 'firma belirtilmemiş'}`;
    }
    gruplar.set(etiket, (gruplar.get(etiket) || 0) + 1);
  }
  for (const [etiket, sayi] of gruplar) sonuc.push({ tur: 'calisan', etiket, otomatik_sayi: sayi, ref_modul: 'cekirdek_puantaj' });
  for (const m of malKabul.projeGunuIcinListele(projeId, tarih)) {
    const mz = m.malzeme_id ? malzemeSrv.getir(m.malzeme_id) : null;
    sonuc.push({ tur: 'malzeme', etiket: `${mz?.ad ?? m.kalem_aciklama ?? 'Malzeme'} (${m.birim})`, otomatik_sayi: m.kabul_miktar, ref_modul: 'depo_mal_kabul', ref_id: String(m.id) });
  }
  for (const c of ekipman.projeGunuCalismalari(projeId, tarih)) {
    const e = ekipman.getir(c.ekipman_id);
    sonuc.push({ tur: 'makine', etiket: `${e?.ad ?? 'Makine'} (saat)`, otomatik_sayi: c.calisma_saat, ref_modul: 'santiye_ekipman_calisma', ref_id: String(c.id) });
  }
  return sonuc;
}

/** Günün raporunu açar (varsa mevcut olanı döner) ve otomatik bölümleri çeker. */
export function olustur(projeId, tarih, aktor) {
  const mevcut = stmtGetGun.get(projeId, tarih);
  if (mevcut) return getir(mevcut.id);
  const info = stmtInsert.run(projeId, tarih, null, null, null, aktor ?? null);
  const id = info.lastInsertRowid;
  audit.kaydet('gunluk_rapor', id, 'OLUSTUR', aktor, { proje_id: projeId, tarih });
  for (const o of otomatikBolumler(projeId, tarih)) stmtBolumInsert.run(bolumRow(id, o));
  return getir(id);
}

/** Şef düzeltmesi yapılmamış otomatik satırları yeniden çeker; düzeltilmiş satırlara DOKUNMAZ. */
export function otomatikYenile(raporId, aktor) {
  const r = stmtGet.get(raporId);
  if (!r) throw new Error('Rapor bulunamadı');
  kilitKontrol(r);
  const duzeltilmis = new Set(stmtDuzeltilmisEtiketler.all(raporId).map((x) => `${x.tur}|${x.etiket}`));
  stmtOtomatikSil.run(raporId);
  for (const o of otomatikBolumler(r.proje_id, r.tarih)) if (!duzeltilmis.has(`${o.tur}|${o.etiket}`)) stmtBolumInsert.run(bolumRow(raporId, o));
  audit.kaydet('gunluk_rapor', raporId, 'GUNCELLE', aktor, { otomatik_yenile: true });
  return getir(raporId);
}

export function getir(id) {
  const r = stmtGet.get(id);
  if (!r) return undefined;
  const bolumler = stmtBolumListe.all(id).map((b) => ({ ...b, gecerli_sayi: b.sayi ?? b.otomatik_sayi, duzeltildi_mi: b.otomatik_sayi != null && b.sayi != null && b.sayi !== b.otomatik_sayi }));
  return { ...r, bolumler };
}
export function gunIcinGetir(projeId, tarih) { const r = stmtGetGun.get(projeId, tarih); return r ? getir(r.id) : null; }
export function listele(projeId) { return stmtListe.all(projeId); }

export function guncelle(id, patch, aktor) {
  const r = stmtGet.get(id);
  if (!r) throw new Error('Rapor bulunamadı');
  kilitKontrol(r);
  stmtGuncelle.run(patch.hava_durumu ?? r.hava_durumu, patch.sicaklik_c ?? r.sicaklik_c, patch.sorunlar ?? r.sorunlar, aktor ?? null, id);
  audit.kaydet('gunluk_rapor', id, 'GUNCELLE', aktor, { patch });
  return getir(id);
}

/** Şef düzeltmesi: otomatik sayıyı ezer (otomatik_sayi korunur — denetim için fark görünür). */
export function sayiDuzelt(bolumId, sayi, aktor) {
  const b = stmtBolumGet.get(bolumId);
  if (!b) throw new Error('Bölüm bulunamadı');
  kilitKontrol(stmtGet.get(b.rapor_id));
  if (!(sayi >= 0)) throw new Error('Sayı negatif olamaz.');
  stmtBolumSayi.run(sayi, bolumId);
  audit.kaydet('gunluk_rapor_bolum', bolumId, 'GUNCELLE', aktor, { otomatik_sayi: b.otomatik_sayi, sayi });
  return stmtBolumGet.get(bolumId);
}

/** Elle bölüm: yapılan iş (WBS'li), fotoğraf (konumlu), elle makine/malzeme satırı. */
export function bolumEkle(raporId, item, aktor) {
  const r = stmtGet.get(raporId);
  if (!r) throw new Error('Rapor bulunamadı');
  kilitKontrol(r);
  if (!['is', 'fotograf', 'makine', 'malzeme', 'calisan'].includes(item.tur)) throw new Error(`Geçersiz bölüm türü: ${item.tur}`);
  if (item.wbs_gorev_id && !getRecord('tb_wbs_gorevler', item.wbs_gorev_id)) throw new Error(`WBS görevi bulunamadı: ${item.wbs_gorev_id}`);
  const info = stmtBolumInsert.run(bolumRow(raporId, { ...item, otomatik_sayi: null, sayi: item.sayi ?? null }));
  audit.kaydet('gunluk_rapor_bolum', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: item });
  return stmtBolumGet.get(info.lastInsertRowid);
}

export function onayla(id, aktor) {
  const r = stmtGet.get(id);
  if (!r) throw new Error('Rapor bulunamadı');
  kilitKontrol(r);
  if (!r.hava_durumu) throw new Error('Onay için hava durumu girilmelidir.');
  stmtOnay.run(aktor ?? null, id);
  audit.kaydet('gunluk_rapor', id, 'GUNCELLE', aktor, { durum: 'onayli' });
  return getir(id);
}

/** İç rapordan resmi şantiye defteri TASLAĞI (metin) üretir ve kaydeder. */
export function resmiDefterTaslagiUret(id, aktor) {
  const r = getir(id);
  if (!r) throw new Error('Rapor bulunamadı');
  const satir = (tur, baslik) => {
    const l = r.bolumler.filter((b) => b.tur === tur);
    return l.length ? `${baslik}:\n${l.map((b) => `  - ${b.etiket}${b.gecerli_sayi != null ? `: ${b.gecerli_sayi}` : ''}${b.notes ? ` (${b.notes})` : ''}`).join('\n')}\n` : '';
  };
  const metin = [
    `ŞANTİYE DEFTERİ — TASLAK (resmi deftere işlenmeden önce yapı denetim/şantiye şefi tarafından kontrol edilmelidir)`,
    `Tarih: ${r.tarih}    Proje: ${r.proje_id}`,
    `Hava: ${HAVA_ETIKET[r.hava_durumu] ?? r.hava_durumu ?? '—'}${r.sicaklik_c != null ? `, ${r.sicaklik_c}°C` : ''}`, '',
    satir('calisan', 'Çalışan personel'), satir('makine', 'Çalışan makine/ekipman'), satir('is', 'Yapılan işler'), satir('malzeme', 'Gelen malzeme'),
    r.sorunlar ? `Sorunlar / notlar:\n  ${r.sorunlar}\n` : '',
    `Bu metin ODA+ iç günlük raporundan otomatik üretilmiştir; resmi defter yerine geçmez.`,
  ].join('\n');
  stmtTaslak.run(metin, id);
  audit.kaydet('gunluk_rapor', id, 'GUNCELLE', aktor, { resmi_defter_taslagi: true });
  return metin;
}

const stmtIstemciIsaretle = db.prepare('UPDATE gunluk_rapor SET son_istemci_kayit_id = ? WHERE id = ?');
const stmtBolumEtiketTur = db.prepare('SELECT * FROM gunluk_rapor_bolum WHERE rapor_id = ? AND tur = ? AND etiket = ?');

/**
 * Mobil sihirbazın TEK ATOMİK kaydı (çevrimdışı kuyruktan gelir): raporu açar
 * (otomatik bölümler çekilir), hava/sorun günceller, şef DÜZELTMELERİNİ
 * (tur+etiket ile eşleşen otomatik satırın sayısı) ve yeni bölümleri ekler.
 * Aynı istemci_kayit_id ikinci kez gelirse HİÇBİR ŞEY YAPMAZ (mükerrer bölüm
 * oluşmaz). Hata olursa tüm işlem geri alınır.
 */
export function topluKaydet(payload, aktor) {
  const mevcut = stmtGetGun.get(payload.proje_id, payload.tarih);
  if (payload.istemci_kayit_id && mevcut && mevcut.son_istemci_kayit_id === payload.istemci_kayit_id) return { rapor: getir(mevcut.id), tekrarGonderim: true };
  db.exec('BEGIN');
  try {
    const rapor = olustur(payload.proje_id, payload.tarih, aktor);
    guncelle(rapor.id, { hava_durumu: payload.hava_durumu, sicaklik_c: payload.sicaklik_c, sorunlar: payload.sorunlar }, aktor);
    for (const d of payload.duzeltmeler || []) {
      const b = stmtBolumEtiketTur.get(rapor.id, d.tur, d.etiket);
      if (!b) throw new Error(`Düzeltilecek bölüm bulunamadı: ${d.tur} / ${d.etiket}`);
      sayiDuzelt(b.id, d.sayi, aktor);
    }
    for (const b of payload.bolumler || []) bolumEkle(rapor.id, b, aktor);
    if (payload.istemci_kayit_id) stmtIstemciIsaretle.run(payload.istemci_kayit_id, rapor.id);
    db.exec('COMMIT');
    return { rapor: getir(rapor.id), tekrarGonderim: false };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
