import { useEffect, useMemo, useState } from 'react';
import { PackagePlus, PackageMinus, WifiOff, CloudUpload } from 'lucide-react';
import * as api from '../api';
import { createOfflineQueue } from '../../_cekirdek/offlineQueue';
import type { Depo, MalzemeKarti, TeslimAlanTipi, GirisIstek, CikisIstek } from '../types';
import { TESLIM_ALAN_ETIKET } from './format';

const TESLIM_ALAN_TIPLERI: TeslimAlanTipi[] = ['personel', 'taseron_ekibi', 'alt_yuklenici', 'sarf'];

const girisKuyrugu = createOfflineQueue<GirisIstek>({ kuyrukAdi: 'depo-giris', gonder: api.stokGirisi });
const cikisKuyrugu = createOfflineQueue<CikisIstek>({ kuyrukAdi: 'depo-cikis', gonder: api.stokCikisi });

interface Props {
  projeId: string;
}

/**
 * Mobil hızlı çıkış/giriş (görev metni: "Depocu genellikle masa başında
 * değil; çıkışlar mobilde, hızlı... İnternet yoksa kuyruğa alınmalı").
 * Barkod/QR okuma GERÇEK donanım/kamera entegrasyonu gerektirdiğinden bu
 * geçişte YOK — listeden seçerek çalışır (görev metninin "veya listeden
 * seçerek" alternatifi).
 */
export default function HizliCikisGiris({ projeId }: Props) {
  const [yon, setYon] = useState<'giris' | 'cikis'>('cikis');
  const [depolar, setDepolar] = useState<Depo[]>([]);
  const [malzemeler, setMalzemeler] = useState<MalzemeKarti[]>([]);
  const [depoId, setDepoId] = useState<number | null>(null);
  const [malzemeId, setMalzemeId] = useState<number | null>(null);
  const [miktar, setMiktar] = useState(1);
  const [birim, setBirim] = useState('');
  const [birimMaliyet, setBirimMaliyet] = useState(0);
  const [maliyetKoduId, setMaliyetKoduId] = useState('');
  const [teslimAlanTipi, setTeslimAlanTipi] = useState<TeslimAlanTipi>('personel');
  const [teslimAlanAciklama, setTeslimAlanAciklama] = useState('');
  const [cevrimici, setCevrimici] = useState(navigator.onLine);
  const [bekleyenSayisi, setBekleyenSayisi] = useState(0);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.depolariListele(projeId), api.malzemeleriListele()]).then(([d, m]) => {
      setDepolar(d);
      setMalzemeler(m);
      if (d.length) setDepoId(d[0].id);
      if (m.length) { setMalzemeId(m[0].id); setBirim(m[0].birim); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeId]);

  const kuyrukGuncelle = () => setBekleyenSayisi(girisKuyrugu.bekleyenleriListele().length + cikisKuyrugu.bekleyenleriListele().length);
  useEffect(() => {
    kuyrukGuncelle();
    function online() { setCevrimici(true); girisKuyrugu.gonderiyiDene().then(kuyrukGuncelle); cikisKuyrugu.gonderiyiDene().then(kuyrukGuncelle); }
    function offline() { setCevrimici(false); }
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  const secilenMalzeme = useMemo(() => malzemeler.find((m) => m.id === malzemeId), [malzemeler, malzemeId]);

  async function gonder() {
    setHata(null);
    setMesaj(null);
    if (!depoId || !malzemeId) return;
    try {
      if (yon === 'giris') {
        girisKuyrugu.ekle({ depo_id: depoId, malzeme_id: malzemeId, miktar, birim, birim_maliyet_kurus: Math.round(birimMaliyet * 100), proje_id: projeId });
      } else {
        if (!maliyetKoduId) throw new Error('Maliyet kodu (WBS) zorunludur.');
        cikisKuyrugu.ekle({ depo_id: depoId, malzeme_id: malzemeId, miktar, birim, proje_id: projeId, maliyet_kodu_id: Number(maliyetKoduId), teslim_alan_tipi: teslimAlanTipi, teslim_alan_aciklama: teslimAlanAciklama || undefined });
      }
      kuyrukGuncelle();
      setMesaj(cevrimici ? 'Kaydedildi, gönderiliyor…' : 'Çevrimdışı — kuyruğa alındı, bağlantı gelince otomatik gönderilecek.');
      setMiktar(1);
      setTeslimAlanAciklama('');
      if (cevrimici) {
        await (yon === 'giris' ? girisKuyrugu.gonderiyiDene() : cikisKuyrugu.gonderiyiDene());
        kuyrukGuncelle();
      }
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight">Hızlı {yon === 'giris' ? 'Giriş' : 'Çıkış'}</h2>
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
          {cevrimici ? <CloudUpload className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
          {bekleyenSayisi > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400">{bekleyenSayisi} bekliyor</span>}
        </div>
      </div>

      <div className="flex bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-1">
        <button onClick={() => setYon('cikis')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition ${yon === 'cikis' ? 'bg-red-600/20 text-red-400' : 'text-[var(--text-secondary)]'}`}><PackageMinus className="w-4 h-4" /> Çıkış</button>
        <button onClick={() => setYon('giris')} className={`flex-1 py-2 text-xs font-black uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition ${yon === 'giris' ? 'bg-emerald-600/20 text-emerald-400' : 'text-[var(--text-secondary)]'}`}><PackagePlus className="w-4 h-4" /> Giriş</button>
      </div>

      {hata && <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {mesaj && <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}

      <select value={depoId ?? ''} onChange={(e) => setDepoId(Number(e.target.value))} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm">
        {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
      </select>
      <select value={malzemeId ?? ''} onChange={(e) => { const id = Number(e.target.value); setMalzemeId(id); const m = malzemeler.find((x) => x.id === id); if (m) setBirim(m.birim); }} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm">
        {malzemeler.map((m) => <option key={m.id} value={m.id}>{m.ad} ({m.kod})</option>)}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <input type="number" value={miktar} onChange={(e) => setMiktar(Number(e.target.value))} placeholder="Miktar" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
        <input value={birim} onChange={(e) => setBirim(e.target.value)} placeholder={`Birim (ana: ${secilenMalzeme?.birim || '—'})`} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
      </div>

      {yon === 'giris' ? (
        <input type="number" value={birimMaliyet} onChange={(e) => setBirimMaliyet(Number(e.target.value))} placeholder="Birim Maliyet (TL, girilen birim başına)" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
      ) : (
        <>
          <input value={maliyetKoduId} onChange={(e) => setMaliyetKoduId(e.target.value)} type="number" placeholder="Maliyet Kodu ID (WBS) — zorunlu" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
          <select value={teslimAlanTipi} onChange={(e) => setTeslimAlanTipi(e.target.value as TeslimAlanTipi)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm">
            {TESLIM_ALAN_TIPLERI.map((t) => <option key={t} value={t}>{TESLIM_ALAN_ETIKET[t]}</option>)}
          </select>
          <input value={teslimAlanAciklama} onChange={(e) => setTeslimAlanAciklama(e.target.value)} placeholder="Kime? (ör. Ahmet Usta, Ekip A)" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
        </>
      )}

      <button onClick={gonder} className={`w-full py-3.5 text-sm font-black uppercase tracking-wider rounded-xl cursor-pointer transition text-white ${yon === 'cikis' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
        {yon === 'cikis' ? 'Çıkışı Kaydet' : 'Girişi Kaydet'}
      </button>
    </div>
  );
}
