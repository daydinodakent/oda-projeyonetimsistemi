import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import * as api from '../api';
import type { EksikEvrakliUye } from '../types';
import { ROL_SAHA_ETIKET } from './format';

interface Props {
  ekipId: number;
}

/** Görev metni: "eksik evraklı işçi uyarıları" — KAYIT DIŞI İŞÇİ RİSKİ. */
export default function EksikEvrakliIsciUyarilari({ ekipId }: Props) {
  const [liste, setListe] = useState<EksikEvrakliUye[] | null>(null);

  useEffect(() => { api.eksikEvrakliUyeleriGetir(ekipId).then(setListe); }, [ekipId]);

  if (!liste) return <div className="p-6 text-xs text-[var(--text-secondary)]">Yükleniyor…</div>;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><ShieldAlert className="w-5 h-5 text-red-400" /> Eksik Evraklı İşçi Uyarıları</h2>

      {liste.length === 0 ? (
        <div className="text-xs text-emerald-400 py-8 text-center">Tüm ekip üyelerinin evrakları tamam.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {liste.map(({ uye, kontrol }) => (
            <div key={uye.id} className="p-3 bg-red-600/10 border border-red-500/30 rounded-lg">
              <div className="text-xs font-bold">Kişi #{uye.kisi_id} <span className="font-normal text-[var(--text-secondary)]">({ROL_SAHA_ETIKET[uye.rol_saha]})</span></div>
              <ul className="text-[10px] text-red-400 mt-1 list-disc list-inside">
                {kontrol.nedenler.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
