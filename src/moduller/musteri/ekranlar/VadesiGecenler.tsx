import { useEffect, useState } from 'react';
import { AlarmClock, Send } from 'lucide-react';
import * as api from '../api';
import type { VadesiGecen, Hatirlatma } from '../types';
import { KART, BTN_MOR, HATA_KUTU, TAKSIT_TUR_ETIKET, formatKurus, formatTarih, bugun } from './format';

export default function VadesiGecenler({ projeId }: { projeId: string }) {
  const [liste, setListe] = useState<VadesiGecen[]>([]);
  const [kuyruk, setKuyruk] = useState<Hatirlatma[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const yenile = async () => { setListe(await api.vadesiGecenler(projeId, bugun())); setKuyruk(await api.bekleyenHatirlatmalar(bugun())); };
  useEffect(() => { yenile().catch((e) => setHata(String(e.message))); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const toplam = liste.reduce((t, x) => t + x.kalan_kurus, 0);

  return (
    <div className={KART}>
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><AlarmClock className="w-5 h-5 text-red-400" /> Vadesi Geçenler</h2>
        <button onClick={async () => { setHata(null); try { const r = await api.hatirlatmaUret(projeId, bugun()); setMesaj(`${r.eklenen} yeni hatırlatma kuyruğa eklendi (gönderim entegrasyonu kapsam dışı).`); await yenile(); } catch (e) { setHata(String((e as Error).message)); } }} className={`${BTN_MOR} flex items-center gap-1`}><Send className="w-3 h-3" /> Hatırlatma Kuyruğu Üret</button>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {mesaj && <div className="mb-4 p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}
      <div className="text-xs mb-3">Toplam geciken (kalan): <b className="text-red-400">{liste.length ? formatKurus(toplam) : '—'}</b> • {liste.length} taksit</div>
      <div className="flex flex-col gap-2">
        {liste.length === 0 && <div className="text-xs text-emerald-400 py-4">Vadesi geçmiş taksit yok.</div>}
        {liste.map((v) => (
          <div key={v.taksit_id} className="p-3 bg-red-600/5 border border-red-500/30 rounded-lg text-xs flex items-center justify-between">
            <div>
              <div className="font-bold">{v.bolum ?? `Satış #${v.satis_id}`} — {TAKSIT_TUR_ETIKET[v.tur]} • vade {formatTarih(v.vade_tarihi)}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">{v.gecikme_gun} gün gecikme{v.kredi_bekliyor_mu ? ' • KREDİ ONAYI BEKLİYOR' : ''}{v.gecikme_faizi_kurus == null ? ' • faiz: sözleşmede gecikme maddesi/parametresi yok' : ` • faiz ${formatKurus(v.gecikme_faizi_kurus, v.para_birimi)}`}</div>
            </div>
            <b className="text-red-400">{formatKurus(v.kalan_kurus, v.para_birimi)}</b>
          </div>
        ))}
      </div>
      {kuyruk.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2">Bekleyen hatırlatmalar ({kuyruk.length})</div>
          {kuyruk.slice(0, 8).map((h) => <div key={h.id} className="p-2 mb-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[10px]">{formatTarih(h.planlanan_tarih)} • {h.kanal.toUpperCase()} • {h.sablon}</div>)}
        </div>
      )}
    </div>
  );
}
