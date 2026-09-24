import { useEffect, useState } from 'react';
import { GanttChart, Upload, AlertTriangle } from 'lucide-react';
import HizliForm from '../../_cekirdek/HizliForm';
import * as api from '../api';
import type { PlanGerceklesen } from '../types';
import { KART, INPUT, BTN_MOR, BTN_YESIL, HATA_KUTU, formatTarih, bugun } from './format';

export default function GanttPlanGerceklesen({ projeId }: { projeId: string }) {
  const [plan, setPlan] = useState<PlanGerceklesen | null>(null);
  const [csv, setCsv] = useState('');
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yenile = () => api.planGerceklesenGetir(projeId, bugun()).then(setPlan).catch((e) => setHata(String(e.message)));
  useEffect(() => { yenile(); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function iceAktar() {
    setHata(null); setSonuc(null);
    try {
      const r = await api.csvIceAktar(projeId, csv);
      setSonuc(`${r.eklenen} aktivite eklendi${r.hatalar.length ? `, ${r.hatalar.length} satır hatalı: ${r.hatalar.map((h) => `#${h.satir} ${h.hata}`).join('; ')}` : ''}.`);
      setCsv(''); await yenile();
    } catch (e) { setHata(String((e as Error).message)); }
  }
  async function yuzde(id: number, v: number) { try { await api.aktiviteYuzde(id, v); await yenile(); } catch (e) { setHata(String((e as Error).message)); } }

  const tarihler = plan?.satirlar.flatMap((s) => [s.plan_baslangic, s.plan_bitis]) ?? [];
  const min = tarihler.length ? tarihler.reduce((a, b) => (a < b ? a : b)) : bugun();
  const max = tarihler.length ? tarihler.reduce((a, b) => (a > b ? a : b)) : bugun();
  const aralik = Math.max(1, (new Date(max).getTime() - new Date(min).getTime()) / 86400000);
  const yuzdeKonum = (t: string) => `${Math.min(100, Math.max(0, ((new Date(t).getTime() - new Date(min).getTime()) / 86400000 / aralik) * 100))}%`;

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><GanttChart className="w-5 h-5 text-indigo-400" /> İş Programı — Plan vs Gerçekleşen</h2>
      {hata && <div className={HATA_KUTU}>{hata}</div>}

      <HizliForm butonEtiket="Yeni Aktivite" ipucu="Tek aktivite ekler; toplu giriş için aşağıdaki CSV içe aktarımını kullanın."
        alanlar={[{ ad: 'ad', etiket: 'Aktivite adı', zorunlu: true }, { ad: 'bas', etiket: 'Plan başlangıç', tip: 'date', zorunlu: true, varsayilan: bugun() }, { ad: 'bit', etiket: 'Plan bitiş', tip: 'date', zorunlu: true }, { ad: 'yuzde', etiket: 'Gerçekleşen %', tip: 'number', varsayilan: '0' }, { ad: 'wbs', etiket: 'WBS ID (ops.)' }]}
        onKaydet={async (v) => { await api.aktiviteEkle({ proje_id: projeId, ad: v.ad, plan_baslangic: v.bas, plan_bitis: v.bit, gerceklesen_yuzde: Number(v.yuzde || 0), wbs_gorev_id: v.wbs || undefined }); await yenile(); }} />

      <details className="mb-4 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
        <summary className="text-[10px] font-black uppercase cursor-pointer flex items-center gap-1 inline-flex"><Upload className="w-3 h-3" /> Excel / MS Project CSV İçe Aktar</summary>
        <div className="mt-2 flex flex-col gap-2">
          <div className="text-[10px] text-[var(--text-secondary)]">Sütunlar: ad ; başlangıç ; bitiş ; gerçekleşen % ; WBS ID(ops.). Tarih: GG.AA.YYYY veya YYYY-AA-GG.</div>
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={4} placeholder={'Temel;01.09.2026;30.09.2026;40;wbs-1'} className={INPUT} />
          <div className="flex gap-2 items-center"><button onClick={iceAktar} className={BTN_YESIL}>İçe Aktar</button>{sonuc && <span className="text-[10px] text-emerald-400">{sonuc}</span>}</div>
        </div>
      </details>

      {plan && plan.satirlar.length === 0 && <div className="text-xs text-[var(--text-secondary)]">İş programı boş — CSV içe aktarın.</div>}
      <div className="flex flex-col gap-3">
        {plan?.satirlar.map((s) => (
          <div key={s.id} className="text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-bold">{s.ad}{s.wbs_gorev_id ? <span className="text-[var(--text-secondary)] font-normal"> • WBS {s.wbs_gorev_id}</span> : null}</span>
              <span className={s.geride_mi ? 'text-red-400 font-bold' : 'text-emerald-400'}>plan %{s.beklenen_yuzde} • gerçek %{s.gerceklesen_yuzde} ({(s.sapma ?? 0) > 0 ? '+' : ''}{s.sapma})</span>
            </div>
            <div className="relative h-6 bg-[var(--bg-primary)] border border-[var(--border)] rounded">
              <div className="absolute top-0 h-full bg-slate-500/30 rounded" style={{ left: yuzdeKonum(s.plan_baslangic), width: `calc(${yuzdeKonum(s.plan_bitis)} - ${yuzdeKonum(s.plan_baslangic)})` }} title={`Plan ${formatTarih(s.plan_baslangic)} → ${formatTarih(s.plan_bitis)}`} />
              <div className={`absolute top-1.5 h-3 rounded ${s.geride_mi ? 'bg-red-500/70' : 'bg-emerald-500/70'}`} style={{ left: yuzdeKonum(s.plan_baslangic), width: `calc((${yuzdeKonum(s.plan_bitis)} - ${yuzdeKonum(s.plan_baslangic)}) * ${s.gerceklesen_yuzde / 100})` }} />
              <div className="absolute top-0 h-full w-px bg-indigo-400" style={{ left: yuzdeKonum(plan.tarih) }} title="Bugün" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-[var(--text-secondary)]">{formatTarih(s.plan_baslangic)} → {formatTarih(s.plan_bitis)}</span>
              <input type="number" min={0} max={100} defaultValue={s.gerceklesen_yuzde} onBlur={(e) => Number(e.target.value) !== s.gerceklesen_yuzde && yuzde(s.id, Number(e.target.value))} className="w-14 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-1 py-0.5 text-[10px]" title="Şantiye onaylı gerçekleşen %" />
              <span className="text-[10px] text-[var(--text-secondary)]">% (şantiye onaylı)</span>
            </div>
            {s.celiski && <div className="mt-1 p-2 rounded bg-amber-600/10 border border-amber-500/30 text-amber-400 text-[10px] flex gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{s.celiski.mesaj}</div>}
          </div>
        ))}
      </div>
      <div className="mt-3"><button onClick={yenile} className={BTN_MOR}>Yenile</button></div>
    </div>
  );
}
