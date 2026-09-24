import { useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2, Wallet } from 'lucide-react';
import * as api from '../api';
import type { Satis, OdemePlaniDetay, TaksitGirdisi, TaksitTuru, OdemeOzeti } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, TAKSIT_TUR_ETIKET, formatKurus, formatTarih, bugun } from './format';

const tarihEkleAy = (t: string, ay: number) => { const d = new Date(t); d.setMonth(d.getMonth() + ay); return d.toISOString().slice(0, 10); };

export default function OdemePlaniOlusturucu({ projeId }: { projeId: string }) {
  const [satislar, setSatislar] = useState<Satis[]>([]);
  const [satisId, setSatisId] = useState<number | null>(null);
  const [plan, setPlan] = useState<OdemePlaniDetay | null>(null);
  const [ozet, setOzet] = useState<OdemeOzeti | null>(null);
  const [satirlar, setSatirlar] = useState<(TaksitGirdisi & { tutarTl: string })[]>([]);
  const [nedeni, setNedeni] = useState('');
  const [tahsilatTl, setTahsilatTl] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  // sihirbaz: peşinat + N eşit taksit
  const [w, setW] = useState({ pesinatTl: '', adet: '12', ilkVade: bugun() });

  const secili = satislar.find((s) => s.id === satisId) || null;
  const yukle = async () => { setSatislar((await api.satislariListele(projeId)).filter((s) => s.durum !== 'iptal')); };
  const planYukle = async (id: number) => { setPlan(await api.planGetir(id)); setOzet(await api.odemeOzeti(id)); };
  useEffect(() => { yukle().catch((e) => setHata(String(e.message))); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (satisId) planYukle(satisId).catch((e) => setHata(String(e.message))); setSatirlar([]); }, [satisId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sar = (fn: () => Promise<unknown>) => async () => { setHata(null); setMesaj(null); try { await fn(); await yukle(); if (satisId) await planYukle(satisId); } catch (e) { setHata(String((e as Error).message)); } };

  function esitTaksitUret() {
    if (!secili) return;
    const toplam = secili.tutar_kurus; const pes = Math.round(Number(w.pesinatTl || 0) * 100); const adet = Math.max(1, Number(w.adet));
    const kalan = toplam - pes; const taksit = Math.floor(kalan / adet);
    const yeni: (TaksitGirdisi & { tutarTl: string })[] = [];
    if (pes > 0) yeni.push({ tur: 'pesinat', vade_tarihi: w.ilkVade, tutar_kurus: pes, tutarTl: String(pes / 100) });
    for (let i = 0; i < adet; i++) { const t = i === adet - 1 ? kalan - taksit * (adet - 1) : taksit; yeni.push({ tur: 'taksit', vade_tarihi: tarihEkleAy(w.ilkVade, i + 1), tutar_kurus: t, tutarTl: String(t / 100) }); }
    setSatirlar(yeni);
  }
  const guncelle = (i: number, patch: Partial<TaksitGirdisi & { tutarTl: string }>) => setSatirlar(satirlar.map((s, n) => (n === i ? { ...s, ...patch, ...(patch.tutarTl !== undefined ? { tutar_kurus: Math.round(Number(patch.tutarTl) * 100) } : {}) } : s)));
  const toplam = satirlar.reduce((t, s) => t + (s.tutar_kurus || 0), 0);
  const fark = secili ? secili.tutar_kurus - toplam : 0;
  const govde = () => satirlar.map(({ tutarTl: _t, ...s }) => s); // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><CalendarClock className="w-5 h-5 text-indigo-400" /> Ödeme Planı</h2>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {mesaj && <div className="mb-4 p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}

      <select value={satisId ?? ''} onChange={(e) => setSatisId(e.target.value ? Number(e.target.value) : null)} className={`${INPUT} mb-4`}>
        <option value="">Satış seçin…</option>
        {satislar.map((s) => <option key={s.id} value={s.id}>Satış #{s.id} — bölüm #{s.bolum_id} — {formatKurus(s.tutar_kurus, s.para_birimi)} ({s.durum})</option>)}
      </select>

      {secili && (
        <>
          {plan && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="font-black">Aktif plan v{plan.plan.versiyon} • ödenen {formatKurus(plan.odenen_kurus, secili.para_birimi)} / {formatKurus(plan.toplam_kurus, secili.para_birimi)}{ozet ? ` (%${ozet.yuzde})` : ''}</span>
                {plan.plan.revizyon_nedeni && <span className="text-[10px] text-[var(--text-secondary)]">revizyon: {plan.plan.revizyon_nedeni}</span>}
              </div>
              <div className="flex flex-col gap-1.5">
                {plan.taksitler.map((t) => (
                  <div key={t.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex items-center justify-between gap-2">
                    <span>{TAKSIT_TUR_ETIKET[t.tur]} • {formatTarih(t.vade_tarihi)} • {formatKurus(t.tutar_kurus, secili.para_birimi)}{t.tur === 'kredi' ? ` • kredi: ${t.kredi_onay_durumu}` : ''}</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${t.durum === 'kapali' ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' : t.durum === 'kismi' ? 'bg-amber-600/15 text-amber-400 border-amber-500/30' : 'bg-slate-600/20 text-slate-400 border-slate-500/30'}`}>{t.durum} {t.odenen_kurus > 0 ? formatKurus(t.odenen_kurus, secili.para_birimi) : ''}</span>
                      {t.tur === 'kredi' && t.kredi_onay_durumu !== 'onaylandi' && <button onClick={sar(() => api.krediDurumu(t.id, 'onaylandi'))} className={BTN_MOR}>Kredi Onaylandı</button>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1">Sürümler: {plan.versiyonlar.map((v) => `v${v.versiyon} (${v.durum})`).join(' • ')}</div>
            </div>
          )}

          {secili.durum === 'onayli' && plan && (
            <div className="mb-4 flex gap-2 items-end">
              <input type="number" value={tahsilatTl} onChange={(e) => setTahsilatTl(e.target.value)} placeholder="Tahsilat (TL) — en eski vadeden kapatılır" className={INPUT} />
              <button onClick={sar(async () => { await api.tahsilatKaydet(secili.id, { tutar_kurus: Math.round(Number(tahsilatTl) * 100), tarih: bugun(), yontem: 'havale' }); setTahsilatTl(''); setMesaj('Tahsilat kaydedildi.'); })} className={`${BTN_YESIL} flex items-center gap-1 whitespace-nowrap`}><Wallet className="w-3 h-3" /> Tahsil Et</button>
            </div>
          )}

          <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
            <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2">{plan ? 'Revizyon (yeniden yapılandırma)' : 'Yeni plan'} — sihirbaz</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <input type="number" value={w.pesinatTl} onChange={(e) => setW({ ...w, pesinatTl: e.target.value })} placeholder="Peşinat (TL)" className={INPUT} />
              <input type="number" value={w.adet} onChange={(e) => setW({ ...w, adet: e.target.value })} placeholder="Taksit adedi" className={INPUT} />
              <input type="date" value={w.ilkVade} onChange={(e) => setW({ ...w, ilkVade: e.target.value })} className={INPUT} />
              <button onClick={esitTaksitUret} className={BTN_MOR}>Eşit Taksit Üret</button>
            </div>
            <div className="flex flex-col gap-1.5">
              {satirlar.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <select value={s.tur} onChange={(e) => guncelle(i, { tur: e.target.value as TaksitTuru })} className={INPUT}>{Object.entries(TAKSIT_TUR_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <input type="date" value={s.vade_tarihi} onChange={(e) => guncelle(i, { vade_tarihi: e.target.value })} className={INPUT} />
                  <input type="number" value={s.tutarTl} onChange={(e) => guncelle(i, { tutarTl: e.target.value })} className={INPUT} />
                  <button onClick={() => setSatirlar(satirlar.filter((_, n) => n !== i))} className="p-1 cursor-pointer text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <button onClick={() => setSatirlar([...satirlar, { tur: 'ara_odeme', vade_tarihi: bugun(), tutar_kurus: 0, tutarTl: '0' }])} className={`${BTN_MOR} flex items-center gap-1`}><Plus className="w-3 h-3" /> Satır (ara ödeme/senet/kredi/takas)</button>
              <span className={`text-xs font-bold ${fark === 0 && satirlar.length ? 'text-emerald-400' : 'text-amber-400'}`}>Toplam {formatKurus(toplam, secili.para_birimi)} • fark {formatKurus(fark, secili.para_birimi)}</span>
            </div>
            {plan && <input value={nedeni} onChange={(e) => setNedeni(e.target.value)} placeholder="Revizyon nedeni (zorunlu)" className={`${INPUT} mt-2`} />}
            <div className="flex gap-2 mt-3">
              {!plan ? <button disabled={!satirlar.length} onClick={sar(async () => { await api.planOlustur(secili.id, govde()); setSatirlar([]); setMesaj('Plan oluşturuldu.'); })} className={`${BTN_YESIL} disabled:opacity-30`}>Planı Kaydet</button>
                : <button disabled={!satirlar.length} onClick={sar(async () => { await api.planRevize(secili.id, govde(), nedeni); setSatirlar([]); setNedeni(''); setMesaj('Plan revize edildi — eski tahsilatlar yeni plana aktarıldı.'); })} className={`${BTN_YESIL} disabled:opacity-30`}>Revize Et</button>}
              {secili.durum === 'taslak' && plan && <button onClick={sar(async () => { await api.satisOnayla(secili.id); setMesaj('Satış onaylandı — sözleşme yürürlüğe girdi, GELİR taahhüdü yazıldı.'); })} className={BTN_YESIL}>Satışı Onayla</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
