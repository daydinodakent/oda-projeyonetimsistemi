import { useEffect, useState } from 'react';
import { Inbox, ChevronRight } from 'lucide-react';
import * as api from '../api';
import type { SatinalmaTalep, SatinalmaTalepKalem, TalepDurumu } from '../types';
import { formatTarih, TALEP_DURUM_ETIKET, TALEP_DURUM_RENK } from './format';

const AKIS: Record<TalepDurumu, TalepDurumu[]> = {
  taslak: ['onay_bekliyor', 'iptal'], onay_bekliyor: ['onaylandi', 'reddedildi'], onaylandi: [], reddedildi: [], iptal: [],
};

interface Props {
  projeId: string;
  onMukayeseAc: (talepId: number) => void;
}

export default function TalepHavuzu({ projeId, onMukayeseAc }: Props) {
  const [talepler, setTalepler] = useState<SatinalmaTalep[]>([]);
  const [acikTalepId, setAcikTalepId] = useState<number | null>(null);
  const [kalemler, setKalemler] = useState<SatinalmaTalepKalem[]>([]);
  const [durumFiltre, setDurumFiltre] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    setTalepler(await api.talepleriListele(projeId));
  }
  useEffect(() => { yenile(); }, [projeId]);

  async function ac(id: number) {
    setAcikTalepId(acikTalepId === id ? null : id);
    if (acikTalepId !== id) setKalemler(await api.talepKalemleriGetir(id));
  }

  async function durumDegistir(id: number, durum: TalepDurumu) {
    setHata(null);
    try {
      await api.talepDurumDegistir(id, durum);
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  const filtreli = durumFiltre ? talepler.filter((t) => t.durum === durumFiltre) : talepler;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Inbox className="w-5 h-5 text-indigo-400" /> Talep Havuzu</h2>
        <select value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs">
          <option value="">Tüm Durumlar</option>
          {Object.entries(TALEP_DURUM_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      {filtreli.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bu projede (henüz) talep yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtreli.map((t) => (
            <div key={t.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden">
              <button onClick={() => ac(t.id)} className="w-full text-left p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition">
                <div>
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] px-1 py-0.5 rounded uppercase text-[var(--text-secondary)]">{t.numara}</span>
                    {t.aciklama || '(açıklama yok)'}
                    {t.min_teklif_istisna === 1 && <span className="text-[9px] font-black text-amber-400 uppercase">ACİL</span>}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">İhtiyaç: {formatTarih(t.ihtiyac_tarihi)}{t.teslim_yeri ? ` • ${t.teslim_yeri}` : ''}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${TALEP_DURUM_RENK[t.durum]}`}>{TALEP_DURUM_ETIKET[t.durum]}</span>
                  <ChevronRight className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${acikTalepId === t.id ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {acikTalepId === t.id && (
                <div className="p-3 border-t border-[var(--border)] flex flex-col gap-2">
                  {kalemler.map((k) => (
                    <div key={k.id} className="text-xs text-[var(--text-secondary)]">• {k.aciklama} — {k.miktar} {k.birim}</div>
                  ))}
                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    {(AKIS[t.durum] || []).map((hedef) => (
                      <button key={hedef} onClick={() => durumDegistir(t.id, hedef)}
                        className="px-2.5 py-1 text-[10px] font-black uppercase bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition rounded-lg cursor-pointer">
                        → {TALEP_DURUM_ETIKET[hedef]}
                      </button>
                    ))}
                    {t.durum === 'onaylandi' && (
                      <button onClick={() => onMukayeseAc(t.id)} className="px-2.5 py-1 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer">
                        Teklif Mukayesesine Git →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
