import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import * as api from '../api';
import * as cekirdekApi from '../../_cekirdek/api';
import type { Personel } from '../types';
import type { Belge } from '../../_cekirdek/types';
import { formatTarih } from './format';

const BELGE_TUR_ETIKET: Record<string, string> = {
  is_sozlesmesi: 'İş Sözleşmesi', kimlik: 'Kimlik', ikametgah: 'İkametgah', diploma: 'Diploma', ehliyet: 'Ehliyet',
  src_operator: 'SRC/Operatör', mesleki_yeterlilik: 'Mesleki Yeterlilik', saglik_raporu: 'Sağlık Raporu', isg_sertifikasi: 'İSG Sertifikası', diger: 'Diğer',
};

interface Satir { personel: Personel; belge: Belge }

/** Görev metni: "eksik evraklı personelin şantiye girişi P8'de uyarı verir" — bu ekran yalnızca SÜRESİ DOLAN/YAKLAŞAN belgeleri LİSTELER, giriş engeli P8'in işidir. */
export default function EvrakSuresiDolanlar() {
  const [gunOncesi, setGunOncesi] = useState(30);
  const [satirlar, setSatirlar] = useState<Satir[] | null>(null);

  async function yenile() {
    const personeller = await api.personelleriListele();
    const kisiIdMap = new Map(personeller.map((p) => [p.kisi_id, p]));
    const dolanlar = await cekirdekApi.belgeleriSuresiDolanlariGetir('kisi', undefined, gunOncesi);
    const sonuc: Satir[] = dolanlar
      .filter((b) => kisiIdMap.has(Number(b.ilgili_id)))
      .map((b) => ({ personel: kisiIdMap.get(Number(b.ilgili_id))!, belge: b }));
    setSatirlar(sonuc);
  }
  useEffect(() => { yenile(); }, [gunOncesi]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 text-[var(--text-primary)]">
      <div className="flex flex-wrap gap-2 items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-400" /> Evrak Süresi Dolanlar</h2>
        <select value={gunOncesi} onChange={(e) => setGunOncesi(Number(e.target.value))} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1.5 text-xs">
          <option value={0}>Süresi geçmiş</option>
          <option value={15}>15 gün içinde dolacak</option>
          <option value={30}>30 gün içinde dolacak</option>
          <option value={90}>90 gün içinde dolacak</option>
        </select>
      </div>

      {!satirlar ? (
        <div className="text-xs text-[var(--text-secondary)]">Yükleniyor…</div>
      ) : satirlar.length === 0 ? (
        <div className="text-xs text-[var(--text-secondary)] py-8 text-center">Bu kriterde süresi dolan/dolacak evrak yok.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {satirlar.map(({ personel, belge }) => (
            <div key={belge.id} className="p-3 bg-[var(--bg-primary)] border border-red-500/30 rounded-lg flex items-center justify-between text-xs">
              <div>
                <div className="font-bold">{personel?.sicil_no ?? `Kişi #${belge.ilgili_id}`} — {BELGE_TUR_ETIKET[belge.tur] ?? belge.tur}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{belge.dosya_adi}</div>
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded border uppercase bg-red-600/15 text-red-400 border-red-500/30">{formatTarih(belge.gecerlilik_bitis)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
