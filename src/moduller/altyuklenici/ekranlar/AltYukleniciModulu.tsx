import { useState } from 'react';
import { HardHat, FileSpreadsheet, Printer, TrendingUp, Award, FileCheck2 } from 'lucide-react';
import AltYukleniciListesi from './AltYukleniciListesi';
import HakedisHazirlama from './HakedisHazirlama';
import HakedisCiktisi from './HakedisCiktisi';
import IlerlemeGecikme from './IlerlemeGecikme';
import PerformansKarnesi from './PerformansKarnesi';
import EvrakDurumu from './EvrakDurumu';

type UstSekme = 'liste' | 'hakedis' | 'cikti' | 'ilerleme' | 'performans' | 'evrak';

interface Props {
  projeId: string;
}

/**
 * Alt Yüklenici modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ
 * OLARAK mevcut App.tsx navigasyonuna BAĞLANMADI (P1-P4'teki AYNI karar —
 * bkz. docs/moduller/CAKISMA_HARITASI.md "P5 Uygulama Durumu").
 */
export default function AltYukleniciModulu({ projeId }: Props) {
  const [ustSekme, setUstSekme] = useState<UstSekme>('liste');
  const [aktifSozlesmeId, setAktifSozlesmeId] = useState<number | null>(null);

  function sozlesmeSec(id: number) {
    setAktifSozlesmeId(id);
    setUstSekme('hakedis');
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start overflow-x-auto">
        <TabButon aktif={ustSekme === 'liste'} onClick={() => setUstSekme('liste')} icon={<HardHat className="w-3.5 h-3.5" />} etiket="Alt Yükleniciler" />
        <TabButon aktif={ustSekme === 'hakedis'} onClick={() => setUstSekme('hakedis')} icon={<FileSpreadsheet className="w-3.5 h-3.5" />} etiket="Hakediş Hazırlama" />
        <TabButon aktif={ustSekme === 'cikti'} onClick={() => setUstSekme('cikti')} icon={<Printer className="w-3.5 h-3.5" />} etiket="Hakediş Çıktısı" />
        <TabButon aktif={ustSekme === 'ilerleme'} onClick={() => setUstSekme('ilerleme')} icon={<TrendingUp className="w-3.5 h-3.5" />} etiket="İlerleme/Gecikme" />
        <TabButon aktif={ustSekme === 'performans'} onClick={() => setUstSekme('performans')} icon={<Award className="w-3.5 h-3.5" />} etiket="Performans" />
        <TabButon aktif={ustSekme === 'evrak'} onClick={() => setUstSekme('evrak')} icon={<FileCheck2 className="w-3.5 h-3.5" />} etiket="Evrak Durumu" />
      </div>

      {ustSekme === 'liste' && <AltYukleniciListesi projeId={projeId} onSozlesmeSec={sozlesmeSec} />}
      {ustSekme === 'hakedis' && (
        aktifSozlesmeId ? <HakedisHazirlama sozlesmeId={aktifSozlesmeId} /> : <div className="p-6 text-xs text-[var(--text-secondary)]">Önce Alt Yükleniciler listesinden bir sözleşme seçin.</div>
      )}
      {ustSekme === 'cikti' && <HakedisCiktisi hakedisId={null} />}
      {ustSekme === 'ilerleme' && (
        aktifSozlesmeId ? <IlerlemeGecikme sozlesmeId={aktifSozlesmeId} /> : <div className="p-6 text-xs text-[var(--text-secondary)]">Önce Alt Yükleniciler listesinden bir sözleşme seçin.</div>
      )}
      {ustSekme === 'performans' && (
        aktifSozlesmeId ? <PerformansKarnesi sozlesmeId={aktifSozlesmeId} /> : <div className="p-6 text-xs text-[var(--text-secondary)]">Önce Alt Yükleniciler listesinden bir sözleşme seçin.</div>
      )}
      {ustSekme === 'evrak' && (
        aktifSozlesmeId ? <EvrakDurumu sozlesmeId={aktifSozlesmeId} /> : <div className="p-6 text-xs text-[var(--text-secondary)]">Önce Alt Yükleniciler listesinden bir sözleşme seçin.</div>
      )}
    </div>
  );
}

function TabButon({ aktif, onClick, icon, etiket }: { aktif: boolean; onClick: () => void; icon: React.ReactNode; etiket: string }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
        aktif ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}>
      {icon} {etiket}
    </button>
  );
}
