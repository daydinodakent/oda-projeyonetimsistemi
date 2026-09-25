import { useEffect, useState } from 'react';
import { Truck, Plus, Clock } from 'lucide-react';
import * as api from '../api';
import { createOfflineQueue } from '../../_cekirdek/offlineQueue';
import type { Ekipman, EkipmanCalisma } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, bugun } from './format';

type CalismaVeri = { ekipman_id: number; tarih: string; calisma_saat: number; yakit_litre?: number; maliyet_kodu_id?: number };
// Sahadan girilen çalışma saati → çevrimdışı kuyruklu; sunucu istemci_kayit_id ile idempotent (mükerrer maliyet YAZMAZ).
const kuyruk = createOfflineQueue<CalismaVeri>({ kuyrukAdi: 'santiye-ekipman-calisma', gonder: (v) => api.ekipmanCalismaKaydet(v) });

export default function EkipmanListesi({ projeId }: { projeId: string }) {
  const [liste, setListe] = useState<Ekipman[]>([]);
  const [formAcik, setFormAcik] = useState(false);
  const [f, setF] = useState({ ad: '', sahiplik: 'kiralik' as 'kiralik' | 'oz_mal', kira_sozlesme_id: '', ozmal_tl: '' });
  const [saat, setSaat] = useState<Record<number, string>>({});
  const [mk, setMk] = useState('');
  const [gecmis, setGecmis] = useState<{ id: number; satirlar: EkipmanCalisma[] } | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = () => api.ekipmanlariListele(projeId).then(setListe).catch((e) => setHata(String(e.message)));
  useEffect(() => { yenile(); const t = () => kuyruk.gonderiyiDene().then(yenile); window.addEventListener('online', t); return () => window.removeEventListener('online', t); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function olustur() {
    setHata(null);
    try {
      await api.ekipmanOlustur({ proje_id: projeId, ad: f.ad, sahiplik: f.sahiplik, kira_sozlesme_id: f.kira_sozlesme_id ? Number(f.kira_sozlesme_id) : undefined, ozmal_saat_maliyeti_kurus: f.ozmal_tl ? Math.round(Number(f.ozmal_tl) * 100) : undefined });
      setFormAcik(false); setF({ ...f, ad: '' }); await yenile();
    } catch (e) { setHata(String((e as Error).message)); }
  }
  async function calisma(e: Ekipman) {
    setHata(null); setMesaj(null);
    kuyruk.ekle({ ekipman_id: e.id, tarih: bugun(), calisma_saat: Number(saat[e.id]), maliyet_kodu_id: mk ? Number(mk) : undefined });
    if (!navigator.onLine) { setMesaj('Çevrimdışı — kayıt cihazda bekliyor.'); return; }
    const s = await kuyruk.gonderiyiDene();
    if (s.basarisiz > 0) setHata(kuyruk.bekleyenleriListele().slice(-1)[0]?.sonHata || 'Gönderilemedi');
    else { setMesaj('Çalışma kaydı işlendi.'); setSaat({ ...saat, [e.id]: '' }); }
    await yenile();
  }

  return (
    <div className={KART}>
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-400" /> Ekipman / Makine</h2>
        <button onClick={() => setFormAcik((v) => !v)} className={`${BTN_YESIL} flex items-center gap-1`}><Plus className="w-3 h-3" /> Ekipman Ekle</button>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {mesaj && <div className="mb-4 p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}
      {formAcik && (
        <div className="mb-4 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} placeholder="Ekipman adı" className={INPUT} />
          <select value={f.sahiplik} onChange={(e) => setF({ ...f, sahiplik: e.target.value as 'kiralik' | 'oz_mal' })} className={INPUT}><option value="kiralik">Kiralık</option><option value="oz_mal">Öz Mal</option></select>
          {f.sahiplik === 'kiralik'
            ? <input type="number" value={f.kira_sozlesme_id} onChange={(e) => setF({ ...f, kira_sozlesme_id: e.target.value })} placeholder="Kira sözleşmesi ID (zorunlu)" className={INPUT} />
            : <input type="number" value={f.ozmal_tl} onChange={(e) => setF({ ...f, ozmal_tl: e.target.value })} placeholder="Saat maliyeti (TL, ops.)" className={INPUT} />}
          <button onClick={olustur} className={BTN_YESIL}>Kaydet</button>
        </div>
      )}
      <input type="number" value={mk} onChange={(e) => setMk(e.target.value)} placeholder="Maliyet kodu ID (makine/ekipman) — çalışma maliyeti deftere yazılsın diye" className={`${INPUT} mb-3`} />
      <div className="flex flex-col gap-2">
        {liste.length === 0 && <div className="text-xs text-[var(--text-secondary)] py-6 text-center">Ekipman yok.</div>}
        {liste.map((e) => (
          <div key={e.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex items-center justify-between gap-2 flex-wrap">
            <div><div className="font-bold">{e.ad} <span className="text-[10px] text-[var(--text-secondary)] font-normal">{e.sahiplik === 'kiralik' ? `kiralık (söz. #${e.kira_sozlesme_id})` : 'öz mal'}</span></div>
              <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1"><Clock className="w-3 h-3" /> sayaç {e.sayac_saat} saat • <span className={e.durum === 'arizali' ? 'text-red-400 font-bold' : ''}>{e.durum}</span></div></div>
            <div className="flex gap-1"><input type="number" value={saat[e.id] ?? ''} onChange={(ev) => setSaat({ ...saat, [e.id]: ev.target.value })} placeholder="Bugün saat" className="w-24 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
              <button disabled={!saat[e.id]} onClick={() => calisma(e)} className={`${BTN_MOR} disabled:opacity-30`}>Çalışma Kaydet</button>
              <button onClick={async () => { if (gecmis?.id === e.id) { setGecmis(null); return; } try { setGecmis({ id: e.id, satirlar: await api.ekipmanCalismalari(e.id) }); } catch (err) { setHata(String((err as Error).message)); } }} className="px-2 py-1 text-[10px] font-black uppercase text-indigo-400 cursor-pointer">Geçmiş</button></div>
            {gecmis?.id === e.id && (
              <div className="w-full mt-1 border-t border-[var(--border)] pt-2 text-[10px] flex flex-col gap-0.5">
                {gecmis.satirlar.length === 0 && <div className="text-[var(--text-secondary)]">Çalışma kaydı yok.</div>}
                {gecmis.satirlar.map((c) => <div key={c.id} className="flex justify-between"><span>{c.tarih} • {c.calisma_saat} saat{c.yakit_litre ? ` • ${c.yakit_litre} lt yakıt` : ''}</span><span>{c.tutar_kurus != null ? `${(c.tutar_kurus / 100).toLocaleString('tr-TR')} TL` : '—'}</span></div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
