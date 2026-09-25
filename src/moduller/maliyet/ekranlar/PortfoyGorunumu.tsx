import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import HizliForm from '../../_cekirdek/HizliForm';
import * as api from '../api';
import type { Portfoy, KurBazi } from '../types';
import { KART, INPUT, HATA_KUTU, tl, yuzde, sapmaRenk, KUR_BAZI_ETIKET } from './format';

export default function PortfoyGorunumu({ onProjeSec }: { onProjeSec?: (projeId: string) => void }) {
  const [p, setP] = useState<Portfoy | null>(null);
  const [kurBazi, setKurBazi] = useState<KurBazi>('nominal');
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { api.portfoy(kurBazi).then(setP).catch((e) => setHata(String(e.message))); }, [kurBazi]);

  return (
    <div className={KART}>
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-400" /> Portföy Görünümü</h2>
        <select value={kurBazi} onChange={(e) => setKurBazi(e.target.value as KurBazi)} className={`${INPUT} w-auto`}>{Object.entries(KUR_BAZI_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      <HizliForm butonEtiket="Genel gider dağıt" ipucu="Havuz projedeki (genel gider) harcamayı seçilen dönemde projelere anahtarla dağıtır (ciro/maliyet/süre). Deftere satır yazmaz; kârlılıkta ayrı gösterilir. Aynı dönem yeniden dağıtılırsa öncekinin yerine geçer."
        alanlar={[{ ad: 'havuz', etiket: 'Havuz proje ID', zorunlu: true }, { ad: 'bas', etiket: 'Dönem başlangıç', tip: 'date', zorunlu: true }, { ad: 'bit', etiket: 'Dönem bitiş', tip: 'date', zorunlu: true }]}
        onKaydet={async (v) => { await api.genelGiderDagit(v.havuz, v.bas, v.bit); setP(await api.portfoy(kurBazi)); }} />
      {!p ? <div className="text-xs text-[var(--text-secondary)]">Yükleniyor…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[9px] uppercase text-[var(--text-secondary)] border-b border-[var(--border)]">
              <th className="text-left py-1.5">Proje</th><th className="text-left">Bütçe v.</th><th className="text-right">Bütçe</th><th className="text-right">Taahhüt</th><th className="text-right">Gerçekleşen</th><th className="text-right">EAC*</th>
              <th className="text-right">Sapma %</th><th className="text-right">Gelir</th><th className="text-right">Kâr</th><th className="text-right">Marj</th><th className="text-right">CPI</th><th className="text-right">SPI</th></tr></thead>
            <tbody>
              {p.projeler.map((x) => (
                <tr key={x.proje_id} onClick={() => onProjeSec?.(x.proje_id)} className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--bg-primary)]">
                  <td className="py-1.5 font-bold">{x.proje_id}</td><td>{x.butce_versiyon ? `v${x.butce_versiyon.versiyon_no}` : '—'}</td>
                  <td className="text-right">{tl(x.butce)}</td><td className="text-right">{tl(x.taahhut)}</td><td className="text-right">{tl(x.gerceklesen)}</td><td className="text-right">{tl(x.eac)}</td>
                  <td className={`text-right ${sapmaRenk(x.sapma)}`}>{yuzde(x.sapma_yuzde)}</td><td className="text-right">{tl(x.gelir_beklenen)}</td>
                  <td className={`text-right ${sapmaRenk(x.beklenen_kar)}`}>{tl(x.beklenen_kar)}</td><td className={`text-right ${sapmaRenk(x.marj_yuzde)}`}>{yuzde(x.marj_yuzde)}</td>
                  <td className={`text-right ${x.cpi != null && x.cpi < 1 ? 'text-red-400' : ''}`}>{x.cpi ?? '—'}</td><td className={`text-right ${x.spi != null && x.spi < 1 ? 'text-red-400' : ''}`}>{x.spi ?? '—'}</td>
                </tr>
              ))}
              <tr className="font-black border-t-2 border-[var(--border)]"><td className="py-2">PORTFÖY</td><td /><td className="text-right">{tl(p.toplam.butce)}</td><td className="text-right">{tl(p.toplam.taahhut)}</td><td className="text-right">{tl(p.toplam.gerceklesen)}</td><td className="text-right">{tl(p.toplam.eac)}</td><td /><td className="text-right">{tl(p.toplam.gelir)}</td><td className={`text-right ${sapmaRenk(p.toplam.beklenen_kar)}`}>{tl(p.toplam.beklenen_kar)}</td><td className="text-right">{yuzde(p.toplam.marj_yuzde)}</td><td /><td /></tr>
            </tbody>
          </table>
          <div className="text-[10px] text-[var(--text-secondary)] mt-2">*EAC dağıtılmış genel gider payını içerir. Satıra tıklayınca proje panosu açılır.</div>
        </div>
      )}
    </div>
  );
}
