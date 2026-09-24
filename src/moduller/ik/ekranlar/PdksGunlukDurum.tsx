import { useEffect, useState } from 'react';
import { Users, LogIn, Wifi, WifiOff } from 'lucide-react';
import HizliForm from '../../_cekirdek/HizliForm';
import * as api from '../api';
import { createOfflineQueue } from '../../_cekirdek/offlineQueue';
import type { Personel, PdksYontemi, PdksMeta } from '../types';
import type { PuantajKaydi } from '../../_cekirdek/types';
import { PDKS_YONTEM_ETIKET } from './format';

interface PdksVeri {
  personel_id: number; proje_id: string; tarih: string; yontem: PdksYontemi; giris_saati?: string;
}

/**
 * Sahadan giriş yapılan bir ekran (manuel şef PDKS girişi) — ÇALIŞMA
 * KURALLARI: "Sahadan veri girilen ekranlar... çevrimdışı kuyruklu olsun."
 * Taşeron/P6'nın MobilGunlukPuantaj.tsx'i bu altyapıyı KULLANMAMIŞTI (bkz.
 * CAKISMA_HARITASI.md P6 notu) — bu ekran o boşluğu İK için KAPATIR.
 */
const kuyruk = createOfflineQueue<PdksVeri>({ kuyrukAdi: 'ik-pdks-manuel', gonder: (veri) => api.pdksKaydet(veri) });

export default function PdksGunlukDurum({ projeId: baslangicProjeId }: { projeId?: string }) {
  const [projeId, setProjeId] = useState(baslangicProjeId || '');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [icindekiler, setIcindekiler] = useState<(PuantajKaydi & { pdks: PdksMeta | null })[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [secilenPersonelId, setSecilenPersonelId] = useState('');
  const [yontem, setYontem] = useState<PdksYontemi>('manuel_sef');
  const [cevrimici, setCevrimici] = useState(navigator.onLine);
  const [bekleyenSayisi, setBekleyenSayisi] = useState(0);
  const [hata, setHata] = useState<string | null>(null);

  async function icindekileriYenile() {
    if (!projeId) return;
    setIcindekiler(await api.pdksIcindekileriGetir(projeId, tarih));
  }
  useEffect(() => { icindekileriYenile(); }, [projeId, tarih]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.personelleriListele().then(setPersoneller); }, []);

  useEffect(() => {
    function guncelle() {
      setCevrimici(navigator.onLine);
      setBekleyenSayisi(kuyruk.bekleyenleriListele().length);
    }
    guncelle();
    async function senkronDene() { await kuyruk.gonderiyiDene(); guncelle(); await icindekileriYenile(); }
    window.addEventListener('online', senkronDene);
    window.addEventListener('offline', guncelle);
    const zamanlayici = setInterval(guncelle, 5000);
    return () => { window.removeEventListener('online', senkronDene); window.removeEventListener('offline', guncelle); clearInterval(zamanlayici); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function girisKaydet() {
    setHata(null);
    if (!secilenPersonelId || !projeId) { setHata('Personel ve proje seçilmelidir.'); return; }
    const veri: PdksVeri = { personel_id: Number(secilenPersonelId), proje_id: projeId, tarih, yontem, giris_saati: new Date().toTimeString().slice(0, 5) };
    kuyruk.ekle(veri); // ÖNCE yerel kuyruğa — ağ bağlantısı BEKLENMEZ
    setBekleyenSayisi(kuyruk.bekleyenleriListele().length);
    if (navigator.onLine) {
      const sonuc = await kuyruk.gonderiyiDene();
      setBekleyenSayisi(kuyruk.bekleyenleriListele().length);
      if (sonuc.basarili > 0) await icindekileriYenile();
    }
    setSecilenPersonelId('');
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)] flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400" /> PDKS Günlük Durum</h2>
        <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase flex items-center gap-1 ${cevrimici ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' : 'bg-red-600/15 text-red-400 border-red-500/30'}`}>
          {cevrimici ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />} {cevrimici ? 'Çevrimiçi' : 'Çevrimdışı'}
        </span>
      </div>

      {hata && <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {bekleyenSayisi > 0 && <div className="p-2.5 rounded-lg bg-amber-600/10 border border-amber-500/30 text-amber-400 text-[10px]">{bekleyenSayisi} kayıt gönderilmeyi bekliyor (bağlantı gelince otomatik gönderilir).</div>}

      <div className="grid grid-cols-2 gap-2">
        <input value={projeId} onChange={(e) => setProjeId(e.target.value)} placeholder="Proje ID" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs" />
        <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs" />
      </div>

      <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex flex-col gap-2">
        <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] flex items-center gap-1.5"><LogIn className="w-3 h-3" /> Manuel Giriş Kaydı</div>
        <select value={secilenPersonelId} onChange={(e) => setSecilenPersonelId(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-2 text-xs">
          <option value="">Personel seçin…</option>
          {personeller.map((p) => <option key={p.id} value={p.id}>{p.sicil_no} — {p.unvan || 'Personel'}</option>)}
        </select>
        <select value={yontem} onChange={(e) => setYontem(e.target.value as PdksYontemi)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-2 text-xs">
          {Object.entries(PDKS_YONTEM_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={girisKaydet} className="w-full py-2.5 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer">Giriş Kaydet</button>
      </div>

      <div>
        <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2">İçeride ({icindekiler.length})</div>
        <div className="flex flex-col gap-1.5">
          {icindekiler.length === 0 && <div className="text-[10px] text-[var(--text-secondary)]">Kimse içeride görünmüyor (ya da proje/tarih girilmedi).</div>}
          {icindekiler.map((k) => (
            <div key={k.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs">
              <div className="flex items-center justify-between">
                <span>Kişi #{k.kisi_id} — giriş {k.giris_saati} • gün {k.gun_degeri}</span>
                {k.pdks && <span className="text-[9px] text-[var(--text-secondary)] uppercase">{PDKS_YONTEM_ETIKET[k.pdks.yontem]}</span>}
              </div>
              {personeller.find((p) => p.kisi_id === k.kisi_id) && (
                <div className="mt-1.5">
                  <HizliForm butonEtiket="Kaydı düzelt" ipucu="Eski kayıt silinmez; düzeltme, onaylayan adıyla yeni kayıt olarak işlenir (denetim izi)."
                    alanlar={[
                      { ad: 'gun', etiket: 'Doğru gün değeri', tip: 'select', zorunlu: true, secenekler: [{ deger: '1', etiket: 'Tam gün (1)' }, { deger: '0.5', etiket: 'Yarım gün (0.5)' }, { deger: '0', etiket: 'Yok (0)' }] },
                      { ad: 'onaylayan', etiket: 'Onaylayan (ad soyad)', zorunlu: true },
                    ]}
                    onKaydet={async (v) => { await api.pdksDuzelt(k.id, { personel_id: personeller.find((p) => p.kisi_id === k.kisi_id)!.id, proje_id: projeId, tarih, yontem: 'manuel_sef', gun_degeri: Number(v.gun) as 0 | 0.5 | 1 }, v.onaylayan); await icindekileriYenile(); }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
