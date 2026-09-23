import { useEffect, useState } from 'react';
import { ClipboardCheck, Plus } from 'lucide-react';
import * as api from '../api';
import type { Depo, MalzemeKarti, Sayim, SayimKalem } from '../types';

interface Props {
  projeId: string;
}

export default function SayimFarkRaporu({ projeId }: Props) {
  const [depolar, setDepolar] = useState<Depo[]>([]);
  const [malzemeler, setMalzemeler] = useState<MalzemeKarti[]>([]);
  const [depoId, setDepoId] = useState<number | null>(null);
  const [sayim, setSayim] = useState<Sayim | null>(null);
  const [kalemler, setKalemler] = useState<SayimKalem[]>([]);
  const [eklenecekMalzemeId, setEklenecekMalzemeId] = useState<number | null>(null);
  const [eklenecekMiktar, setEklenecekMiktar] = useState(0);
  const [farklar, setFarklar] = useState<{ malzeme_id: number; fark: number }[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.depolariListele(projeId), api.malzemeleriListele()]).then(([d, m]) => {
      setDepolar(d);
      setMalzemeler(m);
      if (d.length) setDepoId(d[0].id);
    });
  }, [projeId]);

  async function sayimBaslat() {
    if (!depoId) return;
    setHata(null);
    setFarklar(null);
    try {
      const s = await api.sayimBaslat(depoId, new Date().toISOString().slice(0, 10));
      setSayim(s);
      setKalemler([]);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function kalemEkle() {
    if (!sayim || !eklenecekMalzemeId) return;
    setHata(null);
    try {
      await api.sayimKalemGir(sayim.id, eklenecekMalzemeId, eklenecekMiktar);
      setKalemler(await api.sayimKalemleriGetir(sayim.id));
      setEklenecekMiktar(0);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function tamamla() {
    if (!sayim) return;
    const sonuc = await api.sayimTamamla(sayim.id);
    setSayim(sonuc.sayim);
    setFarklar(sonuc.farklar);
  }

  const malzemeAdi = (id: number) => malzemeler.find((m) => m.id === id)?.ad || `#${id}`;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <ClipboardCheck className="w-5 h-5 text-indigo-400" /> Sayım ve Fark Raporu
      </h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      {!sayim ? (
        <div className="flex items-center gap-2">
          <select value={depoId ?? ''} onChange={(e) => setDepoId(Number(e.target.value))} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs">
            {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
          <button onClick={sayimBaslat} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer">Sayım Başlat</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-[var(--text-secondary)]">Sayım #{sayim.id} — {sayim.durum === 'acik' ? 'AÇIK' : 'TAMAMLANDI'}</div>

          {sayim.durum === 'acik' && (
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl flex items-center gap-2">
              <select value={eklenecekMalzemeId ?? ''} onChange={(e) => setEklenecekMalzemeId(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs flex-1">
                <option value="">Malzeme seçin…</option>
                {malzemeler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
              </select>
              <input type="number" value={eklenecekMiktar} onChange={(e) => setEklenecekMiktar(Number(e.target.value))} placeholder="Sayılan miktar" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs w-32" />
              <button onClick={kalemEkle} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Ekle</button>
            </div>
          )}

          {kalemler.map((k) => (
            <div key={k.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between text-xs">
              <span>{malzemeAdi(k.malzeme_id)}</span>
              <span className="text-[var(--text-secondary)]">Sistem: {k.sistem_miktar} → Sayılan: {k.sayilan_miktar ?? '—'}</span>
            </div>
          ))}

          {sayim.durum === 'acik' && kalemler.length > 0 && (
            <button onClick={tamamla} className="self-start px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Sayımı Tamamla</button>
          )}

          {farklar && (
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] mb-2">Fark Raporu</div>
              {farklar.length === 0 ? <div className="text-xs text-[var(--text-secondary)]">Fark yok — sistem ile fiili sayım birebir uyuştu.</div> : farklar.map((f) => (
                <div key={f.malzeme_id} className="flex items-center justify-between text-xs py-1">
                  <span>{malzemeAdi(f.malzeme_id)}</span>
                  <span className={f.fark < 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{f.fark > 0 ? '+' : ''}{f.fark}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
