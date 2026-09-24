import { useEffect, useState } from 'react';
import { ScanSearch, ShieldCheck } from 'lucide-react';
import * as api from '../api';
import type { MutabakatRaporu } from '../types';
import { KART, HATA_KUTU, BTN_MOR, tl, BULGU_ETIKET } from './format';

/** Çift sayım / eksik sayım avcısı: kaynak modüllerde onaylı olup defterde olmayan veya defterde olup kaynağı iptal/eksik kayıtlar. */
export default function MutabakatEkrani({ projeId }: { projeId?: string }) {
  const [m, setM] = useState<MutabakatRaporu | null>(null);
  const [filtre, setFiltre] = useState<string>('');
  const [hata, setHata] = useState<string | null>(null);
  const yukle = () => api.mutabakat(projeId).then(setM).catch((e) => setHata(String(e.message)));
  useEffect(() => { yukle(); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const liste = m?.bulgular.filter((b) => !filtre || b.tur === filtre) ?? [];
  return (
    <div className={KART}>
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><ScanSearch className="w-5 h-5 text-indigo-400" /> Mutabakat Raporu {projeId ? `— ${projeId}` : '(tüm portföy)'}</h2>
        <button onClick={yukle} className={BTN_MOR}>Yeniden Tara</button>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {!m ? <div className="text-xs text-[var(--text-secondary)]">Taranıyor…</div> : (
        <>
          <div className={`p-3 rounded-xl border mb-4 flex items-center gap-3 text-xs ${m.temiz ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' : 'bg-red-600/10 border-red-500/30 text-red-400'}`}>
            <ShieldCheck className="w-4 h-4" />
            <span><b>{m.temiz ? 'Hata bulunmadı' : `${m.bulgular.filter((b) => b.seviye === 'hata').length} hata`}</b> — {m.taranan_hareket} defter hareketi tarandı, {m.bulgu_sayisi} bulgu.</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button onClick={() => setFiltre('')} className={`px-2 py-1 text-[10px] font-black uppercase rounded border cursor-pointer ${filtre === '' ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>Hepsi ({m.bulgu_sayisi})</button>
            {Object.entries(m.sayim).map(([k, v]) => <button key={k} onClick={() => setFiltre(k)} className={`px-2 py-1 text-[10px] font-black uppercase rounded border cursor-pointer ${filtre === k ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>{BULGU_ETIKET[k] ?? k} ({v})</button>)}
          </div>
          <div className="flex flex-col gap-1.5">
            {liste.map((b, i) => (
              <div key={i} className={`p-2.5 rounded-lg border text-xs ${b.seviye === 'hata' ? 'bg-red-600/5 border-red-500/30' : 'bg-amber-600/5 border-amber-500/30'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{BULGU_ETIKET[b.tur] ?? b.tur} • {b.etiket ?? `${b.modul} #${b.kaynak_id}`}</span>
                  {b.tutar_kurus != null && <b>{tl(b.tutar_kurus)}</b>}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">{b.proje_id ? `${b.proje_id} • ` : ''}{b.modul} {b.kaynak_id ? `#${b.kaynak_id}` : ''}{b.hareket_id ? ` • defter hareketi #${b.hareket_id}` : ''} — {b.mesaj}</div>
              </div>
            ))}
            {liste.length === 0 && m.temiz && <div className="text-xs text-emerald-400 py-4">Bu kriterde bulgu yok.</div>}
          </div>
        </>
      )}
    </div>
  );
}
