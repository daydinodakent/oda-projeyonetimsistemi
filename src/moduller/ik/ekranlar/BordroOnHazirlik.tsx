import { useEffect, useState } from 'react';
import { Printer, Calculator, CheckCircle2, Download } from 'lucide-react';
import * as api from '../api';
import type { Personel, BordroDonemi, BordroSatiri } from '../types';
import { formatKurus, BORDRO_DURUM_ETIKET } from './format';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/**
 * Bordro ÖN HAZIRLIK — SGK/vergi kesintisi HESAPLAMAZ (bkz.
 * server/moduller/ik/bordroDonemi.js dosya başı notu). Bu ekran
 * "dış bordro programına aktarım" noktasıdır.
 */
export default function BordroOnHazirlik() {
  const [donemler, setDonemler] = useState<BordroDonemi[]>([]);
  const [aktifDonemId, setAktifDonemId] = useState<number | null>(null);
  const [yil, setYil] = useState(new Date().getFullYear());
  const [ay, setAy] = useState(new Date().getMonth() + 1);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [satirlar, setSatirlar] = useState<BordroSatiri[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    setDonemler(await api.bordroDonemleriniListele());
    setPersoneller(await api.personelleriListele());
  }
  useEffect(() => { yenile(); }, []);

  async function donemSatirlariniYenile(donemId: number) {
    setSatirlar(await api.bordroSatirlariniGetir(donemId));
  }
  useEffect(() => { if (aktifDonemId) donemSatirlariniYenile(aktifDonemId); }, [aktifDonemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const aktifDonem = donemler.find((d) => d.id === aktifDonemId) || null;

  async function donemAc() {
    setHata(null);
    try {
      const donem = await api.bordroDonemiOlustur({ donem_yil: yil, donem_ay: ay });
      await yenile();
      setAktifDonemId(donem.id);
    } catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function hepsiniHesapla() {
    if (!aktifDonemId) return;
    setHata(null);
    for (const p of personeller) {
      try { await api.bordroPersonelHesapla(aktifDonemId, p.id); }
      catch { /* ücreti tanımsız personel atlanır — ekranda bariz eksik satır olarak görünür */ }
    }
    await donemSatirlariniYenile(aktifDonemId);
  }

  async function onayla() {
    if (!aktifDonemId) return;
    setHata(null);
    try { await api.bordroDurumDegistir(aktifDonemId, 'onaylandi'); await yenile(); }
    catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function disaAktar() {
    if (!aktifDonemId) return;
    try {
      await api.bordroDurumDegistir(aktifDonemId, 'disa_aktarildi');
      const satirlar = await api.bordroDisaAktarimGetir(aktifDonemId);
      const csv = ['sicil_no;brut_kurus;calisilan_gun;fazla_mesai_saat;izinli_gun;ucretsiz_izin_gun;avans_kesinti_kurus', ...satirlar.map((s) => `${s.sicil_no};${s.brut_kurus};${s.calisilan_gun};${s.fazla_mesai_saat};${s.izinli_gun};${s.ucretsiz_izin_gun};${s.avans_kesinti_kurus}`)].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bordro-${aktifDonem?.numara}.csv`; a.click();
      URL.revokeObjectURL(url);
      await yenile();
    } catch (err) { setHata(String((err as Error).message || err)); }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><Printer className="w-5 h-5 text-indigo-400" /> Bordro Ön Hazırlık</h2>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs">{hata}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 items-end">
        <input type="number" value={yil} onChange={(e) => setYil(Number(e.target.value))} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
        <select value={ay} onChange={(e) => setAy(Number(e.target.value))} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
          {AYLAR.map((a, i) => <option key={a} value={i + 1}>{a}</option>)}
        </select>
        <button onClick={donemAc} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Dönem Aç</button>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {donemler.map((d) => (
          <button key={d.id} onClick={() => setAktifDonemId(d.id)} className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border cursor-pointer ${aktifDonemId === d.id ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
            {AYLAR[d.donem_ay - 1]} {d.donem_yil} — {BORDRO_DURUM_ETIKET[d.durum]}
          </button>
        ))}
      </div>

      {aktifDonem && (
        <>
          <div className="flex gap-2 mb-4">
            {aktifDonem.durum === 'acik' && (
              <>
                <button onClick={hepsiniHesapla} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1"><Calculator className="w-3 h-3" /> Tüm Personeli Hesapla</button>
                <button onClick={onayla} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Onayla (Maliyet Defteri'ne Yaz)</button>
              </>
            )}
            {aktifDonem.durum === 'onaylandi' && (
              <button onClick={disaAktar} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1"><Download className="w-3 h-3" /> Dış Bordro Programına Aktar (CSV)</button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="text-left py-1.5">Personel</th><th className="text-right">Çalışılan Gün</th><th className="text-right">FM (saat)</th>
                  <th className="text-right">İzinli</th><th className="text-right">Ücretsiz İzin</th><th className="text-right">Avans Kesinti</th><th className="text-right">Brüt Hak Ediş</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => {
                  const p = personeller.find((x) => x.id === s.personel_id);
                  return (
                    <tr key={s.id} className="border-b border-[var(--border)]">
                      <td className="py-1.5">{p?.sicil_no ?? s.personel_id}</td>
                      <td className="text-right">{s.calisilan_gun}</td>
                      <td className="text-right">{s.fazla_mesai_saat}</td>
                      <td className="text-right">{s.izinli_gun}</td>
                      <td className="text-right">{s.ucretsiz_izin_gun}</td>
                      <td className="text-right">{formatKurus(s.avans_kesinti_kurus)}</td>
                      <td className="text-right font-bold">{formatKurus(s.brut_maas_kurus)}</td>
                    </tr>
                  );
                })}
                {satirlar.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-[var(--text-secondary)]">Henüz hesaplanmış satır yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
