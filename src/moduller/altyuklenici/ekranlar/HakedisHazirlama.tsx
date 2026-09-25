import { useEffect, useState } from 'react';
import { FileSpreadsheet, Plus, ArrowRight, ShieldAlert, Banknote } from 'lucide-react';
import * as sozlesmeApi from '../../sozlesme/api';
import HizliForm, { tlToKurus } from '../../_cekirdek/HizliForm';
import * as cekirdekApi from '../../_cekirdek/api';
import type { Parametre } from '../../_cekirdek/types';
import * as api from '../api';
import type { SozlesmeKalem } from '../../sozlesme/types';
import type { Hakedis, HakedisDurumu, HakedisKalem, HakedisKesinti, KesintiTuru } from '../types';
import { formatKurus, formatTarih, HAKEDIS_DURUM_ETIKET, HAKEDIS_DURUM_RENK, KESINTI_TUR_ETIKET } from './format';

const AKIS: Record<HakedisDurumu, HakedisDurumu[]> = {
  taslak: ['alt_yuklenici_beyani'], alt_yuklenici_beyani: ['santiye_onayi'], santiye_onayi: ['teknik_ofis'],
  teknik_ofis: ['onayli', 'reddedildi'], onayli: [], reddedildi: [],
};
const KESINTI_TURLERI: KesintiTuru[] = ['avans_mahsubu', 'ceza', 'sgk_bekletme', 'diger'];

interface Props {
  sozlesmeId: number;
}

/** Teminat/stopaj/KDV tevkifatı: oran, Parametre tablosundan (yürürlük tarihli) okunur; parametre yoksa satır oluşmaz. */
function ParametrikKesintiFormu({ hakedisId, onEklendi }: { hakedisId: number; onEklendi: () => Promise<void> }) {
  const [parametreler, setParametreler] = useState<Parametre[]>([]);
  useEffect(() => { cekirdekApi.parametreleriListele().then(setParametreler).catch(() => setParametreler([])); }, []);
  const turler: KesintiTuru[] = ['teminat_kesintisi', 'stopaj', 'kdv_tevkifati', 'sgk_bekletme', 'diger'];
  return (
    <HizliForm
      butonEtiket="Oranla kesinti (parametrik)"
      ipucu="Brüt tutar üzerinden, seçilen parametrenin tarihe göre geçerli oranıyla hesaplanır. O tarihte geçerli parametre yoksa satır eklenmez."
      alanlar={[
        { ad: 'tur', etiket: 'Kesinti türü', tip: 'select', zorunlu: true, secenekler: turler.map((t) => ({ deger: t, etiket: KESINTI_TUR_ETIKET[t] })) },
        { ad: 'kod', etiket: 'Oran parametresi', tip: 'select', zorunlu: true, secenekler: parametreler.map((p) => ({ deger: p.kod, etiket: `${p.ad} (${p.deger})` })) },
        { ad: 'brut', etiket: 'Brüt tutar (TL)', tip: 'number', zorunlu: true },
        { ad: 'tarih', etiket: 'Tarih', tip: 'date', zorunlu: true, varsayilan: new Date().toISOString().slice(0, 10) },
      ]}
      onKaydet={async (v) => { await api.parametrikKesintiEkle(hakedisId, v.tur as KesintiTuru, v.kod, tlToKurus(v.brut), v.tarih); await onEklendi(); }}
    />
  );
}

export default function HakedisHazirlama({ sozlesmeId }: Props) {
  const [sozlesmeKalemleri, setSozlesmeKalemleri] = useState<SozlesmeKalem[]>([]);
  const [hakedisler, setHakedisler] = useState<Hakedis[]>([]);
  const [acikHakedisId, setAcikHakedisId] = useState<number | null>(null);
  const [kalemler, setKalemler] = useState<HakedisKalem[]>([]);
  const [kesintiler, setKesintiler] = useState<HakedisKesinti[]>([]);
  const [yeniFormAcik, setYeniFormAcik] = useState(false);
  const [donemBaslangic, setDonemBaslangic] = useState('');
  const [donemBitis, setDonemBitis] = useState('');
  const [sonHakedisMi, setSonHakedisMi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  const [kesintiTur, setKesintiTur] = useState<KesintiTuru>('avans_mahsubu');
  const [kesintiTutar, setKesintiTutar] = useState(0);
  const [blokajGerekce, setBlokajGerekce] = useState('');
  const [vadeTarihi, setVadeTarihi] = useState('');

  async function yenile() {
    const [sk, hl] = await Promise.all([sozlesmeApi.kalemleriGetir(sozlesmeId), api.hakedisleriGetir(sozlesmeId)]);
    setSozlesmeKalemleri(sk);
    setHakedisler(hl);
  }
  useEffect(() => { yenile(); }, [sozlesmeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ac(id: number) {
    if (acikHakedisId === id) { setAcikHakedisId(null); return; }
    setAcikHakedisId(id);
    const [kl, ks] = await Promise.all([api.hakedisKalemleriGetir(id), api.kesintileriGetir(id)]);
    setKalemler(kl);
    setKesintiler(ks);
  }

  async function yeniHakedisOlustur() {
    setHata(null);
    try {
      const h = await api.hakedisOlustur({ sozlesme_id: sozlesmeId, donem_baslangic: donemBaslangic, donem_bitis: donemBitis, son_hakedis_mi: sonHakedisMi });
      setYeniFormAcik(false);
      setDonemBaslangic(''); setDonemBitis(''); setSonHakedisMi(false);
      await yenile();
      ac(h.id);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function kalemEkle(sozlesmeKalemId: number) {
    if (!acikHakedisId) return;
    setHata(null);
    try {
      await api.hakedisKalemEkle(acikHakedisId, sozlesmeKalemId);
      setKalemler(await api.hakedisKalemleriGetir(acikHakedisId));
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function beyanGir(kalemId: number, miktar: number) {
    setHata(null);
    try {
      await api.beyanGir(kalemId, miktar);
      if (acikHakedisId) setKalemler(await api.hakedisKalemleriGetir(acikHakedisId));
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function onayGir(kalemId: number, miktar: number) {
    setHata(null);
    setUyari(null);
    try {
      const sonuc = await api.onayGir(kalemId, miktar);
      if (sonuc.uyari) setUyari(sonuc.uyari.mesaj);
      if (acikHakedisId) {
        setKalemler(await api.hakedisKalemleriGetir(acikHakedisId));
        await yenile();
      }
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function durumIlerlet(hedef: HakedisDurumu) {
    if (!acikHakedisId) return;
    setHata(null);
    try {
      await api.hakedisDurumDegistir(acikHakedisId, hedef);
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function kesintiEkle() {
    if (!acikHakedisId) return;
    setHata(null);
    try {
      await api.kesintiEkle(acikHakedisId, { tur: kesintiTur, tutar_kurus: Math.round(kesintiTutar * 100) });
      setKesintiler(await api.kesintileriGetir(acikHakedisId));
      await yenile();
      setKesintiTutar(0);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function malzemeKesintisiEkle() {
    if (!acikHakedisId) return;
    setHata(null);
    try {
      await api.malzemeKesintisiEkle(acikHakedisId, sozlesmeId);
      setKesintiler(await api.kesintileriGetir(acikHakedisId));
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function blokajiAs() {
    if (!acikHakedisId) return;
    setHata(null);
    try {
      await api.blokajiAsarakOnayla(acikHakedisId, blokajGerekce);
      setBlokajGerekce('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function odemeTalimatiOlustur() {
    if (!acikHakedisId || !vadeTarihi) return;
    setHata(null);
    try {
      await api.odemeTalimatiOlustur(acikHakedisId, vadeTarihi);
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  const acikHakedis = hakedisler.find((h) => h.id === acikHakedisId) || null;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-indigo-400" /> Hakediş Hazırlama</h2>
        <button onClick={() => setYeniFormAcik((v) => !v)} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Yeni Hakediş</button>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {uyari && <div className="mb-4 p-3 rounded-lg bg-amber-600/10 border border-amber-500/30 text-amber-400 text-xs">{uyari}</div>}

      {yeniFormAcik && (
        <div className="mb-4 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
          <input type="date" value={donemBaslangic} onChange={(e) => setDonemBaslangic(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input type="date" value={donemBitis} onChange={(e) => setDonemBitis(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <label className="flex items-center gap-1.5 text-[10px] text-amber-400"><input type="checkbox" checked={sonHakedisMi} onChange={(e) => setSonHakedisMi(e.target.checked)} /> Son Hakediş</label>
          <button disabled={!donemBaslangic || !donemBitis} onClick={yeniHakedisOlustur} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Oluştur</button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {hakedisler.map((h) => (
          <div key={h.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden">
            <button onClick={() => ac(h.id)} className="w-full text-left p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition">
              <div>
                <div className="text-xs font-bold font-mono">{h.numara} <span className="font-normal text-[var(--text-secondary)]">— {formatTarih(h.donem_baslangic)} – {formatTarih(h.donem_bitis)}</span></div>
                {h.blokaj_mi === 1 && h.blokaj_asildi_mi === 0 && <div className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5"><ShieldAlert className="w-3 h-3" /> Blokajlı: {h.blokaj_nedeni}</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black">{formatKurus(h.net_tutar_kurus, h.para_birimi)}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${HAKEDIS_DURUM_RENK[h.durum]}`}>{HAKEDIS_DURUM_ETIKET[h.durum]}</span>
              </div>
            </button>

            {acikHakedisId === h.id && (
              <div className="p-3 border-t border-[var(--border)] flex flex-col gap-3">
                {h.durum === 'taslak' && (
                  <select onChange={(e) => e.target.value && kalemEkle(Number(e.target.value))} value="" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
                    <option value="">+ Sözleşme kalemi ekle…</option>
                    {sozlesmeKalemleri.filter((sk) => !kalemler.some((k) => k.sozlesme_kalem_id === sk.id)).map((sk) => <option key={sk.id} value={sk.id}>{sk.aciklama}</option>)}
                  </select>
                )}

                <table className="w-full text-[10px]">
                  <thead><tr className="text-[var(--text-secondary)] uppercase text-left">
                    <th className="pb-1">Kalem</th><th className="pb-1">Önceki Küm.</th><th className="pb-1">Beyan</th><th className="pb-1">Onay</th><th className="pb-1">Kümülatif</th><th className="pb-1">Tutar</th>
                  </tr></thead>
                  <tbody>
                    {kalemler.map((k) => {
                      const sk = sozlesmeKalemleri.find((x) => x.id === k.sozlesme_kalem_id);
                      return (
                        <tr key={k.id} className="border-t border-[var(--border)]/40">
                          <td className="py-1.5 pr-2">{sk?.aciklama || `#${k.sozlesme_kalem_id}`}</td>
                          <td className="py-1.5 pr-2">{k.onceki_kumulatif_miktar}</td>
                          <td className="py-1.5 pr-2">
                            {h.durum === 'alt_yuklenici_beyani' ? (
                              <input type="number" defaultValue={k.bu_donem_beyan_miktar ?? ''} onBlur={(e) => e.target.value && beyanGir(k.id, Number(e.target.value))} className="w-20 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1.5 py-1" />
                            ) : (k.bu_donem_beyan_miktar ?? '—')}
                          </td>
                          <td className="py-1.5 pr-2">
                            {h.durum === 'santiye_onayi' ? (
                              <input type="number" defaultValue={k.bu_donem_onay_miktar ?? ''} onBlur={(e) => e.target.value && onayGir(k.id, Number(e.target.value))} className="w-20 bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-1.5 py-1" />
                            ) : (k.bu_donem_onay_miktar ?? '—')}
                          </td>
                          <td className="py-1.5 pr-2 font-bold">{k.kumulatif_miktar}{sk ? ` / ${sk.miktar}` : ''}</td>
                          <td className="py-1.5 pr-2 font-bold">{formatKurus(k.tutar_kurus)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
                  <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1.5">Kesintiler</div>
                  {kesintiler.map((k) => (
                    <div key={k.id} className="flex items-center justify-between text-[10px] py-0.5">
                      <span>{KESINTI_TUR_ETIKET[k.tur]}{k.aciklama ? ` — ${k.aciklama}` : ''}</span>
                      <span className="font-bold text-red-400">-{formatKurus(k.tutar_kurus)}</span>
                    </div>
                  ))}
                  {h.durum !== 'onayli' && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <select value={kesintiTur} onChange={(e) => setKesintiTur(e.target.value as KesintiTuru)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-1.5 py-1 text-[10px]">
                        {KESINTI_TURLERI.map((t) => <option key={t} value={t}>{KESINTI_TUR_ETIKET[t]}</option>)}
                      </select>
                      <input type="number" value={kesintiTutar} onChange={(e) => setKesintiTutar(Number(e.target.value))} placeholder="Tutar (TL)" className="w-24 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-1.5 py-1 text-[10px]" />
                      <button onClick={kesintiEkle} className="px-2 py-1 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded cursor-pointer">Ekle</button>
                      <button onClick={malzemeKesintisiEkle} className="px-2 py-1 text-[10px] font-black uppercase bg-orange-600/15 border border-orange-500/30 text-orange-400 rounded cursor-pointer">Malzeme Kesintisi Getir (P4)</button>
                    </div>
                  )}
                  {h.durum !== 'onayli' && (
                    <div className="mt-2">
                      <ParametrikKesintiFormu hakedisId={acikHakedisId!} onEklendi={async () => { setKesintiler(await api.kesintileriGetir(acikHakedisId!)); await yenile(); }} />
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-black pt-2 mt-1 border-t border-[var(--border)]">
                    <span>Brüt: {formatKurus(h.brut_tutar_kurus)}</span>
                    <span>Net: <span className="text-emerald-400">{formatKurus(h.net_tutar_kurus)}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(AKIS[h.durum] || []).map((hedef) => (
                    <button key={hedef} onClick={() => durumIlerlet(hedef)} className="px-2.5 py-1 text-[10px] font-black uppercase bg-blue-600/15 border border-blue-500/30 text-blue-400 rounded-lg cursor-pointer flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {HAKEDIS_DURUM_ETIKET[hedef]}</button>
                  ))}
                </div>

                {h.blokaj_mi === 1 && h.blokaj_asildi_mi === 0 && h.durum === 'teknik_ofis' && (
                  <div className="p-2.5 bg-red-600/10 border border-red-500/30 rounded-lg flex items-center gap-1.5">
                    <input value={blokajGerekce} onChange={(e) => setBlokajGerekce(e.target.value)} placeholder="Blokajı aşma gerekçesi (zorunlu)" className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-[10px]" />
                    <button disabled={!blokajGerekce} onClick={blokajiAs} className="px-2.5 py-1 text-[10px] font-black uppercase bg-red-600/15 border border-red-500/30 text-red-400 rounded cursor-pointer disabled:opacity-40">Blokajı Aş</button>
                  </div>
                )}

                {h.durum === 'onayli' && !h.odeme_talimati_olusturuldu_mu && (
                  <div className="flex items-center gap-1.5">
                    <input type="date" value={vadeTarihi} onChange={(e) => setVadeTarihi(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                    <button disabled={!vadeTarihi} onClick={odemeTalimatiOlustur} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Ödeme Talimatı Oluştur</button>
                  </div>
                )}
                {h.odeme_talimati_olusturuldu_mu === 1 && <div className="text-[10px] text-emerald-400">Ödeme talimatı oluşturuldu.</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
