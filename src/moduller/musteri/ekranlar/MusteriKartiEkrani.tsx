import { useState } from 'react';
import { UserRound, ShieldCheck } from 'lucide-react';
import * as api from '../api';
import type { MusteriKarti } from '../types';
import { KART, INPUT, BTN_MOR, BTN_YESIL, HATA_KUTU, TAKSIT_TUR_ETIKET, DURUM_ETIKET, formatKurus, formatTarih, bugun } from './format';

export default function MusteriKartiEkrani() {
  const [tip, setTip] = useState<'kisi' | 'firma'>('kisi');
  const [id, setId] = useState('');
  const [kart, setKart] = useState<MusteriKarti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const yukle = async () => { setHata(null); try { setKart(await api.musteriKarti(tip === 'kisi' ? { kisi_id: Number(id) } : { firma_id: Number(id) })); } catch (e) { setHata(String((e as Error).message)); } };
  const riza = async (tur: 'aydinlatma' | 'pazarlama') => { setHata(null); try { await api.kvkkRizaKaydet({ ilgili_tip: 'kisi', ilgili_id: Number(id), tur, metin_versiyon: 'v1', verildi_tarihi: bugun() }); await yukle(); } catch (e) { setHata(String((e as Error).message)); } };

  return (
    <div className={KART}>
      <h2 className="text-lg font-black tracking-tight flex items-center gap-2 pb-4 border-b border-[var(--border)] mb-4"><UserRound className="w-5 h-5 text-indigo-400" /> Müşteri Kartı</h2>
      {hata && <div className={HATA_KUTU}>{hata}</div>}
      <div className="flex gap-2 mb-4 max-w-md">
        <select value={tip} onChange={(e) => setTip(e.target.value as 'kisi' | 'firma')} className={INPUT}><option value="kisi">Kişi</option><option value="firma">Firma</option></select>
        <input type="number" value={id} onChange={(e) => setId(e.target.value)} placeholder="Çekirdek ID" className={INPUT} />
        <button onClick={yukle} className={BTN_MOR}>Getir</button>
      </div>
      {kart && (
        <div className="flex flex-col gap-4">
          <div className="text-sm font-black">{kart.musteri.ad_soyad ?? kart.musteri.unvan}</div>
          {kart.kvkk && (
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs flex items-center gap-3 flex-wrap">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Aydınlatma: <b className={kart.kvkk.aydinlatma ? 'text-emerald-400' : 'text-red-400'}>{kart.kvkk.aydinlatma ? 'kayıtlı' : 'yok'}</b></span>
              <span>Pazarlama rızası: <b className={kart.kvkk.pazarlama ? 'text-emerald-400' : 'text-slate-400'}>{kart.kvkk.pazarlama ? 'var' : 'yok'}</b></span>
              {!kart.kvkk.aydinlatma && <button onClick={() => riza('aydinlatma')} className={BTN_YESIL}>Aydınlatma Kaydet</button>}
              {!kart.kvkk.pazarlama && <button onClick={() => riza('pazarlama')} className={BTN_MOR}>Pazarlama Rızası Al</button>}
            </div>
          )}
          {kart.satislar.length === 0 && <div className="text-xs text-[var(--text-secondary)]">Bu müşterinin satışı yok.</div>}
          {kart.satislar.map((s) => (
            <div key={s.satis.id} className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs flex flex-col gap-2">
              <div className="font-black">{s.bolum?.etiket} <span className="font-normal text-[var(--text-secondary)]">• {s.bolum ? DURUM_ETIKET[s.bolum.durum] : ''} • satış #{s.satis.id} ({s.satis.durum}) • {formatKurus(s.satis.tutar_kurus, s.satis.para_birimi)} • sözleşme #{s.satis.sozlesme_id}</span></div>
              {s.odeme && <div>Tahsil edilen: <b>{formatKurus(s.odeme.tahsil_edilen_kurus, s.satis.para_birimi)}</b> (%{s.odeme.yuzde}) • kalan {formatKurus(s.odeme.kalan_kurus, s.satis.para_birimi)}</div>}
              {s.plan && <div className="text-[10px] text-[var(--text-secondary)]">Plan v{s.plan.plan.versiyon}: {s.plan.taksitler.map((t) => `${TAKSIT_TUR_ETIKET[t.tur]} ${formatTarih(t.vade_tarihi)} ${formatKurus(t.tutar_kurus, s.satis.para_birimi)} [${t.durum}]`).join(' • ')}</div>}
              {s.tahsilatlar.length > 0 && <div className="text-[10px]">Tahsilatlar: {s.tahsilatlar.map((t) => `${formatTarih(t.tarih)} ${formatKurus(t.tutar_kurus, t.para_birimi)}`).join(' • ')}</div>}
              {s.teslim && <div className="text-[10px]">Teslim: {formatTarih(s.teslim.tarih)} (ödeme %{s.teslim.odeme_yuzdesi}{s.teslim.istisna_onayi_mi ? ', istisna onaylı' : ''}) • eksik: {s.teslim.eksikler.length} ({s.teslim.eksikler.filter((e) => e.gorev_id).length} görev)</div>}
              {s.talepler.length > 0 && <div className="text-[10px]">Talepler: {s.talepler.map((t) => `${t.tur}: ${t.aciklama} [${t.durum}]`).join(' • ')}</div>}
            </div>
          ))}
          <div className="text-[10px] text-[var(--text-secondary)]">Belgeler: {kart.belgeler.length ? kart.belgeler.map((b) => `${b.tur} (${b.dosya_adi})`).join(', ') : '—'}</div>
        </div>
      )}
    </div>
  );
}
