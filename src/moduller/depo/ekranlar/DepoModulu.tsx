import { useState } from 'react';
import { Settings2, Boxes, Smartphone, PackageCheck, ArrowRightLeft, ClipboardList, ClipboardCheck } from 'lucide-react';
import StokDurumu from './StokDurumu';
import HizliCikisGiris from './HizliCikisGiris';
import MalKabulEkrani from './MalKabulEkrani';
import Transfer from './Transfer';
import ZimmetListesi from './ZimmetListesi';
import SayimFarkRaporu from './SayimFarkRaporu';
import TanimlarEkrani from './TanimlarEkrani';

type UstSekme = 'tanimlar' | 'stok' | 'hizli' | 'mal-kabul' | 'transfer' | 'zimmet' | 'sayim';

interface Props {
  projeId: string;
}

/**
 * Depo modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ OLARAK mevcut
 * App.tsx navigasyonuna BAĞLANMADI (P1/P2/P3'teki AYNI karar — bkz.
 * docs/moduller/CAKISMA_HARITASI.md "P4 Uygulama Durumu").
 */
export default function DepoModulu({ projeId }: Props) {
  const [ustSekme, setUstSekme] = useState<UstSekme>('stok');

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start overflow-x-auto">
        <TabButon aktif={ustSekme === 'tanimlar'} onClick={() => setUstSekme('tanimlar')} icon={<Settings2 className="w-3.5 h-3.5" />} etiket="Tanımlar" />
        <TabButon aktif={ustSekme === 'stok'} onClick={() => setUstSekme('stok')} icon={<Boxes className="w-3.5 h-3.5" />} etiket="Stok Durumu" />
        <TabButon aktif={ustSekme === 'hizli'} onClick={() => setUstSekme('hizli')} icon={<Smartphone className="w-3.5 h-3.5" />} etiket="Hızlı Çıkış/Giriş" />
        <TabButon aktif={ustSekme === 'mal-kabul'} onClick={() => setUstSekme('mal-kabul')} icon={<PackageCheck className="w-3.5 h-3.5" />} etiket="Mal Kabul" />
        <TabButon aktif={ustSekme === 'transfer'} onClick={() => setUstSekme('transfer')} icon={<ArrowRightLeft className="w-3.5 h-3.5" />} etiket="Transfer" />
        <TabButon aktif={ustSekme === 'zimmet'} onClick={() => setUstSekme('zimmet')} icon={<ClipboardList className="w-3.5 h-3.5" />} etiket="Zimmet" />
        <TabButon aktif={ustSekme === 'sayim'} onClick={() => setUstSekme('sayim')} icon={<ClipboardCheck className="w-3.5 h-3.5" />} etiket="Sayım" />
      </div>

      {ustSekme === 'tanimlar' && <TanimlarEkrani projeId={projeId} />}
      {ustSekme === 'stok' && <StokDurumu projeId={projeId} />}
      {ustSekme === 'hizli' && <HizliCikisGiris projeId={projeId} />}
      {ustSekme === 'mal-kabul' && <MalKabulEkrani projeId={projeId} />}
      {ustSekme === 'transfer' && <Transfer projeId={projeId} />}
      {ustSekme === 'zimmet' && <ZimmetListesi />}
      {ustSekme === 'sayim' && <SayimFarkRaporu projeId={projeId} />}
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
