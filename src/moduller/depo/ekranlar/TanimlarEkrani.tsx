import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import HizliForm from '../../_cekirdek/HizliForm';
import * as api from '../api';
import type { Depo, DepoTuru, MalzemeKarti } from '../types';

const DEPO_TURLERI: { deger: DepoTuru; etiket: string }[] = [
  { deger: 'santiye', etiket: 'Şantiye deposu' }, { deger: 'merkez', etiket: 'Merkez depo' },
  { deger: 'acik_saha', etiket: 'Açık saha' }, { deger: 'konteyner', etiket: 'Konteyner' },
];

/** Depo ve malzeme kartı tanımları (stok girişi/mal kabulden önce bunlar bulunmalı). */
export default function TanimlarEkrani({ projeId }: { projeId: string }) {
  const [depolar, setDepolar] = useState<Depo[]>([]);
  const [malzemeler, setMalzemeler] = useState<MalzemeKarti[]>([]);
  const yenile = async () => {
    const [d, m] = await Promise.all([api.depolariListele(projeId), api.malzemeleriListele()]);
    setDepolar(d); setMalzemeler(m);
  };
  useEffect(() => { yenile(); }, [projeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Settings2 className="w-5 h-5 text-indigo-400" /> Depo ve Malzeme Tanımları</h2>

      <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2">Depolar</div>
      <HizliForm
        butonEtiket="Yeni Depo"
        alanlar={[
          { ad: 'ad', etiket: 'Depo adı', zorunlu: true },
          { ad: 'tur', etiket: 'Tür', tip: 'select', varsayilan: 'santiye', secenekler: DEPO_TURLERI.map((t) => ({ deger: t.deger, etiket: t.etiket })) },
          { ad: 'merkez', etiket: 'Tüm projelerin kullanacağı merkez depo', tip: 'checkbox' },
        ]}
        onKaydet={async (v) => { await api.depoOlustur({ ad: v.ad, tur: (v.tur || 'santiye') as DepoTuru, proje_id: v.merkez === '1' ? null : projeId }); await yenile(); }}
      />
      <div className="flex flex-col gap-1 mb-6">
        {depolar.length === 0 && <div className="text-xs text-[var(--text-secondary)] py-2">Henüz depo yok.</div>}
        {depolar.map((d) => (
          <div key={d.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex justify-between">
            <span className="font-bold">{d.ad}</span><span className="flex items-center gap-3"><span className="text-[var(--text-secondary)]">{d.tur}{d.proje_id ? '' : ' • merkez'}</span>
              <button onClick={async () => { if (!window.confirm(`"${d.ad}" deposu pasife alınsın mı? Geçmiş hareketler korunur.`)) return; try { await api.depoPasifEt(d.id); await yenile(); } catch (err) { window.alert(String((err as Error).message || err)); } }} className="text-[10px] font-black uppercase text-red-400 cursor-pointer">Pasife al</button></span>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2">Malzeme Kartları</div>
      <HizliForm
        butonEtiket="Yeni Malzeme"
        ipucu="Stoklu malzemenin maliyeti depo çıkışında yazılır (Maliyet Kuralı); stoksuz/hizmet kalemleri faturada yazılır."
        alanlar={[
          { ad: 'kod', etiket: 'Malzeme kodu', zorunlu: true },
          { ad: 'ad', etiket: 'Ad', zorunlu: true },
          { ad: 'birim', etiket: 'Ana birim (ör. adet, kg, m3)', zorunlu: true },
          { ad: 'kategori', etiket: 'Kategori' },
          { ad: 'min_stok', etiket: 'Min. stok', tip: 'number' },
          { ad: 'stoklu', etiket: 'Stoklu malzeme', tip: 'checkbox', varsayilan: '1' },
          { ad: 'demirbas', etiket: 'Demirbaş (zimmetli)', tip: 'checkbox' },
        ]}
        onKaydet={async (v) => {
          await api.malzemeOlustur({
            kod: v.kod, ad: v.ad, birim: v.birim, kategori: v.kategori || null,
            min_stok: v.min_stok ? Number(v.min_stok) : null,
            stoklu_mu: v.stoklu === '1' ? 1 : 0, demirbas_mi: v.demirbas === '1' ? 1 : 0,
          });
          await yenile();
        }}
      />
      <div className="flex flex-col gap-1">
        {malzemeler.length === 0 && <div className="text-xs text-[var(--text-secondary)] py-2">Henüz malzeme kartı yok.</div>}
        {malzemeler.map((m) => (
          <div key={m.id} className="p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
            <span><span className="font-mono text-[10px] text-[var(--text-secondary)] mr-2">{m.kod}</span><span className="font-bold">{m.ad}</span> <span className="text-[var(--text-secondary)]">({m.birim})</span></span>
            <span className="flex items-center gap-3">
              <span className="text-[10px] text-[var(--text-secondary)]">{m.stoklu_mu ? 'Stoklu' : 'Stoksuz'}{m.demirbas_mi ? ' • Demirbaş' : ''}</span>
              <button onClick={async () => { if (!window.confirm(`"${m.ad}" malzeme kartı pasife alınsın mı?`)) return; try { await api.malzemePasifEt(m.id); await yenile(); } catch (err) { window.alert(String((err as Error).message || err)); } }} className="text-[10px] font-black uppercase text-red-400 cursor-pointer">Pasife al</button>
              <HizliForm
                butonEtiket="Birim dönüşümü"
                alanlar={[{ ad: 'birim', etiket: `Yeni birim (1 birim = ? ${m.birim})`, zorunlu: true }, { ad: 'katsayi', etiket: 'Katsayı', tip: 'number', zorunlu: true }]}
                onKaydet={(v) => api.birimDonusumTanimla(m.id, v.birim, Number(v.katsayi))}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
