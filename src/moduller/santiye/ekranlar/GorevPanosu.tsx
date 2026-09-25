import { useEffect, useState } from 'react';
import { ListChecks, LayoutGrid, List, Plus, MapPin } from 'lucide-react';
import * as api from '../api';
import type { Gorev, SorumluTipi } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, SORUMLU_ETIKET, GOREV_DURUM_ETIKET, formatTarih, bugun } from './format';

const KOLONLAR: Gorev['durum'][] = ['acik', 'devam', 'kapali'];

export default function GorevPanosu({ projeId }: { projeId: string }) {
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [gorunum, setGorunum] = useState<'kanban' | 'liste'>('kanban');
  const [formAcik, setFormAcik] = useState(false);
  const [f, setF] = useState({ baslik: '', sorumlu_tipi: 'kisi' as SorumluTipi, sorumlu_id: '', wbs: '', blok: '', kat: '', daire: '', lat: '', lon: '', son_tarih: '' });
  const [kapatilan, setKapatilan] = useState<number | null>(null);
  const [foto, setFoto] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  const yenile = () => api.gorevleriListele(projeId).then(setGorevler).catch((e) => setHata(String(e.message)));
  useEffect(() => { yenile(); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function olustur() {
    setHata(null);
    try {
      await api.gorevOlustur({
        proje_id: projeId, baslik: f.baslik, sorumlu_tipi: f.sorumlu_tipi, sorumlu_id: Number(f.sorumlu_id), wbs_gorev_id: f.wbs || undefined,
        konum_blok: f.blok || undefined, konum_kat: f.kat || undefined, konum_daire: f.daire || undefined,
        lat: f.lat ? Number(f.lat) : undefined, lon: f.lon ? Number(f.lon) : undefined, son_tarih: f.son_tarih || undefined,
      });
      setFormAcik(false); setF({ ...f, baslik: '' });
      await yenile();
    } catch (e) { setHata(String((e as Error).message)); }
  }
  async function durum(id: number, d: string) { setHata(null); try { await api.gorevDurum(id, d); await yenile(); } catch (e) { setHata(String((e as Error).message)); } }
  async function kapat() {
    if (!kapatilan) return;
    setHata(null);
    try { await api.gorevKapat(kapatilan, foto); setKapatilan(null); setFoto(''); await yenile(); } catch (e) { setHata(String((e as Error).message)); }
  }

  const Kart = ({ g }: { g: Gorev }) => {
    const gecikmis = g.son_tarih && g.son_tarih < bugun() && ['acik', 'devam'].includes(g.durum);
    return (
      <div className={`p-3 rounded-lg border text-xs ${gecikmis ? 'bg-red-600/10 border-red-500/30' : 'bg-[var(--bg-primary)] border-[var(--border)]'}`}>
        <div className="font-bold">{g.baslik}</div>
        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{SORUMLU_ETIKET[g.sorumlu_tipi]} #{g.sorumlu_id}{g.wbs_gorev_id ? ` • WBS ${g.wbs_gorev_id}` : ''}</div>
        <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 flex-wrap">
          {(g.konum_blok || g.konum_kat || g.konum_daire) && <span>{[g.konum_blok, g.konum_kat && `Kat ${g.konum_kat}`, g.konum_daire && `Daire ${g.konum_daire}`].filter(Boolean).join(' / ')}</span>}
          {g.lat != null && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />harita</span>}
          {g.son_tarih && <span className={gecikmis ? 'text-red-400 font-bold' : ''}>son: {formatTarih(g.son_tarih)}</span>}
        </div>
        {['acik', 'devam'].includes(g.durum) && (
          <div className="flex gap-1 mt-2">
            {g.durum === 'acik' && <button onClick={() => durum(g.id, 'devam')} className={BTN_MOR}>Başla</button>}
            <button onClick={() => setKapatilan(g.id)} className={BTN_YESIL}>Fotoğraflı Kapat</button>
          </div>
        )}
        {g.kapanis_foto_url && <div className="text-[10px] text-emerald-400 mt-1">Kapanış fotoğrafı: {g.kapanis_foto_url}</div>}
      </div>
    );
  };

  return (
    <div className={KART}>
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><ListChecks className="w-5 h-5 text-indigo-400" /> Görev Panosu</h2>
        <div className="flex gap-2">
          <button onClick={() => setGorunum(gorunum === 'kanban' ? 'liste' : 'kanban')} className={`${BTN_MOR} flex items-center gap-1`}>{gorunum === 'kanban' ? <><List className="w-3 h-3" /> Liste</> : <><LayoutGrid className="w-3 h-3" /> Kanban</>}</button>
          <button onClick={() => setFormAcik((v) => !v)} className={`${BTN_YESIL} flex items-center gap-1`}><Plus className="w-3 h-3" /> Yeni Görev</button>
        </div>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}

      {formAcik && (
        <div className="mb-4 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input value={f.baslik} onChange={(e) => setF({ ...f, baslik: e.target.value })} placeholder="Görev başlığı" className={`${INPUT} col-span-2`} />
          <select value={f.sorumlu_tipi} onChange={(e) => setF({ ...f, sorumlu_tipi: e.target.value as SorumluTipi })} className={INPUT}>{Object.entries(SORUMLU_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input type="number" value={f.sorumlu_id} onChange={(e) => setF({ ...f, sorumlu_id: e.target.value })} placeholder="Sorumlu ID" className={INPUT} />
          <input value={f.wbs} onChange={(e) => setF({ ...f, wbs: e.target.value })} placeholder="WBS görev ID" className={INPUT} />
          <input type="date" value={f.son_tarih} onChange={(e) => setF({ ...f, son_tarih: e.target.value })} className={INPUT} />
          <input value={f.blok} onChange={(e) => setF({ ...f, blok: e.target.value })} placeholder="Blok" className={INPUT} />
          <input value={f.kat} onChange={(e) => setF({ ...f, kat: e.target.value })} placeholder="Kat" className={INPUT} />
          <input value={f.daire} onChange={(e) => setF({ ...f, daire: e.target.value })} placeholder="Daire" className={INPUT} />
          <input value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} placeholder="Enlem (harita)" className={INPUT} />
          <input value={f.lon} onChange={(e) => setF({ ...f, lon: e.target.value })} placeholder="Boylam (harita)" className={INPUT} />
          <button onClick={olustur} className={BTN_YESIL}>Kaydet</button>
        </div>
      )}

      {kapatilan && (
        <div className="mb-4 p-3 bg-emerald-600/10 border border-emerald-500/30 rounded-lg flex gap-2 items-center">
          <input value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="Kapanış fotoğrafı (dosya adı/URL) — zorunlu" className={INPUT} />
          <button onClick={kapat} className={BTN_YESIL}>Kapat</button>
          <button onClick={() => setKapatilan(null)} className={BTN_MOR}>Vazgeç</button>
        </div>
      )}

      {gorunum === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {KOLONLAR.map((k) => (
            <div key={k} className="flex flex-col gap-2">
              <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">{GOREV_DURUM_ETIKET[k]} ({gorevler.filter((g) => g.durum === k).length})</div>
              {gorevler.filter((g) => g.durum === k).map((g) => <Kart key={g.id} g={g} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">{gorevler.map((g) => <Kart key={g.id} g={g} />)}{gorevler.length === 0 && <div className="text-xs text-[var(--text-secondary)]">Görev yok.</div>}</div>
      )}
    </div>
  );
}
