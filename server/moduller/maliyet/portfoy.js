// Portföy görünümü — tüm projeler tek tabloda (güncel onaylı bütçe versiyonuyla).
import * as maliyetDefteri from '../_cekirdek/maliyetDefteri.js';
import { db } from './db.js';
import { maliyetRaporu } from './rapor.js';
import { evmHesapla } from './evm.js';
import * as genelGider from './genelGider.js';

const stmtButceProjeleri = db.prepare('SELECT DISTINCT proje_id FROM butce_versiyon');

export function portfoy(secenek = {}) {
  const idler = [...new Set([...maliyetDefteri.projeleriListele(), ...stmtButceProjeleri.all().map((r) => r.proje_id)])].sort();
  const satirlar = idler.map((p) => {
    const r = maliyetRaporu(p, secenek);
    const evm = evmHesapla(p, secenek);
    const gg = genelGider.projePayi(p);
    const eac = r.toplam.eac + gg;
    const gelir = r.gelir.beklenen_kurus;
    return {
      proje_id: p, butce_versiyon: r.butce_versiyon, butce: r.toplam.butce, taahhut: r.toplam.taahhut, gerceklesen: r.toplam.gerceklesen, eac,
      genel_gider_payi: gg, sapma: r.toplam.butce - eac, sapma_yuzde: r.toplam.butce > 0 ? Number((((r.toplam.butce - eac) / r.toplam.butce) * 100).toFixed(2)) : null,
      gelir_beklenen: gelir, beklenen_kar: gelir - eac, marj_yuzde: gelir > 0 ? Number((((gelir - eac) / gelir) * 100).toFixed(2)) : null, cpi: evm.cpi, spi: evm.spi,
    };
  });
  const t = satirlar.reduce((a, s) => ({ butce: a.butce + s.butce, taahhut: a.taahhut + s.taahhut, gerceklesen: a.gerceklesen + s.gerceklesen, eac: a.eac + s.eac, gelir: a.gelir + s.gelir_beklenen }), { butce: 0, taahhut: 0, gerceklesen: 0, eac: 0, gelir: 0 });
  return { tarih: new Date().toISOString().slice(0, 10), kur_bazi: secenek.kurBazi || 'nominal', projeler: satirlar, toplam: { ...t, beklenen_kar: t.gelir - t.eac, marj_yuzde: t.gelir > 0 ? Number((((t.gelir - t.eac) / t.gelir) * 100).toFixed(2)) : null } };
}
