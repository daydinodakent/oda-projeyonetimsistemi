// Kârlılık — gelir (P9 satış sözleşmeleri, defterde GELİR/kaynak 'sozlesme')
// vs EAC (+ dağıtılmış genel gider payı) → beklenen kâr/marj; bağımsız bölüm
// başına maliyet (m² maliyeti). Bölüm listesi Müşteri modülünün servisinden
// OKUNUR. Maliyet, TÜM bölümlere brüt m² oranında dağıtılır (arsa sahibi
// payı da maliyet taşır — kat karşılığı işin doğası).
import { maliyetRaporu } from './rapor.js';
import * as genelGider from './genelGider.js';
import * as bolumSrv from '../musteri/bolum.js';
import * as satisSrv from '../musteri/satis.js';

export function karlilik(projeId, secenek = {}) {
  const rapor = maliyetRaporu(projeId, secenek);
  const ggPayi = genelGider.projePayi(projeId);
  const eac = rapor.toplam.eac + ggPayi;
  const gelir = rapor.gelir.beklenen_kurus;
  const kar = gelir - eac;
  const bolumler = bolumSrv.listele(projeId);
  const toplamM2 = bolumler.reduce((t, b) => t + (b.brut_m2 ?? b.net_m2 ?? 0), 0);
  const satislar = new Map(satisSrv.projeIcinListele(projeId).filter((s) => s.durum !== 'iptal').map((s) => [s.bolum_id, s]));
  const bolumSatirlari = bolumler.map((b) => {
    const m2 = b.brut_m2 ?? b.net_m2 ?? 0;
    const maliyet = toplamM2 > 0 ? Math.round(eac * (m2 / toplamM2)) : null;
    const s = satislar.get(b.id);
    const gelirB = s && s.para_birimi === 'TRY' ? s.tutar_kurus : s ? Math.round(s.tutar_kurus * s.kur) : null;
    return {
      bolum_id: b.id, etiket: `${b.blok}-${b.kat}-${b.kapi_no}`, tip: b.tip, m2, sahiplik: b.sahiplik, durum: b.durum,
      tahsis_edilen_maliyet_kurus: maliyet, satis_tutari_kurus: gelirB, kar_kurus: maliyet != null && gelirB != null ? gelirB - maliyet : null,
    };
  });
  return {
    proje_id: projeId, butce_versiyon: rapor.butce_versiyon, kur_bazi: rapor.kur_bazi,
    gelir_beklenen_kurus: gelir, gelir_tahsil_edilen_kurus: rapor.gelir.tahsil_edilen_kurus,
    eac_kurus: rapor.toplam.eac, genel_gider_payi_kurus: ggPayi, toplam_maliyet_tahmini_kurus: eac,
    beklenen_kar_kurus: kar, marj_yuzde: gelir > 0 ? Number(((kar / gelir) * 100).toFixed(2)) : null,
    toplam_m2: toplamM2, m2_maliyet_kurus: toplamM2 > 0 ? Math.round(eac / toplamM2) : null, bolumler: bolumSatirlari,
  };
}
