import { useState } from 'react';
import { Users, CalendarCheck, Table2, Wallet, Printer, Gauge, ShieldAlert } from 'lucide-react';
import EkipListesi from './EkipListesi';
import MobilGunlukPuantaj from './MobilGunlukPuantaj';
import HaftalikPuantajMatrisi from './HaftalikPuantajMatrisi';
import AvansGirisi from './AvansGirisi';
import DonemHesapPusulasi from './DonemHesapPusulasi';
import VerimlilikRaporu from './VerimlilikRaporu';
import EksikEvrakliIsciUyarilari from './EksikEvrakliIsciUyarilari';

type UstSekme = 'ekipler' | 'gunluk' | 'haftalik' | 'avans' | 'hesap-pusulasi' | 'verimlilik' | 'eksik-evrak';

interface Props {
  projeId: string;
}

/**
 * Taşeron modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ OLARAK
 * mevcut App.tsx navigasyonuna BAĞLANMADI (P1-P5'teki AYNI karar — bkz.
 * docs/moduller/CAKISMA_HARITASI.md "P6 Uygulama Durumu").
 */
export default function TaseronModulu({ projeId }: Props) {
  const [ustSekme, setUstSekme] = useState<UstSekme>('ekipler');
  const [aktifEkipId, setAktifEkipId] = useState<number | null>(null);

  function ekipSec(id: number) {
    setAktifEkipId(id);
    setUstSekme('gunluk');
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start overflow-x-auto">
        <TabButon aktif={ustSekme === 'ekipler'} onClick={() => setUstSekme('ekipler')} icon={<Users className="w-3.5 h-3.5" />} etiket="Ekipler" />
        <TabButon aktif={ustSekme === 'gunluk'} onClick={() => setUstSekme('gunluk')} icon={<CalendarCheck className="w-3.5 h-3.5" />} etiket="Günlük Puantaj" />
        <TabButon aktif={ustSekme === 'haftalik'} onClick={() => setUstSekme('haftalik')} icon={<Table2 className="w-3.5 h-3.5" />} etiket="Haftalık Matris" />
        <TabButon aktif={ustSekme === 'avans'} onClick={() => setUstSekme('avans')} icon={<Wallet className="w-3.5 h-3.5" />} etiket="Avans" />
        <TabButon aktif={ustSekme === 'hesap-pusulasi'} onClick={() => setUstSekme('hesap-pusulasi')} icon={<Printer className="w-3.5 h-3.5" />} etiket="Hesap Pusulası" />
        <TabButon aktif={ustSekme === 'verimlilik'} onClick={() => setUstSekme('verimlilik')} icon={<Gauge className="w-3.5 h-3.5" />} etiket="Verimlilik" />
        <TabButon aktif={ustSekme === 'eksik-evrak'} onClick={() => setUstSekme('eksik-evrak')} icon={<ShieldAlert className="w-3.5 h-3.5" />} etiket="Eksik Evrak" />
      </div>

      {ustSekme === 'ekipler' && <EkipListesi projeId={projeId} onEkipSec={ekipSec} />}
      {ustSekme !== 'ekipler' && !aktifEkipId && <div className="p-6 text-xs text-[var(--text-secondary)]">Önce Ekipler listesinden bir ekip seçin.</div>}
      {ustSekme === 'gunluk' && aktifEkipId && <MobilGunlukPuantaj ekipId={aktifEkipId} />}
      {ustSekme === 'haftalik' && aktifEkipId && <HaftalikPuantajMatrisi ekipId={aktifEkipId} />}
      {ustSekme === 'avans' && aktifEkipId && <AvansGirisi ekipId={aktifEkipId} />}
      {ustSekme === 'hesap-pusulasi' && aktifEkipId && <DonemHesapPusulasi ekipId={aktifEkipId} />}
      {ustSekme === 'verimlilik' && aktifEkipId && <VerimlilikRaporu ekipId={aktifEkipId} />}
      {ustSekme === 'eksik-evrak' && aktifEkipId && <EksikEvrakliIsciUyarilari ekipId={aktifEkipId} />}
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
