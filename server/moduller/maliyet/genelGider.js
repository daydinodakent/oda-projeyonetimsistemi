// Genel Gider Dağıtımı — merkez ofis/genel müdürlük giderleri (defterde ayrı
// bir "havuz" proje_id'sinde GERÇEKLEŞEN olarak durur) projelere dağıtım
// anahtarıyla dağıtılır. Anahtar PARAMETRİKTİR: 'maliyet_genel_gider_anahtari'
// (1 = ciro, 2 = maliyet, 3 = süre; tanımsızsa 2/maliyet ve sonuçta işaretlenir).
// Dağıtım bir ANALİZ sonucudur — Maliyet Defteri'ne satır YAZMAZ (kaynak veri
// üretmez); raporlarda "dağıtılmış genel gider" olarak ayrıca gösterilir.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as isProgrami from '../santiye/isProgrami.js';
import { tlCevir } from './rapor.js';

const ANAHTARLAR = { 1: 'ciro', 2: 'maliyet', 3: 'sure' };
const stmtInsert = db.prepare('INSERT INTO genel_gider_dagitim (havuz_proje_id, donem_baslangic, donem_bitis, anahtar, toplam_kurus, olusturan) VALUES (?, ?, ?, ?, ?, ?)');
const stmtGet = db.prepare('SELECT * FROM genel_gider_dagitim WHERE id = ?');
const stmtBul = db.prepare('SELECT * FROM genel_gider_dagitim WHERE havuz_proje_id = ? AND donem_baslangic = ? AND donem_bitis = ?');
const stmtSil = db.prepare('DELETE FROM genel_gider_dagitim WHERE id = ?');
const stmtPaySil = db.prepare('DELETE FROM genel_gider_pay WHERE dagitim_id = ?');
const stmtPayInsert = db.prepare('INSERT INTO genel_gider_pay (dagitim_id, proje_id, oran, tutar_kurus) VALUES (?, ?, ?, ?)');
const stmtPaylar = db.prepare('SELECT * FROM genel_gider_pay WHERE dagitim_id = ? ORDER BY proje_id');
const stmtProjePayi = db.prepare('SELECT COALESCE(SUM(tutar_kurus), 0) AS t FROM genel_gider_pay WHERE proje_id = ?');
const stmtListe = db.prepare('SELECT * FROM genel_gider_dagitim WHERE havuz_proje_id = ? ORDER BY donem_baslangic DESC');

const gunFarki = (a, b) => Math.max(0, Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000) + 1);

function agirlik(projeId, anahtar, bas, bit) {
  const ctx = { projeId, satirlar: new Map(), kurBazi: 'nominal', tarih: bit };
  if (anahtar === 'sure') {
    const akt = isProgrami.listele(projeId);
    if (!akt.length) return 0;
    const min = akt.reduce((a, x) => (x.plan_baslangic < a ? x.plan_baslangic : a), akt[0].plan_baslangic);
    const max = akt.reduce((a, x) => (x.plan_bitis > a ? x.plan_bitis : a), akt[0].plan_bitis);
    const kesBas = min > bas ? min : bas; const kesBit = max < bit ? max : bit;
    return kesBit >= kesBas ? gunFarki(kesBit, kesBas) : 0;
  }
  let t = 0;
  for (const h of maliyetDefteri.projeIcinListele(projeId)) {
    if (h.tarih < bas || h.tarih > bit) continue;
    const tl = tlCevir(h.para_birimi, h.tutar_kurus, h.kur, h.maliyet_kodu_id, ctx);
    if (anahtar === 'ciro' && h.tur === 'GELIR' && h.kaynak_modul === 'sozlesme') t += tl;
    if (anahtar === 'maliyet' && h.tur === 'GERCEKLESEN') t += tl;
  }
  return t;
}

/** Aynı havuz+dönem için yeniden hesaplama önceki sonucu DEĞİŞTİRİR (tek geçerli dağıtım). */
export function dagit(havuzProjeId, baslangic, bitis, aktor) {
  const p = parametre.degerAl('maliyet_genel_gider_anahtari', bitis);
  const anahtar = p ? ANAHTARLAR[p.deger] : 'maliyet';
  if (!anahtar) throw new Error('maliyet_genel_gider_anahtari 1 (ciro), 2 (maliyet) veya 3 (süre) olmalıdır.');
  const havuzCtx = { projeId: havuzProjeId, satirlar: new Map(), kurBazi: 'nominal', tarih: bitis };
  const toplam = maliyetDefteri.projeIcinListele(havuzProjeId)
    .filter((h) => h.tur === 'GERCEKLESEN' && h.tarih >= baslangic && h.tarih <= bitis)
    .reduce((t, h) => t + tlCevir(h.para_birimi, h.tutar_kurus, h.kur, h.maliyet_kodu_id, havuzCtx), 0);
  const projeler = maliyetDefteri.projeleriListele().filter((x) => x !== havuzProjeId);
  const agirliklar = projeler.map((x) => ({ proje_id: x, w: agirlik(x, anahtar, baslangic, bitis) }));
  const wToplam = agirliklar.reduce((t, x) => t + x.w, 0);
  if (wToplam <= 0) throw new Error(`Dağıtım anahtarı "${anahtar}" için hiçbir projede ağırlık bulunamadı — dağıtım yapılamaz.`);

  db.exec('BEGIN');
  try {
    const eski = stmtBul.get(havuzProjeId, baslangic, bitis);
    if (eski) { stmtPaySil.run(eski.id); stmtSil.run(eski.id); }
    const id = stmtInsert.run(havuzProjeId, baslangic, bitis, anahtar, toplam, aktor ?? null).lastInsertRowid;
    let dagitilan = 0;
    const aktifler = agirliklar.filter((x) => x.w > 0);
    aktifler.forEach((x, i) => {
      const tutar = i === aktifler.length - 1 ? toplam - dagitilan : Math.round(toplam * (x.w / wToplam)); // son projeye küsurat — toplam BOZULMAZ
      dagitilan += tutar;
      stmtPayInsert.run(id, x.proje_id, Number((x.w / wToplam).toFixed(6)), tutar);
    });
    audit.kaydet('genel_gider_dagitim', id, 'OLUSTUR', aktor, { havuz: havuzProjeId, baslangic, bitis, anahtar, toplam });
    db.exec('COMMIT');
    return { ...stmtGet.get(id), paylar: stmtPaylar.all(id), anahtar_tanimli_mi: !!p };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
export function dagitimlariListele(havuzProjeId) { return stmtListe.all(havuzProjeId).map((d) => ({ ...d, paylar: stmtPaylar.all(d.id) })); }
/** Bir projenin tüm dönemlerdeki dağıtılmış genel gider payı (TL kuruş). */
export function projePayi(projeId) { return stmtProjePayi.get(projeId).t; }
