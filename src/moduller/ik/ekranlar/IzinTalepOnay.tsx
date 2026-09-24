import { useEffect, useState } from 'react';
import { Palmtree, Check, X } from 'lucide-react';
import * as api from '../api';
import type { Personel, IzinTalebi, IzinTuru } from '../types';
import { formatTarih, kidemYiliHesapla, IZIN_TUR_ETIKET, IZIN_DURUM_ETIKET, IZIN_DURUM_RENK } from './format';

/** Görev metni: "İzin talep/onay (mobil)" — MobilGunlukPuantaj.tsx ile AYNI dar-ekran/tek-elle kullanım deseni. */
export default function IzinTalepOnay() {
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [secilenPersonelId, setSecilenPersonelId] = useState('');
  const [tur, setTur] = useState<IzinTuru>('yillik');
  const [baslangic, setBaslangic] = useState(new Date().toISOString().slice(0, 10));
  const [bitis, setBitis] = useState(new Date().toISOString().slice(0, 10));
  const [aciklama, setAciklama] = useState('');
  const [talepler, setTalepler] = useState<IzinTalebi[]>([]);
  const [bakiye, setBakiye] = useState<{ hak_edilen_gun: number; devreden_gun: number; kullanilan_gun: number } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function yenile(personelId: number) {
    setTalepler(await api.izinTalepleriGetir(personelId));
    setBakiye(await api.izinBakiyesiGetir(personelId, new Date(baslangic).getFullYear()));
  }
  useEffect(() => { api.personelleriListele().then(setPersoneller); }, []);
  useEffect(() => { if (secilenPersonelId) yenile(Number(secilenPersonelId)); }, [secilenPersonelId]); // eslint-disable-line react-hooks/exhaustive-deps

  function gunSayisiHesapla() {
    const gun = Math.round((new Date(bitis).getTime() - new Date(baslangic).getTime()) / 86400000) + 1;
    return Math.max(1, gun);
  }

  async function bakiyeAc() {
    if (!secilenPersonelId) return;
    setHata(null);
    try {
      const p = personeller.find((x) => x.id === Number(secilenPersonelId))!;
      const yil = new Date(baslangic).getFullYear();
      await api.izinBakiyesiniAcYadaGetir(Number(secilenPersonelId), yil, kidemYiliHesapla(p.ise_giris_tarihi, `${yil}-01-01`), undefined);
      await yenile(Number(secilenPersonelId));
    } catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function talepEt() {
    if (!secilenPersonelId) { setHata('Personel seçilmelidir.'); return; }
    setHata(null);
    try {
      await api.izinTalepEt({ personel_id: Number(secilenPersonelId), tur, baslangic_tarihi: baslangic, bitis_tarihi: bitis, gun_sayisi: gunSayisiHesapla(), aciklama });
      setAciklama('');
      await yenile(Number(secilenPersonelId));
    } catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function onayla(id: number) {
    setHata(null);
    try { await api.izinOnayla(id, 'yetkili'); await yenile(Number(secilenPersonelId)); }
    catch (err) { setHata(String((err as Error).message || err)); }
  }
  async function reddet(id: number) {
    await api.izinReddet(id);
    await yenile(Number(secilenPersonelId));
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)] flex flex-col gap-4">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-3 border-b border-[var(--border)]"><Palmtree className="w-5 h-5 text-indigo-400" /> İzin Talep / Onay</h2>

      {hata && <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <select value={secilenPersonelId} onChange={(e) => setSecilenPersonelId(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm">
        <option value="">Personel seçin…</option>
        {personeller.map((p) => <option key={p.id} value={p.id}>{p.sicil_no} — {p.unvan || 'Personel'}</option>)}
      </select>

      {secilenPersonelId && (
        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex items-center justify-between">
          {bakiye ? (
            <span>Bakiye ({new Date(baslangic).getFullYear()}): <b className="text-emerald-400">{(bakiye.hak_edilen_gun + bakiye.devreden_gun - bakiye.kullanilan_gun).toFixed(1)}</b> gün kaldı</span>
          ) : <span className="text-[var(--text-secondary)]">Bu yıl için bakiye henüz açılmamış.</span>}
          <button onClick={bakiyeAc} className="px-2 py-1 text-[9px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded cursor-pointer">Bakiyeyi Aç/Yenile</button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <select value={tur} onChange={(e) => setTur(e.target.value as IzinTuru)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm">
          {Object.entries(IZIN_TUR_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
          <input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
        </div>
        <div className="text-[10px] text-[var(--text-secondary)]">{gunSayisiHesapla()} gün</div>
        <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Açıklama" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
        <button onClick={talepEt} className="w-full py-3 text-sm font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer">Talep Oluştur</button>
      </div>

      <div className="flex flex-col gap-2">
        {talepler.map((t) => (
          <div key={t.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center justify-between">
            <div className="text-xs">
              <div className="font-bold">{IZIN_TUR_ETIKET[t.tur]} — {t.gun_sayisi} gün</div>
              <div className="text-[10px] text-[var(--text-secondary)]">{formatTarih(t.baslangic_tarihi)} → {formatTarih(t.bitis_tarihi)}</div>
            </div>
            {t.durum === 'talep_edildi' ? (
              <div className="flex gap-1">
                <button onClick={() => onayla(t.id)} className="p-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => reddet(t.id)} className="p-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${IZIN_DURUM_RENK[t.durum]}`}>{IZIN_DURUM_ETIKET[t.durum]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
