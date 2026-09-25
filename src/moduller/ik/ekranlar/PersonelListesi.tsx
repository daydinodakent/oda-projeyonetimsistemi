import { useEffect, useState } from 'react';
import { Users, Plus, AlertTriangle } from 'lucide-react';
import HizliForm from '../../_cekirdek/HizliForm';
import * as api from '../api';
import * as cekirdekApi from '../../_cekirdek/api';
import type { Personel } from '../types';
import type { Kisi } from '../../_cekirdek/types';
import { CALISMA_SEKLI_ETIKET } from './format';

interface Props {
  onPersonelSec: (personelId: number) => void;
}

export default function PersonelListesi({ onPersonelSec }: Props) {
  const [personeller, setPersoneller] = useState<Personel[] | null>(null);
  const [kisiMap, setKisiMap] = useState<Map<number, Kisi>>(new Map());
  const [formAcik, setFormAcik] = useState(false);
  const [adSoyad, setAdSoyad] = useState('');
  const [tckn, setTckn] = useState('');
  const [sicilNo, setSicilNo] = useState('');
  const [departman, setDepartman] = useState('');
  const [unvan, setUnvan] = useState('');
  const [iseGirisTarihi, setIseGirisTarihi] = useState(new Date().toISOString().slice(0, 10));
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    const liste = await api.personelleriListele();
    const kisiler = await Promise.all(liste.map((p) => cekirdekApi.kisiGetir(p.kisi_id).catch(() => null)));
    const harita = new Map<number, Kisi>();
    liste.forEach((p, i) => { const k = kisiler[i]; if (k) harita.set(p.id, k); });
    setKisiMap(harita);
    setPersoneller(liste);
  }
  useEffect(() => { yenile(); }, []);

  async function olustur() {
    setHata(null);
    try {
      const kisi = await cekirdekApi.kisiOlustur({ ad_soyad: adSoyad, tckn, rol: 'personel', santiye_giris_yetkisi: true });
      await api.personelOlustur({ kisi_id: kisi.id, sicil_no: sicilNo, departman, unvan, ise_giris_tarihi: iseGirisTarihi });
      setFormAcik(false);
      setAdSoyad(''); setTckn(''); setSicilNo(''); setDepartman(''); setUnvan('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  if (!personeller) return <div className="p-6 text-xs text-[var(--text-secondary)]">Yükleniyor…</div>;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><Users className="w-5 h-5 text-indigo-400" /> Personel</h2>
        <button onClick={() => setFormAcik((v) => !v)} className="px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer flex items-center gap-1">
          <Plus className="w-3 h-3" /> Yeni Personel
        </button>
      </div>

      <div className="flex flex-wrap gap-x-3">
        <HizliForm butonEtiket="Vardiya tanımla"
          alanlar={[{ ad: 'ad', etiket: 'Vardiya adı', zorunlu: true }, { ad: 'bas', etiket: 'Başlangıç saati', varsayilan: '08:00', zorunlu: true }, { ad: 'bit', etiket: 'Bitiş saati', varsayilan: '17:00', zorunlu: true }]}
          onKaydet={(v) => api.vardiyaTanimla({ ad: v.ad, baslangic_saati: v.bas, bitis_saati: v.bit })} />
        <HizliForm butonEtiket="Yıllık izin hakkı kuralı" ipucu="Kıdem aralığına göre yıllık izin günü (parametrik, geçerlilik tarihli)."
          alanlar={[{ ad: 'min', etiket: 'Kıdem yıl (min)', tip: 'number', zorunlu: true }, { ad: 'max', etiket: 'Kıdem yıl (max)', tip: 'number' }, { ad: 'gun', etiket: 'Yıllık izin (gün)', tip: 'number', zorunlu: true }, { ad: 'tarih', etiket: 'Geçerlilik başlangıcı', tip: 'date', zorunlu: true, varsayilan: '2026-01-01' }]}
          onKaydet={(v) => api.izinHakkiTanimla({ kidem_yil_min: Number(v.min), kidem_yil_max: v.max ? Number(v.max) : undefined, yillik_izin_gun: Number(v.gun), gecerli_baslangic: v.tarih })} />
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      {formAcik && (
        <div className="mb-4 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
          <input value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} placeholder="Ad Soyad" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input value={tckn} onChange={(e) => setTckn(e.target.value)} placeholder="TCKN (11 hane)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input value={sicilNo} onChange={(e) => setSicilNo(e.target.value)} placeholder="Sicil No" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input value={departman} onChange={(e) => setDepartman(e.target.value)} placeholder="Departman" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input value={unvan} onChange={(e) => setUnvan(e.target.value)} placeholder="Unvan" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input type="date" value={iseGirisTarihi} onChange={(e) => setIseGirisTarihi(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <button onClick={olustur} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Kaydet</button>
        </div>
      )}

      {personeller.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Henüz personel kaydı yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {personeller.map((p) => {
            const kisi = kisiMap.get(p.id);
            return (
              <button key={p.id} onClick={() => onPersonelSec(p.id)} className="text-left p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-indigo-500/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] bg-[var(--bg-secondary)] border border-[var(--border)] px-1 py-0.5 rounded uppercase text-[var(--text-secondary)]">{p.sicil_no}</span>
                    {kisi?.ad_soyad ?? `Kişi #${p.kisi_id}`}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">{p.unvan || '—'} • {p.departman || '—'} • {CALISMA_SEKLI_ETIKET[p.calisma_sekli]}</div>
                </div>
                {!p.biyometrik_riza_verildi_mi && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase bg-slate-600/20 text-slate-400 border-slate-500/30 flex items-center gap-1" title="Biyometrik PDKS rızası yok">
                    <AlertTriangle className="w-3 h-3" /> Rıza Yok
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
