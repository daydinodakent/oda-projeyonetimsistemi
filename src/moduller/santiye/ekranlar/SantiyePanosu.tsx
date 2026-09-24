import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, ListChecks, AlertOctagon, ShieldAlert, Cloud, FileText, TrendingDown } from 'lucide-react';
import * as api from '../api';
import type { PanoOzeti } from '../types';
import { HAVA_ETIKET, KART, HATA_KUTU, bugun } from './format';

function Kutu({ ikon, baslik, deger, uyari }: { ikon: React.ReactNode; baslik: string; deger: React.ReactNode; uyari?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${uyari ? 'bg-red-600/10 border-red-500/30' : 'bg-[var(--bg-primary)] border-[var(--border)]'}`}>
      <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] flex items-center gap-1.5">{ikon} {baslik}</div>
      <div className="text-2xl font-black mt-1">{deger}</div>
    </div>
  );
}

export default function SantiyePanosu({ projeId }: { projeId: string }) {
  const [pano, setPano] = useState<PanoOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { api.panoGetir(projeId, bugun()).then(setPano).catch((e) => setHata(String(e.message || e))); }, [projeId]);

  if (hata) return <div className={HATA_KUTU}>{hata}</div>;
  if (!pano) return <div className="p-6 text-xs text-[var(--text-secondary)]">Yükleniyor…</div>;

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><LayoutDashboard className="w-5 h-5 text-indigo-400" /> Şantiye Panosu — {pano.tarih}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kutu ikon={<Users className="w-3 h-3" />} baslik="Bugün Kişi (puantaj)" deger={pano.kisi_sayisi} />
        <Kutu ikon={<ListChecks className="w-3 h-3" />} baslik="Açık Görev" deger={<>{pano.acik_gorev}{pano.gecikmis_gorev > 0 && <span className="text-xs text-red-400 ml-2">{pano.gecikmis_gorev} gecikmiş</span>}</>} uyari={pano.gecikmis_gorev > 0} />
        <Kutu ikon={<AlertOctagon className="w-3 h-3" />} baslik="Açık NCR" deger={pano.acik_ncr} uyari={pano.acik_ncr > 0} />
        <Kutu ikon={<Cloud className="w-3 h-3" />} baslik="Hava" deger={pano.hava?.durum ? `${HAVA_ETIKET[pano.hava.durum] ?? pano.hava.durum}${pano.hava.sicaklik_c != null ? ` ${pano.hava.sicaklik_c}°` : ''}` : '—'} />
        <Kutu ikon={<FileText className="w-3 h-3" />} baslik="Günlük Rapor" deger={pano.gunluk_rapor_durumu === 'yok' ? 'Yok' : pano.gunluk_rapor_durumu === 'taslak' ? 'Taslak' : 'Onaylı'} uyari={pano.gunluk_rapor_durumu === 'yok'} />
        <Kutu ikon={<TrendingDown className="w-3 h-3" />} baslik="Geride Aktivite" deger={pano.geride_aktivite_sayisi} uyari={pano.geride_aktivite_sayisi > 0} />
        <Kutu ikon={<ShieldAlert className="w-3 h-3" />} baslik="Kırımı Bekleyen Numune" deger={pano.kirimi_bekleyen_numune} uyari={pano.kirimi_bekleyen_numune > 0} />
        <Kutu ikon={<AlertOctagon className="w-3 h-3" />} baslik="İlerleme Çelişkisi (P5)" deger={pano.ilerleme_celiski_sayisi} uyari={pano.ilerleme_celiski_sayisi > 0} />
      </div>
      <div className="mt-5">
        <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2 flex items-center gap-1.5"><ShieldAlert className="w-3 h-3" /> İSG Uyarıları</div>
        {pano.isg_uyarilari.length === 0 ? <div className="text-xs text-emerald-400">Aktif İSG uyarısı yok.</div> : (
          <div className="flex flex-col gap-1.5">
            {pano.isg_uyarilari.map((u, i) => <div key={i} className="p-2.5 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{u.mesaj}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
