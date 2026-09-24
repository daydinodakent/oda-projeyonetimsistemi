import { useEffect, useState } from 'react';
import { Wallet, Check, X } from 'lucide-react';
import * as api from '../api';
import type { Personel, Avans } from '../types';
import { formatKurus, formatTarih } from './format';

export default function AvansTalepOnay() {
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [secilenPersonelId, setSecilenPersonelId] = useState('');
  const [tutarTl, setTutarTl] = useState('');
  const [taksitSayisi, setTaksitSayisi] = useState(1);
  const [avanslar, setAvanslar] = useState<Avans[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  async function yenile(personelId: number) {
    setAvanslar(await api.avanslariGetir(personelId));
  }
  useEffect(() => { api.personelleriListele().then(setPersoneller); }, []);
  useEffect(() => { if (secilenPersonelId) yenile(Number(secilenPersonelId)); }, [secilenPersonelId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function talepEt() {
    if (!secilenPersonelId || !tutarTl) { setHata('Personel ve tutar zorunludur.'); return; }
    setHata(null);
    try {
      await api.avansTalepEt({ personel_id: Number(secilenPersonelId), tutar_kurus: Math.round(Number(tutarTl) * 100), talep_tarihi: new Date().toISOString().slice(0, 10), taksit_sayisi: taksitSayisi });
      setTutarTl('');
      await yenile(Number(secilenPersonelId));
    } catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function onayla(id: number) {
    setHata(null);
    try { await api.avansOnayla(id, 'yetkili'); await yenile(Number(secilenPersonelId)); }
    catch (err) { setHata(String((err as Error).message || err)); }
  }
  async function reddet(id: number) {
    await api.avansReddet(id);
    await yenile(Number(secilenPersonelId));
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)] flex flex-col gap-4">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-3 border-b border-[var(--border)]"><Wallet className="w-5 h-5 text-indigo-400" /> Avans Talep / Onay</h2>

      {hata && <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <select value={secilenPersonelId} onChange={(e) => setSecilenPersonelId(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm">
        <option value="">Personel seçin…</option>
        {personeller.map((p) => <option key={p.id} value={p.id}>{p.sicil_no} — {p.unvan || 'Personel'}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={tutarTl} onChange={(e) => setTutarTl(e.target.value)} placeholder="Tutar (TL)" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
        <input type="number" min={1} value={taksitSayisi} onChange={(e) => setTaksitSayisi(Number(e.target.value))} placeholder="Taksit Sayısı" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
      </div>
      <button onClick={talepEt} className="w-full py-3 text-sm font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer">Talep Oluştur</button>

      <div className="flex flex-col gap-2">
        {avanslar.map((a) => (
          <div key={a.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
            <div className="text-xs">
              <div className="font-bold">{formatKurus(a.tutar_kurus)} ({a.taksit_sayisi} taksit)</div>
              <div className="text-[10px] text-[var(--text-secondary)]">{formatTarih(a.talep_tarihi)}</div>
            </div>
            {a.durum === 'talep_edildi' ? (
              <div className="flex gap-1">
                <button onClick={() => onayla(a.id)} className="p-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => reddet(a.id)} className="p-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase bg-slate-600/20 text-slate-400 border-slate-500/30">{a.durum}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
