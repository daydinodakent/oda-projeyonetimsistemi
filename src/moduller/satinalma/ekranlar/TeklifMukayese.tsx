import { useEffect, useState } from 'react';
import { Scale, Plus, ShoppingCart } from 'lucide-react';
import * as api from '../api';
import * as cekirdekApi from '../../_cekirdek/api';
import type { MukayeseSonucu } from '../types';
import type { CariFirma } from '../../_cekirdek/types';
import { formatKurus } from './format';

interface Props {
  talepId: number;
  projeId: string;
  onSiparisOlusturuldu?: (siparisId: number) => void;
}

export default function TeklifMukayese({ talepId, projeId, onSiparisOlusturuldu }: Props) {
  const [mukayese, setMukayese] = useState<MukayeseSonucu | null>(null);
  const [firmalar, setFirmalar] = useState<CariFirma[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [yeniFirmaId, setYeniFirmaId] = useState('');
  const [fiyatGirimTeklifId, setFiyatGirimTeklifId] = useState<number | null>(null);
  const [fiyatlar, setFiyatlar] = useState<Record<number, number>>({});

  async function yenile() {
    const [m, f] = await Promise.all([api.mukayeseGetir(talepId), cekirdekApi.firmalariListele()]);
    setMukayese(m);
    setFirmalar(f);
  }
  useEffect(() => { yenile(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [talepId]);

  const firmaAdi = (id: number) => firmalar.find((f) => f.id === id)?.unvan || `#${id}`;

  async function teklifIste() {
    setHata(null);
    try {
      await api.teklifTalepGonder({ talep_id: talepId, firma_id: Number(yeniFirmaId) });
      setYeniFirmaId('');
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function fiyatlariKaydet(teklifId: number) {
    if (!mukayese) return;
    setHata(null);
    try {
      const kalemler = mukayese.kalemler.filter((k) => fiyatlar[k.talep_kalem_id] !== undefined).map((k) => ({
        talep_kalem_id: k.talep_kalem_id, miktar: k.miktar, birim_fiyat_kurus: Math.round(fiyatlar[k.talep_kalem_id] * 100),
      }));
      await api.teklifiGir(teklifId, kalemler);
      setFiyatGirimTeklifId(null);
      setFiyatlar({});
      await yenile();
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function siparisOlustur(teklifId: number, firmaId: number) {
    setHata(null);
    try {
      const s = await api.siparisOlustur({ proje_id: projeId, firma_id: firmaId, talep_id: talepId, teklif_id: teklifId });
      onSiparisOlusturuldu?.(s.id);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  if (!mukayese) return <div className="p-6 text-xs text-[var(--text-secondary)]">Yükleniyor…</div>;

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)] overflow-x-auto">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <Scale className="w-5 h-5 text-indigo-400" /> Teklif Mukayese ({mukayese.teklifSayisi} teklif)
      </h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="flex items-center gap-2 mb-4">
        <select value={yeniFirmaId} onChange={(e) => setYeniFirmaId(e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs">
          <option value="">Tedarikçi firma seçin…</option>
          {firmalar.map((f) => <option key={f.id} value={f.id}>{f.unvan}</option>)}
        </select>
        <button disabled={!yeniFirmaId} onClick={teklifIste} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Tedarikçiye Teklif İste
        </button>
      </div>

      {mukayese.teklifSayisi === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Henüz teklif istenmedi.</div>
      ) : (
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-3 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Kalem</th>
              {mukayese.teklifler.map((t) => (
                <th key={t.id} className="text-left py-2 px-3 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                  <div className="flex flex-col gap-1">
                    <span>{firmaAdi(t.firma_id)}</span>
                    <span className="normal-case font-normal">{t.durum}</span>
                    {t.durum === 'istendi' && (
                      fiyatGirimTeklifId === t.id ? (
                        <button onClick={() => fiyatlariKaydet(t.id)} className="px-2 py-1 bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded cursor-pointer normal-case">Fiyatları Kaydet</button>
                      ) : (
                        <button onClick={() => setFiyatGirimTeklifId(t.id)} className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded cursor-pointer normal-case">Fiyat Gir</button>
                      )
                    )}
                    {(t.durum === 'istendi' || t.durum === 'geldi') && (
                      <button onClick={async () => { if (!window.confirm(`${firmaAdi(t.firma_id)} teklifi elensin mi?`)) return; setHata(null); try { await api.teklifEle(t.id); await yenile(); } catch (err) { setHata(String((err as Error).message || err)); } }}
                        className="px-2 py-1 bg-[var(--bg-primary)] border border-red-500/30 text-red-400 rounded cursor-pointer normal-case">Ele</button>
                    )}
                    {t.durum === 'geldi' && (
                      <button onClick={() => siparisOlustur(t.id, t.firma_id)} className="px-2 py-1 bg-indigo-600 text-white rounded cursor-pointer normal-case flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Sipariş Aç</button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mukayese.kalemler.map((k) => (
              <tr key={k.talep_kalem_id} className="border-b border-[var(--border)]/50">
                <td className="py-2 pr-3 font-medium">{k.aciklama} <span className="text-[var(--text-secondary)]">({k.miktar} {k.birim})</span></td>
                {k.teklifler.map((tf) => (
                  <td key={tf.teklif_id} className={`py-2 px-3 ${tf.teklif_id === k.onerilenTeklifId ? 'bg-emerald-600/10 font-black text-emerald-400' : ''}`}>
                    {fiyatGirimTeklifId === tf.teklif_id ? (
                      <input type="number" placeholder="Birim fiyat (TL)" value={fiyatlar[k.talep_kalem_id] ?? ''}
                        onChange={(e) => setFiyatlar((prev) => ({ ...prev, [k.talep_kalem_id]: Number(e.target.value) }))}
                        className="w-24 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-1.5 py-1 text-xs" />
                    ) : tf.girildi ? (
                      formatKurus(tf.kdv_dahil_toplam_kurus ?? 0)
                    ) : (
                      <span className="text-[var(--text-secondary)]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
