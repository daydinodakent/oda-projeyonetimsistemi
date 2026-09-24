import { useEffect, useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import * as api from '../api';
import type { Aday, AdayAsamasi, Huni } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, ASAMA_ETIKET, bugun } from './format';

const ASAMALAR: AdayAsamasi[] = ['aday', 'gorusme', 'rezervasyon', 'satis', 'kayip'];

export default function AdayHunisi({ projeId }: { projeId: string }) {
  const [adaylar, setAdaylar] = useState<Aday[]>([]);
  const [huni, setHuni] = useState<Huni | null>(null);
  const [f, setF] = useState({ ad_soyad: '', telefon: '', kaynak: '' });
  const [hata, setHata] = useState<string | null>(null);
  const yenile = async () => { setAdaylar(await api.adaylariListele(projeId)); setHuni(await api.huniGetir(projeId)); };
  useEffect(() => { yenile().catch((e) => setHata(String(e.message))); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sar = (fn: () => Promise<unknown>) => async () => { setHata(null); try { await fn(); await yenile(); } catch (e) { setHata(String((e as Error).message)); } };

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Filter className="w-5 h-5 text-indigo-400" /> Aday Hunisi</h2>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <input value={f.ad_soyad} onChange={(e) => setF({ ...f, ad_soyad: e.target.value })} placeholder="Ad Soyad" className={INPUT} />
        <input value={f.telefon} onChange={(e) => setF({ ...f, telefon: e.target.value })} placeholder="Telefon" className={INPUT} />
        <div className="flex gap-2"><input value={f.kaynak} onChange={(e) => setF({ ...f, kaynak: e.target.value })} placeholder="Kaynak" className={INPUT} />
          <button onClick={sar(async () => { await api.adayOlustur({ proje_id: projeId, ...f }); setF({ ad_soyad: '', telefon: '', kaynak: '' }); })} className={`${BTN_YESIL} flex items-center gap-1`}><Plus className="w-3 h-3" /></button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ASAMALAR.map((a) => (
          <div key={a} className="flex flex-col gap-2">
            <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">{ASAMA_ETIKET[a]} ({huni?.[a] ?? 0})</div>
            {adaylar.filter((x) => x.asama === a).map((x) => (
              <div key={x.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs">
                <div className="font-bold">{x.ad_soyad}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{x.telefon || '—'}{x.kaynak ? ` • ${x.kaynak}` : ''}</div>
                {!['satis', 'kayip'].includes(a) && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    <button onClick={sar(() => api.etkilesimEkle(x.id, { tur: 'arama', tarih: bugun(), ozet: 'Arama yapıldı' }))} className={BTN_MOR}>+Arama</button>
                    <button onClick={sar(() => api.adayAsama(x.id, 'kayip'))} className="px-2 py-1 text-[9px] font-black uppercase bg-red-600/15 border border-red-500/30 text-red-400 rounded cursor-pointer">Kayıp</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
