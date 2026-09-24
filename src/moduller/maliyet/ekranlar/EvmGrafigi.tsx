import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import * as api from '../api';
import type { Evm } from '../types';
import { KART, HATA_KUTU, tl, formatTarih } from './format';

const W = 640; const H = 260; const PAD = { l: 60, r: 16, t: 14, b: 30 };

export default function EvmGrafigi({ projeId }: { projeId: string }) {
  const [evm, setEvm] = useState<Evm | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { api.evm(projeId).then(setEvm).catch((e) => setHata(String(e.message))); }, [projeId]);

  const seri = evm?.seri ?? [];
  const maks = Math.max(1, ...seri.flatMap((s) => [s.pv, s.ac ?? 0]), evm?.ev ?? 0, evm?.bac ?? 0);
  const x = (i: number) => PAD.l + (seri.length <= 1 ? 0 : (i / (seri.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - v / maks) * (H - PAD.t - PAD.b);
  const yol = (anahtar: 'pv' | 'ac') => seri.map((s, i) => (s[anahtar] == null ? null : `${i === 0 || seri[i - 1][anahtar] == null ? 'M' : 'L'}${x(i).toFixed(1)},${y(s[anahtar] as number).toFixed(1)}`)).filter(Boolean).join(' ');
  const evIdx = evm ? Math.max(0, seri.findIndex((s) => s.tarih >= evm.ev_noktasi.tarih)) : 0;
  const renk = (v: number | null) => (v == null ? '' : v < 1 ? 'text-red-400' : 'text-emerald-400');

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><TrendingUp className="w-5 h-5 text-indigo-400" /> Kazanılmış Değer (EVM) — {projeId}</h2>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {!evm ? <div className="text-xs text-[var(--text-secondary)]">Yükleniyor…</div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 text-xs">
            {[['BAC (bütçe)', tl(evm.bac)], ['PV (planlanan)', tl(evm.pv)], ['EV (kazanılan)', tl(evm.ev)], ['AC (gerçek maliyet)', tl(evm.ac)]].map(([b, d]) => (
              <div key={b} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl"><div className="text-[9px] font-black uppercase text-[var(--text-secondary)]">{b}</div><div className="font-black text-base">{d}</div></div>
            ))}
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl"><div className="text-[9px] font-black uppercase text-[var(--text-secondary)]">CPI (EV/AC)</div><div className={`font-black text-base ${renk(evm.cpi)}`}>{evm.cpi ?? '—'}</div></div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl"><div className="text-[9px] font-black uppercase text-[var(--text-secondary)]">SPI (EV/PV)</div><div className={`font-black text-base ${renk(evm.spi)}`}>{evm.spi ?? '—'}</div></div>
          </div>
          {seri.length === 0 ? <div className="text-xs text-amber-400">Grafik için WBS'e bağlı ve bütçesi olan iş programı aktivitesi gerekli (P8 İş Programı).</div> : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl">
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}><line x1={PAD.l} x2={W - PAD.r} y1={y(maks * f)} y2={y(maks * f)} stroke="currentColor" opacity="0.1" /><text x={PAD.l - 6} y={y(maks * f) + 3} fontSize="9" textAnchor="end" fill="currentColor" opacity="0.6">{tl(maks * f)}</text></g>
              ))}
              {seri.map((s, i) => (i % Math.ceil(seri.length / 6) === 0 ? <text key={s.tarih} x={x(i)} y={H - 10} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.6">{s.tarih.slice(0, 7)}</text> : null))}
              <path d={yol('pv')} fill="none" stroke="#6366f1" strokeWidth="2" />
              <path d={yol('ac')} fill="none" stroke="#ef4444" strokeWidth="2" />
              <circle cx={x(evIdx)} cy={y(evm.ev)} r="5" fill="#10b981" />
              <line x1={PAD.l} x2={W - PAD.r} y1={y(evm.bac)} y2={y(evm.bac)} stroke="#f59e0b" strokeDasharray="4 3" opacity="0.6" />
            </svg>
          )}
          <div className="flex gap-4 text-[10px] mt-1 flex-wrap"><span className="text-indigo-400">— PV (iş programı)</span><span className="text-red-400">— AC (defter gerçekleşen)</span><span className="text-emerald-400">● EV (onaylı ilerleme, {formatTarih(evm.ev_noktasi.tarih)})</span><span className="text-amber-400">- - BAC</span></div>
          <div className="mt-3 text-[10px] text-[var(--text-secondary)]">{evm.hesaplanan_aktivite}/{evm.aktivite_sayisi} aktivite hesaba girdi. {evm.not}</div>
          {evm.agirliksiz.length > 0 && <div className="mt-2 text-[10px] text-amber-400">Hesaba girmeyen: {evm.agirliksiz.map((a) => `${a.ad} (${a.neden})`).join('; ')}</div>}
        </>
      )}
    </div>
  );
}
