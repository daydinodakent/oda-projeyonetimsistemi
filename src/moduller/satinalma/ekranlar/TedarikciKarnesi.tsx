import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import * as api from '../api';
import * as cekirdekApi from '../../_cekirdek/api';
import type { TedarikciKarnesi as TedarikciKarnesiTipi } from '../types';
import type { CariFirma } from '../../_cekirdek/types';
import { formatKurus } from './format';

export default function TedarikciKarnesi() {
  const [firmalar, setFirmalar] = useState<CariFirma[]>([]);
  const [secilenFirmaId, setSecilenFirmaId] = useState<number | null>(null);
  const [karne, setKarne] = useState<TedarikciKarnesiTipi | null>(null);

  useEffect(() => { cekirdekApi.firmalariListele().then(setFirmalar); }, []);
  useEffect(() => { if (secilenFirmaId) api.tedarikciKarnesiGetir(secilenFirmaId).then(setKarne); else setKarne(null); }, [secilenFirmaId]);

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <Award className="w-5 h-5 text-indigo-400" /> Tedarikçi Karnesi
      </h2>

      <select value={secilenFirmaId ?? ''} onChange={(e) => setSecilenFirmaId(e.target.value ? Number(e.target.value) : null)}
        className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs mb-4">
        <option value="">Tedarikçi seçin…</option>
        {firmalar.filter((f) => f.roller.includes('tedarikci') || f.roller.includes('taseron')).map((f) => <option key={f.id} value={f.id}>{f.unvan}</option>)}
      </select>

      {karne && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat etiket="Sipariş Sayısı" deger={String(karne.siparisSayisi)} />
          <Stat etiket="Toplam Tutar" deger={formatKurus(karne.toplamTutarKurus)} />
          <Stat etiket="Zamanında Teslim %" deger={karne.zamanindaTeslimYuzdesi === null ? 'Veri yok' : `%${karne.zamanindaTeslimYuzdesi}`} vurgu={karne.zamanindaTeslimYuzdesi !== null && karne.zamanindaTeslimYuzdesi >= 80} />
          <Stat etiket="Kalite Red Oranı" deger="P4 (Depo/Kalite) kurulunca" />
        </div>
      )}
      {!karne && secilenFirmaId === null && <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bir tedarikçi seçin.</div>}
    </div>
  );
}

function Stat({ etiket, deger, vurgu }: { etiket: string; deger: string; vurgu?: boolean }) {
  return (
    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
      <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-1 uppercase tracking-wider">{etiket}</span>
      <span className={`text-sm font-black block truncate ${vurgu ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>{deger}</span>
    </div>
  );
}
