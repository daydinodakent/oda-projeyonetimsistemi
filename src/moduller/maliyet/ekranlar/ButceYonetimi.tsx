import { useEffect, useState } from 'react';
import { Wallet, Plus, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import * as api from '../api';
import type { ButceVersiyon, ButceSatir, MaliyetKoduTanim } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, tl, formatTarih } from './format';

export default function ButceYonetimi({ projeId }: { projeId: string }) {
  const [versiyonlar, setVersiyonlar] = useState<ButceVersiyon[]>([]);
  const [aktifId, setAktifId] = useState<number | null>(null);
  const [satirlar, setSatirlar] = useState<ButceSatir[]>([]);
  const [kodlar, setKodlar] = useState<MaliyetKoduTanim[]>([]);
  const [yeni, setYeni] = useState({ kod: '', tutarTl: '', pb: 'TRY', kur: '1', tahminTl: '' });
  const [csv, setCsv] = useState('');
  const [onaylayan, setOnaylayan] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const aktif = versiyonlar.find((v) => v.id === aktifId) || null;
  const yenile = async () => { const v = await api.versiyonlariListele(projeId); setVersiyonlar(v); setKodlar(await api.maliyetKodlari(projeId)); if (!aktifId && v.length) setAktifId(v[v.length - 1].id); };
  useEffect(() => { yenile().catch((e) => setHata(String(e.message))); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (aktifId) api.satirlariGetir(aktifId).then(setSatirlar).catch(() => undefined); }, [aktifId]);
  const sar = (fn: () => Promise<unknown>) => async () => { setHata(null); setMesaj(null); try { await fn(); await yenile(); if (aktifId) setSatirlar(await api.satirlariGetir(aktifId)); } catch (e) { setHata(String((e as Error).message)); } };
  const kodAdi = (id: number) => kodlar.find((k) => k.id === id)?.kod ?? `#${id}`;

  function dosyaYukle(f: File | undefined) {
    if (!f || !aktifId) return;
    const vid = aktifId;
    const okuyucu = new FileReader();
    if (/\.xlsx$/i.test(f.name)) {
      okuyucu.onload = () => { const b64 = String(okuyucu.result).split(',')[1]; sar(async () => { const r = await api.xlsxIceAktar(vid, b64); setMesaj(`${r.eklenen} satır aktarıldı${r.hatalar.length ? `, ${r.hatalar.length} hata: ${r.hatalar.map((h) => `#${h.satir} ${h.hata}`).join('; ')}` : ''}`); })(); };
      okuyucu.readAsDataURL(f);
    } else {
      okuyucu.onload = () => setCsv(String(okuyucu.result));
      okuyucu.readAsText(f);
    }
  }

  return (
    <div className={KART}>
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Wallet className="w-5 h-5 text-indigo-400" /> Bütçe Yönetimi — {projeId}</h2>
        <button onClick={sar(async () => { const v = await api.versiyonOlustur(projeId); setAktifId(v.id); setMesaj(`${v.ad} taslağı açıldı${v.versiyon_no > 1 ? ' (önceki onaylı bütçeden kopyalandı)' : ''}.`); })} className={`${BTN_YESIL} flex items-center gap-1`}><Plus className="w-3 h-3" /> Yeni Versiyon / Revizyon</button>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {mesaj && <div className="mb-4 p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}

      <div className="flex gap-2 flex-wrap mb-4">
        {versiyonlar.length === 0 && <span className="text-xs text-[var(--text-secondary)]">Henüz bütçe versiyonu yok.</span>}
        {versiyonlar.map((v) => (
          <button key={v.id} onClick={() => setAktifId(v.id)} className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border cursor-pointer ${aktifId === v.id ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
            v{v.versiyon_no} {v.ad} • {v.durum}{v.onay_tarihi ? ` (${formatTarih(v.onay_tarihi)})` : ''}
          </button>
        ))}
      </div>

      {aktif && (
        <>
          {aktif.durum === 'taslak' && (
            <div className="mb-4 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl flex flex-col gap-2">
              <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">Satır ekle / güncelle</div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <select value={yeni.kod} onChange={(e) => setYeni({ ...yeni, kod: e.target.value })} className={`${INPUT} col-span-2`}>
                  <option value="">Maliyet kodu…</option>{kodlar.map((k) => <option key={k.id} value={k.id}>{k.kod}</option>)}
                </select>
                <input type="number" value={yeni.tutarTl} onChange={(e) => setYeni({ ...yeni, tutarTl: e.target.value })} placeholder="Tutar" className={INPUT} />
                <input value={yeni.pb} onChange={(e) => setYeni({ ...yeni, pb: e.target.value.toUpperCase() })} placeholder="PB" className={INPUT} />
                <input type="number" value={yeni.kur} onChange={(e) => setYeni({ ...yeni, kur: e.target.value })} placeholder="Bütçe kuru" className={INPUT} />
                <input type="number" value={yeni.tahminTl} onChange={(e) => setYeni({ ...yeni, tahminTl: e.target.value })} placeholder="Kalan tahmin (TL, ops.)" className={INPUT} />
              </div>
              <button onClick={sar(async () => { await api.satirKaydet(aktif.id, { maliyet_kodu_id: Number(yeni.kod), tutar_kurus: Math.round(Number(yeni.tutarTl) * 100), para_birimi: yeni.pb, kur: Number(yeni.kur), kalan_tahmin_kurus: yeni.tahminTl ? Math.round(Number(yeni.tahminTl) * 100) : undefined }); setYeni({ ...yeni, tutarTl: '', tahminTl: '' }); })} className={`${BTN_MOR} self-start`}>Satırı Kaydet</button>

              <details className="mt-1">
                <summary className="text-[10px] font-black uppercase cursor-pointer inline-flex items-center gap-1"><Upload className="w-3 h-3" /> Excel (.xlsx) / CSV içe aktar</summary>
                <div className="mt-2 flex flex-col gap-2">
                  <div className="text-[10px] text-[var(--text-secondary)]">Başlıklar: <code>kod</code> (örn. WBS-1.1.MLZ) <i>veya</i> <code>wbs</code> + <code>kaynak_tipi</code>; <code>tutar</code>; ops. <code>para_birimi</code>, <code>kur</code>, <code>kalan_tahmin</code>. Sayı: 1.250.000,50 veya 1250000.5</div>
                  <input type="file" accept=".xlsx,.csv,.txt" onChange={(e) => dosyaYukle(e.target.files?.[0])} className="text-xs" />
                  <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={4} placeholder={'wbs;kaynak_tipi;tutar\n1.1;malzeme;500000'} className={INPUT} />
                  <button onClick={sar(async () => { const r = await api.csvIceAktar(aktif.id, csv); setMesaj(`${r.eklenen} satır aktarıldı${r.hatalar.length ? `, ${r.hatalar.length} hata: ${r.hatalar.map((h) => `#${h.satir} ${h.hata}`).join('; ')}` : ''}`); setCsv(''); })} className={`${BTN_MOR} self-start`}>CSV İçe Aktar</button>
                </div>
              </details>
            </div>
          )}

          <table className="w-full text-xs mb-4">
            <thead><tr className="text-[9px] uppercase text-[var(--text-secondary)] border-b border-[var(--border)]"><th className="text-left py-1.5">Maliyet kodu</th><th className="text-right">Tutar</th><th className="text-right">Bütçe kuru</th><th className="text-right">TL karşılığı</th><th className="text-right">Kalan tahmin</th><th /></tr></thead>
            <tbody>
              {satirlar.map((s) => (
                <tr key={s.id} className="border-b border-[var(--border)]">
                  <td className="py-1.5">{kodAdi(s.maliyet_kodu_id)}</td>
                  <td className="text-right">{(s.tutar_kurus / 100).toLocaleString('tr-TR')} {s.para_birimi}</td>
                  <td className="text-right">{s.para_birimi === 'TRY' ? '—' : s.kur}</td>
                  <td className="text-right font-bold">{tl(Math.round(s.tutar_kurus * s.kur))}</td>
                  <td className="text-right">{tl(s.kalan_tahmin_kurus)}</td>
                  <td className="text-right">{aktif.durum === 'taslak' && <button onClick={sar(() => api.satirSil(aktif.id, s.maliyet_kodu_id))} className="text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
              <tr className="font-black"><td className="py-2">TOPLAM</td><td /><td /><td className="text-right">{tl(satirlar.reduce((t, s) => t + Math.round(s.tutar_kurus * s.kur), 0))}</td><td /><td /></tr>
            </tbody>
          </table>

          {aktif.durum === 'taslak' && (
            <div className="flex gap-2 items-end">
              <input value={onaylayan} onChange={(e) => setOnaylayan(e.target.value)} placeholder="Onaylayan (zorunlu)" className={`${INPUT} max-w-xs`} />
              <button onClick={sar(async () => { await api.butceOnayla(aktif.id, onaylayan); setMesaj('Bütçe onaylandı — Maliyet Defteri\'ne BUTCE (önceki versiyona göre fark) yazıldı.'); })} className={`${BTN_YESIL} flex items-center gap-1`}><CheckCircle2 className="w-3 h-3" /> Onayla</button>
            </div>
          )}
          {aktif.durum !== 'taslak' && <div className="text-[10px] text-[var(--text-secondary)]">Onaylı/arşivlenmiş versiyon düzenlenemez — değişiklik için yeni revizyon açın. Onaylayan: {aktif.onaylayan}</div>}
        </>
      )}
    </div>
  );
}
