import { useState } from 'react';
import { Plus } from 'lucide-react';

export interface FormAlani {
  ad: string;
  etiket: string;
  tip?: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  secenekler?: { deger: string; etiket: string }[];
  varsayilan?: string;
  zorunlu?: boolean;
}

interface Props {
  /** Aç/kapa düğmesindeki metin (ör. "Yeni Malzeme"). */
  butonEtiket: string;
  alanlar: FormAlani[];
  /** Değerler string olarak gelir (checkbox: '1' | '0'); dönüştürme çağıranın işidir. Hata fırlatırsa formun altında gösterilir. */
  onKaydet: (deger: Record<string, string>) => Promise<unknown>;
  ipucu?: string;
  /** true ise form baştan açık gelir (boş durumlarda). */
  baslangicAcik?: boolean;
}

const GIRDI = 'bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs w-full';

/** Modüller arası ortak "+ Ekle" satır içi formu (UI kütüphanesi yok; mevcut Tailwind desenleri). */
export default function HizliForm({ butonEtiket, alanlar, onKaydet, ipucu, baslangicAcik }: Props) {
  const bos = () => Object.fromEntries(alanlar.map((a) => [a.ad, a.varsayilan ?? (a.tip === 'checkbox' ? '0' : '')]));
  const [acik, setAcik] = useState(!!baslangicAcik);
  const [deger, setDeger] = useState<Record<string, string>>(bos);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  async function kaydet() {
    setHata(null);
    const eksik = alanlar.find((a) => a.zorunlu && !String(deger[a.ad] ?? '').trim());
    if (eksik) { setHata(`"${eksik.etiket}" zorunlu.`); return; }
    setMesgul(true);
    try {
      await onKaydet(deger);
      setDeger(bos());
      setAcik(false);
    } catch (err) {
      setHata(String((err as Error).message || err));
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="mb-3">
      <button type="button" onClick={() => setAcik((v) => !v)}
        className="px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer flex items-center gap-1">
        <Plus className="w-3 h-3" /> {butonEtiket}
      </button>
      {acik && (
        <div className="mt-2 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
          {ipucu && <div className="text-[10px] text-[var(--text-secondary)] mb-2">{ipucu}</div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
            {alanlar.map((a) => (
              <label key={a.ad} className="flex flex-col gap-1 text-[10px] font-bold text-[var(--text-secondary)]">
                {a.etiket}{a.zorunlu ? ' *' : ''}
                {a.tip === 'select' ? (
                  <select value={deger[a.ad]} onChange={(e) => setDeger({ ...deger, [a.ad]: e.target.value })} className={GIRDI}>
                    <option value="">Seçin…</option>
                    {a.secenekler?.map((s) => <option key={s.deger} value={s.deger}>{s.etiket}</option>)}
                  </select>
                ) : a.tip === 'checkbox' ? (
                  <input type="checkbox" checked={deger[a.ad] === '1'} onChange={(e) => setDeger({ ...deger, [a.ad]: e.target.checked ? '1' : '0' })} className="w-4 h-4" />
                ) : (
                  <input type={a.tip ?? 'text'} value={deger[a.ad]} step={a.tip === 'number' ? 'any' : undefined}
                    onChange={(e) => setDeger({ ...deger, [a.ad]: e.target.value })} className={GIRDI} />
                )}
              </label>
            ))}
            <button type="button" disabled={mesgul} onClick={kaydet}
              className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-50">
              {mesgul ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
          {hata && <div className="mt-2 p-2 rounded bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
        </div>
      )}
    </div>
  );
}

/** "12.345,67" / "12345.67" → kuruş (tam sayı). Boş/geçersiz → 0. */
export function tlToKurus(s: string): number {
  const n = Number(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
