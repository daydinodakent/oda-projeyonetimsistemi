import { useEffect, useState } from 'react';
import { Table2 } from 'lucide-react';
import { useKisiAdlari } from '../../_cekirdek/useKisiAdlari';
import * as api from '../api';
import type { EkipUye, TaseronPuantajKaydi } from '../types';
import { haftaGunleri, formatTarih } from './format';

interface Props {
  ekipId: number;
}

export default function HaftalikPuantajMatrisi({ ekipId }: Props) {
  const kisiAdi = useKisiAdlari();
  const [uyeler, setUyeler] = useState<EkipUye[]>([]);
  const [haftaBaslangic, setHaftaBaslangic] = useState(new Date().toISOString().slice(0, 10));
  const [kayitlar, setKayitlar] = useState<Record<number, TaseronPuantajKaydi[]>>({});

  const gunler = haftaGunleri(haftaBaslangic);

  useEffect(() => { api.ekipUyeleriGetir(ekipId).then(setUyeler); }, [ekipId]);

  useEffect(() => {
    (async () => {
      const sonuc: Record<number, TaseronPuantajKaydi[]> = {};
      for (const u of uyeler) {
        sonuc[u.id] = await api.kisiPuantajAraligiGetir(u.kisi_id, gunler[0], gunler[6]);
      }
      setKayitlar(sonuc);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uyeler, haftaBaslangic]);

  function hucre(uyeId: number, tarih: string) {
    const kayit = (kayitlar[uyeId] || []).find((k) => k.tarih === tarih);
    if (!kayit) return <span className="text-[var(--text-secondary)]">—</span>;
    return <span className={kayit.gun_degeri === 1 ? 'text-emerald-400' : kayit.gun_degeri === 0.5 ? 'text-amber-400' : 'text-red-400'}>{kayit.gun_degeri}{kayit.fazla_mesai_saat > 0 ? ` +${kayit.fazla_mesai_saat}sa` : ''}</span>;
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)] overflow-x-auto">
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Table2 className="w-5 h-5 text-indigo-400" /> Haftalık Puantaj Matrisi</h2>
        <input type="date" value={haftaBaslangic} onChange={(e) => setHaftaBaslangic(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs" />
      </div>

      <table className="w-full text-xs border-collapse min-w-[500px]">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            <th className="py-2 pr-3 text-[10px] font-black uppercase text-[var(--text-secondary)]">Kişi</th>
            {gunler.map((g) => <th key={g} className="py-2 px-2 text-[10px] font-black uppercase text-[var(--text-secondary)]">{formatTarih(g).slice(0, 5)}</th>)}
          </tr>
        </thead>
        <tbody>
          {uyeler.map((u) => (
            <tr key={u.id} className="border-b border-[var(--border)]/40">
              <td className="py-2 pr-3 font-bold whitespace-nowrap">{kisiAdi(u.kisi_id)} <span className="text-[var(--text-secondary)] font-normal">({u.rol_saha})</span></td>
              {gunler.map((g) => <td key={g} className="py-2 px-2 text-center">{hucre(u.id, g)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
