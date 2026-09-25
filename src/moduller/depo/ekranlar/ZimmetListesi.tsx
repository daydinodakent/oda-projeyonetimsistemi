import { useEffect, useState } from 'react';
import { ClipboardList, Plus, HardHat } from 'lucide-react';
import * as api from '../api';
import type { MalzemeKarti, Zimmet, ZimmetAlanTipi } from '../types';
import { formatTarih, ZIMMET_DURUM_ETIKET, ZIMMET_DURUM_RENK } from './format';

const TIPLER: ZimmetAlanTipi[] = ['personel', 'taseron_ekibi', 'alt_yuklenici_ekibi'];

function geriDonmesiGerekiyorMu(z: Zimmet): boolean {
  return z.durum === 'zimmette' && !!z.beklenen_iade_tarihi && z.beklenen_iade_tarihi < new Date().toISOString().slice(0, 10);
}

export default function ZimmetListesi() {
  const [zimmetler, setZimmetler] = useState<Zimmet[]>([]);
  const [malzemeler, setMalzemeler] = useState<MalzemeKarti[]>([]);
  const [sadeceAcik, setSadeceAcik] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [malzemeId, setMalzemeId] = useState<number | null>(null);
  const [tip, setTip] = useState<ZimmetAlanTipi>('personel');
  const [aciklama, setAciklama] = useState('');
  const [kkdMi, setKkdMi] = useState(false);
  const [beklenenIade, setBeklenenIade] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    const [z, m] = await Promise.all([api.zimmetListele(sadeceAcik), api.malzemeleriListele()]);
    setZimmetler(z);
    setMalzemeler(m.filter((x) => x.demirbas_mi === 1));
  }
  useEffect(() => { yenile(); }, [sadeceAcik]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ver() {
    setHata(null);
    if (!malzemeId) return;
    try {
      await api.zimmetVer({ malzeme_id: malzemeId, zimmet_alan_tipi: tip, zimmet_alan_aciklama: aciklama, kkd_mi: kkdMi, zimmet_tarihi: new Date().toISOString().slice(0, 10), beklenen_iade_tarihi: beklenenIade || undefined });
      setFormAcik(false);
      setAciklama('');
      setBeklenenIade('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function iadeEt(id: number) {
    await api.zimmetIadeEt(id, new Date().toISOString().slice(0, 10));
    await yenile();
  }

  const malzemeAdi = (id: number) => malzemeler.find((m) => m.id === id)?.ad || `#${id}`;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-400" /> Zimmet Listesi</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={sadeceAcik} onChange={(e) => setSadeceAcik(e.target.checked)} /> Yalnızca açık
          </label>
          <button onClick={() => setFormAcik((v) => !v)} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Zimmet Ver</button>
        </div>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      {formAcik && (
        <div className="mb-4 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={malzemeId ?? ''} onChange={(e) => setMalzemeId(Number(e.target.value))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
            <option value="">Demirbaş/KKD seçin…</option>
            {malzemeler.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
          </select>
          <select value={tip} onChange={(e) => setTip(e.target.value as ZimmetAlanTipi)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
            {TIPLER.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Kime? (ör. Ahmet Usta)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input type="date" value={beklenenIade} onChange={(e) => setBeklenenIade(e.target.value)} placeholder="Beklenen iade" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <label className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 col-span-2 cursor-pointer">
            <input type="checkbox" checked={kkdMi} onChange={(e) => setKkdMi(e.target.checked)} /> KKD (İSG kaydı)
          </label>
          <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">Vazgeç</button>
            <button disabled={!malzemeId} onClick={ver} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Zimmet Ver</button>
          </div>
        </div>
      )}

      {zimmetler.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Zimmet kaydı yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {zimmetler.map((z) => {
            const gecikmis = geriDonmesiGerekiyorMu(z);
            return (
              <div key={z.id} className={`p-3 border rounded-lg flex items-center justify-between ${gecikmis ? 'bg-red-600/10 border-red-500/40' : 'bg-[var(--bg-primary)] border-[var(--border)]'}`}>
                <div className="flex items-center gap-2">
                  {z.kkd_mi === 1 && <HardHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  <div>
                    <div className="text-xs font-bold">{malzemeAdi(z.malzeme_id)} <span className="font-normal text-[var(--text-secondary)]">× {z.miktar}</span></div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{z.zimmet_alan_aciklama} • {formatTarih(z.zimmet_tarihi)}{z.beklenen_iade_tarihi ? ` → Beklenen: ${formatTarih(z.beklenen_iade_tarihi)}` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {gecikmis && <span className="text-[10px] font-black text-red-400 uppercase">Geç Kaldı</span>}
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${ZIMMET_DURUM_RENK[z.durum]}`}>{ZIMMET_DURUM_ETIKET[z.durum]}</span>
                  {z.durum === 'zimmette' && (
                    <>
                      <button onClick={() => iadeEt(z.id)} className="px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-600/15 rounded-lg transition cursor-pointer">İade Al</button>
                      <button onClick={async () => { if (!window.confirm('Zimmet KAYIP olarak işaretlensin mi? (Zimmet alan taşeron/alt yüklenici ise hak edişte kesinti adayı olur.)')) return; try { await api.zimmetKayipIsaretle(z.id); await yenile(); } catch (err) { setHata(String((err as Error).message || err)); } }}
                        className="px-2.5 py-1 text-[10px] font-black uppercase text-red-400 hover:bg-red-600/15 rounded-lg transition cursor-pointer">Kayıp</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
