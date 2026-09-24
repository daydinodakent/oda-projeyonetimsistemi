import { useEffect, useState } from 'react';
import { AlertOctagon, Plus } from 'lucide-react';
import * as api from '../api';
import type { Ncr, SorumluTipi } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, SORUMLU_ETIKET, NCR_DURUM_RENK, formatTarih } from './format';

export default function NcrListesi({ projeId }: { projeId: string }) {
  const [liste, setListe] = useState<Ncr[]>([]);
  const [formAcik, setFormAcik] = useState(false);
  const [f, setF] = useState({ baslik: '', sorumlu_tipi: 'alt_yuklenici' as SorumluTipi, sorumlu_id: '', lat: '', lon: '' });
  const [duzeltme, setDuzeltme] = useState<Record<number, string>>({});
  const [hata, setHata] = useState<string | null>(null);

  const yenile = () => api.ncrListele(projeId).then(setListe).catch((e) => setHata(String(e.message)));
  useEffect(() => { yenile(); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sar = (fn: () => Promise<unknown>) => async () => { setHata(null); try { await fn(); await yenile(); } catch (e) { setHata(String((e as Error).message)); } };

  return (
    <div className={KART}>
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><AlertOctagon className="w-5 h-5 text-red-400" /> Uygunsuzluk (NCR)</h2>
        <button onClick={() => setFormAcik((v) => !v)} className={`${BTN_YESIL} flex items-center gap-1`}><Plus className="w-3 h-3" /> NCR Aç</button>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {formAcik && (
        <div className="mb-4 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input value={f.baslik} onChange={(e) => setF({ ...f, baslik: e.target.value })} placeholder="Uygunsuzluk" className={`${INPUT} col-span-2`} />
          <select value={f.sorumlu_tipi} onChange={(e) => setF({ ...f, sorumlu_tipi: e.target.value as SorumluTipi })} className={INPUT}>{Object.entries(SORUMLU_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input type="number" value={f.sorumlu_id} onChange={(e) => setF({ ...f, sorumlu_id: e.target.value })} placeholder="Sorumlu ID (sözleşme/ekip/kişi)" className={INPUT} />
          <input value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} placeholder="Enlem" className={INPUT} />
          <input value={f.lon} onChange={(e) => setF({ ...f, lon: e.target.value })} placeholder="Boylam" className={INPUT} />
          <button onClick={sar(async () => { await api.ncrAc({ proje_id: projeId, baslik: f.baslik, sorumlu_tipi: f.sorumlu_tipi, sorumlu_id: Number(f.sorumlu_id), lat: f.lat ? Number(f.lat) : undefined, lon: f.lon ? Number(f.lon) : undefined }); setFormAcik(false); setF({ ...f, baslik: '' }); })} className={BTN_YESIL}>Kaydet</button>
        </div>
      )}
      {f.sorumlu_tipi === 'alt_yuklenici' && formAcik && <div className="mb-3 text-[10px] text-amber-400">Sorumlu alt yükleniciyse P5 performans kartına olay otomatik gönderilir.</div>}
      <div className="flex flex-col gap-2">
        {liste.length === 0 && <div className="text-xs text-[var(--text-secondary)] py-6 text-center">NCR kaydı yok.</div>}
        {liste.map((n) => (
          <div key={n.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs">
            <div className="flex items-center justify-between">
              <div><div className="font-bold">{n.baslik}</div><div className="text-[10px] text-[var(--text-secondary)]">{SORUMLU_ETIKET[n.sorumlu_tipi]} #{n.sorumlu_id} • açılış {formatTarih(n.acilis_tarihi)}{n.kapanis_tarihi ? ` • kapanış ${formatTarih(n.kapanis_tarihi)}` : ''}</div></div>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${NCR_DURUM_RENK[n.durum]}`}>{n.durum}</span>
            </div>
            {n.duzeltme_notu && <div className="text-[10px] mt-1 text-[var(--text-secondary)]">Düzeltme: {n.duzeltme_notu}</div>}
            {n.durum === 'acik' && <div className="flex gap-1 mt-2"><input value={duzeltme[n.id] ?? ''} onChange={(e) => setDuzeltme({ ...duzeltme, [n.id]: e.target.value })} placeholder="Düzeltme notu" className={INPUT} /><button onClick={sar(() => api.ncrDuzelt(n.id, duzeltme[n.id] ?? ''))} className={BTN_MOR}>Düzeltildi</button></div>}
            {n.durum === 'duzeltildi' && <button onClick={sar(() => api.ncrKapat(n.id))} className={`${BTN_YESIL} mt-2`}>Kapat</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
