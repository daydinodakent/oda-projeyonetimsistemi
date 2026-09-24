import { useEffect, useState } from 'react';
import { Ruler } from 'lucide-react';
import HizliForm from '../../_cekirdek/HizliForm';
import * as sozlesmeApi from '../../sozlesme/api';
import * as api from '../api';
import type { TaseronMetraj } from '../types';
import type { SozlesmeKalem } from '../../sozlesme/types';

const bugun = () => new Date().toISOString().slice(0, 10);

/** Hakediş dışı metraj: ekibin sözleşme kalemi bazında yaptığı iş miktarı; şef onayı verilen miktar dönem hesabına esas olur. */
export default function EkipMetraj({ ekipId }: { ekipId: number }) {
  const [metrajlar, setMetrajlar] = useState<TaseronMetraj[]>([]);
  const [kalemler, setKalemler] = useState<SozlesmeKalem[]>([]);
  const [onay, setOnay] = useState<Record<number, string>>({});
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    const [m, e] = await Promise.all([api.metrajListele(ekipId), api.ekipGetir(ekipId)]);
    setMetrajlar(m);
    setKalemler(await sozlesmeApi.kalemleriGetir(e.sozlesme_id));
  }
  useEffect(() => { yenile().catch((e) => setHata(String(e.message))); }, [ekipId]); // eslint-disable-line react-hooks/exhaustive-deps
  const kalemAdi = (id: number) => kalemler.find((k) => k.id === id)?.aciklama ?? `Kalem #${id}`;
  const birim = (id: number) => kalemler.find((k) => k.id === id)?.birim ?? '';

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Ruler className="w-5 h-5 text-indigo-400" /> Metraj</h2>
      {hata && <div className="mb-3 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      <HizliForm
        butonEtiket="Metraj gir"
        ipucu="Sözleşme kalemi seçin; girilen miktar şef onayına düşer. Onaylanan miktar dönem hesabında kullanılır."
        alanlar={[
          { ad: 'kalem', etiket: 'Sözleşme kalemi', tip: 'select', zorunlu: true, secenekler: kalemler.map((k) => ({ deger: String(k.id), etiket: `${k.aciklama} (${k.birim})` })) },
          { ad: 'tarih', etiket: 'Tarih', tip: 'date', zorunlu: true, varsayilan: bugun() },
          { ad: 'miktar', etiket: 'Miktar', tip: 'number', zorunlu: true },
          { ad: 'notes', etiket: 'Not' },
        ]}
        onKaydet={async (v) => { await api.metrajKaydet(ekipId, { sozlesme_kalem_id: Number(v.kalem), tarih: v.tarih, miktar: Number(v.miktar), notes: v.notes || undefined }); await yenile(); }}
      />
      {metrajlar.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-6 text-center">Metraj kaydı yok.{kalemler.length === 0 ? ' (Ekibin sözleşmesinde henüz kalem tanımlı değil — Sözleşme Yönetimi\'nden ekleyin.)' : ''}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {metrajlar.map((m) => (
            <div key={m.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-bold">{kalemAdi(m.sozlesme_kalem_id)}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{m.tarih} • girilen {m.miktar} {birim(m.sozlesme_kalem_id)}{m.notes ? ` • ${m.notes}` : ''}</div>
              </div>
              {m.sef_onayli_mi ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded border uppercase bg-emerald-600/15 text-emerald-400 border-emerald-500/30">Onaylı: {m.sef_onay_miktar} {birim(m.sozlesme_kalem_id)}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <input type="number" value={onay[m.id] ?? String(m.miktar)} onChange={(e) => setOnay({ ...onay, [m.id]: e.target.value })} className="w-20 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs" />
                  <button onClick={async () => { setHata(null); try { await api.metrajSefOnayi(m.id, Number(onay[m.id] ?? m.miktar)); await yenile(); } catch (err) { setHata(String((err as Error).message || err)); } }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Şef onayı</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
