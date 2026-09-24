import { useState } from 'react';
import { LayoutDashboard, FileText, ListChecks, GanttChart, ShieldAlert, AlertOctagon, Truck } from 'lucide-react';
import SantiyePanosu from './SantiyePanosu';
import GunlukRaporSihirbazi from './GunlukRaporSihirbazi';
import GorevPanosu from './GorevPanosu';
import GanttPlanGerceklesen from './GanttPlanGerceklesen';
import IsgMerkezi from './IsgMerkezi';
import NcrListesi from './NcrListesi';
import EkipmanListesi from './EkipmanListesi';

type UstSekme = 'pano' | 'rapor' | 'gorev' | 'gantt' | 'isg' | 'ncr' | 'ekipman';

/**
 * Şantiye modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ OLARAK mevcut
 * App.tsx navigasyonuna ve ODA harita koduna BAĞLANMADI (P1-P7'deki AYNI
 * karar; bkz. CAKISMA_HARITASI.md "P8 Uygulama Durumu").
 */
export default function SantiyeModulu({ projeId }: { projeId: string }) {
  const [sekme, setSekme] = useState<UstSekme>('pano');
  const T = ({ k, ikon, ad }: { k: UstSekme; ikon: React.ReactNode; ad: string }) => (
    <button onClick={() => setSekme(k)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${sekme === k ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{ikon} {ad}</button>
  );
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start overflow-x-auto max-w-full">
        <T k="pano" ikon={<LayoutDashboard className="w-3.5 h-3.5" />} ad="Pano" />
        <T k="rapor" ikon={<FileText className="w-3.5 h-3.5" />} ad="Günlük Rapor" />
        <T k="gorev" ikon={<ListChecks className="w-3.5 h-3.5" />} ad="Görevler" />
        <T k="gantt" ikon={<GanttChart className="w-3.5 h-3.5" />} ad="İş Programı" />
        <T k="isg" ikon={<ShieldAlert className="w-3.5 h-3.5" />} ad="İSG" />
        <T k="ncr" ikon={<AlertOctagon className="w-3.5 h-3.5" />} ad="NCR" />
        <T k="ekipman" ikon={<Truck className="w-3.5 h-3.5" />} ad="Ekipman" />
      </div>
      {sekme === 'pano' && <SantiyePanosu projeId={projeId} />}
      {sekme === 'rapor' && <GunlukRaporSihirbazi projeId={projeId} />}
      {sekme === 'gorev' && <GorevPanosu projeId={projeId} />}
      {sekme === 'gantt' && <GanttPlanGerceklesen projeId={projeId} />}
      {sekme === 'isg' && <IsgMerkezi projeId={projeId} />}
      {sekme === 'ncr' && <NcrListesi projeId={projeId} />}
      {sekme === 'ekipman' && <EkipmanListesi projeId={projeId} />}
    </div>
  );
}
