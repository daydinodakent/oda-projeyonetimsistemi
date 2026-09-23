import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import * as api from '../api';
import * as sozlesmeApi from '../../sozlesme/api';
import type { Hakedis, HakedisKalem, HakedisKesinti } from '../types';
import type { Sozlesme, SozlesmeKalem } from '../../sozlesme/types';
import { formatKurus, formatTarih, HAKEDIS_DURUM_ETIKET, KESINTI_TUR_ETIKET } from './format';

interface Props {
  hakedisId: number | null;
}

/** Görev metni: "hakediş çıktısı (yazdırılabilir)". */
export default function HakedisCiktisi({ hakedisId }: Props) {
  const [hakedisIdGirdisi, setHakedisIdGirdisi] = useState(hakedisId ? String(hakedisId) : '');
  const [aktifId, setAktifId] = useState<number | null>(hakedisId);
  const [hakedis, setHakedis] = useState<Hakedis | null>(null);
  const [sozlesme, setSozlesme] = useState<Sozlesme | null>(null);
  const [kalemler, setKalemler] = useState<HakedisKalem[]>([]);
  const [sozlesmeKalemleri, setSozlesmeKalemleri] = useState<SozlesmeKalem[]>([]);
  const [kesintiler, setKesintiler] = useState<HakedisKesinti[]>([]);

  useEffect(() => { setAktifId(hakedisId); }, [hakedisId]);

  useEffect(() => {
    if (!aktifId) return;
    (async () => {
      const h = await api.hakedisGetir(aktifId);
      const [s, kl, ks] = await Promise.all([sozlesmeApi.sozlesmeGetir(h.sozlesme_id), api.hakedisKalemleriGetir(aktifId), api.kesintileriGetir(aktifId)]);
      setHakedis(h); setSozlesme(s); setKalemler(kl); setKesintiler(ks);
      setSozlesmeKalemleri(await sozlesmeApi.kalemleriGetir(h.sozlesme_id));
    })();
  }, [aktifId]);

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)] print:bg-white print:text-black print:border-0">
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <input value={hakedisIdGirdisi} onChange={(e) => setHakedisIdGirdisi(e.target.value)} type="number" placeholder="Hakediş ID" className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs" />
        <button onClick={() => setAktifId(Number(hakedisIdGirdisi))} disabled={!hakedisIdGirdisi} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer disabled:opacity-40">Aç</button>
        {hakedis && <button onClick={() => window.print()} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Yazdır</button>}
      </div>

      {!hakedis || !sozlesme ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bir hakediş ID'si girin.</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-black">HAKEDİŞ — {hakedis.numara}</h2>
            <div className="text-xs text-[var(--text-secondary)] print:text-black">{sozlesme.numara} • {sozlesme.konu} • Dönem: {formatTarih(hakedis.donem_baslangic)} – {formatTarih(hakedis.donem_bitis)} • Durum: {HAKEDIS_DURUM_ETIKET[hakedis.durum]}</div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead><tr className="border-b border-[var(--border)] print:border-black text-left">
              <th className="py-1.5">Kalem</th><th className="py-1.5">Önceki Küm.</th><th className="py-1.5">Bu Dönem</th><th className="py-1.5">Kümülatif</th><th className="py-1.5">Birim Fiyat</th><th className="py-1.5">Tutar</th>
            </tr></thead>
            <tbody>
              {kalemler.map((k) => {
                const sk = sozlesmeKalemleri.find((x) => x.id === k.sozlesme_kalem_id);
                return (
                  <tr key={k.id} className="border-b border-[var(--border)]/40 print:border-black/20">
                    <td className="py-1.5">{sk?.aciklama || `#${k.sozlesme_kalem_id}`}</td>
                    <td className="py-1.5">{k.onceki_kumulatif_miktar} {sk?.birim}</td>
                    <td className="py-1.5">{k.bu_donem_onay_miktar ?? 0} {sk?.birim}</td>
                    <td className="py-1.5">{k.kumulatif_miktar} {sk?.birim}</td>
                    <td className="py-1.5">{formatKurus(k.birim_fiyat_kurus)}</td>
                    <td className="py-1.5 font-bold">{formatKurus(k.tutar_kurus)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-col gap-1 self-end w-full sm:w-64 text-xs">
            <div className="flex justify-between"><span>Brüt Tutar</span><span className="font-bold">{formatKurus(hakedis.brut_tutar_kurus)}</span></div>
            {kesintiler.map((k) => (
              <div key={k.id} className="flex justify-between text-red-400 print:text-black"><span>{KESINTI_TUR_ETIKET[k.tur]}</span><span>-{formatKurus(k.tutar_kurus)}</span></div>
            ))}
            <div className="flex justify-between text-sm font-black pt-1.5 border-t border-[var(--border)] print:border-black"><span>Net Ödenecek</span><span>{formatKurus(hakedis.net_tutar_kurus)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
