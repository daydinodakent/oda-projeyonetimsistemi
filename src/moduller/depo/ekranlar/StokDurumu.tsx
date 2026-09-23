import { useEffect, useState } from 'react';
import { Boxes, ChevronRight, AlertTriangle } from 'lucide-react';
import * as api from '../api';
import type { Depo, MalzemeKarti, StokBakiye, StokHareketi } from '../types';
import { formatKurus, formatTarih, HAREKET_TUR_ETIKET, TESLIM_ALAN_ETIKET } from './format';

interface Props {
  projeId: string;
}

export default function StokDurumu({ projeId }: Props) {
  const [depolar, setDepolar] = useState<Depo[]>([]);
  const [malzemeler, setMalzemeler] = useState<MalzemeKarti[]>([]);
  const [secilenDepoId, setSecilenDepoId] = useState<number | null>(null);
  const [bakiyeler, setBakiyeler] = useState<StokBakiye[]>([]);
  const [acikSatirMalzemeId, setAcikSatirMalzemeId] = useState<number | null>(null);
  const [hareketler, setHareketler] = useState<StokHareketi[]>([]);

  useEffect(() => {
    Promise.all([api.depolariListele(projeId), api.malzemeleriListele()]).then(([d, m]) => {
      setDepolar(d);
      setMalzemeler(m);
      if (d.length && secilenDepoId === null) setSecilenDepoId(d[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeId]);

  useEffect(() => {
    if (secilenDepoId) api.depoStoklariGetir(secilenDepoId).then(setBakiyeler);
  }, [secilenDepoId]);

  async function satiraTikla(malzemeId: number) {
    if (acikSatirMalzemeId === malzemeId) { setAcikSatirMalzemeId(null); return; }
    setAcikSatirMalzemeId(malzemeId);
    if (secilenDepoId) setHareketler(await api.hareketGecmisiGetir(secilenDepoId, malzemeId));
  }

  const malzemeAdi = (id: number) => malzemeler.find((m) => m.id === id)?.ad || `#${id}`;
  const malzemeBirimi = (id: number) => malzemeler.find((m) => m.id === id)?.birim || '';
  const minAltinda = (b: StokBakiye) => {
    const m = malzemeler.find((x) => x.id === b.malzeme_id);
    return m?.min_stok != null && b.mevcut_miktar < m.min_stok;
  };

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Boxes className="w-5 h-5 text-indigo-400" /> Stok Durumu</h2>
        <select value={secilenDepoId ?? ''} onChange={(e) => setSecilenDepoId(Number(e.target.value))} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs">
          {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad} ({d.tur})</option>)}
        </select>
      </div>

      {bakiyeler.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bu depoda hareket görmüş malzeme yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {bakiyeler.map((b) => (
            <div key={b.malzeme_id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden">
              <button onClick={() => satiraTikla(b.malzeme_id)} className="w-full text-left p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition">
                <div className="flex items-center gap-2">
                  {minAltinda(b) && <span title="Min stok altında"><AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" /></span>}
                  <div>
                    <div className="text-xs font-bold">{malzemeAdi(b.malzeme_id)}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">Ağırlıklı Ortalama: {formatKurus(b.agirlikli_ortalama_maliyet_kurus)}/{malzemeBirimi(b.malzeme_id)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${minAltinda(b) ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>{b.mevcut_miktar} {malzemeBirimi(b.malzeme_id)}</span>
                  <ChevronRight className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${acikSatirMalzemeId === b.malzeme_id ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {acikSatirMalzemeId === b.malzeme_id && (
                <div className="p-3 border-t border-[var(--border)] flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Hareket Geçmişi</span>
                  {hareketler.length === 0 ? <div className="text-xs text-[var(--text-secondary)]">Hareket yok.</div> : hareketler.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-[10px] py-1 border-b border-[var(--border)]/40 last:border-0">
                      <span>{formatTarih(h.olusturma_zamani)} • {HAREKET_TUR_ETIKET[h.tur]}{h.teslim_alan_tipi ? ` • ${TESLIM_ALAN_ETIKET[h.teslim_alan_tipi]}${h.teslim_alan_aciklama ? ` (${h.teslim_alan_aciklama})` : ''}` : ''}{h.emanet_mi ? ' • EMANET' : ''}</span>
                      <span className={h.tur === 'cikis' || h.tur === 'transfer_cikis' || h.girilen_miktar < 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {h.tur === 'sayim_farki' ? (h.girilen_miktar > 0 ? '+' : '') : (h.tur === 'cikis' || h.tur === 'transfer_cikis' ? '-' : '+')}
                        {Math.abs(h.girilen_miktar)} {h.girilen_birim}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
