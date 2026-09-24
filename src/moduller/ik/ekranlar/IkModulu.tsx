import { useState } from 'react';
import { Users, LogIn, Palmtree, Wallet, Printer, ShieldAlert } from 'lucide-react';
import PersonelListesi from './PersonelListesi';
import PersonelKarti from './PersonelKarti';
import PdksGunlukDurum from './PdksGunlukDurum';
import IzinTalepOnay from './IzinTalepOnay';
import AvansTalepOnay from './AvansTalepOnay';
import BordroOnHazirlik from './BordroOnHazirlik';
import EvrakSuresiDolanlar from './EvrakSuresiDolanlar';

type UstSekme = 'personel' | 'pdks' | 'izin' | 'avans' | 'bordro' | 'evrak';

interface Props {
  projeId?: string;
}

/**
 * İK modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ OLARAK mevcut
 * App.tsx navigasyonuna BAĞLANMADI (P1-P6'daki AYNI karar — bkz.
 * docs/moduller/CAKISMA_HARITASI.md "P7 Uygulama Durumu").
 */
export default function IkModulu({ projeId }: Props) {
  const [ustSekme, setUstSekme] = useState<UstSekme>('personel');
  const [aktifPersonelId, setAktifPersonelId] = useState<number | null>(null);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start overflow-x-auto">
        <TabButon aktif={ustSekme === 'personel'} onClick={() => { setUstSekme('personel'); setAktifPersonelId(null); }} icon={<Users className="w-3.5 h-3.5" />} etiket="Personel" />
        <TabButon aktif={ustSekme === 'pdks'} onClick={() => setUstSekme('pdks')} icon={<LogIn className="w-3.5 h-3.5" />} etiket="PDKS Günlük Durum" />
        <TabButon aktif={ustSekme === 'izin'} onClick={() => setUstSekme('izin')} icon={<Palmtree className="w-3.5 h-3.5" />} etiket="İzin" />
        <TabButon aktif={ustSekme === 'avans'} onClick={() => setUstSekme('avans')} icon={<Wallet className="w-3.5 h-3.5" />} etiket="Avans" />
        <TabButon aktif={ustSekme === 'bordro'} onClick={() => setUstSekme('bordro')} icon={<Printer className="w-3.5 h-3.5" />} etiket="Bordro Ön Hazırlık" />
        <TabButon aktif={ustSekme === 'evrak'} onClick={() => setUstSekme('evrak')} icon={<ShieldAlert className="w-3.5 h-3.5" />} etiket="Evrak Süresi Dolanlar" />
      </div>

      {ustSekme === 'personel' && (
        aktifPersonelId
          ? <PersonelKarti personelId={aktifPersonelId} onGeri={() => setAktifPersonelId(null)} />
          : <PersonelListesi onPersonelSec={setAktifPersonelId} />
      )}
      {ustSekme === 'pdks' && <PdksGunlukDurum projeId={projeId} />}
      {ustSekme === 'izin' && <IzinTalepOnay />}
      {ustSekme === 'avans' && <AvansTalepOnay />}
      {ustSekme === 'bordro' && <BordroOnHazirlik />}
      {ustSekme === 'evrak' && <EvrakSuresiDolanlar />}
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
