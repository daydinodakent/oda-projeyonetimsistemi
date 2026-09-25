import { useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import * as api from '../api';
import type { NakitAkisi } from '../types';
import { KART, INPUT, HATA_KUTU, tl, formatTarih } from './format';

export default function NakitAkisiEkrani({ projeId }: { projeId: string }) {
  const [periyot, setPeriyot] = useState<'haftalik' | 'aylik'>('aylik');
  const [nakit, setNakit] = useState<NakitAkisi | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { api.nakitAkisi(projeId, periyot).then(setNakit).catch((e) => setHata(String(e.message))); }, [projeId, periyot]);
  const maks = Math.max(1, ...(nakit?.donemler.flatMap((d) => [d.giris, d.cikis]) ?? [1]));

  return (
    <div className={KART}>
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Banknote className="w-5 h-5 text-indigo-400" /> Nakit Akışı Projeksiyonu — {projeId}</h2>
        <select value={periyot} onChange={(e) => setPeriyot(e.target.value as 'haftalik' | 'aylik')} className={`${INPUT} w-auto`}><option value="aylik">Aylık</option><option value="haftalik">Haftalık</option></select>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {!nakit ? <div className="text-xs text-[var(--text-secondary)]">Yükleniyor…</div> : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl"><div className="text-[9px] font-black uppercase text-[var(--text-secondary)]">Toplam giriş (müşteri)</div><div className="font-black text-base text-emerald-400">{tl(nakit.toplam_giris_kurus)}</div></div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl"><div className="text-[9px] font-black uppercase text-[var(--text-secondary)]">Toplam çıkış (talimat)</div><div className="font-black text-base text-red-400">{tl(nakit.toplam_cikis_kurus)}</div></div>
            <div className={`p-3 border rounded-xl ${nakit.en_dusuk_kumulatif_kurus < 0 ? 'bg-red-600/10 border-red-500/30' : 'bg-[var(--bg-primary)] border-[var(--border)]'}`}><div className="text-[9px] font-black uppercase text-[var(--text-secondary)]">En düşük kümülatif</div><div className="font-black text-base">{tl(nakit.en_dusuk_kumulatif_kurus)}</div></div>
          </div>
          <div className="flex flex-col gap-2">
            {nakit.donemler.length === 0 && <div className="text-xs text-[var(--text-secondary)]">Vadeli ödeme talimatı ya da müşteri taksiti yok.</div>}
            {nakit.donemler.map((d) => (
              <div key={d.baslangic} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <b className={d.baslangic === 'gecikmis' ? 'text-red-400' : ''}>{d.baslangic === 'gecikmis' ? 'Vadesi geçmiş' : formatTarih(d.baslangic)}</b>
                  <span>net <b className={d.net < 0 ? 'text-red-400' : 'text-emerald-400'}>{tl(d.net)}</b> • kümülatif <b className={d.kumulatif < 0 ? 'text-red-400' : ''}>{tl(d.kumulatif)}</b></span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2"><div className="h-2.5 rounded bg-emerald-500/70" style={{ width: `${(d.giris / maks) * 60}%` }} /><span className="text-[10px]">{tl(d.giris)}</span></div>
                  <div className="flex items-center gap-2"><div className="h-2.5 rounded bg-red-500/70" style={{ width: `${(d.cikis / maks) * 60}%` }} /><span className="text-[10px]">{tl(d.cikis)}</span></div>
                </div>
                <details className="mt-1"><summary className="text-[10px] text-[var(--text-secondary)] cursor-pointer">{d.kalemler.length} kalem</summary>
                  {d.kalemler.map((k, i) => <div key={i} className="text-[10px] flex justify-between py-0.5"><span>{formatTarih(k.tarih)} • {k.etiket}{k.kesin ? '' : ' (belirsiz)'}</span><span className={k.yon === 'giris' ? 'text-emerald-400' : 'text-red-400'}>{k.yon === 'giris' ? '+' : '−'}{tl(k.tutar_kurus)}</span></div>)}
                </details>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-3">{nakit.not}</div>
        </>
      )}
    </div>
  );
}
