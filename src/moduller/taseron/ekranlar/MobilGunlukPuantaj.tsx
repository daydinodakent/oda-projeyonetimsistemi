import { useEffect, useState } from 'react';
import { CalendarCheck, Zap } from 'lucide-react';
import * as api from '../api';
import type { EkipUye, GunTipi } from '../types';

interface Props {
  ekipId: number;
}

const GUN_TIPLERI: { deger: GunTipi; etiket: string; gunDegeri: 0 | 0.5 | 1 }[] = [
  { deger: 'tam', etiket: 'Tam Gün', gunDegeri: 1 },
  { deger: 'yarim', etiket: 'Yarım Gün', gunDegeri: 0.5 },
  { deger: 'hava_muhalefeti', etiket: 'Hava Muhalefeti (yarım)', gunDegeri: 0.5 },
  { deger: 'iptal', etiket: 'İptal (gelmedi)', gunDegeri: 0 },
];

/** Görev metni: "Günlük puantaj girişi mobil, çevrimdışı, ekip listesinden tek dokunuşla 'hepsi tam gün' + istisnaları düzenleme." */
export default function MobilGunlukPuantaj({ ekipId }: Props) {
  const [uyeler, setUyeler] = useState<EkipUye[]>([]);
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [maliyetKoduId, setMaliyetKoduId] = useState('');
  const [sonuc, setSonuc] = useState<{ basarili: number; basarisiz: { ekip_uye_id: number; hata: string }[] } | null>(null);
  const [duzenlenenUyeId, setDuzenlenenUyeId] = useState<number | null>(null);
  const [gunTipi, setGunTipi] = useState<GunTipi>('tam');
  const [fazlaMesai, setFazlaMesai] = useState(0);
  const [bayramPazar, setBayramPazar] = useState(false);
  const [yetkiliOnayi, setYetkiliOnayi] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => { api.ekipUyeleriGetir(ekipId).then(setUyeler); }, [ekipId]);

  async function hepsiTamGun() {
    setHata(null);
    if (!maliyetKoduId) { setHata('Maliyet Kodu ID zorunludur.'); return; }
    const r = await api.tumEkibeUygula(ekipId, tarih, 1, Number(maliyetKoduId));
    setSonuc({ basarili: r.basarili.length, basarisiz: r.basarisiz });
  }

  async function istisnaKaydet() {
    if (!duzenlenenUyeId) return;
    setHata(null);
    const secilen = GUN_TIPLERI.find((g) => g.deger === gunTipi)!;
    try {
      await api.puantajKaydet({
        ekip_uye_id: duzenlenenUyeId, tarih, gun_degeri: secilen.gunDegeri, gun_tipi: gunTipi, bayram_pazar_mi: bayramPazar,
        maliyet_kodu_id: Number(maliyetKoduId), fazla_mesai_saat: fazlaMesai, yetkiliOnayi, gerekce: yetkiliOnayi ? gerekce : undefined,
      });
      setDuzenlenenUyeId(null);
      setFazlaMesai(0);
      setYetkiliOnayi(false);
      setGerekce('');
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)] flex flex-col gap-4">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-indigo-400" /> Günlük Puantaj</h2>

      {hata && <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />
      <input value={maliyetKoduId} onChange={(e) => setMaliyetKoduId(e.target.value)} type="number" placeholder="Maliyet Kodu ID (WBS) — zorunlu" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-3 text-sm" />

      <button onClick={hepsiTamGun} className="w-full py-3.5 text-sm font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer flex items-center justify-center gap-2">
        <Zap className="w-4 h-4" /> Hepsi Tam Gün
      </button>
      {sonuc && (
        <div className="text-[10px] text-[var(--text-secondary)]">
          {sonuc.basarili} kaydedildi{sonuc.basarisiz.length > 0 && `, ${sonuc.basarisiz.length} istisna (aşağıdan düzenleyin)`}.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {uyeler.map((u) => (
          <div key={u.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
            <button onClick={() => setDuzenlenenUyeId(duzenlenenUyeId === u.id ? null : u.id)} className="w-full text-left text-xs font-bold cursor-pointer">
              Kişi #{u.kisi_id} — {u.rol_saha}
              {sonuc?.basarisiz.some((b) => b.ekip_uye_id === u.id) && <span className="text-red-400 ml-2">İSTİSNA</span>}
            </button>
            {duzenlenenUyeId === u.id && (
              <div className="mt-2 flex flex-col gap-2">
                <select value={gunTipi} onChange={(e) => setGunTipi(e.target.value as GunTipi)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
                  {GUN_TIPLERI.map((g) => <option key={g.deger} value={g.deger}>{g.etiket}</option>)}
                </select>
                <input type="number" value={fazlaMesai} onChange={(e) => setFazlaMesai(Number(e.target.value))} placeholder="Fazla mesai (saat)" className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                <label className="flex items-center gap-1.5 text-[10px] text-amber-400"><input type="checkbox" checked={bayramPazar} onChange={(e) => setBayramPazar(e.target.checked)} /> Bayram/Pazar mesaisi</label>
                <label className="flex items-center gap-1.5 text-[10px] text-red-400"><input type="checkbox" checked={yetkiliOnayi} onChange={(e) => setYetkiliOnayi(e.target.checked)} /> Yetkili onayıyla (SGK/İSG istisnasını aş)</label>
                {yetkiliOnayi && <input value={gerekce} onChange={(e) => setGerekce(e.target.value)} placeholder="Gerekçe (zorunlu)" className="bg-[var(--bg-secondary)] border border-red-500/30 rounded px-2 py-1.5 text-xs" />}
                <button onClick={istisnaKaydet} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer">Kaydet</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
