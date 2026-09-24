import { useEffect, useState } from 'react';
import { PackageCheck, Wrench } from 'lucide-react';
import * as api from '../api';
import type { Satis, TeslimTutanagi, SatisSonrasiTalep } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, formatKurus, formatTarih, bugun } from './format';

export default function TeslimSatisSonrasi({ projeId }: { projeId: string }) {
  const [satislar, setSatislar] = useState<Satis[]>([]);
  const [satisId, setSatisId] = useState('');
  const [tutanak, setTutanak] = useState<TeslimTutanagi | null>(null);
  const [talepler, setTalepler] = useState<SatisSonrasiTalep[]>([]);
  const [eksikMetin, setEksikMetin] = useState('');
  const [istisna, setIstisna] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [sorumlu, setSorumlu] = useState('');
  const [talep, setTalep] = useState({ tur: 'ariza', aciklama: '', wbs: '' });
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);

  const yukle = async () => { setSatislar((await api.satislariListele(projeId)).filter((s) => s.durum === 'onayli')); setTalepler(await api.talepleriListele(projeId)); };
  useEffect(() => { yukle().catch((e) => setHata(String(e.message))); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTutanak(null); if (satisId) api.teslimGetir(Number(satisId)).then(setTutanak).catch(() => undefined); }, [satisId]);
  const sar = (fn: () => Promise<unknown>) => async () => { setHata(null); setMesaj(null); try { await fn(); await yukle(); if (satisId) setTutanak(await api.teslimGetir(Number(satisId))); } catch (e) { setHata(String((e as Error).message)); } };

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><PackageCheck className="w-5 h-5 text-indigo-400" /> Teslim & Satış Sonrası</h2>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {mesaj && <div className="mb-4 p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}
      <select value={satisId} onChange={(e) => setSatisId(e.target.value)} className={`${INPUT} mb-4`}>
        <option value="">Onaylı satış seçin…</option>
        {satislar.map((s) => <option key={s.id} value={s.id}>Satış #{s.id} — bölüm #{s.bolum_id} — {formatKurus(s.tutar_kurus, s.para_birimi)}</option>)}
      </select>

      {satisId && !tutanak && (
        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl mb-4 flex flex-col gap-2">
          <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">Teslim Tutanağı</div>
          <textarea value={eksikMetin} onChange={(e) => setEksikMetin(e.target.value)} rows={3} placeholder="Eksik listesi (her satıra bir eksik)" className={INPUT} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={istisna} onChange={(e) => setIstisna(e.target.checked)} /> Ödeme tamamlanma şartına yetkili istisna onayı</label>
          {istisna && <input value={gerekce} onChange={(e) => setGerekce(e.target.value)} placeholder="Gerekçe (zorunlu)" className={INPUT} />}
          <button onClick={sar(async () => { await api.teslimYap(Number(satisId), { tarih: bugun(), eksikler: eksikMetin.split('\n').map((x) => x.trim()).filter(Boolean), istisnaOnayi: istisna, gerekce: gerekce || undefined }); setMesaj('Teslim tamamlandı.'); })} className={BTN_YESIL}>Teslim Et</button>
        </div>
      )}

      {tutanak && (
        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl mb-4 text-xs">
          <div className="font-bold mb-1">Teslim: {formatTarih(tutanak.tarih)} • ödeme %{tutanak.odeme_yuzdesi}{tutanak.istisna_onayi_mi ? ` • istisna: ${tutanak.istisna_gerekcesi}` : ''}</div>
          {tutanak.eksikler.map((e) => <div key={e.id} className="py-1 flex justify-between border-b border-[var(--border)]"><span>{e.aciklama}</span><span className={e.gorev_id ? 'text-emerald-400' : 'text-amber-400'}>{e.gorev_id ? `Şantiye görevi #${e.gorev_id}` : 'göreve dönüşmedi'}</span></div>)}
          {tutanak.eksikler.some((e) => !e.gorev_id) && (
            <div className="flex gap-2 mt-2"><input type="number" value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} placeholder="Sorumlu Kişi ID (P8 görev)" className={INPUT} />
              <button onClick={sar(async () => { const r = await api.eksikleriGoreveDonustur(tutanak.id, { sorumlu_tipi: 'kisi', sorumlu_id: Number(sorumlu) }); setMesaj(`${r.length} eksik Şantiye görevine dönüştü.`); })} className={`${BTN_MOR} whitespace-nowrap`}>Şantiye Görevine Dönüştür</button></div>
          )}
        </div>
      )}

      <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2 flex items-center gap-1.5"><Wrench className="w-3 h-3" /> Satış Sonrası Talepler</div>
      {satisId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <select value={talep.tur} onChange={(e) => setTalep({ ...talep, tur: e.target.value })} className={INPUT}><option value="ariza">Arıza</option><option value="sikayet">Şikayet</option><option value="talep">Talep</option></select>
          <input value={talep.aciklama} onChange={(e) => setTalep({ ...talep, aciklama: e.target.value })} placeholder="Açıklama" className={INPUT} />
          <input value={talep.wbs} onChange={(e) => setTalep({ ...talep, wbs: e.target.value })} placeholder="WBS ID (alt yüklenici bulunsun)" className={INPUT} />
          <button onClick={sar(async () => { await api.talepAc({ satis_id: Number(satisId), tur: talep.tur, aciklama: talep.aciklama, wbs_gorev_id: talep.wbs || undefined, talep_tarihi: bugun() }); setTalep({ ...talep, aciklama: '' }); })} className={BTN_YESIL}>Talep Aç</button>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {talepler.map((t) => (
          <div key={t.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex items-center justify-between">
            <span>{t.tur}: {t.aciklama} • {formatTarih(t.talep_tarihi)} • <b>{t.durum}</b>{t.garanti_kapsaminda_mi === 0 ? ' • GARANTİ DIŞI' : t.garanti_kapsaminda_mi === 1 ? ' • garanti içinde' : ''}{t.yonlendirilen_sozlesme_id ? ` • alt yüklenici sözleşme #${t.yonlendirilen_sozlesme_id}` : ''}{t.gorev_id ? ` • görev #${t.gorev_id}` : ''}</span>
            {t.durum === 'acik' && <button onClick={sar(async () => { await api.talepYonlendir(t.id, sorumlu ? { sorumlu_tipi: 'kisi', sorumlu_id: Number(sorumlu) } : undefined); setMesaj('Talep P8 göreve yönlendirildi.'); })} className={BTN_MOR}>Yönlendir</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
