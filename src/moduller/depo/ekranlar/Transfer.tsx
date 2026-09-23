import { useEffect, useState } from 'react';
import { ArrowRightLeft, Truck } from 'lucide-react';
import * as api from '../api';
import type { Depo, MalzemeKarti, Transfer as TransferTip } from '../types';
import { formatTarih } from './format';

interface Props {
  projeId: string;
}

export default function Transfer({ projeId }: Props) {
  const [depolar, setDepolar] = useState<Depo[]>([]);
  const [malzemeler, setMalzemeler] = useState<MalzemeKarti[]>([]);
  const [kaynakDepoId, setKaynakDepoId] = useState<number | null>(null);
  const [hedefDepoId, setHedefDepoId] = useState<number | null>(null);
  const [malzemeId, setMalzemeId] = useState<number | null>(null);
  const [miktar, setMiktar] = useState(1);
  const [birim, setBirim] = useState('');
  const [transferler, setTransferler] = useState<TransferTip[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.depolariListele(projeId), api.malzemeleriListele()]).then(([d, m]) => {
      setDepolar(d);
      setMalzemeler(m);
      if (d.length) { setKaynakDepoId(d[0].id); setHedefDepoId(d[1]?.id ?? d[0].id); }
      if (m.length) { setMalzemeId(m[0].id); setBirim(m[0].birim); }
    });
  }, [projeId]);

  async function listeyiYenile(depoId: number) {
    setTransferler(await api.transferleriGetir(depoId));
  }
  useEffect(() => { if (kaynakDepoId) listeyiYenile(kaynakDepoId); }, [kaynakDepoId]);

  async function baslat() {
    setHata(null);
    if (!kaynakDepoId || !hedefDepoId || !malzemeId) return;
    try {
      await api.transferBaslat({ kaynak_depo_id: kaynakDepoId, hedef_depo_id: hedefDepoId, malzeme_id: malzemeId, miktar, birim, proje_id: projeId });
      await listeyiYenile(kaynakDepoId);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function teslimAl(id: number) {
    await api.transferTeslimAl(id);
    if (kaynakDepoId) await listeyiYenile(kaynakDepoId);
  }

  const depoAdi = (id: number) => depolar.find((d) => d.id === id)?.ad || `#${id}`;
  const malzemeAdi = (id: number) => malzemeler.find((m) => m.id === id)?.ad || `#${id}`;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <ArrowRightLeft className="w-5 h-5 text-indigo-400" /> Depolar Arası Transfer
      </h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-2 items-end mb-4">
        <select value={kaynakDepoId ?? ''} onChange={(e) => setKaynakDepoId(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
          {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
        </select>
        <select value={hedefDepoId ?? ''} onChange={(e) => setHedefDepoId(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
          {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
        </select>
        <select value={malzemeId ?? ''} onChange={(e) => { const id = Number(e.target.value); setMalzemeId(id); const m = malzemeler.find((x) => x.id === id); if (m) setBirim(m.birim); }} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
          {malzemeler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
        </select>
        <input type="number" value={miktar} onChange={(e) => setMiktar(Number(e.target.value))} placeholder="Miktar" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
        <button onClick={baslat} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer">Transferi Başlat</button>
      </div>

      {transferler.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Transfer kaydı yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {transferler.map((t) => (
            <div key={t.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold">{malzemeAdi(t.malzeme_id)}</span> — {t.miktar} • {depoAdi(t.kaynak_depo_id)} → {depoAdi(t.hedef_depo_id)}
                <div className="text-[10px] text-[var(--text-secondary)]">{formatTarih(t.olusturma_zamani)}</div>
              </div>
              {t.durum === 'yolda' ? (
                <button onClick={() => teslimAl(t.id)} className="px-2.5 py-1 text-[10px] font-black uppercase bg-amber-600/15 border border-amber-500/30 text-amber-400 rounded-lg cursor-pointer flex items-center gap-1"><Truck className="w-3 h-3" /> Yolda — Teslim Al</button>
              ) : (
                <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-emerald-600/15 text-emerald-400 border-emerald-500/30">Tamamlandı</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
