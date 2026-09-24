import { Fragment, useEffect, useState } from 'react';
import { Gauge, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import * as api from '../api';
import type { MaliyetRaporu, ButceVersiyon, KurBazi, UyariSonucu, Karlilik } from '../types';
import KaynakBelgeDetay from './KaynakBelgeDetay';
import { KART, INPUT, HATA_KUTU, tl, yuzde, sapmaRenk, KUR_BAZI_ETIKET } from './format';

function Kpi({ baslik, deger, alt, uyari }: { baslik: string; deger: string; alt?: string; uyari?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${uyari ? 'bg-red-600/10 border-red-500/30' : 'bg-[var(--bg-primary)] border-[var(--border)]'}`}>
      <div className="text-[9px] font-black uppercase text-[var(--text-secondary)]">{baslik}</div>
      <div className="text-lg font-black mt-0.5">{deger}</div>
      {alt && <div className="text-[10px] text-[var(--text-secondary)]">{alt}</div>}
    </div>
  );
}

function Hucre({ v, onClick }: { v: number; onClick?: () => void }) {
  return <td className={`text-right px-2 py-1 ${onClick ? 'cursor-pointer hover:underline text-indigo-300' : ''}`} onClick={onClick}>{tl(v)}</td>;
}

export default function MaliyetPanosu({ projeId }: { projeId: string }) {
  const [versiyonlar, setVersiyonlar] = useState<ButceVersiyon[]>([]);
  const [versiyonId, setVersiyonId] = useState<number | undefined>();
  const [kurBazi, setKurBazi] = useState<KurBazi>('nominal');
  const [rapor, setRapor] = useState<MaliyetRaporu | null>(null);
  const [uy, setUy] = useState<UyariSonucu | null>(null);
  const [kar, setKar] = useState<Karlilik | null>(null);
  const [acik, setAcik] = useState<Set<string>>(new Set());
  const [drill, setDrill] = useState<{ kodId: number | 'kodsuz'; baslik: string } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => { api.versiyonlariListele(projeId).then(setVersiyonlar).catch(() => undefined); }, [projeId]);
  useEffect(() => {
    setHata(null);
    const s = { versiyonId, kurBazi };
    Promise.all([api.maliyetRaporu(projeId, s), api.uyarilar(projeId, s), api.karlilik(projeId, s)]).then(([r, u, k]) => { setRapor(r); setUy(u); setKar(k); }).catch((e) => setHata(String(e.message)));
  }, [projeId, versiyonId, kurBazi]);

  const t = rapor?.toplam;

  return (
    <div className={KART}>
      <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Gauge className="w-5 h-5 text-indigo-400" /> Proje Maliyet Panosu — {projeId}</h2>
        <div className="flex gap-2">
          <select value={versiyonId ?? ''} onChange={(e) => setVersiyonId(e.target.value ? Number(e.target.value) : undefined)} className={`${INPUT} w-auto`}>
            <option value="">Güncel onaylı bütçe</option>
            {versiyonlar.map((v) => <option key={v.id} value={v.id}>v{v.versiyon_no} — {v.ad} ({v.durum})</option>)}
          </select>
          <select value={kurBazi} onChange={(e) => setKurBazi(e.target.value as KurBazi)} className={`${INPUT} w-auto`}>
            {Object.entries(KUR_BAZI_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {!rapor || !t ? <div className="text-xs text-[var(--text-secondary)]">Yükleniyor…</div> : (
        <>
          <div className="text-[10px] text-[var(--text-secondary)] mb-3">
            Rapor bütçe versiyonu: <b>{rapor.butce_versiyon ? `v${rapor.butce_versiyon.versiyon_no} — ${rapor.butce_versiyon.ad}` : 'yok'}</b> • {KUR_BAZI_ETIKET[rapor.kur_bazi]} • {rapor.tarih}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            <Kpi baslik="Bütçe" deger={tl(t.butce)} />
            <Kpi baslik="Taahhüt" deger={tl(t.taahhut)} alt={t.butce ? yuzde((t.taahhut / t.butce) * 100) + ' bütçe' : undefined} uyari={t.taahhut > t.butce && t.butce > 0} />
            <Kpi baslik="Gerçekleşen" deger={tl(t.gerceklesen)} alt={t.butce ? yuzde((t.gerceklesen / t.butce) * 100) + ' bütçe' : undefined} />
            <Kpi baslik="EAC (tamamlanma tahmini)" deger={tl(t.eac)} alt={`sapma ${tl(t.sapma)} (${yuzde(t.sapma_yuzde)})`} uyari={t.sapma < 0} />
            <Kpi baslik="Beklenen gelir" deger={tl(kar?.gelir_beklenen_kurus)} alt={`tahsil: ${tl(kar?.gelir_tahsil_edilen_kurus)}`} />
            <Kpi baslik="Beklenen kâr" deger={tl(kar?.beklenen_kar_kurus)} alt={`marj ${yuzde(kar?.marj_yuzde)} • ${tl(kar?.m2_maliyet_kurus)}/m²`} uyari={(kar?.beklenen_kar_kurus ?? 0) < 0} />
          </div>

          {uy && uy.uyarilar.length > 0 && (
            <div className="mb-4 flex flex-col gap-1.5">
              {uy.uyarilar.map((u, i) => (
                <div key={i} className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${u.seviye === 'kritik' ? 'bg-red-600/10 border-red-500/30 text-red-400' : 'bg-amber-600/10 border-amber-500/30 text-amber-400'}`}><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{u.mesaj}</div>
              ))}
            </div>
          )}
          {rapor.uyarilar.map((u, i) => <div key={i} className="mb-3 p-2 rounded bg-amber-600/10 border border-amber-500/30 text-amber-400 text-xs">{u}</div>)}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="text-left py-1.5">WBS / Maliyet Kodu</th><th className="text-right">Bütçe</th><th className="text-right">Taahhüt</th><th className="text-right">Gerçekleşen</th>
                  <th className="text-right">Kalan (bütçe)</th><th className="text-right">EAC</th><th className="text-right">Sapma</th><th className="text-right">Sapma %</th>
                </tr>
              </thead>
              <tbody>
                {rapor.satirlar.map((w) => (
                  <Fragment key={w.wbs_kod}>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)] font-bold">
                      <td className="py-1.5 px-2" style={{ paddingLeft: 8 + w.derinlik * 16 }}>
                        {w.kodlar.length > 0 ? (
                          <button onClick={() => { const y = new Set(acik); y.has(w.wbs_kod) ? y.delete(w.wbs_kod) : y.add(w.wbs_kod); setAcik(y); }} className="inline-flex items-center gap-1 cursor-pointer">
                            {acik.has(w.wbs_kod) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}{w.wbs_kod} {w.ad}
                          </button>
                        ) : <span>{w.wbs_kod} {w.ad}</span>}
                      </td>
                      <Hucre v={w.ozet.butce} /><Hucre v={w.ozet.taahhut} /><Hucre v={w.ozet.gerceklesen} /><Hucre v={w.ozet.kalan} /><Hucre v={w.ozet.eac} />
                      <td className={`text-right px-2 ${sapmaRenk(w.ozet.sapma)}`}>{tl(w.ozet.sapma)}</td><td className={`text-right px-2 ${sapmaRenk(w.ozet.sapma)}`}>{yuzde(w.ozet.sapma_yuzde)}</td>
                    </tr>
                    {acik.has(w.wbs_kod) && w.kodlar.map((k) => (
                      <tr key={`${w.wbs_kod}-${k.maliyet_kodu_id}`} className="border-b border-[var(--border)]">
                        <td className="py-1 px-2 text-[var(--text-secondary)]" style={{ paddingLeft: 8 + (w.derinlik + 1) * 16 }}>{k.kod}</td>
                        <Hucre v={k.butce} />
                        <Hucre v={k.taahhut} onClick={() => k.maliyet_kodu_id != null && setDrill({ kodId: k.maliyet_kodu_id, baslik: `${k.kod} • taahhüt/gerçekleşen` })} />
                        <Hucre v={k.gerceklesen} onClick={() => k.maliyet_kodu_id != null && setDrill({ kodId: k.maliyet_kodu_id, baslik: `${k.kod} • taahhüt/gerçekleşen` })} />
                        <Hucre v={k.kalan} /><Hucre v={k.eac} />
                        <td className={`text-right px-2 ${sapmaRenk(k.sapma)}`}>{tl(k.sapma)}</td><td className={`text-right px-2 ${sapmaRenk(k.sapma)}`}>{yuzde(k.sapma_yuzde)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {rapor.kodsuz && (
                  <tr className="border-b border-[var(--border)] bg-amber-600/5">
                    <td className="py-1.5 px-2 font-bold text-amber-400">(maliyet kodsuz)</td><Hucre v={0} />
                    <Hucre v={rapor.kodsuz.taahhut} onClick={() => setDrill({ kodId: 'kodsuz', baslik: 'Maliyet kodsuz hareketler' })} />
                    <Hucre v={rapor.kodsuz.gerceklesen} onClick={() => setDrill({ kodId: 'kodsuz', baslik: 'Maliyet kodsuz hareketler' })} />
                    <Hucre v={0} /><Hucre v={rapor.kodsuz.eac} /><td /><td />
                  </tr>
                )}
                <tr className="font-black border-t-2 border-[var(--border)]">
                  <td className="py-2 px-2">PROJE TOPLAMI</td><Hucre v={t.butce} /><Hucre v={t.taahhut} /><Hucre v={t.gerceklesen} /><Hucre v={t.kalan} /><Hucre v={t.eac} />
                  <td className={`text-right px-2 ${sapmaRenk(t.sapma)}`}>{tl(t.sapma)}</td><td className={`text-right px-2 ${sapmaRenk(t.sapma)}`}>{yuzde(t.sapma_yuzde)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-2">Taahhüt/gerçekleşen rakamlarına tıklayın → defter hareketleri → kaynak belge (hakediş, fatura, depo çıkışı, puantaj dönemi, bordro…).</div>
        </>
      )}
      {drill && <KaynakBelgeDetay projeId={projeId} kodId={drill.kodId} baslik={drill.baslik} kurBazi={kurBazi} onKapat={() => setDrill(null)} />}
    </div>
  );
}
