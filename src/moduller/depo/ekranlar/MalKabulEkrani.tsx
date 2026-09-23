import { useEffect, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import * as api from '../api';
import * as satinalmaApi from '../../satinalma/api';
import type { Depo } from '../types';
import type { SatinalmaSiparis, SatinalmaSiparisKalem } from '../../satinalma/types';

interface Props {
  projeId: string;
}

/** Görev metni: "mal kabul (sipariş seçerek)". */
export default function MalKabulEkrani({ projeId }: Props) {
  const [siparisler, setSiparisler] = useState<SatinalmaSiparis[]>([]);
  const [depolar, setDepolar] = useState<Depo[]>([]);
  const [secilenSiparisId, setSecilenSiparisId] = useState<number | null>(null);
  const [kalemler, setKalemler] = useState<SatinalmaSiparisKalem[]>([]);
  const [form, setForm] = useState<Record<number, { depoId: number | null; gelen: number; kabul: number; red: number; redNedeni: string }>>({});
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([satinalmaApi.siparisleriListele(projeId), api.depolariListele(projeId)]).then(([s, d]) => {
      setSiparisler(s.filter((x) => x.durum === 'onaylandi' || x.durum === 'kismi_teslim'));
      setDepolar(d);
    });
  }, [projeId]);

  async function siparisSec(id: number) {
    setSecilenSiparisId(id);
    const kl = await satinalmaApi.siparisKalemleriGetir(id);
    setKalemler(kl);
    setForm(Object.fromEntries(kl.map((k) => [k.id, { depoId: depolar[0]?.id ?? null, gelen: k.miktar - k.teslim_edilen_miktar, kabul: k.miktar - k.teslim_edilen_miktar, red: 0, redNedeni: '' }])));
  }

  async function kaydet(kalemId: number) {
    const f = form[kalemId];
    setHata(null);
    setBasarili(null);
    try {
      await api.malKabulKaydet({
        siparis_kalem_id: kalemId, depo_id: f.depoId ?? undefined, gelen_miktar: f.gelen, kabul_miktar: f.kabul,
        red_miktar: f.red || undefined, red_nedeni: f.red ? f.redNedeni : undefined, tarih: new Date().toISOString().slice(0, 10),
      });
      setBasarili('Mal kabul kaydedildi.');
      if (secilenSiparisId) setKalemler(await satinalmaApi.siparisKalemleriGetir(secilenSiparisId));
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4">
        <PackageCheck className="w-5 h-5 text-indigo-400" /> Mal Kabul
      </h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}
      {basarili && <div className="mb-4 p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-xs">{basarili}</div>}

      <select value={secilenSiparisId ?? ''} onChange={(e) => siparisSec(Number(e.target.value))} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs mb-4">
        <option value="">Sipariş seçin…</option>
        {siparisler.map((s) => <option key={s.id} value={s.id}>{s.numara}</option>)}
      </select>

      {secilenSiparisId && (
        <div className="flex flex-col gap-3">
          {kalemler.map((k) => {
            const f = form[k.id];
            if (!f) return null;
            return (
              <div key={k.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
                <div className="text-xs font-bold mb-2">{k.aciklama} <span className="text-[var(--text-secondary)] font-normal">— sipariş: {k.miktar} {k.birim}, önceden teslim: {k.teslim_edilen_miktar}</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                  <select value={f.depoId ?? ''} onChange={(e) => setForm((p) => ({ ...p, [k.id]: { ...f, depoId: Number(e.target.value) } }))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
                    {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
                  </select>
                  <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">Gelen
                    <input type="number" value={f.gelen} onChange={(e) => setForm((p) => ({ ...p, [k.id]: { ...f, gelen: Number(e.target.value) } }))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                  </label>
                  <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">Kabul
                    <input type="number" value={f.kabul} onChange={(e) => setForm((p) => ({ ...p, [k.id]: { ...f, kabul: Number(e.target.value) } }))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                  </label>
                  <label className="text-[10px] text-[var(--text-secondary)] flex flex-col gap-1">Red
                    <input type="number" value={f.red} onChange={(e) => setForm((p) => ({ ...p, [k.id]: { ...f, red: Number(e.target.value) } }))} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                  </label>
                  <button onClick={() => kaydet(k.id)} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Kaydet</button>
                </div>
                {f.red > 0 && (
                  <input value={f.redNedeni} onChange={(e) => setForm((p) => ({ ...p, [k.id]: { ...f, redNedeni: e.target.value } }))} placeholder="Red nedeni" className="mt-2 w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
