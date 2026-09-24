import { Suspense, lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { X } from 'lucide-react';
import type { ModuleId } from './ModuleGridDialog';

type Ekran = LazyExoticComponent<ComponentType<{ projeId: string }>>;

// Modüller ilk açılışta yüklenmez (bundle şişmesin).
const EKRANLAR: Record<ModuleId, { baslik: string; Bilesen: Ekran }> = {
  altyuklenici: { baslik: 'Alt Yüklenici Takibi', Bilesen: lazy(() => import('../../moduller/altyuklenici/ekranlar/AltYukleniciModulu')) },
  taseron: { baslik: 'Taşeron Takibi', Bilesen: lazy(() => import('../../moduller/taseron/ekranlar/TaseronModulu')) },
  maliyet: { baslik: 'Maliyet Yönetimi', Bilesen: lazy(() => import('../../moduller/maliyet/ekranlar/MaliyetModulu')) },
  musteri: { baslik: 'Müşteri Yönetimi', Bilesen: lazy(() => import('../../moduller/musteri/ekranlar/MusteriModulu')) },
  satinalma: { baslik: 'Satın Alma Yönetimi', Bilesen: lazy(() => import('../../moduller/satinalma/ekranlar/SatinAlmaModulu')) },
  santiye: { baslik: 'Şantiye Yönetimi', Bilesen: lazy(() => import('../../moduller/santiye/ekranlar/SantiyeModulu')) },
  sozlesme: { baslik: 'Sözleşme Yönetimi', Bilesen: lazy(() => import('../../moduller/sozlesme/ekranlar/SozlesmeModulu')) },
  depo: { baslik: 'Depo Yönetimi', Bilesen: lazy(() => import('../../moduller/depo/ekranlar/DepoModulu')) },
  ik: { baslik: 'İK Yönetimi', Bilesen: lazy(() => import('../../moduller/ik/ekranlar/IkModulu')) },
};

/** "Yönetim Modülleri" ızgarasından seçilen modülü merkez alanda açar. */
export default function YonetimModulPaneli({ modulId, projeId, onClose }: { modulId: ModuleId; projeId: string; onClose: () => void }) {
  const { baslik, Bilesen } = EKRANLAR[modulId];
  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl text-[var(--text-primary)]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
        <h2 className="text-sm font-black">{baslik} <span className="text-[10px] font-bold text-[var(--text-secondary)]">· Proje: {projeId}</span></h2>
        <button id="yonetim-modul-kapat" title="Kapat" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-primary)]"><X className="w-4 h-4" /></button>
      </div>
      <Suspense fallback={<div className="text-xs p-6">Yükleniyor…</div>}>
        <Bilesen key={modulId + projeId} projeId={projeId} />
      </Suspense>
    </div>
  );
}
