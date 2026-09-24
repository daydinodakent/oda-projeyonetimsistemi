// Uyarılar — bütçe aşımı GERÇEKLEŞENDE DEĞİL TAAHHÜTTE yakalanır:
//  - kod taahhüdü bütçenin %X'ini aştı ('maliyet_taahhut_uyari_yuzde', varsayılan 90 → yanıtta "varsayilan": true)
//  - kod taahhüt/gerçekleşeni bütçeyi aştı (kritik)
//  - CPI < eşik ('maliyet_cpi_esik', varsayılan 1), SPI < eşik ('maliyet_spi_esik', varsayılan 1)
//  - maliyet kodsuz taahhüt/gerçekleşen var (WBS'e dağıtılamıyor)
import * as parametre from '../_cekirdek/parametre.js';
import { maliyetRaporu } from './rapor.js';
import { evmHesapla } from './evm.js';

const paramOku = (kod, varsayilan, tarih) => { const p = parametre.degerAl(kod, tarih); return { deger: p ? p.deger : varsayilan, varsayilan: !p }; };

export function uyarilar(projeId, secenek = {}) {
  const rapor = maliyetRaporu(projeId, secenek);
  const t = rapor.tarih;
  const yuzde = paramOku('maliyet_taahhut_uyari_yuzde', 90, t);
  const cpiEsik = paramOku('maliyet_cpi_esik', 1, t);
  const spiEsik = paramOku('maliyet_spi_esik', 1, t);
  const liste = [];
  for (const w of rapor.satirlar) {
    for (const k of w.kodlar) {
      if (k.butce <= 0) {
        if (k.taahhut > 0 || k.gerceklesen > 0) liste.push({ seviye: 'uyari', tur: 'butcesiz_harcama', maliyet_kodu_id: k.maliyet_kodu_id, kod: k.kod, mesaj: `${k.kod}: bütçe tanımlı değil ama taahhüt/gerçekleşen var` });
        continue;
      }
      const oran = (k.taahhut / k.butce) * 100;
      if (k.gerceklesen > k.butce) liste.push({ seviye: 'kritik', tur: 'gerceklesen_asimi', maliyet_kodu_id: k.maliyet_kodu_id, kod: k.kod, mesaj: `${k.kod}: gerçekleşen bütçeyi aştı (%${((k.gerceklesen / k.butce) * 100).toFixed(1)})`, oran });
      else if (k.taahhut > k.butce) liste.push({ seviye: 'kritik', tur: 'taahhut_asimi', maliyet_kodu_id: k.maliyet_kodu_id, kod: k.kod, mesaj: `${k.kod}: TAAHHÜT bütçeyi aştı (%${oran.toFixed(1)}) — henüz harcanmadı ama kesin gidecek`, oran });
      else if (oran >= yuzde.deger) liste.push({ seviye: 'uyari', tur: 'taahhut_esigi', maliyet_kodu_id: k.maliyet_kodu_id, kod: k.kod, mesaj: `${k.kod}: taahhüt bütçenin %${oran.toFixed(1)}'ine ulaştı (eşik %${yuzde.deger})`, oran, esik_varsayilan: yuzde.varsayilan });
    }
  }
  if (rapor.kodsuz) liste.push({ seviye: 'uyari', tur: 'kodsuz', mesaj: 'Maliyet kodsuz taahhüt/gerçekleşen var — WBS bazlı görünmüyor' });
  const evm = evmHesapla(projeId, secenek);
  if (evm.cpi != null && evm.cpi < cpiEsik.deger) liste.push({ seviye: 'kritik', tur: 'cpi', mesaj: `CPI ${evm.cpi} < ${cpiEsik.deger} — maliyet verimsiz (kazanılan değer harcanandan az)`, deger: evm.cpi, esik_varsayilan: cpiEsik.varsayilan });
  if (evm.spi != null && evm.spi < spiEsik.deger) liste.push({ seviye: 'uyari', tur: 'spi', mesaj: `SPI ${evm.spi} < ${spiEsik.deger} — program gerisinde`, deger: evm.spi, esik_varsayilan: spiEsik.varsayilan });
  const sira = { kritik: 0, uyari: 1 };
  liste.sort((a, b) => sira[a.seviye] - sira[b.seviye]);
  return { proje_id: projeId, tarih: t, butce_versiyon: rapor.butce_versiyon, esikler: { taahhut_yuzde: yuzde, cpi: cpiEsik, spi: spiEsik }, uyarilar: liste };
}
