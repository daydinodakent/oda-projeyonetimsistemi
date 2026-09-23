import { useState } from 'react';
import { Gauge } from 'lucide-react';
import * as api from '../api';
import type { VerimlilikRaporu as VerimlilikRaporuTipi } from '../types';

interface Props {
  ekipId: number;
}

export default function VerimlilikRaporu({ ekipId }: Props) {
  const [sozlesmeKalemId, setSozlesmeKalemId] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [rapor, setRapor] = useState<VerimlilikRaporuTipi | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function getir() {
    setHata(null);
    try {
      setRapor(await api.verimlilikRaporuGetir(ekipId, Number(sozlesmeKalemId), baslangic, bitis));
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Gauge className="w-5 h-5 text-indigo-400" /> Verimlilik Raporu</h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <input value={sozlesmeKalemId} onChange={(e) => setSozlesmeKalemId(e.target.value)} type="number" placeholder="Sözleşme Kalemi ID" className="col-span-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs" />
        <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs" />
        <input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs" />
      </div>
      <button disabled={!sozlesmeKalemId || !baslangic || !bitis} onClick={getir} className="w-full px-3 py-2 text-xs font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer disabled:opacity-40 mb-4">Raporu Getir</button>

      {rapor && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-center">
            <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1">Toplam Metraj</div>
            <div className="text-sm font-black">{rapor.toplamMetraj} {rapor.birim}</div>
          </div>
          <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-center">
            <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1">Adam-Gün</div>
            <div className="text-sm font-black">{rapor.toplamAdamGun}</div>
          </div>
          <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-center">
            <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1">Adam-Gün/Birim</div>
            <div className="text-sm font-black text-indigo-400">{rapor.adamGunBirim ?? '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
