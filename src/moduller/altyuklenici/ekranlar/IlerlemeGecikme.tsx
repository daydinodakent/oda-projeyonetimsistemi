import { useEffect, useState } from 'react';
import { TrendingUp, Plus } from 'lucide-react';
import * as api from '../api';
import type { GecikmeOzetSatiri } from '../types';

interface Props {
  sozlesmeId: number;
}

export default function IlerlemeGecikme({ sozlesmeId }: Props) {
  const [ozet, setOzet] = useState<GecikmeOzetSatiri[]>([]);
  const [formAcik, setFormAcik] = useState(false);
  const [wbsId, setWbsId] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [planlanan, setPlanlanan] = useState(0);
  const [gerceklesen, setGerceklesen] = useState(0);
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    setOzet(await api.gecikmeOzetiGetir(sozlesmeId));
  }
  useEffect(() => { yenile(); }, [sozlesmeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function kaydet() {
    setHata(null);
    try {
      await api.ilerlemeKaydet(sozlesmeId, { wbs_gorev_id: wbsId, tarih, planlanan_yuzde: planlanan, gerceklesen_yuzde: gerceklesen });
      setFormAcik(false);
      setWbsId('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-400" /> İlerleme / Gecikme</h2>
        <button onClick={() => setFormAcik((v) => !v)} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Kayıt Ekle</button>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      {formAcik && (
        <div className="mb-4 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
          <input value={wbsId} onChange={(e) => setWbsId(e.target.value)} placeholder="WBS Görev ID" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input type="number" value={planlanan} onChange={(e) => setPlanlanan(Number(e.target.value))} placeholder="Planlanan %" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input type="number" value={gerceklesen} onChange={(e) => setGerceklesen(Number(e.target.value))} placeholder="Gerçekleşen %" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <button disabled={!wbsId} onClick={kaydet} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Kaydet</button>
        </div>
      )}

      {ozet.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">İlerleme kaydı yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {ozet.map((o) => (
            <div key={o.wbs_gorev_id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold font-mono">{o.wbs_gorev_id}</span>
                <span className="text-[var(--text-secondary)]"> — Planlanan %{o.planlanan_yuzde} / Gerçekleşen %{o.gerceklesen_yuzde}</span>
              </div>
              <span className={`text-xs font-black ${o.gecikmeYuzde > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{o.gecikmeYuzde > 0 ? `%${o.gecikmeYuzde} GERİDE` : 'Zamanında/Önde'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
