import { useEffect, useState } from 'react';
import { Users, AlertTriangle, Plus } from 'lucide-react';
import * as sozlesmeApi from '../../sozlesme/api';
import * as cekirdekApi from '../../_cekirdek/api';
import * as api from '../api';
import type { Sozlesme } from '../../sozlesme/types';
import type { CariFirma } from '../../_cekirdek/types';
import type { TaseronEkip, OdemeTipi } from '../types';
import { ODEME_TIPI_ETIKET } from './format';
import YukleniciEkle from '../../sozlesme/ekranlar/YukleniciEkle';

interface Props {
  projeId: string;
  onEkipSec: (ekipId: number) => void;
}

interface Satir {
  sozlesme: Sozlesme;
  firmaAdi: string;
  ekip: TaseronEkip | null;
  eksikEvrakSayisi: number;
}

export default function EkipListesi({ projeId, onEkipSec }: Props) {
  const [satirlar, setSatirlar] = useState<Satir[] | null>(null);
  const [formAcikSozlesmeId, setFormAcikSozlesmeId] = useState<number | null>(null);
  const [isKolu, setIsKolu] = useState('');
  const [odemeTipi, setOdemeTipi] = useState<OdemeTipi>('yevmiye');
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    const [sozlesmeler, firmalar] = await Promise.all([sozlesmeApi.sozlesmeleriListele(projeId), cekirdekApi.firmalariListele()]);
    const taseronSozlesmeleri = sozlesmeler.filter((s) => s.tip === 'taseron');
    const firmaMap = new Map<number, CariFirma>(firmalar.map((f) => [f.id, f]));
    const veriler = await Promise.all(taseronSozlesmeleri.map(async (s) => {
      const ekipler = await api.ekipleriListele(projeId);
      const ekip = ekipler.find((e) => e.sozlesme_id === s.id) ?? null;
      const eksikSayisi = ekip ? (await api.eksikEvrakliUyeleriGetir(ekip.id)).length : 0;
      return { sozlesme: s, firmaAdi: (s.taraf_firma_id && firmaMap.get(s.taraf_firma_id)?.unvan) || '—', ekip, eksikEvrakSayisi: eksikSayisi };
    }));
    setSatirlar(veriler);
  }
  useEffect(() => { yenile(); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ekipOlustur(sozlesmeId: number) {
    setHata(null);
    try {
      const e = await api.ekipOlustur({ sozlesme_id: sozlesmeId, is_kolu: isKolu, odeme_tipi: odemeTipi });
      setFormAcikSozlesmeId(null);
      setIsKolu('');
      await yenile();
      onEkipSec(e.id);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  if (!satirlar) return <div className="p-6 text-xs text-[var(--text-secondary)]">Yükleniyor…</div>;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Users className="w-5 h-5 text-indigo-400" /> Taşeron Ekipleri</h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <YukleniciEkle projeId={projeId} tip="taseron" etiket="Taşeron" onOlustu={yenile} />

      {satirlar.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bu projede taşeron yok. Yukarıdaki "Yeni Taşeron Sözleşmesi" ile ekleyin, sonra "Ekip Kur" deyin.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {satirlar.map(({ sozlesme, firmaAdi, ekip, eksikEvrakSayisi }) => (
            <div key={sozlesme.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] px-1 py-0.5 rounded uppercase text-[var(--text-secondary)]">{sozlesme.numara}</span>
                    {firmaAdi} — {sozlesme.konu}
                  </div>
                  {ekip && <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{ekip.is_kolu} • {ODEME_TIPI_ETIKET[ekip.odeme_tipi]}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {eksikEvrakSayisi > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-red-600/15 text-red-400 border-red-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {eksikEvrakSayisi} eksik evrak</span>
                  )}
                  {ekip ? (
                    <button onClick={() => onEkipSec(ekip.id)} className="px-2.5 py-1 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer">Ekibi Aç</button>
                  ) : (
                    <button onClick={() => setFormAcikSozlesmeId(sozlesme.id)} className="px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer flex items-center gap-1"><Plus className="w-3 h-3" /> Ekip Kur</button>
                  )}
                </div>
              </div>
              {formAcikSozlesmeId === sozlesme.id && (
                <div className="p-3 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
                  <input value={isKolu} onChange={(e) => setIsKolu(e.target.value)} placeholder="İş kolu (ör. Kalıp)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                  <select value={odemeTipi} onChange={(e) => setOdemeTipi(e.target.value as OdemeTipi)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
                    {Object.entries(ODEME_TIPI_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => ekipOlustur(sozlesme.id)} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Kur</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
