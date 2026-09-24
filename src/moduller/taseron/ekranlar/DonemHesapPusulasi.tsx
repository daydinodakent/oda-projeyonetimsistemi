import { useEffect, useState } from 'react';
import { Printer, ArrowRight, Banknote } from 'lucide-react';
import * as api from '../api';
import type { OdemeDonemi, OdemeDonemiKesinti, OdemeDonemiDurumu } from '../types';
import { formatKurus, formatTarih, DONEM_DURUM_ETIKET, KESINTI_TUR_ETIKET } from './format';

interface Props {
  ekipId: number;
}

const AKIS: Record<OdemeDonemiDurumu, OdemeDonemiDurumu[]> = {
  acik: ['sef_onayi'], sef_onayi: ['proje_muduru_onayi'], proje_muduru_onayi: ['kapandi'], kapandi: [],
};

/** Görev metni: "dönem hesap/hesap pusulası (ekip başına imzalatılabilir çıktı)". */
export default function DonemHesapPusulasi({ ekipId }: Props) {
  const [donemler, setDonemler] = useState<OdemeDonemi[]>([]);
  const [secilenId, setSecilenId] = useState<number | null>(null);
  const [donem, setDonem] = useState<OdemeDonemi | null>(null);
  const [kesintiler, setKesintiler] = useState<OdemeDonemiKesinti[]>([]);
  const [formAcik, setFormAcik] = useState(false);
  const [donemBaslangic, setDonemBaslangic] = useState('');
  const [donemBitis, setDonemBitis] = useState('');
  const [vadeTarihi, setVadeTarihi] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  async function yenile() {
    setDonemler(await api.donemleriListele(ekipId));
  }
  useEffect(() => { yenile(); }, [ekipId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function ac(id: number) {
    setSecilenId(id);
    const [d, k] = await Promise.all([api.donemGetir(id), api.donemKesintileriGetir(id)]);
    setDonem(d);
    setKesintiler(k);
  }

  async function olustur() {
    setHata(null);
    try {
      const d = await api.donemOlustur({ ekip_id: ekipId, donem_baslangic: donemBaslangic, donem_bitis: donemBitis });
      setFormAcik(false);
      await yenile();
      ac(d.id);
    } catch (err) {
      setHata(String((err as Error).message || err));
    }
  }

  async function hesapla() {
    if (!secilenId) return;
    setHata(null);
    try { await ac(secilenId); const guncel = await api.donemHesapla(secilenId); setDonem(guncel); }
    catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function durumIlerlet(hedef: OdemeDonemiDurumu) {
    if (!secilenId) return;
    setHata(null);
    try { await api.donemDurumDegistir(secilenId, hedef); await ac(secilenId); }
    catch (err) { setHata(String((err as Error).message || err)); }
  }

  async function odemeTalimati() {
    if (!secilenId || !vadeTarihi) return;
    setHata(null);
    try { await api.donemOdemeTalimatiOlustur(secilenId, vadeTarihi); await ac(secilenId); }
    catch (err) { setHata(String((err as Error).message || err)); }
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)] print:bg-white print:text-black print:border-0">
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4 print:hidden">
        <h2 className="text-lg font-black tracking-tight">Dönem Hesap Pusulası</h2>
        <button onClick={() => setFormAcik((v) => !v)} className="px-3 py-1.5 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer">+ Yeni Dönem</button>
      </div>

      {hata && <div className="mb-4 p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 text-xs print:hidden">{hata}</div>}

      {formAcik && (
        <div className="mb-4 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2 items-end print:hidden">
          <input type="date" value={donemBaslangic} onChange={(e) => setDonemBaslangic(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <input type="date" value={donemBitis} onChange={(e) => setDonemBitis(e.target.value)} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs" />
          <button onClick={olustur} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer">Oluştur</button>
        </div>
      )}

      <select value={secilenId ?? ''} onChange={(e) => ac(Number(e.target.value))} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs mb-4 print:hidden">
        <option value="">Dönem seçin…</option>
        {donemler.map((d) => <option key={d.id} value={d.id}>{d.numara} — {formatTarih(d.donem_baslangic)}–{formatTarih(d.donem_bitis)}</option>)}
      </select>

      {donem && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black">{donem.numara}</h3>
              <div className="text-xs text-[var(--text-secondary)] print:text-black">{formatTarih(donem.donem_baslangic)} – {formatTarih(donem.donem_bitis)} • {DONEM_DURUM_ETIKET[donem.durum]}</div>
            </div>
            <button onClick={() => window.print()} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer flex items-center gap-1.5 print:hidden"><Printer className="w-3.5 h-3.5" /> Yazdır</button>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-72 text-sm">
            <div className="flex justify-between"><span>Brüt Tutar</span><span className="font-bold">{formatKurus(donem.brut_tutar_kurus)}</span></div>
            {kesintiler.map((k) => (
              <div key={k.id} className="flex justify-between text-xs text-red-400 print:text-black"><span>{KESINTI_TUR_ETIKET[k.tur]}{k.aciklama ? ` — ${k.aciklama}` : ''}</span><span>-{formatKurus(k.tutar_kurus)}</span></div>
            ))}
            <div className="flex justify-between text-base font-black pt-1.5 border-t border-[var(--border)] print:border-black"><span>Net Ödenecek</span><span>{formatKurus(donem.net_tutar_kurus)}</span></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-8 text-xs print:mt-16">
            <div className="border-t border-[var(--border)] print:border-black pt-2">Ekip Başı İmza</div>
            <div className="border-t border-[var(--border)] print:border-black pt-2">Şantiye Şefi İmza</div>
          </div>

          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {donem.durum === 'acik' && (
              <button onClick={async () => { setHata(null); try { const e = await api.ekipGetir(ekipId); await api.donemMalzemeFireKesintisiEkle(donem.id, e.sozlesme_id); await ac(donem.id); } catch (err) { setHata(String((err as Error).message || err)); } }}
                className="px-2.5 py-1 text-[10px] font-black uppercase bg-orange-600/15 border border-orange-500/30 text-orange-400 rounded-lg cursor-pointer">Malzeme Fire Kesintisi Getir</button>
            )}
            <button onClick={hesapla} className="px-2.5 py-1 text-[10px] font-black uppercase bg-blue-600/15 border border-blue-500/30 text-blue-400 rounded-lg cursor-pointer">Yeniden Hesapla</button>
            {(AKIS[donem.durum] || []).map((hedef) => (
              <button key={hedef} onClick={() => durumIlerlet(hedef)} className="px-2.5 py-1 text-[10px] font-black uppercase bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-lg cursor-pointer flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {DONEM_DURUM_ETIKET[hedef]}</button>
            ))}
          </div>

          {donem.durum === 'kapandi' && !donem.odeme_talimati_olusturuldu_mu && (
            <div className="flex items-center gap-1.5 print:hidden">
              <input type="date" value={vadeTarihi} onChange={(e) => setVadeTarihi(e.target.value)} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs" />
              <button disabled={!vadeTarihi} onClick={odemeTalimati} className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-lg cursor-pointer disabled:opacity-40 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Ödeme Talimatı Oluştur</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
