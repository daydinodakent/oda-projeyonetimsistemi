import { useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import * as api from '../api';
import type { EvrakDurumSatiri, EvrakTuru } from '../types';
import { formatTarih, EVRAK_TUR_ETIKET, EVRAK_DURUM_ETIKET, EVRAK_DURUM_RENK } from './format';

interface Props {
  sozlesmeId: number;
}

export default function EvrakDurumu({ sozlesmeId }: Props) {
  const [durumlar, setDurumlar] = useState<EvrakDurumSatiri[]>([]);
  const [sonHakedisMi, setSonHakedisMi] = useState(false);
  const [duzenlenenTur, setDuzenlenenTur] = useState<EvrakTuru | null>(null);
  const [gecerlilikBitis, setGecerlilikBitis] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    setDurumlar(await api.evraklariGetir(sozlesmeId, sonHakedisMi));
  }
  useEffect(() => { yenile(); }, [sozlesmeId, sonHakedisMi]); // eslint-disable-line react-hooks/exhaustive-deps

  async function kaydet(tur: EvrakTuru) {
    setHata(null);
    try {
      await api.evrakGuncelle(sozlesmeId, tur, { gecerlilik_bitis: gecerlilikBitis || undefined });
      setDuzenlenenTur(null);
      setGecerlilikBitis('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><FileCheck2 className="w-5 h-5 text-indigo-400" /> Evrak Durumu</h2>
        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">
          <input type="checkbox" checked={sonHakedisMi} onChange={(e) => setSonHakedisMi(e.target.checked)} /> Son hakediş (ilişiksizlik dahil)
        </label>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="flex flex-col gap-2">
        {durumlar.map((d) => (
          <div key={d.tur} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
            <div className="text-xs">
              <span className="font-bold">{EVRAK_TUR_ETIKET[d.tur]}</span>
              {d.kayit?.gecerlilik_bitis && <span className="text-[var(--text-secondary)]"> — Geçerlilik: {formatTarih(d.kayit.gecerlilik_bitis)}</span>}
            </div>
            <div className="flex items-center gap-2">
              {duzenlenenTur === d.tur ? (
                <>
                  <input type="date" value={gecerlilikBitis} onChange={(e) => setGecerlilikBitis(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-[10px]" />
                  <button onClick={() => kaydet(d.tur)} className="px-2 py-1 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded cursor-pointer">Kaydet</button>
                </>
              ) : (
                <>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${EVRAK_DURUM_RENK[d.durum]}`}>{EVRAK_DURUM_ETIKET[d.durum]}</span>
                  <button onClick={() => setDuzenlenenTur(d.tur)} className="px-2 py-1 text-[10px] font-black uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer">Güncelle</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
