import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import * as api from '../api';
import type { OdemeDonemi, OdemeDonemiKesinti } from '../types';
import { formatKurus, formatTarih, DONEM_DURUM_ETIKET, KESINTI_TUR_ETIKET } from './format';

interface Props {
  ekipId: number;
}

/** Görev metni: "avans girişi" — sık ve düzensiz avanslar için hızlı bir kesinti ekleme ekranı. */
export default function AvansGirisi({ ekipId }: Props) {
  const [donemler, setDonemler] = useState<OdemeDonemi[]>([]);
  const [secilenDonemId, setSecilenDonemId] = useState<number | null>(null);
  const [kesintiler, setKesintiler] = useState<OdemeDonemiKesinti[]>([]);
  const [tutar, setTutar] = useState(0);
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    const dl = await api.donemleriListele(ekipId);
    setDonemler(dl);
    if (!secilenDonemId && dl.length) setSecilenDonemId(dl.find((d) => d.durum === 'acik')?.id ?? dl[0].id);
  }
  useEffect(() => { yenile(); }, [ekipId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (secilenDonemId) api.donemKesintileriGetir(secilenDonemId).then(setKesintiler); }, [secilenDonemId]);

  async function avansEkle() {
    if (!secilenDonemId) return;
    setHata(null);
    try {
      await api.donemKesintiEkle(secilenDonemId, { tur: 'avans', tutar_kurus: Math.round(tutar * 100), aciklama });
      setTutar(0);
      setAciklama('');
      setKesintiler(await api.donemKesintileriGetir(secilenDonemId));
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  const secilenDonem = donemler.find((d) => d.id === secilenDonemId);

  return (
    <div className="w-full max-w-lg mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Wallet className="w-5 h-5 text-indigo-400" /> Avans Girişi</h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <select value={secilenDonemId ?? ''} onChange={(e) => setSecilenDonemId(Number(e.target.value))} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs mb-4">
        {donemler.map((d) => <option key={d.id} value={d.id}>{d.numara} — {formatTarih(d.donem_baslangic)}–{formatTarih(d.donem_bitis)} ({DONEM_DURUM_ETIKET[d.durum]})</option>)}
      </select>

      {secilenDonem && (
        <>
          <div className="flex gap-2 mb-4">
            <input type="number" value={tutar} onChange={(e) => setTutar(Number(e.target.value))} placeholder="Avans tutarı (TL)" className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm" />
            <button disabled={!tutar || secilenDonem.durum === 'kapandi'} onClick={avansEkle} className="px-4 py-2 text-xs font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Ekle</button>
          </div>
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Açıklama (opsiyonel)" className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm mb-4" />

          <div className="flex flex-col gap-1.5">
            {kesintiler.map((k) => (
              <div key={k.id} className="flex items-center justify-between text-xs p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
                <span>{KESINTI_TUR_ETIKET[k.tur]}{k.aciklama ? ` — ${k.aciklama}` : ''}</span>
                <span className="font-bold text-red-400">-{formatKurus(k.tutar_kurus)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
