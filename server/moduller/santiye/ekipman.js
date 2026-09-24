// Ekipman (makine) — kiralık/öz mal, saat sayacı, yakıt, arıza, operatör,
// günlük çalışma saati → Maliyet Defteri GERÇEKLEŞEN (makine/ekipman).
// Kiralıksa birim fiyat Sözleşme'den (P2, tip='kira') OKUNUR — burada kopyalanmaz.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as belge from '../_cekirdek/belge.js';
import * as sozlesme from '../sozlesme/sozlesme.js';

const stmtInsert = db.prepare(
  `INSERT INTO ekipman (proje_id, ad, plaka_seri, sahiplik, kira_sozlesme_id, ozmal_saat_maliyeti_kurus, olusturan)
   VALUES (@proje_id, @ad, @plaka_seri, @sahiplik, @kira_sozlesme_id, @ozmal_saat_maliyeti_kurus, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM ekipman WHERE id = ? AND row_status = 1');
const stmtListe = db.prepare('SELECT * FROM ekipman WHERE proje_id = ? AND row_status = 1 ORDER BY ad');
const stmtSayac = db.prepare('UPDATE ekipman SET sayac_saat = sayac_saat + ? WHERE id = ?');
const stmtDurum = db.prepare('UPDATE ekipman SET durum = ? WHERE id = ?');
const stmtCalismaInsert = db.prepare(
  `INSERT INTO ekipman_calisma (ekipman_id, proje_id, tarih, calisma_saat, yakit_litre, ariza_notu, operator_kisi_id, maliyet_kodu_id, tutar_kurus, istemci_kayit_id, olusturan)
   VALUES (@ekipman_id, @proje_id, @tarih, @calisma_saat, @yakit_litre, @ariza_notu, @operator_kisi_id, @maliyet_kodu_id, @tutar_kurus, @istemci_kayit_id, @olusturan)`
);
const stmtCalismaGet = db.prepare('SELECT * FROM ekipman_calisma WHERE id = ?');
const stmtCalismaIstemci = db.prepare('SELECT * FROM ekipman_calisma WHERE istemci_kayit_id = ?');
const stmtCalismaListe = db.prepare('SELECT * FROM ekipman_calisma WHERE ekipman_id = ? ORDER BY tarih DESC, id DESC');
const stmtCalismaGun = db.prepare('SELECT * FROM ekipman_calisma WHERE proje_id = ? AND tarih = ?');

export function olustur(item, aktor) {
  if (!['kiralik', 'oz_mal'].includes(item.sahiplik)) throw new Error('sahiplik "kiralik" veya "oz_mal" olmalıdır.');
  if (item.sahiplik === 'kiralik') {
    const s = item.kira_sozlesme_id ? sozlesme.getir(item.kira_sozlesme_id) : null;
    if (!s || s.tip !== 'kira') throw new Error('Kiralık ekipman için tip="kira" olan bir sözleşme (kira_sozlesme_id) zorunludur.');
  }
  const row = {
    proje_id: item.proje_id, ad: item.ad, plaka_seri: item.plaka_seri ?? null, sahiplik: item.sahiplik,
    kira_sozlesme_id: item.kira_sozlesme_id ?? null, ozmal_saat_maliyeti_kurus: item.ozmal_saat_maliyeti_kurus ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('ekipman', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(info.lastInsertRowid);
}
export function getir(id) { return stmtGet.get(id); }
export function listele(projeId) { return stmtListe.all(projeId); }
export function arizaBildir(id, notu, aktor) {
  if (!stmtGet.get(id)) throw new Error('Ekipman bulunamadı');
  stmtDurum.run('arizali', id);
  audit.kaydet('ekipman', id, 'GUNCELLE', aktor, { durum: 'arizali', not: notu });
  return stmtGet.get(id);
}

/** Birim (saat) fiyatı: kiralıkta Sözleşme kalemi (birim 'saat' varsa o, yoksa ilk kalem); öz malda opsiyonel manuel maliyet. Yoksa null. */
export function saatFiyatiGetir(e) {
  if (e.sahiplik === 'kiralik') {
    const kalemler = sozlesme.kalemleriGetir(e.kira_sozlesme_id);
    const k = kalemler.find((x) => String(x.birim).toLowerCase() === 'saat') || kalemler[0];
    return k ? k.birim_fiyat_kurus : null;
  }
  return e.ozmal_saat_maliyeti_kurus ?? null;
}

/** Operatörün SRC/operatör belgesi geçerli mi? (İK/Çekirdek Belge'den OKUNUR — uyarı, engel değil.) */
export function operatorBelgesiUyarisi(kisiId, tarih) {
  const b = belge.ilgiliIcinListele('kisi', kisiId).filter((x) => x.tur === 'src_operator');
  if (!b.length) return 'Operatörün SRC/operatör belgesi kayıtlı değil';
  if (!b.some((x) => !x.gecerlilik_bitis || x.gecerlilik_bitis >= tarih)) return 'Operatörün SRC/operatör belgesinin süresi dolmuş';
  return null;
}

/**
 * Çalışma kaydı: sayaç artar; tutar = saat × birim fiyat → maliyet_kodu_id
 * varsa GERÇEKLEŞEN (makine/ekipman) yazılır. maliyet_kodu kaynak tipi
 * 'makine_ekipman' olmalıdır. istemci_kayit_id ile çevrimdışı tekrar
 * gönderim mükerrer kayıt AÇMAZ.
 */
export function calismaKaydet(item, aktor) {
  if (item.istemci_kayit_id) {
    const m = stmtCalismaIstemci.get(item.istemci_kayit_id);
    if (m) return { kayit: m, tekrarGonderim: true, uyarilar: [] };
  }
  const e = stmtGet.get(item.ekipman_id);
  if (!e) throw new Error('Ekipman bulunamadı');
  if (!(item.calisma_saat > 0)) throw new Error('calisma_saat pozitif olmalıdır.');
  const uyarilar = [];
  if (item.operator_kisi_id) { const u = operatorBelgesiUyarisi(item.operator_kisi_id, item.tarih); if (u) uyarilar.push(u); }
  const fiyat = saatFiyatiGetir(e);
  let tutar = null;
  if (fiyat != null) tutar = Math.round(item.calisma_saat * fiyat);
  else uyarilar.push('Saat fiyatı bulunamadı (kira sözleşmesinde kalem yok / öz mal maliyeti tanımsız) — maliyet yazılmadı');
  if (item.maliyet_kodu_id) {
    const mk = maliyetKodu.listele(e.proje_id).find((x) => x.id === Number(item.maliyet_kodu_id));
    if (!mk || mk.kaynak_tipi !== 'makine_ekipman') throw new Error('maliyet_kodu_id, bu projenin "makine_ekipman" kaynak tipli bir maliyet kodu olmalıdır.');
  }
  const row = {
    ekipman_id: e.id, proje_id: e.proje_id, tarih: item.tarih, calisma_saat: item.calisma_saat, yakit_litre: item.yakit_litre ?? null,
    ariza_notu: item.ariza_notu ?? null, operator_kisi_id: item.operator_kisi_id ?? null, maliyet_kodu_id: item.maliyet_kodu_id ?? null,
    tutar_kurus: tutar, istemci_kayit_id: item.istemci_kayit_id ?? null, olusturan: aktor ?? null,
  };
  const info = stmtCalismaInsert.run(row);
  const id = info.lastInsertRowid;
  stmtSayac.run(item.calisma_saat, e.id);
  if (item.ariza_notu) stmtDurum.run('arizali', e.id);
  audit.kaydet('ekipman_calisma', id, 'OLUSTUR', aktor, { yeni: row });
  if (tutar && item.maliyet_kodu_id) {
    maliyetDefteri.yaz({
      proje_id: e.proje_id, maliyet_kodu_id: Number(item.maliyet_kodu_id), tur: 'GERCEKLESEN', tutar_kurus: tutar, tarih: item.tarih,
      kaynak_modul: 'santiye_ekipman_calisma', kaynak_id: String(id), notes: `${e.ad} — ${item.calisma_saat} saat`,
    }, aktor);
  } else if (tutar) uyarilar.push('maliyet_kodu_id verilmediği için Maliyet Defteri\'ne yazılmadı');
  return { kayit: stmtCalismaGet.get(id), tekrarGonderim: false, uyarilar };
}
export function calismalariGetir(ekipmanId) { return stmtCalismaListe.all(ekipmanId); }
export function projeGunuCalismalari(projeId, tarih) { return stmtCalismaGun.all(projeId, tarih); }
