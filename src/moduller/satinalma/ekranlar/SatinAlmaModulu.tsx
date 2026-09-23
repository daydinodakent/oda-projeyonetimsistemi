import { useState } from 'react';
import { ClipboardPlus, Inbox, Scale, Truck, FileWarning, Award } from 'lucide-react';
import TalepOlustur from './TalepOlustur';
import TalepHavuzu from './TalepHavuzu';
import TeklifMukayese from './TeklifMukayese';
import SiparisTakip from './SiparisTakip';
import FaturaEslestirmeIstisnalari from './FaturaEslestirmeIstisnalari';
import TedarikciKarnesiEkrani from './TedarikciKarnesi';

type UstSekme = 'talep-olustur' | 'talep-havuzu' | 'mukayese' | 'siparis-takip' | 'fatura-eslestirme' | 'tedarikci-karnesi';

interface Props {
  projeId: string;
}

/**
 * Satın Alma modülünün kendi kendine yeten kök bileşeni. BİLİNÇLİ OLARAK
 * mevcut App.tsx navigasyonuna BAĞLANMADI (P1/P2'deki AYNI karar — bkz.
 * docs/moduller/CAKISMA_HARITASI.md "P3 Uygulama Durumu").
 */
export default function SatinAlmaModulu({ projeId }: Props) {
  const [ustSekme, setUstSekme] = useState<UstSekme>('talep-havuzu');
  const [aktifTalepId, setAktifTalepId] = useState<number | null>(null);
  const [aktifFaturaId, setAktifFaturaId] = useState<number | null>(null);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 self-start overflow-x-auto">
        <TabButon aktif={ustSekme === 'talep-olustur'} onClick={() => setUstSekme('talep-olustur')} icon={<ClipboardPlus className="w-3.5 h-3.5" />} etiket="Talep Oluştur" />
        <TabButon aktif={ustSekme === 'talep-havuzu'} onClick={() => setUstSekme('talep-havuzu')} icon={<Inbox className="w-3.5 h-3.5" />} etiket="Talep Havuzu" />
        <TabButon aktif={ustSekme === 'mukayese'} onClick={() => setUstSekme('mukayese')} icon={<Scale className="w-3.5 h-3.5" />} etiket="Teklif Mukayese" />
        <TabButon aktif={ustSekme === 'siparis-takip'} onClick={() => setUstSekme('siparis-takip')} icon={<Truck className="w-3.5 h-3.5" />} etiket="Sipariş Takip" />
        <TabButon aktif={ustSekme === 'fatura-eslestirme'} onClick={() => setUstSekme('fatura-eslestirme')} icon={<FileWarning className="w-3.5 h-3.5" />} etiket="Fatura Eşleştirme" />
        <TabButon aktif={ustSekme === 'tedarikci-karnesi'} onClick={() => setUstSekme('tedarikci-karnesi')} icon={<Award className="w-3.5 h-3.5" />} etiket="Tedarikçi Karnesi" />
      </div>

      {ustSekme === 'talep-olustur' && <TalepOlustur projeId={projeId} onOlusturuldu={() => setUstSekme('talep-havuzu')} />}
      {ustSekme === 'talep-havuzu' && <TalepHavuzu projeId={projeId} onMukayeseAc={(id) => { setAktifTalepId(id); setUstSekme('mukayese'); }} />}
      {ustSekme === 'mukayese' && (
        aktifTalepId
          ? <TeklifMukayese talepId={aktifTalepId} projeId={projeId} onSiparisOlusturuldu={() => setUstSekme('siparis-takip')} />
          : <div className="p-6 text-xs text-[var(--text-secondary)]">Önce Talep Havuzu'ndan onaylı bir talep seçin.</div>
      )}
      {ustSekme === 'siparis-takip' && <SiparisTakip projeId={projeId} onFaturaOlusturuldu={(id) => { setAktifFaturaId(id); setUstSekme('fatura-eslestirme'); }} />}
      {ustSekme === 'fatura-eslestirme' && <FaturaEslestirmeIstisnalari faturaId={aktifFaturaId} />}
      {ustSekme === 'tedarikci-karnesi' && <TedarikciKarnesiEkrani />}
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
