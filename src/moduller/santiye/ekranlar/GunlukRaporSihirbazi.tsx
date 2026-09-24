import { useEffect, useState } from 'react';
import { FileText, ChevronLeft, ChevronRight, Wifi, WifiOff, MapPin, Plus, Check } from 'lucide-react';
import * as api from '../api';
import { createOfflineQueue } from '../../_cekirdek/offlineQueue';
import type { OtomatikBolum, GunlukRapor, TopluRaporIstek } from '../types';
import { HAVA_ETIKET, INPUT, bugun, BTN_YESIL, BTN_MOR, HATA_KUTU } from './format';

// ÇALIŞMA KURALLARI: sahadan girilen ekran → çevrimdışı kuyruklu. Sunucu tarafı
// topluKaydet ATOMİK + istemci_kayit_id ile idempotent (tekrar gönderim mükerrer açmaz).
const kuyruk = createOfflineQueue<TopluRaporIstek>({ kuyrukAdi: 'santiye-gunluk-rapor', gonder: (v) => api.raporTopluKaydet(v) });

const ADIMLAR = ['Hava', 'Çalışanlar', 'İşler & Makine', 'Malzeme & Sorun', 'Fotoğraf', 'Özet'];

interface Props { projeId: string }

export default function GunlukRaporSihirbazi({ projeId }: Props) {
  const [adim, setAdim] = useState(0);
  const [tarih, setTarih] = useState(bugun());
  const [hava, setHava] = useState('gunesli');
  const [sicaklik, setSicaklik] = useState('');
  const [otomatik, setOtomatik] = useState<OtomatikBolum[]>([]);
  const [duzeltme, setDuzeltme] = useState<Record<string, string>>({});
  const [isler, setIsler] = useState<{ etiket: string; wbs_gorev_id?: string }[]>([]);
  const [yeniIs, setYeniIs] = useState('');
  const [yeniWbs, setYeniWbs] = useState('');
  const [sorunlar, setSorunlar] = useState('');
  const [fotolar, setFotolar] = useState<{ etiket: string; dosya_url: string; lat?: number; lon?: number }[]>([]);
  const [fotoAd, setFotoAd] = useState('');
  const [rapor, setRapor] = useState<GunlukRapor | null>(null);
  const [taslak, setTaslak] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [cevrimici, setCevrimici] = useState(navigator.onLine);
  const [bekleyen, setBekleyen] = useState(kuyruk.bekleyenleriListele().length);

  useEffect(() => {
    api.raporOtomatikOnizleme(projeId, tarih).then(setOtomatik).catch(() => setOtomatik([]));
    setDuzeltme({});
  }, [projeId, tarih]);

  useEffect(() => {
    const yenile = () => { setCevrimici(navigator.onLine); setBekleyen(kuyruk.bekleyenleriListele().length); };
    const online = async () => { await kuyruk.gonderiyiDene(); yenile(); };
    window.addEventListener('online', online); window.addEventListener('offline', yenile);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', yenile); };
  }, []);

  const anahtar = (b: OtomatikBolum) => `${b.tur}|${b.etiket}`;
  const calisanlar = otomatik.filter((b) => b.tur === 'calisan');
  const malzemeler = otomatik.filter((b) => b.tur === 'malzeme');
  const makineler = otomatik.filter((b) => b.tur === 'makine');
  const toplamKisi = calisanlar.reduce((t, b) => t + Number(duzeltme[anahtar(b)] ?? b.otomatik_sayi), 0);

  function konumAl() {
    navigator.geolocation?.getCurrentPosition((p) => {
      setFotolar((f) => [...f, { etiket: fotoAd || 'Fotoğraf', dosya_url: fotoAd || 'foto', lat: p.coords.latitude, lon: p.coords.longitude }]);
      setFotoAd('');
    }, () => { setFotolar((f) => [...f, { etiket: fotoAd || 'Fotoğraf', dosya_url: fotoAd || 'foto' }]); setFotoAd(''); setMesaj('Konum alınamadı — fotoğraf konumsuz eklendi.'); });
  }

  async function kaydet() {
    setHata(null); setMesaj(null);
    const yuk: TopluRaporIstek = {
      proje_id: projeId, tarih, hava_durumu: hava, sicaklik_c: sicaklik ? Number(sicaklik) : undefined, sorunlar: sorunlar || undefined,
      duzeltmeler: otomatik.filter((b) => duzeltme[anahtar(b)] !== undefined && duzeltme[anahtar(b)] !== '' && Number(duzeltme[anahtar(b)]) !== b.otomatik_sayi)
        .map((b) => ({ tur: b.tur, etiket: b.etiket, sayi: Number(duzeltme[anahtar(b)]) })),
      bolumler: [
        ...isler.map((i) => ({ tur: 'is' as const, etiket: i.etiket, wbs_gorev_id: i.wbs_gorev_id })),
        ...fotolar.map((f) => ({ tur: 'fotograf' as const, etiket: f.etiket, dosya_url: f.dosya_url, lat: f.lat, lon: f.lon })),
      ],
    };
    kuyruk.ekle(yuk); // ÖNCE yerel — ağ beklenmez
    setBekleyen(kuyruk.bekleyenleriListele().length);
    if (navigator.onLine) {
      const s = await kuyruk.gonderiyiDene();
      setBekleyen(kuyruk.bekleyenleriListele().length);
      if (s.basarisiz > 0) { setHata(kuyruk.bekleyenleriListele().slice(-1)[0]?.sonHata || 'Gönderilemedi'); return; }
      const r = await api.raporGunGetir(projeId, tarih);
      setRapor(r); setMesaj('Rapor sunucuya kaydedildi.');
    } else setMesaj('Çevrimdışısınız — rapor cihazda bekliyor, bağlantı gelince otomatik gönderilecek.');
  }

  async function onayla() {
    if (!rapor) return;
    setHata(null);
    try { setRapor(await api.raporOnayla(rapor.id)); setMesaj('Rapor onaylandı ve kilitlendi.'); } catch (e) { setHata(String((e as Error).message)); }
  }
  async function defterTaslagi() {
    if (!rapor) return;
    try { setTaslak((await api.raporResmiDefterTaslagi(rapor.id)).taslak); } catch (e) { setHata(String((e as Error).message)); }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-400" /> Günlük Rapor</h2>
        <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase flex items-center gap-1 ${cevrimici ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' : 'bg-red-600/15 text-red-400 border-red-500/30'}`}>
          {cevrimici ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />} {cevrimici ? 'Çevrimiçi' : 'Çevrimdışı'}
        </span>
      </div>
      <div className="flex gap-1">{ADIMLAR.map((a, i) => <div key={a} className={`flex-1 h-1.5 rounded ${i <= adim ? 'bg-indigo-500' : 'bg-[var(--border)]'}`} title={a} />)}</div>
      <div className="text-[10px] font-black uppercase text-[var(--text-secondary)]">Adım {adim + 1}/{ADIMLAR.length} — {ADIMLAR[adim]}</div>

      {hata && <div className={HATA_KUTU}>{hata}</div>}
      {mesaj && <div className="p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{mesaj}</div>}
      {bekleyen > 0 && <div className="p-2.5 rounded-lg bg-amber-600/10 border border-amber-500/30 text-amber-400 text-[10px]">{bekleyen} rapor gönderilmeyi bekliyor.</div>}

      {adim === 0 && (
        <div className="flex flex-col gap-2">
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className={INPUT} />
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(HAVA_ETIKET).map(([k, v]) => (
              <button key={k} onClick={() => setHava(k)} className={`py-3 rounded-lg border text-xs font-bold cursor-pointer ${hava === k ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'border-[var(--border)]'}`}>{v}</button>
            ))}
          </div>
          <input type="number" value={sicaklik} onChange={(e) => setSicaklik(e.target.value)} placeholder="Sıcaklık (°C)" className={INPUT} />
        </div>
      )}

      {adim === 1 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-[var(--text-secondary)]">Puantajdan otomatik geldi — yalnızca yanlış olanı düzeltin. Toplam: <b>{toplamKisi}</b> kişi</div>
          {calisanlar.length === 0 && <div className="text-xs text-[var(--text-secondary)]">Bu gün için puantaj kaydı yok.</div>}
          {calisanlar.map((b) => (
            <div key={anahtar(b)} className="flex items-center justify-between gap-2 p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <div className="text-xs"><div className="font-bold">{b.etiket}</div><div className="text-[10px] text-[var(--text-secondary)]">puantaj: {b.otomatik_sayi}</div></div>
              <input type="number" min={0} value={duzeltme[anahtar(b)] ?? b.otomatik_sayi} onChange={(e) => setDuzeltme({ ...duzeltme, [anahtar(b)]: e.target.value })} className="w-16 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-2 text-sm text-center" />
            </div>
          ))}
        </div>
      )}

      {adim === 2 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-[var(--text-secondary)]">Çalışan makineler (ekipman kayıtlarından otomatik)</div>
          {makineler.length === 0 ? <div className="text-xs text-[var(--text-secondary)]">Bu gün makine çalışma kaydı yok.</div> : makineler.map((m) => <div key={anahtar(m)} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs">{m.etiket}: {m.otomatik_sayi}</div>)}
          <div className="text-[10px] text-[var(--text-secondary)] mt-2">Yapılan işler (WBS ile)</div>
          {isler.map((i, n) => <div key={n} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs flex justify-between"><span>{i.etiket}</span><span className="text-[var(--text-secondary)]">{i.wbs_gorev_id || 'WBS yok'}</span></div>)}
          <input value={yeniIs} onChange={(e) => setYeniIs(e.target.value)} placeholder="Yapılan iş (ör. 3. kat kolon kalıbı)" className={INPUT} />
          <input value={yeniWbs} onChange={(e) => setYeniWbs(e.target.value)} placeholder="WBS görev ID (opsiyonel)" className={INPUT} />
          <button onClick={() => { if (yeniIs) { setIsler([...isler, { etiket: yeniIs, wbs_gorev_id: yeniWbs || undefined }]); setYeniIs(''); setYeniWbs(''); } }} className={`${BTN_MOR} flex items-center justify-center gap-1`}><Plus className="w-3 h-3" /> İş Ekle</button>
        </div>
      )}

      {adim === 3 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] text-[var(--text-secondary)]">Gelen malzeme (Depo mal kabulünden otomatik)</div>
          {malzemeler.length === 0 ? <div className="text-xs text-[var(--text-secondary)]">Bu gün mal kabul kaydı yok.</div> : malzemeler.map((m) => <div key={anahtar(m)} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs flex justify-between"><span>{m.etiket}</span><b>{m.otomatik_sayi}</b></div>)}
          <textarea value={sorunlar} onChange={(e) => setSorunlar(e.target.value)} rows={4} placeholder="Sorunlar / notlar" className={INPUT} />
        </div>
      )}

      {adim === 4 && (
        <div className="flex flex-col gap-2">
          <input value={fotoAd} onChange={(e) => setFotoAd(e.target.value)} placeholder="Fotoğraf açıklaması / dosya adı" className={INPUT} />
          <button onClick={konumAl} className={`${BTN_MOR} flex items-center justify-center gap-1`}><MapPin className="w-3 h-3" /> Konumlu Fotoğraf Ekle</button>
          {fotolar.map((f, i) => <div key={i} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs flex justify-between"><span>{f.etiket}</span><span className="text-[var(--text-secondary)]">{f.lat != null ? `${f.lat.toFixed(4)}, ${f.lon?.toFixed(4)}` : 'konumsuz'}</span></div>)}
        </div>
      )}

      {adim === 5 && (
        <div className="flex flex-col gap-2 text-xs">
          <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg leading-relaxed">
            <div><b>{tarih}</b> — {HAVA_ETIKET[hava]}{sicaklik ? `, ${sicaklik}°C` : ''}</div>
            <div>Çalışan: <b>{toplamKisi}</b> kişi • Yapılan iş: <b>{isler.length}</b> • Malzeme: <b>{malzemeler.length}</b> kalem • Fotoğraf: <b>{fotolar.length}</b></div>
            {sorunlar && <div className="text-[var(--text-secondary)] mt-1">Sorun: {sorunlar}</div>}
          </div>
          {!rapor ? (
            <button onClick={kaydet} className="w-full py-3 text-sm font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer">Raporu Kaydet</button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-[var(--text-secondary)]">Durum: <b>{rapor.durum}</b></div>
              {rapor.durum === 'taslak' && <button onClick={onayla} className={`${BTN_YESIL} flex items-center justify-center gap-1`}><Check className="w-3 h-3" /> Onayla (kilitle)</button>}
              <button onClick={defterTaslagi} className={BTN_MOR}>Resmi Şantiye Defteri Taslağı Üret</button>
              {taslak && <pre className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[10px] whitespace-pre-wrap">{taslak}</pre>}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button disabled={adim === 0} onClick={() => setAdim(adim - 1)} className={`${BTN_MOR} disabled:opacity-30 flex items-center gap-1`}><ChevronLeft className="w-3 h-3" /> Geri</button>
        <button disabled={adim === ADIMLAR.length - 1} onClick={() => setAdim(adim + 1)} className={`${BTN_MOR} disabled:opacity-30 flex items-center gap-1`}>İleri <ChevronRight className="w-3 h-3" /></button>
      </div>
    </div>
  );
}
