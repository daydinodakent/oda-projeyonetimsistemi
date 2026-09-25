import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Wand2 } from 'lucide-react';
import * as sozlesmeApi from '../api';
import type { SozlesmeSablon, SozlesmeTipi } from '../types';
import { SOZLESME_TIP_ETIKET } from './format';

const TIPLER: SozlesmeTipi[] = ['musteri_satis', 'alt_yuklenici', 'taseron', 'tedarikci_cerceve', 'kira', 'hizmet', 'arsa_sahibi'];

export default function SablonYonetimi() {
  const [sablonlar, setSablonlar] = useState<SozlesmeSablon[]>([]);
  const [formAcik, setFormAcik] = useState(false);
  const [tip, setTip] = useState<SozlesmeTipi>('taseron');
  const [ad, setAd] = useState('');
  const [belgeMetni, setBelgeMetni] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [secilenId, setSecilenId] = useState<number | null>(null);
  const [degiskenlerMetni, setDegiskenlerMetni] = useState('taraf=ABC İnşaat Ltd.\nbedel=1.500.000,00 TL\ntarih=23.09.2026\nproje=IGA Etap 1\nkonu=Kaba inşaat işleri');
  const [uretilenMetin, setUretilenMetin] = useState('');

  async function yenile() {
    setSablonlar(await sozlesmeApi.sablonlariListele());
  }
  useEffect(() => { yenile(); }, []);

  async function olustur() {
    setHata(null);
    try {
      await sozlesmeApi.sablonOlustur({ tip, ad, belge_metni: belgeMetni });
      setFormAcik(false); setAd(''); setBelgeMetni('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function sil(id: number) {
    await sozlesmeApi.sablonSil(id);
    if (secilenId === id) setSecilenId(null);
    await yenile();
  }

  function degiskenleriAyristir(metin: string): Record<string, string> {
    const sonuc: Record<string, string> = {};
    for (const satir of metin.split('\n')) {
      const i = satir.indexOf('=');
      if (i > 0) sonuc[satir.slice(0, i).trim()] = satir.slice(i + 1).trim();
    }
    return sonuc;
  }

  async function belgeUret() {
    if (!secilenId) return;
    setHata(null);
    try {
      const { metin } = await sozlesmeApi.sablonBelgeUret(secilenId, degiskenleriAyristir(degiskenlerMetni));
      setUretilenMetin(metin);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-400" /> Sözleşme Şablonları</h2>
        <button onClick={() => setFormAcik((v) => !v)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Yeni Şablon
        </button>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      {formAcik && (
        <div className="mb-5 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={tip} onChange={(e) => setTip(e.target.value as SozlesmeTipi)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs">
            {TIPLER.map((t) => <option key={t} value={t}>{SOZLESME_TIP_ETIKET[t]}</option>)}
          </select>
          <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Şablon adı" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <textarea value={belgeMetni} onChange={(e) => setBelgeMetni(e.target.value)} placeholder="Belge metni — değişken için {{taraf}}, {{bedel}}, {{tarih}}, {{proje}}, {{konu}} kullanın" rows={5}
            className="sm:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs font-mono" />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">Vazgeç</button>
            <button disabled={!ad || !belgeMetni} onClick={olustur} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Kaydet</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {sablonlar.length === 0 ? <div className="text-xs text-[var(--text-secondary)] py-4 text-center">Henüz şablon yok.</div> : sablonlar.map((s) => (
            <button key={s.id} onClick={() => setSecilenId(s.id)}
              className={`text-left p-3 border rounded-lg flex items-center justify-between transition cursor-pointer ${secilenId === s.id ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-[var(--bg-primary)] border-[var(--border)] hover:border-indigo-500/30'}`}>
              <div>
                <div className="text-xs font-bold">{s.ad}</div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase">{SOZLESME_TIP_ETIKET[s.tip]}</div>
              </div>
              <span onClick={(e) => { e.stopPropagation(); sil(s.id); }} className="p-1.5 rounded-lg hover:bg-red-600/15 text-[var(--text-secondary)] hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>

        {secilenId && (
          <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5"><Wand2 className="w-3.5 h-3.5" /> Değişkenler (her satır: ad=değer)</span>
            <textarea value={degiskenlerMetni} onChange={(e) => setDegiskenlerMetni(e.target.value)} rows={5} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs font-mono" />
            <button onClick={belgeUret} className="self-start px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer">Belge Üret</button>
            {uretilenMetin && <pre className="whitespace-pre-wrap text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-3 mt-2">{uretilenMetin}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}
