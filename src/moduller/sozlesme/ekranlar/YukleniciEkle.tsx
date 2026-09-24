import { useEffect, useState } from 'react';
import HizliForm, { tlToKurus } from '../../_cekirdek/HizliForm';
import * as cekirdekApi from '../../_cekirdek/api';
import * as sozlesmeApi from '../api';
import type { CariFirma } from '../../_cekirdek/types';
import type { SozlesmeTipi } from '../types';

interface Props {
  projeId: string;
  /** Oluşturulacak sözleşmenin tipi (alt yüklenici / taşeron). */
  tip: Extract<SozlesmeTipi, 'alt_yuklenici' | 'taseron'>;
  etiket: string;
  onOlustu: () => void;
}

/**
 * Alt Yüklenici / Taşeron ekleme: firma (Çekirdek cari) + o firmayla proje sözleşmesi (P2 servisi).
 * Alt yüklenici/taşeron ayrı bir tablo değildir; sözleşme tipi ile ayrışır (bkz. CAKISMA_HARITASI TANIM AYRIMI).
 */
export default function YukleniciEkle({ projeId, tip, etiket, onOlustu }: Props) {
  const [firmalar, setFirmalar] = useState<CariFirma[]>([]);
  const yenileFirma = () => cekirdekApi.firmalariListele().then(setFirmalar).catch(() => setFirmalar([]));
  useEffect(() => { yenileFirma(); }, []);

  return (
    <div className="flex flex-wrap gap-x-3">
      <HizliForm
        butonEtiket={`Yeni ${etiket} Sözleşmesi`}
        ipucu={`Firmayı seçin (yoksa önce "Yeni Firma" ile ekleyin). Sözleşme taslak açılır; kalem, onay ve imza Sözleşme Yönetimi'nden yürütülür.`}
        alanlar={[
          { ad: 'firma', etiket: 'Firma', tip: 'select', zorunlu: true, secenekler: firmalar.map((f) => ({ deger: String(f.id), etiket: `${f.unvan} (${f.vkn_tckn})` })) },
          { ad: 'konu', etiket: 'İş / Sözleşme konusu', zorunlu: true },
          { ad: 'bedel', etiket: 'Bedel (TL)', tip: 'number' },
          { ad: 'baslangic', etiket: 'Başlangıç', tip: 'date', zorunlu: true, varsayilan: new Date().toISOString().slice(0, 10) },
          { ad: 'bitis', etiket: 'Bitiş', tip: 'date' },
        ]}
        onKaydet={async (v) => {
          await sozlesmeApi.sozlesmeOlustur({
            tip, proje_id: projeId, konu: v.konu, taraf_firma_id: Number(v.firma), bedel_kurus: tlToKurus(v.bedel),
            baslangic_tarihi: v.baslangic, bitis_tarihi: v.bitis || undefined,
          });
          onOlustu();
        }}
      />
      <HizliForm
        butonEtiket="Yeni Firma"
        alanlar={[
          { ad: 'unvan', etiket: 'Unvan', zorunlu: true },
          { ad: 'vkn', etiket: 'VKN / TCKN', zorunlu: true },
          { ad: 'vergi_dairesi', etiket: 'Vergi Dairesi' },
          { ad: 'adres', etiket: 'Adres' },
        ]}
        onKaydet={async (v) => {
          await cekirdekApi.firmaOlustur({ unvan: v.unvan, vkn_tckn: v.vkn, vergi_dairesi: v.vergi_dairesi || null, adres: v.adres || null });
          await yenileFirma();
        }}
      />
    </div>
  );
}
