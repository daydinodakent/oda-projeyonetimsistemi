import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import * as api from '../api';
import type { PerformansKarti } from '../types';

interface Props {
  sozlesmeId: number;
}

export default function PerformansKarnesi({ sozlesmeId }: Props) {
  const [kartlar, setKartlar] = useState<PerformansKarti[]>([]);
  const [donem, setDonem] = useState('');
  const [zaman, setZaman] = useState(80);
  const [kalite, setKalite] = useState(80);
  const [isg, setIsg] = useState(80);
  const [belge, setBelge] = useState(80);
  const [ncrAcik, setNcrAcik] = useState(0);
  const [isgIhlal, setIsgIhlal] = useState(0);
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    setKartlar(await api.performansGetir(sozlesmeId));
  }
  useEffect(() => { yenile(); }, [sozlesmeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function kaydet() {
    setHata(null);
    try {
      await api.performansKaydet(sozlesmeId, { donem, zaman_puani: zaman, kalite_puani: kalite, isg_puani: isg, belge_puani: belge, ncr_acik_sayisi: ncrAcik, isg_ihlal_sayisi: isgIhlal });
      setDonem('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Award className="w-5 h-5 text-indigo-400" /> Performans Karnesi</h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 items-end mb-4">
        <input value={donem} onChange={(e) => setDonem(e.target.value)} placeholder="Dönem (ör. 2026-Q1)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs col-span-2" />
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">Zaman <input type="number" value={zaman} onChange={(e) => setZaman(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs" /></label>
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">Kalite <input type="number" value={kalite} onChange={(e) => setKalite(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs" /></label>
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">İSG <input type="number" value={isg} onChange={(e) => setIsg(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs" /></label>
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">Belge <input type="number" value={belge} onChange={(e) => setBelge(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs" /></label>
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">Açık NCR <input type="number" value={ncrAcik} onChange={(e) => setNcrAcik(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs" /></label>
        <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">İSG İhlali <input type="number" value={isgIhlal} onChange={(e) => setIsgIhlal(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs" /></label>
        <button disabled={!donem} onClick={kaydet} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Kaydet</button>
      </div>

      {kartlar.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Performans kaydı yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {kartlar.map((k) => (
            <div key={k.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold">{k.donem}</span>
                <span className="text-[var(--text-secondary)]"> — Zaman:{k.zaman_puani} Kalite:{k.kalite_puani} İSG:{k.isg_puani} Belge:{k.belge_puani} • Açık NCR: {k.ncr_acik_sayisi} • İSG İhlali: {k.isg_ihlal_sayisi}</span>
              </div>
              <span className="text-sm font-black text-indigo-400">{k.toplam_puan}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
