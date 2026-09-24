import { useEffect, useState } from 'react';
import { X, FileSearch, ArrowUp } from 'lucide-react';
import * as api from '../api';
import type { DefterHareketi, KaynakBelge } from '../types';
import { tlTam, formatTarih, TUR_ETIKET, HATA_KUTU } from './format';

/** Drill-down: hücre → defter hareketleri → hareketin KAYNAK BELGESİ (+ zincir: çıkış ← giriş ← mal kabul ← sipariş). */
export default function KaynakBelgeDetay({ projeId, kodId, baslik, kurBazi, tarih, onKapat }: { projeId: string; kodId: number | 'kodsuz'; baslik: string; kurBazi?: 'nominal' | 'sabit' | 'guncel'; tarih?: string; onKapat: () => void }) {
  const [hareketler, setHareketler] = useState<DefterHareketi[] | null>(null);
  const [secili, setSecili] = useState<{ hareket: DefterHareketi; kaynak: KaynakBelge } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  useEffect(() => { api.kodHareketleri(projeId, kodId, { kurBazi, tarih }).then(setHareketler).catch((e) => setHata(String(e.message))); }, [projeId, kodId, kurBazi, tarih]);

  async function ac(h: DefterHareketi) { setHata(null); try { setSecili(await api.hareketKaynagi(h.id)); } catch (e) { setHata(String((e as Error).message)); } }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onKapat}>
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 text-[var(--text-primary)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-sm flex items-center gap-2"><FileSearch className="w-4 h-4 text-indigo-400" /> {baslik} — defter hareketleri</h3>
          <button onClick={onKapat} className="p-1 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        {hata && <div className={HATA_KUTU}>{hata}</div>}
        {!hareketler ? <div className="text-xs text-[var(--text-secondary)]">Yükleniyor…</div> : (
          <div className="flex flex-col gap-1.5 mb-4">
            {hareketler.length === 0 && <div className="text-xs text-[var(--text-secondary)]">Hareket yok.</div>}
            {hareketler.map((h) => (
              <button key={h.id} onClick={() => ac(h)} className={`text-left p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${secili?.hareket.id === h.id ? 'border-indigo-500/50 bg-indigo-600/10' : 'border-[var(--border)] bg-[var(--bg-primary)]'}`}>
                <span><b>{TUR_ETIKET[h.tur] ?? h.tur}</b> • {formatTarih(h.tarih)} • {h.kaynak_modul} #{h.kaynak_id}{h.iptal_edildi ? ' • (iptal edildi)' : ''}</span>
                <b className={h.tutar_kurus < 0 ? 'text-red-400' : ''}>{tlTam(h.tl_kurus ?? h.tutar_kurus)}</b>
              </button>
            ))}
          </div>
        )}
        {secili && (
          <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs">
            <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1">Kaynak belge</div>
            {!secili.kaynak.bulundu ? <div className="text-red-400 font-bold">Kaynak belge bulunamadı — mutabakat raporunda görünür.</div> : (
              <>
                <div className="font-black text-sm">{secili.kaynak.etiket} <span className="font-normal text-[var(--text-secondary)]">• {secili.kaynak.belge_tipi} #{secili.kaynak.belge_id} • durum: {secili.kaynak.durum}{secili.kaynak.iptal ? ' • İPTAL/GEÇERSİZ' : ''}</span></div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {Object.entries(secili.kaynak.ozet ?? {}).map(([k, v]) => <div key={k}><span className="text-[var(--text-secondary)]">{k}:</span> {typeof v === 'number' && k.endsWith('_kurus') ? tlTam(v) : String(v ?? '—')}</div>)}
                </div>
                {secili.kaynak.zincir.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] font-black uppercase text-[var(--text-secondary)] mb-1">Zincir (kaynağa doğru)</div>
                    {secili.kaynak.zincir.map((z, i) => <div key={i} className="flex items-center gap-1.5 py-0.5"><ArrowUp className="w-3 h-3 text-indigo-400" />{z.belge_tipi}: {z.etiket}</div>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
