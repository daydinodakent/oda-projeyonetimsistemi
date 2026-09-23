import { useEffect, useMemo, useState } from 'react';
import { FileSignature, Plus, Search } from 'lucide-react';
import * as sozlesmeApi from '../api';
import * as cekirdekApi from '../../_cekirdek/api';
import type { Sozlesme, SozlesmeDurumu, SozlesmeOlusturIstek, SozlesmeTipi } from '../types';
import type { CariFirma } from '../../_cekirdek/types';
import { formatKurus, formatTarih, SOZLESME_TIP_ETIKET, SOZLESME_DURUM_ETIKET, SOZLESME_DURUM_RENK } from './format';

const TIPLER: SozlesmeTipi[] = ['musteri_satis', 'alt_yuklenici', 'taseron', 'tedarikci_cerceve', 'kira', 'hizmet', 'arsa_sahibi'];
const DURUMLAR: SozlesmeDurumu[] = ['taslak', 'onayda', 'imzali', 'yururlukte', 'askida', 'feshedildi', 'tamamlandi'];

interface Props {
  projeId: string;
  onSecSozlesme: (id: number) => void;
}

const BOS_FORM: SozlesmeOlusturIstek = {
  tip: 'taseron', proje_id: '', konu: '', bedel_kurus: 0, baslangic_tarihi: new Date().toISOString().slice(0, 10),
};

export default function SozlesmeListesi({ projeId, onSecSozlesme }: Props) {
  const [sozlesmeler, setSozlesmeler] = useState<Sozlesme[]>([]);
  const [firmalar, setFirmalar] = useState<CariFirma[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [tipFiltre, setTipFiltre] = useState<string>('');
  const [durumFiltre, setDurumFiltre] = useState<string>('');
  const [arama, setArama] = useState('');
  const [formAcik, setFormAcik] = useState(false);
  const [form, setForm] = useState<SozlesmeOlusturIstek>({ ...BOS_FORM, proje_id: projeId });
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function yenile() {
    setYukleniyor(true);
    setHata(null);
    try {
      const [s, f] = await Promise.all([sozlesmeApi.sozlesmeleriListele(projeId), cekirdekApi.firmalariListele()]);
      setSozlesmeler(s);
      setFirmalar(f);
    } catch (err) {
      setHata(String((err as Error).message || err));
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => { yenile(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projeId]);

  const firmaAdi = useMemo(() => {
    const map = new Map(firmalar.map((f) => [f.id, f.unvan]));
    return (id?: number | null) => (id ? map.get(id) || `#${id}` : '—');
  }, [firmalar]);

  const filtreli = sozlesmeler.filter((s) => {
    if (tipFiltre && s.tip !== tipFiltre) return false;
    if (durumFiltre && s.durum !== durumFiltre) return false;
    if (arama) {
      const hedef = `${s.numara} ${s.konu} ${firmaAdi(s.taraf_firma_id)}`.toLowerCase();
      if (!hedef.includes(arama.toLowerCase())) return false;
    }
    return true;
  });

  async function formGonder() {
    setKaydediliyor(true);
    setHata(null);
    try {
      const yeni = await sozlesmeApi.sozlesmeOlustur({ ...form, proje_id: projeId });
      setFormAcik(false);
      setForm({ ...BOS_FORM, proje_id: projeId });
      await yenile();
      onSecSozlesme(yeni.id);
    } catch (err) {
      setHata(String((err as Error).message || err));
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border)] mb-4 gap-3">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-indigo-400" /> Sözleşmeler
        </h2>
        <button
          onClick={() => setFormAcik((v) => !v)}
          className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1.5 self-start"
        >
          <Plus className="w-3.5 h-3.5" /> Yeni Sözleşme
        </button>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      {formAcik && (
        <div className="mb-5 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex flex-col gap-1">
            Tip
            <select value={form.tip} onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value as SozlesmeTipi }))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]">
              {TIPLER.map((t) => <option key={t} value={t}>{SOZLESME_TIP_ETIKET[t]}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex flex-col gap-1">
            Taraf Firma ID
            <input type="number" value={form.taraf_firma_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, taraf_firma_id: e.target.value ? Number(e.target.value) : undefined }))}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]" placeholder="Çekirdek Firma ID" />
          </label>
          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex flex-col gap-1 sm:col-span-2">
            Konu
            <input value={form.konu} onChange={(e) => setForm((f) => ({ ...f, konu: e.target.value }))}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]" placeholder="Ör. Kaba inşaat işleri" />
          </label>
          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex flex-col gap-1">
            Bedel (TL)
            <input type="number" value={form.bedel_kurus / 100 || ''} onChange={(e) => setForm((f) => ({ ...f, bedel_kurus: Math.round(Number(e.target.value || 0) * 100) }))}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]" placeholder="0,00" />
          </label>
          <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex flex-col gap-1">
            Başlangıç Tarihi
            <input type="date" value={form.baslangic_tarihi} onChange={(e) => setForm((f) => ({ ...f, baslangic_tarihi: e.target.value }))}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)]" />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <button onClick={() => setFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition rounded-lg cursor-pointer">Vazgeç</button>
            <button disabled={kaydediliyor || !form.konu || !form.taraf_firma_id} onClick={formGonder}
              className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              {kaydediliyor ? 'Kaydediliyor…' : 'Sözleşmeyi Oluştur'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-1.5 flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Numara, konu veya taraf ara…" className="bg-transparent outline-none text-xs text-[var(--text-primary)] flex-1" />
        </div>
        <select value={tipFiltre} onChange={(e) => setTipFiltre(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)]">
          <option value="">Tüm Tipler</option>
          {TIPLER.map((t) => <option key={t} value={t}>{SOZLESME_TIP_ETIKET[t]}</option>)}
        </select>
        <select value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)]">
          <option value="">Tüm Durumlar</option>
          {DURUMLAR.map((d) => <option key={d} value={d}>{SOZLESME_DURUM_ETIKET[d]}</option>)}
        </select>
      </div>

      {yukleniyor ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Yükleniyor…</div>
      ) : filtreli.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bu projede (henüz) sözleşme yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtreli.map((s) => (
            <button key={s.id} onClick={() => onSecSozlesme(s.id)}
              className="text-left p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between hover:border-indigo-500/50 transition cursor-pointer">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] px-1 py-0.5 rounded uppercase text-[var(--text-secondary)]">{s.numara}</span>
                  <span>{s.konu}</span>
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">
                  {SOZLESME_TIP_ETIKET[s.tip]} • {firmaAdi(s.taraf_firma_id)} • {formatTarih(s.baslangic_tarihi)}{s.bitis_tarihi ? ` – ${formatTarih(s.bitis_tarihi)}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs font-black text-[var(--text-primary)]">{formatKurus(s.bedel_kurus, s.para_birimi)}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${SOZLESME_DURUM_RENK[s.durum]}`}>{SOZLESME_DURUM_ETIKET[s.durum]}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
