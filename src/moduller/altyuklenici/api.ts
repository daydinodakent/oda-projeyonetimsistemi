// Alt Yüklenici — ince REST istemcisi. server/moduller/altyuklenici/routes.js
// altındaki uçları çağırır.
import type {
  Hakedis, HakedisKalem, HakedisDurumu, OnayUyarisi, HakedisKesinti, KesintiTuru,
  EvrakDurumSatiri, EvrakTuru, IlerlemeKaydi, GecikmeOzetSatiri, PerformansKarti,
} from './types';

const BASE = '/api/altyuklenici';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Alt Yüklenici API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

// --- Hakediş ---
export const hakedisleriGetir = (sozlesmeId: number) => istek<Hakedis[]>(`/sozlesmeler/${sozlesmeId}/hakedisler`);
export const hakedisGetir = (id: number) => istek<Hakedis>(`/hakedisler/${id}`);
export const hakedisOlustur = (item: { sozlesme_id: number; donem_baslangic: string; donem_bitis: string; son_hakedis_mi?: boolean; notes?: string }, aktor?: number) =>
  istek<Hakedis>('/hakedisler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const hakedisDurumDegistir = (id: number, durum: HakedisDurumu, aktor?: number) =>
  istek<Hakedis>(`/hakedisler/${id}/durum`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });
export const blokajiAsarakOnayla = (id: number, gerekce: string, aktor?: number) =>
  istek<Hakedis>(`/hakedisler/${id}/blokaj-as`, { method: 'POST', body: JSON.stringify({ gerekce, aktor }) });
export const odemeTalimatiOlustur = (id: number, vadeTarihi: string, aktor?: number) =>
  istek<{ id: number; numara: string; tutar_kurus: number }>(`/hakedisler/${id}/odeme-talimati`, { method: 'POST', body: JSON.stringify({ vade_tarihi: vadeTarihi, aktor }) });

// --- Hakediş Kalemi ---
export const hakedisKalemleriGetir = (hakedisId: number) => istek<HakedisKalem[]>(`/hakedisler/${hakedisId}/kalemler`);
export const hakedisKalemEkle = (hakedisId: number, sozlesmeKalemId: number, aktor?: number) =>
  istek<HakedisKalem>(`/hakedisler/${hakedisId}/kalemler`, { method: 'POST', body: JSON.stringify({ sozlesme_kalem_id: sozlesmeKalemId, aktor }) });
export const beyanGir = (hakedisKalemId: number, miktar: number, aktor?: number) =>
  istek<HakedisKalem>(`/hakedis-kalemleri/${hakedisKalemId}/beyan`, { method: 'POST', body: JSON.stringify({ miktar, aktor }) });
export const onayGir = (hakedisKalemId: number, miktar: number, aktor?: number) =>
  istek<{ kalem: HakedisKalem; uyari: OnayUyarisi | null }>(`/hakedis-kalemleri/${hakedisKalemId}/onay`, { method: 'POST', body: JSON.stringify({ miktar, aktor }) });

// --- Kesinti ---
export const kesintileriGetir = (hakedisId: number) => istek<HakedisKesinti[]>(`/hakedisler/${hakedisId}/kesintiler`);
export const kesintiEkle = (hakedisId: number, item: { tur: KesintiTuru; tutar_kurus: number; aciklama?: string }, aktor?: number) =>
  istek<Hakedis>(`/hakedisler/${hakedisId}/kesintiler`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const parametrikKesintiEkle = (hakedisId: number, tur: KesintiTuru, parametreKodu: string, brutTutarKurus: number, tarih: string, aktor?: number) =>
  istek<Hakedis>(`/hakedisler/${hakedisId}/kesintiler/parametrik`, { method: 'POST', body: JSON.stringify({ tur, parametre_kodu: parametreKodu, brut_tutar_kurus: brutTutarKurus, tarih, aktor }) });
export const malzemeKesintisiEkle = (hakedisId: number, sozlesmeId: number, aktor?: number) =>
  istek<Hakedis>(`/hakedisler/${hakedisId}/kesintiler/malzeme`, { method: 'POST', body: JSON.stringify({ sozlesme_id: sozlesmeId, aktor }) });

// --- Evrak Kontrol ---
export const evraklariGetir = (sozlesmeId: number, sonHakedis?: boolean) => istek<EvrakDurumSatiri[]>(`/sozlesmeler/${sozlesmeId}/evraklar${sonHakedis ? '?son_hakedis=true' : ''}`);
export const evrakGuncelle = (sozlesmeId: number, tur: EvrakTuru, item: { gecerlilik_baslangic?: string; gecerlilik_bitis?: string; dokuman_id?: string; notes?: string }, aktor?: number) =>
  istek<EvrakDurumSatiri>(`/sozlesmeler/${sozlesmeId}/evraklar/${tur}`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- İlerleme ---
export const ilerlemeGetir = (sozlesmeId: number) => istek<IlerlemeKaydi[]>(`/sozlesmeler/${sozlesmeId}/ilerleme`);
export const gecikmeOzetiGetir = (sozlesmeId: number) => istek<GecikmeOzetSatiri[]>(`/sozlesmeler/${sozlesmeId}/ilerleme/ozet`);
export const ilerlemeKaydet = (sozlesmeId: number, item: { wbs_gorev_id: string; tarih: string; planlanan_yuzde: number; gerceklesen_yuzde: number; notes?: string }, aktor?: number) =>
  istek<IlerlemeKaydi>(`/sozlesmeler/${sozlesmeId}/ilerleme`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Performans ---
export const performansGetir = (sozlesmeId: number) => istek<PerformansKarti[]>(`/sozlesmeler/${sozlesmeId}/performans`);
export const performansKaydet = (sozlesmeId: number, item: {
  donem: string; zaman_puani: number; kalite_puani: number; isg_puani: number; belge_puani: number;
  ncr_acik_sayisi?: number; ncr_ortalama_kapanma_gun?: number; isg_ihlal_sayisi?: number; notes?: string;
}, aktor?: number) => istek<PerformansKarti>(`/sozlesmeler/${sozlesmeId}/performans`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
