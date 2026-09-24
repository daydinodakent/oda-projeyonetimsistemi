import { useState } from 'react';
import { Gauge, Wallet, TrendingUp, Banknote, Layers, ScanSearch } from 'lucide-react';
import MaliyetPanosu from './MaliyetPanosu';
import ButceYonetimi from './ButceYonetimi';
import EvmGrafigi from './EvmGrafigi';
import NakitAkisiEkrani from './NakitAkisiEkrani';
import PortfoyGorunumu from './PortfoyGorunumu';
import MutabakatEkrani from './MutabakatEkrani';

type Sekme = 'pano' | 'butce' | 'evm' | 'nakit' | 'portfoy' | 'mutabakat';

/**
 * Maliyet Yönetimi kök bileşeni. BİLİNÇLİ OLARAK mevcut App.tsx navigasyonuna
 * BAĞLANMADI (P1-P9'daki AYNI karar; bkz. CAKISMA_HARITASI.md "P10").
 */
export default function MaliyetModulu({ projeId: baslangic }: { projeId: string }) {
  const [sekme, setSekme] = useState<Sekme>('pano');
  const [projeId, setProjeId] = useState(baslangic);
  const T = ({ k, ikon, ad }: { k: Sekme; ikon: React.ReactNode; ad: string }) => (
    <button onClick={() => setSekme(k)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${sekme === k ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{ikon} {ad}</button>
  );
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 overflow-x-auto max-w-full">
          <T k="pano" ikon={<Gauge className="w-3.5 h-3.5" />} ad="Maliyet Panosu" />
          <T k="butce" ikon={<Wallet className="w-3.5 h-3.5" />} ad="Bütçe" />
          <T k="evm" ikon={<TrendingUp className="w-3.5 h-3.5" />} ad="EVM" />
          <T k="nakit" ikon={<Banknote className="w-3.5 h-3.5" />} ad="Nakit Akışı" />
          <T k="portfoy" ikon={<Layers className="w-3.5 h-3.5" />} ad="Portföy" />
          <T k="mutabakat" ikon={<ScanSearch className="w-3.5 h-3.5" />} ad="Mutabakat" />
        </div>
        <input value={projeId} onChange={(e) => setProjeId(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs w-40" placeholder="Proje ID" />
      </div>
      {sekme === 'pano' && <MaliyetPanosu projeId={projeId} />}
      {sekme === 'butce' && <ButceYonetimi projeId={projeId} />}
      {sekme === 'evm' && <EvmGrafigi projeId={projeId} />}
      {sekme === 'nakit' && <NakitAkisiEkrani projeId={projeId} />}
      {sekme === 'portfoy' && <PortfoyGorunumu onProjeSec={(p) => { setProjeId(p); setSekme('pano'); }} />}
      {sekme === 'mutabakat' && <MutabakatEkrani projeId={projeId} />}
    </div>
  );
}
