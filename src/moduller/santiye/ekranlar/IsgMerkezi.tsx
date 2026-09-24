import { useEffect, useState } from 'react';
import { ShieldAlert, DoorOpen, GraduationCap, FileCheck2, Siren, Wrench, ClipboardCheck } from 'lucide-react';
import * as api from '../api';
import type { GirisKontrol, IsIzni, IsIzniTuru, RamakKala, IsgOlay, DuzelticiFaaliyet, DenetimSablon, IsgEgitim } from '../types';
import { KART, INPUT, BTN_YESIL, BTN_MOR, HATA_KUTU, IS_IZNI_ETIKET, OLAY_ETIKET, formatTarih, bugun } from './format';

type Sekme = 'giris' | 'egitim' | 'izin' | 'ramak' | 'olay' | 'duzeltici' | 'denetim';

export default function IsgMerkezi({ projeId }: { projeId: string }) {
  const [sekme, setSekme] = useState<Sekme>('giris');
  const [hata, setHata] = useState<string | null>(null);
  const sar = (fn: () => Promise<unknown>) => async () => { setHata(null); try { await fn(); } catch (e) { setHata(String((e as Error).message)); } };

  // giriş kontrolü
  const [kisiId, setKisiId] = useState('');
  const [kontrol, setKontrol] = useState<GirisKontrol | null>(null);
  const [gerekce, setGerekce] = useState('');
  // eğitim
  const [egKisi, setEgKisi] = useState(''); const [egBas, setEgBas] = useState(bugun()); const [egBit, setEgBit] = useState('');
  const [dolanlar, setDolanlar] = useState<IsgEgitim[]>([]); const [kisiEgitimleri, setKisiEgitimleri] = useState<IsgEgitim[]>([]);
  // iş izni
  const [izinler, setIzinler] = useState<IsIzni[]>([]); const [izTur, setIzTur] = useState<IsIzniTuru>('yuksekte_calisma'); const [izKonum, setIzKonum] = useState('');
  // ramak kala
  const [ramaklar, setRamaklar] = useState<RamakKala[]>([]); const [rkMetin, setRkMetin] = useState(''); const [rkAnonim, setRkAnonim] = useState(false);
  // olay
  const [olaylar, setOlaylar] = useState<IsgOlay[]>([]); const [olTur, setOlTur] = useState('is_kazasi'); const [olMetin, setOlMetin] = useState('');
  // düzeltici
  const [dzler, setDzler] = useState<DuzelticiFaaliyet[]>([]); const [dzMetin, setDzMetin] = useState(''); const [dzKapanis, setDzKapanis] = useState<Record<number, string>>({});
  // denetim
  const [sablonlar, setSablonlar] = useState<DenetimSablon[]>([]); const [aktifSablon, setAktifSablon] = useState<DenetimSablon | null>(null); const [yanitlar, setYanitlar] = useState<Record<string, boolean>>({});
  const [sablonAd, setSablonAd] = useState(''); const [sablonMaddeler, setSablonMaddeler] = useState('');

  async function yukle() {
    if (sekme === 'egitim') setDolanlar(await api.suresiDolanEgitimler(30));
    if (sekme === 'izin') setIzinler(await api.isIzinleriGetir(projeId));
    if (sekme === 'ramak') setRamaklar(await api.ramakKalalariGetir(projeId));
    if (sekme === 'olay') setOlaylar(await api.olaylariGetir(projeId));
    if (sekme === 'duzeltici') setDzler(await api.duzelticileriGetir(projeId));
    if (sekme === 'denetim') setSablonlar(await api.denetimSablonlariGetir());
  }
  useEffect(() => { yukle().catch((e) => setHata(String(e.message))); }, [sekme, projeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const T = ({ k, ikon, ad }: { k: Sekme; ikon: React.ReactNode; ad: string }) => (
    <button onClick={() => setSekme(k)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${sekme === k ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)]'}`}>{ikon} {ad}</button>
  );

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><ShieldAlert className="w-5 h-5 text-red-400" /> İSG Merkezi (6331)</h2>
      <div className="flex gap-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-1 mb-4 overflow-x-auto">
        <T k="giris" ikon={<DoorOpen className="w-3.5 h-3.5" />} ad="Giriş Kontrolü" />
        <T k="egitim" ikon={<GraduationCap className="w-3.5 h-3.5" />} ad="Eğitim" />
        <T k="izin" ikon={<FileCheck2 className="w-3.5 h-3.5" />} ad="İş İzni" />
        <T k="ramak" ikon={<Siren className="w-3.5 h-3.5" />} ad="Ramak Kala" />
        <T k="olay" ikon={<ShieldAlert className="w-3.5 h-3.5" />} ad="Olay/Kaza" />
        <T k="duzeltici" ikon={<Wrench className="w-3.5 h-3.5" />} ad="Düzeltici Faaliyet" />
        <T k="denetim" ikon={<ClipboardCheck className="w-3.5 h-3.5" />} ad="Denetim" />
      </div>
      {hata && <div className={HATA_KUTU}>{hata}</div>}

      {sekme === 'giris' && (
        <div className="flex flex-col gap-3 max-w-md">
          <div className="flex gap-2"><input type="number" value={kisiId} onChange={(e) => setKisiId(e.target.value)} placeholder="Kişi ID (turnike/manuel)" className={INPUT} />
            <button onClick={sar(async () => setKontrol(await api.girisKontrolu(Number(kisiId), bugun())))} className={BTN_MOR}>Kontrol Et</button></div>
          {kontrol && (
            <div className={`p-3 rounded-lg border text-xs ${kontrol.uygun ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' : 'bg-red-600/10 border-red-500/30 text-red-400'}`}>
              <div className="font-bold">{kontrol.ad_soyad} — {kontrol.uygun ? 'GİRİŞE UYGUN' : 'UYARI: giriş uygun değil'}</div>
              {kontrol.uyarilar.map((u, i) => <div key={i}>• {u}</div>)}
              {kontrol.giris_izni != null && <div className="mt-1 font-bold">{kontrol.giris_izni ? 'Giriş izni verildi' : 'Giriş izni VERİLMEDİ'}</div>}
              {!kontrol.uygun && (
                <div className="mt-2 flex gap-2">
                  <input value={gerekce} onChange={(e) => setGerekce(e.target.value)} placeholder="Yetkili gerekçesi" className={INPUT} />
                  <button onClick={sar(async () => setKontrol(await api.girisKaydet(projeId, Number(kisiId), bugun(), !!gerekce, gerekce)))} className={BTN_YESIL}>Yetkili Geçiş</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {sekme === 'egitim' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <input type="number" value={egKisi} onChange={(e) => setEgKisi(e.target.value)} placeholder="Kişi ID" className={INPUT} />
            <input type="date" value={egBas} onChange={(e) => setEgBas(e.target.value)} className={INPUT} />
            <input type="date" value={egBit} onChange={(e) => setEgBit(e.target.value)} className={INPUT} title="Geçerlilik bitişi" />
            <button onClick={sar(async () => { await api.egitimEkle({ kisi_id: Number(egKisi), tarih: egBas, gecerlilik_bitis: egBit }); setKisiEgitimleri(await api.egitimleriGetir(Number(egKisi))); setDolanlar(await api.suresiDolanEgitimler(30)); })} className={BTN_YESIL}>İşe Başlama Eğitimi Ekle</button>
          </div>
          {kisiEgitimleri.map((e) => <div key={e.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs">Kişi #{e.kisi_id} — {e.egitim_tipi}: {formatTarih(e.tarih)} → {formatTarih(e.gecerlilik_bitis)}</div>)}
          <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">Süresi dolmuş / 30 gün içinde dolacak</div>
          {dolanlar.length === 0 && <div className="text-xs text-emerald-400">Yok.</div>}
          {dolanlar.map((e) => <div key={e.id} className="p-2 bg-red-600/10 border border-red-500/30 rounded text-xs text-red-400">Kişi #{e.kisi_id} — bitiş {formatTarih(e.gecerlilik_bitis)}</div>)}
        </div>
      )}

      {sekme === 'izin' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select value={izTur} onChange={(e) => setIzTur(e.target.value as IsIzniTuru)} className={INPUT}>{Object.entries(IS_IZNI_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input value={izKonum} onChange={(e) => setIzKonum(e.target.value)} placeholder="Konum" className={INPUT} />
            <button onClick={sar(async () => { await api.isIzniTalepEt({ proje_id: projeId, tur: izTur, konum: izKonum, baslangic: `${bugun()}T08:00`, bitis: `${bugun()}T17:00` }); await yukle(); })} className={BTN_YESIL}>İzin Talep Et</button>
          </div>
          {izinler.map((i) => (
            <div key={i.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex items-center justify-between">
              <span>{IS_IZNI_ETIKET[i.tur]} • {i.konum || '—'} • <b>{i.durum}</b></span>
              <span className="flex gap-1">
                {i.durum === 'talep' && <button onClick={sar(async () => { await api.isIzniDurum(i.id, 'onayli', 'İSG Uzmanı'); await yukle(); })} className={BTN_YESIL}>Onayla</button>}
                {i.durum === 'onayli' && <button onClick={sar(async () => { await api.isIzniDurum(i.id, 'kapali'); await yukle(); })} className={BTN_MOR}>Kapat</button>}
              </span>
            </div>
          ))}
        </div>
      )}

      {sekme === 'ramak' && (
        <div className="flex flex-col gap-3">
          <textarea value={rkMetin} onChange={(e) => setRkMetin(e.target.value)} rows={3} placeholder="Ramak kala olayı" className={INPUT} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={rkAnonim} onChange={(e) => setRkAnonim(e.target.checked)} /> Anonim bildir (kimlik kaydedilmez)</label>
          <button onClick={sar(async () => { await api.ramakKalaBildir({ proje_id: projeId, tarih: bugun(), aciklama: rkMetin, anonim: rkAnonim }); setRkMetin(''); await yukle(); })} className={BTN_YESIL}>Bildir</button>
          {ramaklar.map((r) => <div key={r.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs">{formatTarih(r.tarih)} — {r.aciklama} {r.anonim_mi ? <i className="text-[var(--text-secondary)]">(anonim)</i> : null}</div>)}
        </div>
      )}

      {sekme === 'olay' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={olTur} onChange={(e) => setOlTur(e.target.value)} className={INPUT}>{Object.entries(OLAY_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input value={olMetin} onChange={(e) => setOlMetin(e.target.value)} placeholder="Açıklama" className={INPUT} />
          </div>
          <button onClick={sar(async () => { await api.olayKaydet({ proje_id: projeId, tur: olTur, tarih: bugun(), aciklama: olMetin }); setOlMetin(''); await yukle(); })} className={BTN_YESIL}>Olay Kaydet</button>
          {olaylar.map((o) => {
            const gecikti = o.yasal_bildirim_son_tarih && !o.bildirim_yapildi_mi && o.yasal_bildirim_son_tarih < bugun();
            return (
              <div key={o.id} className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${gecikti ? 'bg-red-600/10 border-red-500/30' : 'bg-[var(--bg-primary)] border-[var(--border)]'}`}>
                <span>{OLAY_ETIKET[o.tur]} — {o.aciklama}{o.yasal_bildirim_son_tarih && <span className={gecikti ? 'text-red-400 font-bold' : 'text-[var(--text-secondary)]'}> • yasal bildirim son: {formatTarih(o.yasal_bildirim_son_tarih)}{o.bildirim_yapildi_mi ? ' (yapıldı)' : ''}</span>}</span>
                {o.yasal_bildirim_son_tarih && !o.bildirim_yapildi_mi && <button onClick={sar(async () => { await api.olayBildirimYapildi(o.id, bugun()); await yukle(); })} className={BTN_MOR}>Bildirim Yapıldı</button>}
              </div>
            );
          })}
        </div>
      )}

      {sekme === 'duzeltici' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2"><input value={dzMetin} onChange={(e) => setDzMetin(e.target.value)} placeholder="Düzeltici faaliyet" className={INPUT} />
            <button onClick={sar(async () => { await api.duzelticiEkle({ proje_id: projeId, aciklama: dzMetin }); setDzMetin(''); await yukle(); })} className={BTN_YESIL}>Ekle</button></div>
          {dzler.map((d) => (
            <div key={d.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex items-center justify-between gap-2">
              <span>{d.aciklama} • <b>{d.durum}</b></span>
              {d.durum === 'acik' && <span className="flex gap-1"><input value={dzKapanis[d.id] ?? ''} onChange={(e) => setDzKapanis({ ...dzKapanis, [d.id]: e.target.value })} placeholder="Kapanış notu" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-[10px]" />
                <button onClick={sar(async () => { await api.duzelticiKapat(d.id, dzKapanis[d.id] ?? ''); await yukle(); })} className={BTN_YESIL}>Kapat</button></span>}
            </div>
          ))}
        </div>
      )}

      {sekme === 'denetim' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={sablonAd} onChange={(e) => setSablonAd(e.target.value)} placeholder="Şablon adı" className={INPUT} />
            <input value={sablonMaddeler} onChange={(e) => setSablonMaddeler(e.target.value)} placeholder="Maddeler (virgülle)" className={INPUT} />
            <button onClick={sar(async () => { await api.denetimSablonEkle({ ad: sablonAd, periyot: 'gunluk', maddeler: sablonMaddeler.split(',').map((x) => x.trim()).filter(Boolean) }); setSablonAd(''); setSablonMaddeler(''); await yukle(); })} className={BTN_MOR}>Şablon Ekle</button>
          </div>
          <div className="flex gap-2 flex-wrap">{sablonlar.map((s) => <button key={s.id} onClick={() => { setAktifSablon(s); setYanitlar({}); }} className={aktifSablon?.id === s.id ? BTN_YESIL : BTN_MOR}>{s.ad}</button>)}</div>
          {aktifSablon && (
            <div className="flex flex-col gap-1.5">
              {aktifSablon.maddeler.map((m) => (
                <label key={m} className="flex items-center gap-2 p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs"><input type="checkbox" checked={yanitlar[m] ?? true} onChange={(e) => setYanitlar({ ...yanitlar, [m]: e.target.checked })} /> {m} <span className="text-[var(--text-secondary)]">(işaretli = uygun)</span></label>
              ))}
              <button onClick={sar(async () => { const r = await api.denetimYanitla({ sablon_id: aktifSablon.id, proje_id: projeId, tarih: bugun(), yanitlar: aktifSablon.maddeler.map((m) => ({ madde: m, uygun: yanitlar[m] ?? true })) }); setHata(r.uygunsuz_sayisi ? `${r.uygunsuz_sayisi} uygunsuzluk için düzeltici faaliyet açıldı.` : null); })} className={BTN_YESIL}>Denetimi Kaydet</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
