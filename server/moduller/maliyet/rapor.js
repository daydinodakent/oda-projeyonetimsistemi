// Maliyet Raporu — WBS ağacı × {bütçe, taahhüt, gerçekleşen, kalan, EAC,
// sapma, sapma %}. Taahhüt/gerçekleşen/gelir YALNIZCA Maliyet Defteri'nden
// (Çekirdek maliyetDefteri) okunur; bütçe seçilen bütçe versiyonundan.
//
// Tanımlar (hepsi TL):
//   kalan_taahhut   = max(0, taahhüt − gerçekleşen)   (defterde taahhüt↔gerçekleşen bağı yok → kod düzeyinde yaklaşım)
//   tahmin_kalan    = elle girilen kalan tahmin, yoksa max(0, bütçe − max(taahhüt, gerçekleşen))  ("taahhüt edilmemiş kalan")
//   EAC             = gerçekleşen + kalan_taahhut + tahmin_kalan
//   sapma           = bütçe − EAC   (negatif = bütçe aşımı);  sapma_yuzde = sapma / bütçe × 100
//   kalan           = bütçe − gerçekleşen
// Kur bazı: 'nominal' (hareketin kendi kuru), 'sabit' (bütçe kuru), 'guncel'
// (parametre kur_<PB>, yürürlük tarihli). TRY hareketler her zaman 1.
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as butce from './butce.js';
import { getRecord, listRecords } from '../../db.js';

export const KUR_BAZLARI = ['nominal', 'sabit', 'guncel'];

export function baglamOlustur(projeId, { versiyonId, kurBazi = 'nominal', tarih } = {}) {
  if (!KUR_BAZLARI.includes(kurBazi)) throw new Error(`Geçersiz kur bazı: ${kurBazi} (${KUR_BAZLARI.join('/')})`);
  const versiyon = versiyonId ? butce.versiyonGetir(Number(versiyonId)) : (butce.guncelVersiyon(projeId) || null);
  if (versiyonId && (!versiyon || versiyon.proje_id !== projeId)) throw new Error('Bütçe versiyonu bu projeye ait değil.');
  const satirlar = new Map((versiyon ? butce.satirlariGetir(versiyon.id) : []).map((s) => [s.maliyet_kodu_id, s]));
  return { projeId, versiyon, satirlar, kurBazi, tarih: tarih || new Date().toISOString().slice(0, 10) };
}

/** Bir tutarı (kendi para biriminde, kuruş) TL kuruşa çevirir. */
export function tlCevir(pb, tutarKurus, hareketKuru, maliyetKoduId, ctx) {
  if (!pb || pb === 'TRY') return tutarKurus;
  let kur = hareketKuru || 1;
  if (ctx.kurBazi === 'sabit') {
    const b = ctx.satirlar.get(maliyetKoduId);
    kur = b && b.para_birimi === pb ? b.kur : (parametre.degerAl(`butce_kur_${pb}`, ctx.tarih)?.deger ?? kur);
  } else if (ctx.kurBazi === 'guncel') kur = parametre.degerAl(`kur_${pb}`, ctx.tarih)?.deger ?? kur;
  return Math.round(tutarKurus * kur);
}

export function metrik({ butce: b = 0, taahhut = 0, gerceklesen = 0, tahminOverride = null }) {
  const kalanTaahhut = Math.max(0, taahhut - gerceklesen);
  const tahminKalan = tahminOverride != null ? tahminOverride : Math.max(0, b - Math.max(taahhut, gerceklesen));
  const eac = gerceklesen + kalanTaahhut + tahminKalan;
  const sapma = b - eac;
  return { butce: b, taahhut, gerceklesen, kalan_taahhut: kalanTaahhut, tahmin_kalan: tahminKalan, eac, kalan: b - gerceklesen, sapma, sapma_yuzde: b > 0 ? Number(((sapma / b) * 100).toFixed(2)) : null };
}
const topla = (liste) => liste.reduce((t, m) => ({ butce: t.butce + m.butce, taahhut: t.taahhut + m.taahhut, gerceklesen: t.gerceklesen + m.gerceklesen, kalan_taahhut: t.kalan_taahhut + m.kalan_taahhut, tahmin_kalan: t.tahmin_kalan + m.tahmin_kalan }), { butce: 0, taahhut: 0, gerceklesen: 0, kalan_taahhut: 0, tahmin_kalan: 0 });
function toplamMetrik(t) {
  const eac = t.gerceklesen + t.kalan_taahhut + t.tahmin_kalan; const sapma = t.butce - eac;
  return { ...t, eac, kalan: t.butce - t.gerceklesen, sapma, sapma_yuzde: t.butce > 0 ? Number(((sapma / t.butce) * 100).toFixed(2)) : null };
}

/** Ledger'ı maliyet kodu bazında toplar (tarih ≤ ctx.tarih). Ters kayıtlar negatif tutarla zaten netleşir. */
export function kodBazliToplamlar(ctx) {
  const map = new Map(); // maliyet_kodu_id|null → { taahhut, gerceklesen, gelir_taahhut, gelir_gerceklesen }
  for (const h of maliyetDefteri.projeIcinListele(ctx.projeId)) {
    if (h.tur === 'BUTCE' || h.tarih > ctx.tarih) continue;
    const anahtar = h.maliyet_kodu_id ?? null;
    const k = map.get(anahtar) || { taahhut: 0, gerceklesen: 0, gelir_sozlesme: 0, gelir_tahsilat: 0 };
    const tl = tlCevir(h.para_birimi, h.tutar_kurus, h.kur, anahtar, ctx);
    if (h.tur === 'TAAHHUT') k.taahhut += tl;
    else if (h.tur === 'GERCEKLESEN') k.gerceklesen += tl;
    else if (h.tur === 'GELIR') { if (h.kaynak_modul === 'musteri_tahsilat') k.gelir_tahsilat += tl; else k.gelir_sozlesme += tl; }
    map.set(anahtar, k);
  }
  return map;
}

const dogalSirala = (a, b) => String(a).localeCompare(String(b), 'tr', { numeric: true });

/** WBS kaydı → { kod, ad } */
function wbsBilgi(wbsGorevId) {
  const r = getRecord('tb_wbs_gorevler', wbsGorevId);
  return { kod: r?.wbs_code ? String(r.wbs_code) : `wbs-${wbsGorevId}`, ad: r?.name || '(WBS kaydı yok)' };
}

/** Bir WBS'in bütçesi (TL) — EVM ve kârlılık için. */
export function wbsButceleri(ctx) {
  const kodlar = maliyetKodu.listele(ctx.projeId);
  const m = new Map();
  for (const k of kodlar) {
    const s = ctx.satirlar.get(k.id);
    if (!s) continue;
    m.set(k.wbs_gorev_id, (m.get(k.wbs_gorev_id) || 0) + tlCevir(s.para_birimi, s.tutar_kurus, s.kur, k.id, { ...ctx, kurBazi: ctx.kurBazi === 'nominal' ? 'nominal' : ctx.kurBazi }));
  }
  return m;
}

export function maliyetRaporu(projeId, secenek = {}) {
  const ctx = baglamOlustur(projeId, secenek);
  const toplamlar = kodBazliToplamlar(ctx);
  const kodlar = maliyetKodu.listele(projeId);

  const kodSatirlari = kodlar.map((k) => {
    const b = ctx.satirlar.get(k.id);
    const t = toplamlar.get(k.id) || { taahhut: 0, gerceklesen: 0 };
    const bTl = b ? tlCevir(b.para_birimi, b.tutar_kurus, b.kur, k.id, ctx) : 0;
    return { maliyet_kodu_id: k.id, kod: k.kod, kaynak_tipi: k.kaynak_tipi, wbs_gorev_id: k.wbs_gorev_id, para_birimi: b?.para_birimi ?? 'TRY', ...metrik({ butce: bTl, taahhut: t.taahhut, gerceklesen: t.gerceklesen, tahminOverride: b?.kalan_tahmin_kurus ?? null }) };
  });
  // Bütçesi olup kodu listede olmayan/silinmiş kod yok varsayılır; kodsuz hareketler ayrı satır
  const kodsuz = toplamlar.get(null);
  const kodsuzSatir = kodsuz && (kodsuz.taahhut || kodsuz.gerceklesen)
    ? { maliyet_kodu_id: null, kod: '(maliyet kodsuz)', kaynak_tipi: null, wbs_gorev_id: null, para_birimi: 'TRY', ...metrik({ taahhut: kodsuz.taahhut, gerceklesen: kodsuz.gerceklesen }) } : null;

  // WBS düğümleri
  const wbsOnbellek = new Map();
  const wbsB = (id) => { if (!wbsOnbellek.has(id)) wbsOnbellek.set(id, wbsBilgi(id)); return wbsOnbellek.get(id); }; // P11: satır başına tekrar tekrar getRecord (O(K²)) yerine bir kez
  const dugumler = new Map(); // wbs_code → { kod, ad, kodlar:[], ozet }
  const wbsAdlari = new Map(listRecords('tb_wbs_gorevler').map((w) => [String(w.wbs_code), w.name]));
  for (const ks of kodSatirlari) {
    const { kod, ad } = wbsB(ks.wbs_gorev_id);
    const d = dugumler.get(kod) || { wbs_kod: kod, ad, kodlar: [] };
    d.kodlar.push(ks);
    dugumler.set(kod, d);
  }
  // Nokta ayrımlı üst düğümleri (1.2.3 → 1.2, 1) oluştur
  for (const kod of [...dugumler.keys()]) {
    const parca = kod.split('.');
    for (let i = parca.length - 1; i >= 1; i--) {
      const ust = parca.slice(0, i).join('.');
      if (!dugumler.has(ust)) dugumler.set(ust, { wbs_kod: ust, ad: wbsAdlari.get(ust) || `WBS ${ust}`, kodlar: [] });
    }
  }
  const sirali = [...dugumler.values()].sort((a, b) => dogalSirala(a.wbs_kod, b.wbs_kod));
  const satirlar = sirali.map((d) => {
    const alt = kodSatirlari.filter((ks) => { const kk = wbsB(ks.wbs_gorev_id).kod; return kk === d.wbs_kod || kk.startsWith(`${d.wbs_kod}.`); });
    return { wbs_kod: d.wbs_kod, ad: d.ad, derinlik: d.wbs_kod.split('.').length - 1, kodlar: d.kodlar, ozet: toplamMetrik(topla(alt)) };
  });

  const tumu = [...kodSatirlari, ...(kodsuzSatir ? [kodsuzSatir] : [])];
  const proje = toplamMetrik(topla(tumu));
  const gelir = Array.from(toplamlar.values()).reduce((t, k) => ({ sozlesme: t.sozlesme + k.gelir_sozlesme, tahsilat: t.tahsilat + k.gelir_tahsilat }), { sozlesme: 0, tahsilat: 0 });
  return {
    proje_id: projeId, tarih: ctx.tarih, kur_bazi: ctx.kurBazi,
    butce_versiyon: ctx.versiyon ? { id: ctx.versiyon.id, versiyon_no: ctx.versiyon.versiyon_no, ad: ctx.versiyon.ad, durum: ctx.versiyon.durum } : null,
    satirlar, kodsuz: kodsuzSatir, toplam: proje,
    gelir: { beklenen_kurus: gelir.sozlesme, tahsil_edilen_kurus: gelir.tahsilat },
    uyarilar: ctx.versiyon ? [] : ['Bu proje için onaylı/seçili bütçe versiyonu yok — bütçe sütunları 0.'],
  };
}

/** Bir maliyet kodunun (veya kodsuzun) defter hareketleri — drill-down'ın ilk adımı. */
export function kodHareketleri(projeId, maliyetKoduId, secenek = {}) {
  const ctx = baglamOlustur(projeId, secenek);
  const kodId = maliyetKoduId === 'kodsuz' || maliyetKoduId == null ? null : Number(maliyetKoduId);
  return maliyetDefteri.projeIcinListele(projeId)
    .filter((h) => h.tur !== 'BUTCE' && (h.maliyet_kodu_id ?? null) === kodId && h.tarih <= ctx.tarih)
    .map((h) => ({ ...h, tl_kurus: tlCevir(h.para_birimi, h.tutar_kurus, h.kur, kodId, ctx) }));
}
