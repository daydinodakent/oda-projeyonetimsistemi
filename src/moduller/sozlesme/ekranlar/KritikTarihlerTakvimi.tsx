import { useEffect, useState } from 'react';
import { AlarmClock } from 'lucide-react';
import * as sozlesmeApi from '../api';
import type { KritikTarih } from '../types';
import { formatTarih, ACILIYET_RENK, ACILIYET_ETIKET } from './format';

const KAYNAK_ETIKET: Record<string, string> = {
  sozlesme_bitis: 'Sözleşme Bitişi', teminat_bitis: 'Teminat Bitişi', madde_kontrol: 'Madde Kontrol Tarihi',
};

interface Props {
  projeId: string;
  onSecSozlesme?: (id: number) => void;
}

/**
 * NOT: Bu ekran, sozlesme.kritikTarihler()'in DÖNDÜRDÜĞÜ listeyi gösterir —
 * gerçek bir bildirim (push/e-posta) GÖNDERİMİ yapmaz. Bildirim ortak
 * servisi henüz yazılmadı (bkz. CAKISMA_HARITASI.md P1 ertelenenler).
 */
export default function KritikTarihlerTakvimi({ projeId, onSecSozlesme }: Props) {
  const [liste, setListe] = useState<KritikTarih[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    setYukleniyor(true);
    sozlesmeApi.kritikTarihleriGetir(projeId).then(setListe).finally(() => setYukleniyor(false));
  }, [projeId]);

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <AlarmClock className="w-5 h-5 text-amber-400" /> Kritik Tarihler
      </h2>

      {yukleniyor ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Yükleniyor…</div>
      ) : liste.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Yaklaşan kritik tarih yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {liste.map((k, i) => (
            <button key={i} onClick={() => onSecSozlesme?.(k.sozlesme_id)}
              className="text-left p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between hover:border-amber-500/40 transition cursor-pointer">
              <div>
                <div className="text-xs font-bold flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] px-1 py-0.5 rounded uppercase text-[var(--text-secondary)]">{k.sozlesme_numara}</span>
                  {KAYNAK_ETIKET[k.kaynak]}{k.madde_turu ? ` (${k.madde_turu})` : ''}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{formatTarih(k.tarih)} • {k.kalanGun >= 0 ? `${k.kalanGun} gün kaldı` : `${Math.abs(k.kalanGun)} gün gecikti`}</div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ml-3 ${ACILIYET_RENK[k.aciliyet]}`}>{ACILIYET_ETIKET[k.aciliyet]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
