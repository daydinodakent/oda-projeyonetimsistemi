import { useState } from 'react';
import { FileSignature, FileText, AlarmClock } from 'lucide-react';
import SozlesmeListesi from './SozlesmeListesi';
import SozlesmeDetay from './SozlesmeDetay';
import SablonYonetimi from './SablonYonetimi';
import KritikTarihlerTakvimi from './KritikTarihlerTakvimi';

type UstSekme = 'sozlesmeler' | 'sablonlar' | 'kritik-tarihler';

interface Props {
  projeId: string;
}

/**
 * Sözleşme modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ OLARAK
 * mevcut App.tsx navigasyonuna BAĞLANMADI (bkz. docs/moduller/CAKISMA_HARITASI.md
 * "P2 Uygulama Durumu" notu) — "mevcut ekranlar bozulmaz" kabul kriterini bu
 * geçişte riske atmamak için. İleride bir modül grid'ine (ModuleGridDialog)
 * eklenirken bu bileşen olduğu gibi import edilebilir: <SozlesmeModulu projeId={...} />
 */
export default function SozlesmeModulu({ projeId }: Props) {
  const [ustSekme, setUstSekme] = useState<UstSekme>('sozlesmeler');
  const [secilenSozlesmeId, setSecilenSozlesmeId] = useState<number | null>(null);

  function sekmeSec(s: UstSekme) {
    setUstSekme(s);
    setSecilenSozlesmeId(null);
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start max-w-full overflow-x-auto">
        <TabButon aktif={ustSekme === 'sozlesmeler'} onClick={() => sekmeSec('sozlesmeler')} icon={<FileSignature className="w-3.5 h-3.5" />} etiket="Sözleşmeler" />
        <TabButon aktif={ustSekme === 'kritik-tarihler'} onClick={() => sekmeSec('kritik-tarihler')} icon={<AlarmClock className="w-3.5 h-3.5" />} etiket="Kritik Tarihler" />
        <TabButon aktif={ustSekme === 'sablonlar'} onClick={() => sekmeSec('sablonlar')} icon={<FileText className="w-3.5 h-3.5" />} etiket="Şablonlar" />
      </div>

      {ustSekme === 'sozlesmeler' && (
        secilenSozlesmeId
          ? <SozlesmeDetay sozlesmeId={secilenSozlesmeId} onGeri={() => setSecilenSozlesmeId(null)} />
          : <SozlesmeListesi projeId={projeId} onSecSozlesme={setSecilenSozlesmeId} />
      )}
      {ustSekme === 'kritik-tarihler' && <KritikTarihlerTakvimi projeId={projeId} onSecSozlesme={(id) => { setUstSekme('sozlesmeler'); setSecilenSozlesmeId(id); }} />}
      {ustSekme === 'sablonlar' && <SablonYonetimi />}
    </div>
  );
}

function TabButon({ aktif, onClick, icon, etiket }: { aktif: boolean; onClick: () => void; icon: React.ReactNode; etiket: string }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
        aktif ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}>
      {icon} {etiket}
    </button>
  );
}
