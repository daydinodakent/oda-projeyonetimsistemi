import { useEffect, useState } from 'react';
import { FileWarning, CheckCircle2, Banknote } from 'lucide-react';
import * as api from '../api';
import type { SatinalmaFatura, EslesmeIstisnasi } from '../types';
import { formatKurus, formatTarih, FATURA_DURUM_ETIKET, FATURA_DURUM_RENK, ISTISNA_TUR_ETIKET } from './format';

interface Props {
  faturaId: number | null;
}

/** Görev metnindeki "fatura eşleştirme istisnaları" ekranı. */
export default function FaturaEslestirmeIstisnalari({ faturaId: baslangicFaturaId }: Props) {
  const [faturaId, setFaturaId] = useState<number | null>(baslangicFaturaId);
  const [faturaIdGirdisi, setFaturaIdGirdisi] = useState(baslangicFaturaId ? String(baslangicFaturaId) : '');
  const [fatura, setFatura] = useState<SatinalmaFatura | null>(null);
  const [istisnalar, setIstisnalar] = useState<EslesmeIstisnasi[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [islemSuruyor, setIslemSuruyor] = useState(false);
  const [odemeSonucu, setOdemeSonucu] = useState<{ numara: string } | null>(null);

  useEffect(() => { setFaturaId(baslangicFaturaId); }, [baslangicFaturaId]);

  async function yenile(id: number) {
    setHata(null);
    try {
      const [f, ist] = await Promise.all([api.faturaGetir(id), api.faturaIstisnalariGetir(id)]);
      setFatura(f);
      setIstisnalar(ist);
      setOdemeSonucu(null);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }
  useEffect(() => { if (faturaId) yenile(faturaId); }, [faturaId]);

  async function eslestir() {
    if (!faturaId) return;
    setIslemSuruyor(true);
    setHata(null);
    try {
      await api.faturaEslestir(faturaId);
      await yenile(faturaId);
    } catch (err) {
      setHata(String((err as Error).message || err));
    } finally {
      setIslemSuruyor(false);
    }
  }

  async function odemeTalimatiOlustur() {
    if (!faturaId) return;
    setIslemSuruyor(true);
    setHata(null);
    try {
      const t = await api.faturaOdemeTalimatiOlustur(faturaId);
      setOdemeSonucu(t);
      await yenile(faturaId);
    } catch (err) {
      setHata(String((err as Error).message || err));
    } finally {
      setIslemSuruyor(false);
    }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <FileWarning className="w-5 h-5 text-amber-400" /> Fatura Eşleştirme
      </h2>

      <div className="flex items-center gap-2 mb-4">
        <input value={faturaIdGirdisi} onChange={(e) => setFaturaIdGirdisi(e.target.value)} type="number" placeholder="Fatura ID"
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs" />
        <button onClick={() => setFaturaId(Number(faturaIdGirdisi))} disabled={!faturaIdGirdisi} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer disabled:opacity-40">Faturayı Aç</button>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {odemeSonucu && <div className="mb-4 p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">Ödeme talimatı oluşturuldu: {odemeSonucu.numara}</div>}

      {!fatura ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bir fatura ID'si girin.</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
            <div>
              <div className="text-xs font-bold">{fatura.fatura_no} <span className="text-[var(--text-secondary)] font-normal">• {formatTarih(fatura.fatura_tarihi)}</span></div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Genel Toplam: {formatKurus(fatura.genel_toplam_kurus, fatura.para_birimi)} (KDV: {formatKurus(fatura.kdv_tutari_kurus)}, Tevkifat: {formatKurus(fatura.tevkifat_tutari_kurus)})</div>
            </div>
            <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider ${FATURA_DURUM_RENK[fatura.durum]}`}>{FATURA_DURUM_ETIKET[fatura.durum]}</span>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={islemSuruyor} onClick={eslestir} className="px-3 py-1.5 text-[10px] font-black uppercase bg-blue-600/15 border border-blue-500/30 text-blue-400 rounded-lg cursor-pointer disabled:opacity-40">3'lü Eşleştirmeyi Çalıştır</button>
            {fatura.durum === 'eslestirildi' && (
              <button disabled={islemSuruyor} onClick={odemeTalimatiOlustur} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Ödeme Talimatı Oluştur</button>
            )}
          </div>

          {fatura.durum === 'eslestirildi' && istisnalar.length === 0 && (
            <div className="p-3 bg-emerald-600/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> İstisnasız eşleşti.</div>
          )}

          {istisnalar.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">İstisnalar ({istisnalar.length})</span>
              {istisnalar.map((i) => (
                <div key={i.id} className="p-3 bg-red-600/10 border border-red-500/30 rounded-lg">
                  <div className="text-xs font-bold text-red-400">{ISTISNA_TUR_ETIKET[i.tur]}</div>
                  <pre className="text-[10px] text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">{JSON.stringify(i.detay, null, 0)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
