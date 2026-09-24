// Kazanılmış Değer (EVM). PV: iş programından (P8 — plan tarihleri, doğrusal
// beklenen %), EV: şantiye ONAYLI ilerleme (gerçekleşen %), AC: Maliyet
// Defteri gerçekleşen. Ağırlık = aktivitenin bağlı olduğu WBS'in BÜTÇESİ;
// WBS'e bağlı olmayan veya bütçesiz aktiviteler hesaba girmez, sayısı raporlanır.
//   CPI = EV / AC   (1'in altı = maliyet aşımı)
//   SPI = EV / PV   (1'in altı = programın gerisinde)
import * as maliyetKodu from '../_cekirdek/maliyetKodu.js';
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import * as isProgrami from '../santiye/isProgrami.js';
import { baglamOlustur, tlCevir, wbsButceleri } from './rapor.js';

const ayBitisi = (yil, ay) => new Date(Date.UTC(yil, ay + 1, 0)).toISOString().slice(0, 10);

export function evmHesapla(projeId, secenek = {}) {
  const ctx = baglamOlustur(projeId, secenek);
  const butceler = wbsButceleri(ctx);
  const aktiviteler = isProgrami.listele(projeId);
  const bagli = []; const agirliksiz = [];
  for (const a of aktiviteler) {
    const bac = a.wbs_gorev_id ? butceler.get(String(a.wbs_gorev_id)) : null;
    if (!bac) { agirliksiz.push({ id: a.id, ad: a.ad, neden: a.wbs_gorev_id ? 'bağlı WBS için bütçe yok' : 'WBS bağlantısı yok' }); continue; }
    bagli.push({ ...a, bac });
  }
  // Aynı WBS'e birden çok aktivite bağlıysa bütçe aktiviteler arasında eşit bölünür (çift sayım olmasın).
  const wbsSayaci = new Map();
  bagli.forEach((a) => wbsSayaci.set(a.wbs_gorev_id, (wbsSayaci.get(a.wbs_gorev_id) || 0) + 1));
  bagli.forEach((a) => { a.agirlikli_bac = Math.round(a.bac / wbsSayaci.get(a.wbs_gorev_id)); });

  const pvAl = (t) => bagli.reduce((s, a) => s + a.agirlikli_bac * (isProgrami.beklenenYuzde(a, t) / 100), 0);
  const bac = bagli.reduce((s, a) => s + a.agirlikli_bac, 0);
  const pv = Math.round(pvAl(ctx.tarih));
  const ev = Math.round(bagli.reduce((s, a) => s + a.agirlikli_bac * (a.gerceklesen_yuzde / 100), 0));

  // AC: yalnızca bağlı WBS'lerin maliyet kodlarının gerçekleşeni (EV ile aynı kapsam)
  const bagliWbs = new Set(bagli.map((a) => String(a.wbs_gorev_id)));
  const kodWbs = new Map(maliyetKodu.listele(projeId).map((k) => [k.id, k.wbs_gorev_id]));
  const hareketler = maliyetDefteri.projeIcinListele(projeId).filter((h) => h.tur === 'GERCEKLESEN' && h.maliyet_kodu_id != null && bagliWbs.has(kodWbs.get(h.maliyet_kodu_id)));
  const acAl = (t) => hareketler.filter((h) => h.tarih <= t).reduce((s, h) => s + tlCevir(h.para_birimi, h.tutar_kurus, h.kur, h.maliyet_kodu_id, ctx), 0);
  const ac = acAl(ctx.tarih);

  // Eğri: aylık PV (tüm plan boyunca) + AC (bugüne kadar); EV yalnızca güncel nokta (ilerleme geçmişi tutulmuyor)
  const seri = [];
  if (bagli.length) {
    const min = bagli.reduce((x, a) => (a.plan_baslangic < x ? a.plan_baslangic : x), bagli[0].plan_baslangic);
    const max = bagli.reduce((x, a) => (a.plan_bitis > x ? a.plan_bitis : x), bagli[0].plan_bitis);
    let y = Number(min.slice(0, 4)); let m = Number(min.slice(5, 7)) - 1;
    for (let guvenlik = 0; guvenlik < 240; guvenlik++) {
      const t = ayBitisi(y, m);
      seri.push({ tarih: t, pv: Math.round(pvAl(t)), ac: t <= ctx.tarih ? acAl(t) : null, ev: null });
      if (t >= max) break;
      m += 1; if (m > 11) { m = 0; y += 1; }
    }
  }
  return {
    proje_id: projeId, tarih: ctx.tarih, butce_versiyon: ctx.versiyon ? { id: ctx.versiyon.id, versiyon_no: ctx.versiyon.versiyon_no, ad: ctx.versiyon.ad } : null,
    bac, pv, ev, ac, cpi: ac > 0 ? Number((ev / ac).toFixed(3)) : null, spi: pv > 0 ? Number((ev / pv).toFixed(3)) : null,
    maliyet_sapmasi: ev - ac, program_sapmasi: ev - pv,
    aktivite_sayisi: aktiviteler.length, hesaplanan_aktivite: bagli.length, agirliksiz, seri, ev_noktasi: { tarih: ctx.tarih, ev },
    not: 'EV geçmişi (ilerleme geçmişi) tutulmadığından EV yalnızca güncel noktadır.',
  };
}
