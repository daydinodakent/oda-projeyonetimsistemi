import { useState } from 'react';
import { Building2, Filter, UserRound, CalendarClock, AlarmClock, PackageCheck } from 'lucide-react';
import SatisTablosu from './SatisTablosu';
import AdayHunisi from './AdayHunisi';
import MusteriKartiEkrani from './MusteriKartiEkrani';
import OdemePlaniOlusturucu from './OdemePlaniOlusturucu';
import VadesiGecenler from './VadesiGecenler';
import TeslimSatisSonrasi from './TeslimSatisSonrasi';

type Sekme = 'tablo' | 'huni' | 'kart' | 'plan' | 'vade' | 'teslim';

/**
 * Müşteri modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ OLARAK mevcut
 * App.tsx navigasyonuna BAĞLANMADI (P1-P8'deki AYNI karar; bkz.
 * CAKISMA_HARITASI.md "P9 Uygulama Durumu").
 */
export default function MusteriModulu({ projeId }: { projeId: string }) {
  const [sekme, setSekme] = useState<Sekme>('tablo');
  const T = ({ k, ikon, ad }: { k: Sekme; ikon: React.ReactNode; ad: string }) => (
    <button onClick={() => setSekme(k)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${sekme === k ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{ikon} {ad}</button>
  );
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start overflow-x-auto max-w-full">
        <T k="tablo" ikon={<Building2 className="w-3.5 h-3.5" />} ad="Satış Tablosu" />
        <T k="huni" ikon={<Filter className="w-3.5 h-3.5" />} ad="Aday Hunisi" />
        <T k="plan" ikon={<CalendarClock className="w-3.5 h-3.5" />} ad="Ödeme Planı" />
        <T k="kart" ikon={<UserRound className="w-3.5 h-3.5" />} ad="Müşteri Kartı" />
        <T k="vade" ikon={<AlarmClock className="w-3.5 h-3.5" />} ad="Vadesi Geçenler" />
        <T k="teslim" ikon={<PackageCheck className="w-3.5 h-3.5" />} ad="Teslim & Satış Sonrası" />
      </div>
      {sekme === 'tablo' && <SatisTablosu projeId={projeId} onSatisSec={() => setSekme('plan')} />}
      {sekme === 'huni' && <AdayHunisi projeId={projeId} />}
      {sekme === 'plan' && <OdemePlaniOlusturucu projeId={projeId} />}
      {sekme === 'kart' && <MusteriKartiEkrani />}
      {sekme === 'vade' && <VadesiGecenler projeId={projeId} />}
      {sekme === 'teslim' && <TeslimSatisSonrasi projeId={projeId} />}
    </div>
  );
}
