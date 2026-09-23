import { useEffect, useState, type ReactElement } from 'react';
import { ArrowLeft, FilePlus2, Plus, ShieldCheck, FileStack, ListChecks, Paperclip, Info } from 'lucide-react';
import * as sozlesmeApi from '../api';
import type {
  Sozlesme, SozlesmeDurumu, SozlesmeKalem, SozlesmeMadde, SozlesmeTeminat, SozlesmeVersiyon, SozlesmeBelge, KalanBedel, MaddeTuru, TeminatTuru,
} from '../types';
import { formatKurus, formatTarih, SOZLESME_TIP_ETIKET, SOZLESME_DURUM_ETIKET, SOZLESME_DURUM_RENK } from './format';

const AKIS: Record<SozlesmeDurumu, SozlesmeDurumu[]> = {
  taslak: ['onayda'], onayda: ['imzali', 'taslak'], imzali: ['yururlukte'],
  yururlukte: ['askida', 'tamamlandi', 'feshedildi'], askida: ['yururlukte', 'feshedildi'], feshedildi: [], tamamlandi: [],
};

type Sekme = 'ozet' | 'kalemler' | 'maddeler' | 'teminatlar' | 'versiyonlar' | 'belgeler' | 'bagli';
const SEKMELER: { id: Sekme; ad: string; icon: ReactElement }[] = [
  { id: 'ozet', ad: 'Özet', icon: <Info className="w-3.5 h-3.5" /> },
  { id: 'kalemler', ad: 'Kalemler', icon: <ListChecks className="w-3.5 h-3.5" /> },
  { id: 'maddeler', ad: 'Maddeler', icon: <FileStack className="w-3.5 h-3.5" /> },
  { id: 'teminatlar', ad: 'Teminatlar', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'versiyonlar', ad: 'Versiyonlar', icon: <FilePlus2 className="w-3.5 h-3.5" /> },
  { id: 'belgeler', ad: 'Belgeler', icon: <Paperclip className="w-3.5 h-3.5" /> },
  { id: 'bagli', ad: 'Bağlı Kayıtlar', icon: <Info className="w-3.5 h-3.5" /> },
];

interface Props {
  sozlesmeId: number;
  onGeri: () => void;
}

export default function SozlesmeDetay({ sozlesmeId, onGeri }: Props) {
  const [sozlesme, setSozlesme] = useState<Sozlesme | null>(null);
  const [kalanBedel, setKalanBedelState] = useState<KalanBedel | null>(null);
  const [kalemler, setKalemler] = useState<SozlesmeKalem[]>([]);
  const [maddeler, setMaddeler] = useState<SozlesmeMadde[]>([]);
  const [teminatlar, setTeminatlar] = useState<SozlesmeTeminat[]>([]);
  const [versiyonlar, setVersiyonlar] = useState<SozlesmeVersiyon[]>([]);
  const [belgeler, setBelgeler] = useState<SozlesmeBelge[]>([]);
  const [sekme, setSekme] = useState<Sekme>('ozet');
  const [hata, setHata] = useState<string | null>(null);
  const [islemSuruyor, setIslemSuruyor] = useState(false);

  async function tumunuYukle() {
    try {
      const [s, kb, kl, md, tm, vr, bl] = await Promise.all([
        sozlesmeApi.sozlesmeGetir(sozlesmeId), sozlesmeApi.sozlesmeKalanBedel(sozlesmeId),
        sozlesmeApi.kalemleriGetir(sozlesmeId), sozlesmeApi.maddeleriGetir(sozlesmeId),
        sozlesmeApi.teminatlariGetir(sozlesmeId), sozlesmeApi.versiyonlariGetir(sozlesmeId), sozlesmeApi.belgeleriGetir(sozlesmeId),
      ]);
      setSozlesme(s); setKalanBedelState(kb); setKalemler(kl); setMaddeler(md); setTeminatlar(tm); setVersiyonlar(vr); setBelgeler(bl);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  useEffect(() => { tumunuYukle(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sozlesmeId]);

  async function durumDegistir(yeni: SozlesmeDurumu) {
    setIslemSuruyor(true);
    setHata(null);
    try {
      await sozlesmeApi.sozlesmeDurumDegistir(sozlesmeId, yeni);
      await tumunuYukle();
    } catch (err) {
      setHata(String((err as Error).message || err));
    } finally {
      setIslemSuruyor(false);
    }
  }

  if (!sozlesme) {
    return <div className="p-6 text-xs text-[var(--text-secondary)]">{hata || 'Yükleniyor…'}</div>;
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)] mb-4">
        <button onClick={onGeri} className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] transition cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">{sozlesme.numara} • {SOZLESME_TIP_ETIKET[sozlesme.tip]}</div>
          <h2 className="text-lg font-black tracking-tight truncate">{sozlesme.konu}</h2>
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-wider shrink-0 ${SOZLESME_DURUM_RENK[sozlesme.durum]}`}>{SOZLESME_DURUM_ETIKET[sozlesme.durum]}</span>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(AKIS[sozlesme.durum] || []).map((hedef) => (
          <button key={hedef} disabled={islemSuruyor} onClick={() => durumDegistir(hedef)}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition rounded-lg cursor-pointer disabled:opacity-40">
            → {SOZLESME_DURUM_ETIKET[hedef]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 mb-5 border-b border-[var(--border)] overflow-x-auto">
        {SEKMELER.map((s) => (
          <button key={s.id} onClick={() => setSekme(s.id)}
            className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition cursor-pointer whitespace-nowrap ${
              sekme === s.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}>
            {s.icon} {s.ad}
          </button>
        ))}
      </div>

      {sekme === 'ozet' && kalanBedel && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat etiket="Orijinal Bedel" deger={formatKurus(kalanBedel.orijinalBedelKurus, sozlesme.para_birimi)} />
          <Stat etiket="Zeyilname Farkı" deger={formatKurus(kalanBedel.zeyilnameToplamFarkKurus, sozlesme.para_birimi)} />
          <Stat etiket="Güncel Toplam Bedel" deger={formatKurus(kalanBedel.guncelToplamBedelKurus, sozlesme.para_birimi)} vurgu />
          <Stat etiket="Başlangıç / Bitiş" deger={`${formatTarih(sozlesme.baslangic_tarihi)}${sozlesme.bitis_tarihi ? ` – ${formatTarih(sozlesme.bitis_tarihi)}` : ''}`} />
          <Stat etiket="KDV Durumu" deger={sozlesme.kdv_durumu} />
          <Stat etiket="Ödeme Şartları" deger={sozlesme.odeme_sartlari || '—'} />
          <Stat etiket="Alt Tip" deger={sozlesme.alt_tip || '—'} />
          <Stat etiket="Taahhüt Deftere Yazıldı mı?" deger={sozlesme.taahhut_yazildi ? 'Evet' : 'Hayır'} />
        </div>
      )}

      {sekme === 'kalemler' && <KalemlerSekmesi sozlesmeId={sozlesmeId} sozlesme={sozlesme} kalemler={kalemler} paraBirimi={sozlesme.para_birimi} onDegisti={tumunuYukle} />}
      {sekme === 'maddeler' && <MaddelerSekmesi sozlesmeId={sozlesmeId} maddeler={maddeler} onDegisti={tumunuYukle} />}
      {sekme === 'teminatlar' && <TeminatlarSekmesi sozlesmeId={sozlesmeId} teminatlar={teminatlar} onDegisti={tumunuYukle} />}
      {sekme === 'versiyonlar' && <VersiyonlarSekmesi sozlesmeId={sozlesmeId} versiyonlar={versiyonlar} paraBirimi={sozlesme.para_birimi} onDegisti={tumunuYukle} />}
      {sekme === 'belgeler' && <BelgelerSekmesi sozlesmeId={sozlesmeId} belgeler={belgeler} onDegisti={tumunuYukle} />}
      {sekme === 'bagli' && (
        <div className="text-xs text-[var(--text-secondary)] p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
          Bağlı Hakediş / Sipariş / Ödeme kayıtları bu sözleşmeye <code className="font-mono">sozlesme_id</code> ile referans verecek — ancak Hakediş ve Satın Alma modülleri henüz kurulmadı
          (bkz. docs/moduller/CAKISMA_HARITASI.md). Bu sekme, o modüller kurulduğunda ilgili listeleri burada gösterecek.
        </div>
      )}
    </div>
  );
}

function Stat({ etiket, deger, vurgu }: { etiket: string; deger: string; vurgu?: boolean }) {
  return (
    <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
      <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-1 uppercase tracking-wider">{etiket}</span>
      <span className={`text-sm font-black block truncate ${vurgu ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>{deger}</span>
    </div>
  );
}

function KalemlerSekmesi({ sozlesmeId, sozlesme, kalemler, paraBirimi, onDegisti }: { sozlesmeId: number; sozlesme: Sozlesme; kalemler: SozlesmeKalem[]; paraBirimi: string; onDegisti: () => void }) {
  const [formAcik, setFormAcik] = useState(false);
  const [aciklama, setAciklama] = useState('');
  const [birim, setBirim] = useState('m2');
  const [miktar, setMiktar] = useState(1);
  const [birimFiyat, setBirimFiyat] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const kilitli = ['yururlukte', 'askida', 'tamamlandi', 'feshedildi'].includes(sozlesme.durum);

  async function ekle() {
    setHata(null);
    try {
      await sozlesmeApi.kalemEkle(sozlesmeId, { aciklama, birim, miktar, birim_fiyat_kurus: Math.round(birimFiyat * 100) });
      setFormAcik(false); setAciklama(''); setMiktar(1); setBirimFiyat(0);
      onDegisti();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {kilitli && <div className="text-[10px] text-amber-400 mb-1">Bu sözleşme "{sozlesme.durum}" durumunda — kalemler yalnızca zeyilname ile değiştirilebilir.</div>}
      {hata && <div className="p-2 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {!kilitli && !formAcik && (
        <button onClick={() => setFormAcik(true)} className="self-start px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Kalem Ekle
        </button>
      )}
      {formAcik && (
        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Açıklama" className="col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input value={birim} onChange={(e) => setBirim(e.target.value)} placeholder="Birim (m2, ton…)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input type="number" value={miktar} onChange={(e) => setMiktar(Number(e.target.value))} placeholder="Miktar" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input type="number" value={birimFiyat} onChange={(e) => setBirimFiyat(Number(e.target.value))} placeholder="Birim Fiyat (TL)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <div className="col-span-2 sm:col-span-4 flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">Vazgeç</button>
            <button disabled={!aciklama} onClick={ekle} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Ekle</button>
          </div>
        </div>
      )}
      {kalemler.length === 0 ? <div className="text-xs text-[var(--text-secondary)] py-4 text-center">Kalem yok.</div> : kalemler.map((k) => (
        <div key={k.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold">{k.aciklama}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">{k.miktar} {k.birim} × {formatKurus(k.birim_fiyat_kurus, paraBirimi)}{k.wbs_gorev_id ? ` • WBS: ${k.wbs_gorev_id}` : ''}</div>
          </div>
          <span className="text-xs font-black">{formatKurus(k.miktar * k.birim_fiyat_kurus, paraBirimi)}</span>
        </div>
      ))}
    </div>
  );
}

const MADDE_TURLERI: MaddeTuru[] = ['ceza', 'teminat', 'avans', 'fiyat_farki', 'sigorta', 'isg', 'gizlilik', 'diger'];

function MaddelerSekmesi({ sozlesmeId, maddeler, onDegisti }: { sozlesmeId: number; maddeler: SozlesmeMadde[]; onDegisti: () => void }) {
  const [formAcik, setFormAcik] = useState(false);
  const [tur, setTur] = useState<MaddeTuru>('ceza');
  const [kontrolTarihi, setKontrolTarihi] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function ekle() {
    setHata(null);
    try {
      await sozlesmeApi.maddeEkle(sozlesmeId, { tur, kontrol_tarihi: kontrolTarihi || undefined, aciklama });
      setFormAcik(false); setAciklama(''); setKontrolTarihi('');
      onDegisti();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {hata && <div className="p-2 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {!formAcik && (
        <button onClick={() => setFormAcik(true)} className="self-start px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Madde Ekle
        </button>
      )}
      {formAcik && (
        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={tur} onChange={(e) => setTur(e.target.value as MaddeTuru)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs">
            {MADDE_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={kontrolTarihi} onChange={(e) => setKontrolTarihi(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Açıklama" className="col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <div className="col-span-2 sm:col-span-4 flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">Vazgeç</button>
            <button onClick={ekle} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Ekle</button>
          </div>
        </div>
      )}
      {maddeler.length === 0 ? <div className="text-xs text-[var(--text-secondary)] py-4 text-center">Madde yok.</div> : maddeler.map((m) => (
        <div key={m.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase">{m.tur}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">{m.aciklama}</div>
          </div>
          {m.kontrol_tarihi && <span className="text-[10px] text-[var(--text-secondary)]">{formatTarih(m.kontrol_tarihi)}</span>}
        </div>
      ))}
    </div>
  );
}

const TEMINAT_TURLERI: TeminatTuru[] = ['nakit', 'teminat_mektubu', 'cek_senet'];

function TeminatlarSekmesi({ sozlesmeId, teminatlar, onDegisti }: { sozlesmeId: number; teminatlar: SozlesmeTeminat[]; onDegisti: () => void }) {
  const [formAcik, setFormAcik] = useState(false);
  const [tur, setTur] = useState<TeminatTuru>('teminat_mektubu');
  const [banka, setBanka] = useState('');
  const [tutar, setTutar] = useState(0);
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function ekle() {
    setHata(null);
    try {
      await sozlesmeApi.teminatEkle(sozlesmeId, { tur, banka: banka || undefined, tutar_kurus: Math.round(tutar * 100), bitis_tarihi: bitisTarihi || undefined });
      setFormAcik(false); setBanka(''); setTutar(0); setBitisTarihi('');
      onDegisti();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function iadeIsaretle(id: number) {
    await sozlesmeApi.teminatIadeIsaretle(id, 'iade_edildi');
    onDegisti();
  }

  return (
    <div className="flex flex-col gap-2">
      {hata && <div className="p-2 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {!formAcik && (
        <button onClick={() => setFormAcik(true)} className="self-start px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Teminat Ekle
        </button>
      )}
      {formAcik && (
        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={tur} onChange={(e) => setTur(e.target.value as TeminatTuru)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs">
            {TEMINAT_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={banka} onChange={(e) => setBanka(e.target.value)} placeholder="Banka" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input type="number" value={tutar} onChange={(e) => setTutar(Number(e.target.value))} placeholder="Tutar (TL)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input type="date" value={bitisTarihi} onChange={(e) => setBitisTarihi(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <div className="col-span-2 sm:col-span-4 flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">Vazgeç</button>
            <button onClick={ekle} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Ekle</button>
          </div>
        </div>
      )}
      {teminatlar.length === 0 ? <div className="text-xs text-[var(--text-secondary)] py-4 text-center">Teminat yok.</div> : teminatlar.map((t) => (
        <div key={t.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase">{t.tur} {t.banka ? `• ${t.banka}` : ''}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">{formatKurus(t.tutar_kurus, t.para_birimi)} • Bitiş: {formatTarih(t.bitis_tarihi)} • {t.iade_durumu}</div>
          </div>
          {t.iade_durumu === 'serbest' && (
            <button onClick={() => iadeIsaretle(t.id)} className="px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400 hover:bg-emerald-600/15 rounded-lg transition cursor-pointer">İade Edildi İşaretle</button>
          )}
        </div>
      ))}
    </div>
  );
}

function VersiyonlarSekmesi({ sozlesmeId, versiyonlar, paraBirimi, onDegisti }: { sozlesmeId: number; versiyonlar: SozlesmeVersiyon[]; paraBirimi: string; onDegisti: () => void }) {
  const [formAcik, setFormAcik] = useState(false);
  const [bedelFarki, setBedelFarki] = useState(0);
  const [sureUzatimi, setSureUzatimi] = useState(0);
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function ekle() {
    setHata(null);
    try {
      await sozlesmeApi.zeyilnameOlustur(sozlesmeId, { bedel_farki_kurus: Math.round(bedelFarki * 100), sure_uzatimi_gun: sureUzatimi || undefined, aciklama });
      setFormAcik(false); setBedelFarki(0); setSureUzatimi(0); setAciklama('');
      onDegisti();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {hata && <div className="p-2 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {!formAcik && (
        <button onClick={() => setFormAcik(true)} className="self-start px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Zeyilname Ekle
        </button>
      )}
      {formAcik && (
        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input type="number" value={bedelFarki} onChange={(e) => setBedelFarki(Number(e.target.value))} placeholder="Bedel Farkı (TL, +/-)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input type="number" value={sureUzatimi} onChange={(e) => setSureUzatimi(Number(e.target.value))} placeholder="Süre Uzatımı (gün)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Açıklama (zorunlu)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
          <div className="col-span-2 sm:col-span-3 flex justify-end gap-2">
            <button onClick={() => setFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">Vazgeç</button>
            <button disabled={!aciklama} onClick={ekle} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Zeyilnameyi Kaydet</button>
          </div>
        </div>
      )}
      {versiyonlar.map((v) => (
        <div key={v.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
          <div>
            <div className="text-xs font-bold">v{v.versiyon_no} — {v.tur === 'orijinal' ? 'Orijinal' : 'Zeyilname'}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">{v.aciklama} • {formatTarih(v.olusturma_zamani)}</div>
          </div>
          <span className={`text-xs font-black ${v.bedel_farki_kurus < 0 ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
            {v.bedel_farki_kurus >= 0 ? '+' : ''}{formatKurus(v.bedel_farki_kurus, paraBirimi)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BelgelerSekmesi({ sozlesmeId, belgeler, onDegisti }: { sozlesmeId: number; belgeler: SozlesmeBelge[]; onDegisti: () => void }) {
  const [dokumanId, setDokumanId] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function bagla() {
    setHata(null);
    try {
      await sozlesmeApi.belgeBagla(sozlesmeId, dokumanId, 'ek');
      setDokumanId('');
      onDegisti();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] text-[var(--text-secondary)]">Mevcut Doküman Arşivi'ndeki bir dokümanın ID'sini girerek bu sözleşmeye bağlayın (kopyalama yok, yalnızca referans).</div>
      {hata && <div className="p-2 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      <div className="flex gap-2">
        <input value={dokumanId} onChange={(e) => setDokumanId(e.target.value)} placeholder="Doküman ID" className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
        <button disabled={!dokumanId} onClick={bagla} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Bağla</button>
      </div>
      {belgeler.length === 0 ? <div className="text-xs text-[var(--text-secondary)] py-4 text-center">Bağlı belge yok.</div> : belgeler.map((b) => (
        <div key={b.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
          <span className="text-xs font-mono">{b.dokuman_id}</span>
          <span className="text-[10px] text-[var(--text-secondary)] uppercase">{b.rol}</span>
        </div>
      ))}
    </div>
  );
}
