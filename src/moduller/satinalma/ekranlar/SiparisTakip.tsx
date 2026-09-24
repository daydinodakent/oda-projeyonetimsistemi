import { useEffect, useState } from 'react';
import { Truck, FileInput, PackageSearch } from 'lucide-react';
import HizliForm, { tlToKurus } from '../../_cekirdek/HizliForm';
import * as api from '../api';
import type { SatinalmaSiparis, SatinalmaSiparisKalem } from '../types';
import { formatKurus, formatTarih, SIPARIS_DURUM_ETIKET, SIPARIS_DURUM_RENK } from './format';

type Sekme = 'taslak' | 'bekleyen' | 'kismi_teslim' | 'tamamlandi';
const SEKME_DURUM: Record<Sekme, string> = { taslak: 'taslak', bekleyen: 'onaylandi', kismi_teslim: 'kismi_teslim', tamamlandi: 'tamamlandi' };
const SEKME_ETIKET: Record<Sekme, string> = { taslak: 'Taslak', bekleyen: 'Bekleyen', kismi_teslim: 'Kısmi Teslim', tamamlandi: 'Tamam' };

interface Props {
  projeId: string;
  onFaturaOlusturuldu?: (faturaId: number) => void;
}

export default function SiparisTakip({ projeId, onFaturaOlusturuldu }: Props) {
  const [siparisler, setSiparisler] = useState<SatinalmaSiparis[]>([]);
  const [sekme, setSekme] = useState<Sekme>('bekleyen');
  const [acikId, setAcikId] = useState<number | null>(null);
  const [kalemler, setKalemler] = useState<SatinalmaSiparisKalem[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [faturaFormAcik, setFaturaFormAcik] = useState(false);
  const [faturaNo, setFaturaNo] = useState('');
  const [faturaTarihi, setFaturaTarihi] = useState(new Date().toISOString().slice(0, 10));
  const [faturaKalemMiktar, setFaturaKalemMiktar] = useState<Record<number, number>>({});

  async function yenile() {
    setSiparisler(await api.siparisleriListele(projeId));
  }
  useEffect(() => { yenile(); }, [projeId]);

  async function ac(s: SatinalmaSiparis) {
    if (acikId === s.id) { setAcikId(null); return; }
    setAcikId(s.id);
    setFaturaFormAcik(false);
    setKalemler(await api.siparisKalemleriGetir(s.id));
  }

  async function onayla(id: number) {
    setHata(null);
    try { await api.siparisDurumDegistir(id, 'onaylandi'); await yenile(); }
    catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function faturaKaydet() {
    if (!acikId) return;
    const siparisKaydi = siparisler.find((s) => s.id === acikId);
    if (!siparisKaydi) return;
    setHata(null);
    try {
      const faturaKalemleri = kalemler.filter((k) => faturaKalemMiktar[k.id] > 0).map((k) => ({ siparis_kalem_id: k.id, miktar: faturaKalemMiktar[k.id], birim_fiyat_kurus: k.birim_fiyat_kurus, kdv_orani: k.kdv_orani }));
      if (!faturaKalemleri.length) throw new Error('En az bir kalem için faturalanan miktar girin.');
      const f = await api.faturaKaydet({ siparis_id: acikId, firma_id: siparisKaydi.firma_id, fatura_no: faturaNo, fatura_tarihi: faturaTarihi, vade_tarihi: faturaTarihi, kalemler: faturaKalemleri });
      setFaturaFormAcik(false);
      setFaturaNo('');
      setFaturaKalemMiktar({});
      onFaturaOlusturuldu?.(f.id);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  const filtreli = siparisler.filter((s) => s.durum === SEKME_DURUM[sekme]);

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <Truck className="w-5 h-5 text-indigo-400" /> Sipariş Takip
      </h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="flex items-center gap-1 mb-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-1 self-start w-fit">
        {(Object.keys(SEKME_ETIKET) as Sekme[]).map((s) => (
          <button key={s} onClick={() => setSekme(s)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer ${sekme === s ? 'bg-indigo-600/20 text-indigo-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {SEKME_ETIKET[s]} ({siparisler.filter((x) => x.durum === SEKME_DURUM[s]).length})
          </button>
        ))}
      </div>

      {filtreli.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bu durumda sipariş yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtreli.map((s) => (
            <div key={s.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden">
              <button onClick={() => ac(s)} className="w-full text-left p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition">
                <div>
                  <div className="text-xs font-bold font-mono">{s.numara}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">Teslim planı: {formatTarih(s.teslim_tarihi)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black">{formatKurus(s.toplam_tutar_kurus, s.para_birimi)}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${SIPARIS_DURUM_RENK[s.durum]}`}>{SIPARIS_DURUM_ETIKET[s.durum]}</span>
                </div>
              </button>
              {acikId === s.id && (
                <div className="p-3 border-t border-[var(--border)] flex flex-col gap-3">
                  {s.durum === 'taslak' && (
                    <button onClick={() => onayla(s.id)} className="self-start px-3 py-1.5 text-[10px] font-black uppercase bg-blue-600/15 border border-blue-500/30 text-blue-400 rounded-lg cursor-pointer">Siparişi Onayla (TAAHHÜT yazılır)</button>
                  )}
                  {s.durum === 'taslak' && (
                    <HizliForm butonEtiket="Kalem ekle" ipucu="Yalnızca taslak siparişe eklenir; toplam otomatik yeniden hesaplanır."
                      alanlar={[{ ad: 'aciklama', etiket: 'Açıklama', zorunlu: true }, { ad: 'birim', etiket: 'Birim', zorunlu: true, varsayilan: 'adet' }, { ad: 'miktar', etiket: 'Miktar', tip: 'number', zorunlu: true }, { ad: 'fiyat', etiket: 'Birim fiyat (TL, KDV hariç)', tip: 'number', zorunlu: true }, { ad: 'kdv', etiket: 'KDV %', tip: 'number', varsayilan: '20' }]}
                      onKaydet={async (v) => { await api.siparisKalemEkle(s.id, { aciklama: v.aciklama, birim: v.birim, miktar: Number(v.miktar), birim_fiyat_kurus: tlToKurus(v.fiyat), kdv_orani: Number(v.kdv || 20) }); setKalemler(await api.siparisKalemleriGetir(s.id)); await yenile(); }} />
                  )}
                  {kalemler.map((k) => (
                    <div key={k.id} className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
                      <div className="text-xs font-bold">{k.aciklama}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                        Sipariş: {k.miktar} {k.birim} • Teslim Alınan: {k.teslim_edilen_miktar} • Faturalanan: {k.faturalanan_miktar}
                      </div>
                    </div>
                  ))}
                  {s.durum !== 'taslak' && (
                    <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1.5">
                      <PackageSearch className="w-3.5 h-3.5" /> Mal kabul artık Depo modülünde yapılır (Mal Kabul sekmesi — sipariş seçerek).
                    </div>
                  )}

                  {s.durum !== 'taslak' && (
                    faturaFormAcik ? (
                      <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={faturaNo} onChange={(e) => setFaturaNo(e.target.value)} placeholder="Fatura No" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                          <input type="date" value={faturaTarihi} onChange={(e) => setFaturaTarihi(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                        </div>
                        {kalemler.map((k) => (
                          <label key={k.id} className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                            {k.aciklama}
                            <input type="number" placeholder="Faturalanan miktar" value={faturaKalemMiktar[k.id] ?? ''} onChange={(e) => setFaturaKalemMiktar((prev) => ({ ...prev, [k.id]: Number(e.target.value) }))}
                              className="w-28 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-xs" />
                          </label>
                        ))}
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setFaturaFormAcik(false)} className="px-3 py-1.5 text-[10px] font-black uppercase text-[var(--text-secondary)] cursor-pointer">Vazgeç</button>
                          <button disabled={!faturaNo} onClick={faturaKaydet} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40">Faturayı Kaydet</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setFaturaFormAcik(true)} className="self-start px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1.5"><FileInput className="w-3.5 h-3.5" /> Fatura Gir</button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
