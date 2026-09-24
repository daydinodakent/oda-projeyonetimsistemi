import { useEffect, useState } from 'react';
import { Building2, Lock, Plus, X } from 'lucide-react';
import * as api from '../api';
import type { Izgara, IzgaraBolum, BolumDetay } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, DURUM_ETIKET, DURUM_RENK, formatKurus, formatTarih, bugun } from './format';

export default function SatisTablosu({ projeId, onSatisSec }: { projeId: string; onSatisSec?: (bolumId: number) => void }) {
  const [izgara, setIzgara] = useState<Izgara | null>(null);
  const [secili, setSecili] = useState<BolumDetay | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [formAcik, setFormAcik] = useState(false);
  const [yeni, setYeni] = useState({ blok: 'A', kat: '1', kapi_no: '1', tip: '3+1', net_m2: '' });
  const [fiyatTl, setFiyatTl] = useState('');
  const [rez, setRez] = useState({ bitis: '', kaparoTl: '' });
  const [musteriId, setMusteriId] = useState('');

  const yenile = () => api.satisTablosu(projeId).then(setIzgara).catch((e) => setHata(String(e.message)));
  useEffect(() => { yenile(); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const sar = (fn: () => Promise<unknown>) => async () => { setHata(null); setMesaj(null); try { await fn(); await yenile(); if (secili) setSecili(await api.bolumGetir(secili.id)); } catch (e) { setHata(String((e as Error).message)); } };

  async function sec(b: IzgaraBolum) { setHata(null); setMesaj(null); setSecili(await api.bolumGetir(b.id)); }

  const bloklar = izgara ? Object.keys(izgara).sort() : [];
  const durumAnahtari = (b: IzgaraBolum) => (b.satisa_kapali ? 'arsa_sahibi' : b.durum);

  return (
    <div className={KART}>
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-400" /> Satış Tablosu</h2>
        <button onClick={() => setFormAcik((v) => !v)} className={`${BTN_YESIL} flex items-center gap-1`}><Plus className="w-3 h-3" /> Bölüm Ekle</button>
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {mesaj && <div className="mb-4 p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}

      {formAcik && (
        <div className="mb-4 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(['blok', 'kat', 'kapi_no', 'tip', 'net_m2'] as const).map((k) => <input key={k} value={yeni[k]} onChange={(e) => setYeni({ ...yeni, [k]: e.target.value })} placeholder={k} className={INPUT} />)}
          <button onClick={sar(async () => { await api.bolumOlustur({ proje_id: projeId, blok: yeni.blok, kat: yeni.kat, kapi_no: yeni.kapi_no, tip: yeni.tip, net_m2: yeni.net_m2 ? Number(yeni.net_m2) : undefined }); setFormAcik(false); })} className={BTN_YESIL}>Kaydet</button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap mb-4">
        {Object.entries(DURUM_ETIKET).map(([k, v]) => <span key={k} className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${DURUM_RENK[k]}`}>{v}</span>)}
      </div>

      {!izgara ? <div className="text-xs text-[var(--text-secondary)]">Yükleniyor…</div> : bloklar.length === 0 ? <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Henüz bağımsız bölüm yok.</div> : (
        <div className="flex flex-col gap-5">
          {bloklar.map((blok) => {
            const katlar = Object.keys(izgara[blok]).sort((a, b) => Number(b) - Number(a));
            return (
              <div key={blok}>
                <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1.5">Blok {blok}</div>
                <div className="flex flex-col gap-1.5">
                  {katlar.map((kat) => (
                    <div key={kat} className="flex items-center gap-2">
                      <div className="w-12 text-[10px] text-[var(--text-secondary)] shrink-0">Kat {kat}</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {izgara[blok][kat].map((b) => (
                          <button key={b.id} onClick={() => sec(b)} title={`${b.etiket} • ${b.tip} • ${DURUM_ETIKET[durumAnahtari(b)]}`}
                            className={`min-w-[62px] px-2 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer flex flex-col items-center ${DURUM_RENK[durumAnahtari(b)]} ${secili?.id === b.id ? 'ring-2 ring-white/60' : ''}`}>
                            <span className="flex items-center gap-1">{b.satisa_kapali && <Lock className="w-2.5 h-2.5" />}{b.kapi_no}</span>
                            <span className="opacity-70 font-normal">{b.tip}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {secili && (
        <div className="mt-5 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="font-black text-sm">{secili.blok}-{secili.kat}-{secili.kapi_no} <span className="text-[var(--text-secondary)] font-normal text-xs">• {secili.tip}{secili.net_m2 ? ` • ${secili.net_m2} m² net` : ''}</span></div>
            <button onClick={() => setSecili(null)} className="p-1 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-xs mb-3 flex gap-3 flex-wrap items-center">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${DURUM_RENK[secili.sahiplik === 'arsa_sahibi' ? 'arsa_sahibi' : secili.durum]}`}>{secili.sahiplik === 'arsa_sahibi' ? 'Arsa sahibi payı — satışa kapalı' : DURUM_ETIKET[secili.durum]}</span>
            <span>Liste fiyatı: <b>{secili.fiyat ? formatKurus(secili.fiyat.fiyat_kurus, secili.fiyat.para_birimi) : '—'}</b>{secili.fiyat && <span className="text-[var(--text-secondary)]"> ({formatTarih(secili.fiyat.gecerli_baslangic)})</span>}</span>
          </div>
          {secili.fiyat_gecmisi.length > 1 && <div className="text-[10px] text-[var(--text-secondary)] mb-3">Fiyat geçmişi: {secili.fiyat_gecmisi.map((f) => `${formatTarih(f.gecerli_baslangic)}: ${formatKurus(f.fiyat_kurus, f.para_birimi)}`).join(' • ')}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex gap-2 items-end">
              <input type="number" value={fiyatTl} onChange={(e) => setFiyatTl(e.target.value)} placeholder="Yeni liste fiyatı (TL)" className={INPUT} />
              <button onClick={sar(async () => { await api.fiyatTanimla(secili.id, Math.round(Number(fiyatTl) * 100), bugun()); setFiyatTl(''); })} className={BTN_MOR}>Fiyat Ekle</button>
            </div>
            {secili.sahiplik === 'firma' && secili.durum === 'musait' && (
              <div className="flex gap-2 items-end">
                <input type="date" value={rez.bitis} onChange={(e) => setRez({ ...rez, bitis: e.target.value })} className={INPUT} title="Opsiyon bitişi" />
                <input type="number" value={rez.kaparoTl} onChange={(e) => setRez({ ...rez, kaparoTl: e.target.value })} placeholder="Kaparo TL" className={INPUT} />
                <button onClick={sar(async () => { await api.rezervasyonOlustur({ bolum_id: secili.id, baslangic_tarihi: bugun(), bitis_tarihi: rez.bitis, kaparo_kurus: rez.kaparoTl ? Math.round(Number(rez.kaparoTl) * 100) : 0 }); setMesaj('Opsiyon verildi.'); })} className={BTN_MOR}>Opsiyonla</button>
              </div>
            )}
            {secili.sahiplik === 'firma' && ['musait', 'opsiyonlu'].includes(secili.durum) && (
              <div className="flex gap-2 items-end sm:col-span-2">
                <input type="number" value={musteriId} onChange={(e) => setMusteriId(e.target.value)} placeholder="Müşteri Kişi ID (rol: müşteri)" className={INPUT} />
                <button onClick={sar(async () => { const s = await api.satisOlustur({ bolum_id: secili.id, musteriler: [{ kisi_id: Number(musteriId) }], satis_tarihi: bugun() }); setMesaj(`Satış #${s.id} taslak açıldı — ödeme planı oluşturup onaylayın.`); onSatisSec?.(secili.id); })} className={BTN_YESIL}>Satış Aç</button>
              </div>
            )}
            {secili.sahiplik === 'arsa_sahibi' && <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-600/20 border border-slate-500/30 text-[10px] text-slate-300">Bu bölüm kat karşılığı arsa sahibine aittir (sözleşme #{secili.arsa_sozlesme_id}); satılamaz ve opsiyonlanamaz.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
