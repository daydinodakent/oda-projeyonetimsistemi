import { useState } from 'react';
import { ClipboardPlus, Plus, Trash2 } from 'lucide-react';
import * as api from '../api';

interface TaslakKalem {
  aciklama: string;
  miktar: number;
  birim: string;
}

interface Props {
  projeId: string;
  onOlusturuldu?: (talepId: number) => void;
}

/**
 * Mobil hızlı talep formu (görev metni: "Talep formu basit, mobilde hızlı
 * olmalı; satınalmacı sonradan netleştirir"). Tek sütun, büyük dokunma
 * alanları — malzeme kartı SEÇİMİ burada YOK, yalnızca serbest metin
 * açıklama (ör. "2 kamyon kum") — satınalmacı teklif aşamasında netleştirir.
 */
export default function TalepOlustur({ projeId, onOlusturuldu }: Props) {
  const [ihtiyacTarihi, setIhtiyacTarihi] = useState(new Date().toISOString().slice(0, 10));
  const [teslimYeri, setTeslimYeri] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [kalemler, setKalemler] = useState<TaslakKalem[]>([{ aciklama: '', miktar: 1, birim: '' }]);
  const [acil, setAcil] = useState(false);
  const [istisnaGerekcesi, setIstisnaGerekcesi] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);

  function kalemGuncelle(i: number, patch: Partial<TaslakKalem>) {
    setKalemler((prev) => prev.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  }
  function kalemSil(i: number) {
    setKalemler((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function gonder() {
    setHata(null);
    setGonderiliyor(true);
    try {
      const gecerliKalemler = kalemler.filter((k) => k.aciklama.trim());
      if (!gecerliKalemler.length) throw new Error('En az bir kalem girin (ör. "2 kamyon kum").');
      const talep = await api.talepOlustur({
        proje_id: projeId, ihtiyac_tarihi: ihtiyacTarihi, teslim_yeri: teslimYeri || undefined,
        aciklama: aciklama || undefined, min_teklif_istisna: acil, istisna_gerekcesi: acil ? istisnaGerekcesi : undefined,
      });
      for (const k of gecerliKalemler) await api.talepKalemEkle(talep.id, k);
      setBasarili(`Talep ${talep.numara} oluşturuldu.`);
      setKalemler([{ aciklama: '', miktar: 1, birim: '' }]);
      setAciklama('');
      setTeslimYeri('');
      onOlusturuldu?.(talep.id);
    } catch (err) {
      setHata(String((err as Error).message || err));
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)] flex flex-col gap-4">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
        <ClipboardPlus className="w-5 h-5 text-indigo-400" /> Yeni Satın Alma Talebi
      </h2>

      {hata && <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {basarili && <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{basarili}</div>}

      <div className="flex flex-col gap-3">
        {kalemler.map((k, i) => (
          <div key={i} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Kalem {i + 1}</span>
              {kalemler.length > 1 && (
                <button onClick={() => kalemSil(i)} className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-600/15 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
            <input value={k.aciklama} onChange={(e) => kalemGuncelle(i, { aciklama: e.target.value })} placeholder='Ne lazım? (ör. "2 kamyon kum")'
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={k.miktar} onChange={(e) => kalemGuncelle(i, { miktar: Number(e.target.value) })} placeholder="Miktar"
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm" />
              <input value={k.birim} onChange={(e) => kalemGuncelle(i, { birim: e.target.value })} placeholder="Birim (kamyon, ton…)"
                className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>
        ))}
        <button onClick={() => setKalemler((prev) => [...prev, { aciklama: '', miktar: 1, birim: '' }])}
          className="self-start px-3 py-2 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Kalem Ekle
        </button>
      </div>

      <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
        İhtiyaç Tarihi
        <input type="date" value={ihtiyacTarihi} onChange={(e) => setIhtiyacTarihi(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]" />
      </label>
      <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
        Teslim Yeri
        <input value={teslimYeri} onChange={(e) => setTeslimYeri(e.target.value)} placeholder="Ör. Blok A, -2 kat" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]" />
      </label>
      <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
        Açıklama / Not
        <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} rows={2} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]" />
      </label>

      <label className="flex items-center gap-2 text-xs font-bold text-amber-400 cursor-pointer">
        <input type="checkbox" checked={acil} onChange={(e) => setAcil(e.target.checked)} className="w-4 h-4" />
        Acil — min. 3 teklif kuralına istisna gerekiyor
      </label>
      {acil && (
        <textarea value={istisnaGerekcesi} onChange={(e) => setIstisnaGerekcesi(e.target.value)} rows={2} placeholder="İstisna gerekçesi (zorunlu, üst onaya sunulacak)"
          className="bg-[var(--bg-primary)] border border-amber-500/30 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)]" />
      )}

      <button disabled={gonderiliyor} onClick={gonder}
        className="w-full py-3 text-sm font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition rounded-xl cursor-pointer disabled:opacity-50">
        {gonderiliyor ? 'Gönderiliyor…' : 'Talebi Gönder'}
      </button>
    </div>
  );
}
