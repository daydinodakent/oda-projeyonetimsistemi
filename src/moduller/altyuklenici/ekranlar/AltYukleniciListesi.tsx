import { useEffect, useState } from 'react';
import { HardHat, AlertOctagon, Award } from 'lucide-react';
import * as sozlesmeApi from '../../sozlesme/api';
import * as cekirdekApi from '../../_cekirdek/api';
import * as api from '../api';
import type { Sozlesme } from '../../sozlesme/types';
import type { CariFirma } from '../../_cekirdek/types';
import type { Hakedis, PerformansKarti } from '../types';
import YukleniciEkle from '../../sozlesme/ekranlar/YukleniciEkle';

interface Props {
  projeId: string;
  onSozlesmeSec: (sozlesmeId: number) => void;
}

interface Satir {
  sozlesme: Sozlesme;
  firmaAdi: string;
  hakedisler: Hakedis[];
  sonPerformans: PerformansKarti | null;
}

export default function AltYukleniciListesi({ projeId, onSozlesmeSec }: Props) {
  const [satirlar, setSatirlar] = useState<Satir[] | null>(null);
  const [yenileSayac, setYenileSayac] = useState(0);

  useEffect(() => {
    (async () => {
      const [sozlesmeler, firmalar] = await Promise.all([sozlesmeApi.sozlesmeleriListele(projeId), cekirdekApi.firmalariListele()]);
      const altYukleniciSozlesmeleri = sozlesmeler.filter((s) => s.tip === 'alt_yuklenici');
      const firmaMap = new Map<number, CariFirma>(firmalar.map((f) => [f.id, f]));
      const veriler = await Promise.all(altYukleniciSozlesmeleri.map(async (s) => {
        const [hakedisler, performanslar] = await Promise.all([api.hakedisleriGetir(s.id), api.performansGetir(s.id)]);
        return { sozlesme: s, firmaAdi: (s.taraf_firma_id && firmaMap.get(s.taraf_firma_id)?.unvan) || '—', hakedisler, sonPerformans: performanslar[0] ?? null };
      }));
      setSatirlar(veriler);
    })();
  }, [projeId, yenileSayac]);

  if (!satirlar) return <div className="p-6 text-xs text-[var(--text-secondary)]">Yükleniyor…</div>;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <HardHat className="w-5 h-5 text-indigo-400" /> Alt Yükleniciler
      </h2>

      <YukleniciEkle projeId={projeId} tip="alt_yuklenici" etiket="Alt Yüklenici" onOlustu={() => setYenileSayac((n) => n + 1)} />

      {satirlar.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bu projede alt yüklenici yok. Yukarıdaki "Yeni Alt Yüklenici Sözleşmesi" ile ekleyin.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {satirlar.map(({ sozlesme, firmaAdi, hakedisler, sonPerformans }) => {
            const acikHakedisSayisi = hakedisler.filter((h) => h.durum !== 'onayli' && h.durum !== 'reddedildi').length;
            const blokajVar = hakedisler.some((h) => h.blokaj_mi === 1 && h.blokaj_asildi_mi === 0);
            return (
              <button key={sozlesme.id} onClick={() => onSozlesmeSec(sozlesme.id)}
                className="w-full text-left p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between hover:border-indigo-500/40 transition cursor-pointer">
                <div>
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] px-1 py-0.5 rounded uppercase text-[var(--text-secondary)]">{sozlesme.numara}</span>
                    {firmaAdi} — {sozlesme.konu}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{acikHakedisSayisi} açık hakediş</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sonPerformans && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider bg-indigo-600/15 text-indigo-400 border-indigo-500/30 flex items-center gap-1">
                      <Award className="w-3 h-3" /> {sonPerformans.toplam_puan}
                    </span>
                  )}
                  {blokajVar && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider bg-red-600/15 text-red-400 border-red-500/30 flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> Blokaj
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
