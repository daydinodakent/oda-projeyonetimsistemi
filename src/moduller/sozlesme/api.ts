// Sözleşme — ince REST istemcisi. server/moduller/sozlesme/routes.js
// altındaki uçları çağırır. src/moduller/_cekirdek/api.ts ile AYNI kalıp.
import type {
  Sozlesme, SozlesmeOlusturIstek, SozlesmeDurumu, SozlesmeVersiyon, ZeyilnameIstek, KalanBedel,
  SozlesmeKalem, SozlesmeMadde, SozlesmeTeminat, IadeDurumu, SozlesmeBelge, KritikTarih, SozlesmeSablon, SozlesmeTipi,
} from './types';

const BASE = '/api/sozlesme';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Sözleşme API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

// --- Sözleşme ---
export const sozlesmeleriListele = (projeId: string) => istek<Sozlesme[]>(`?proje_id=${encodeURIComponent(projeId)}`);
export const sozlesmeGetir = (id: number) => istek<Sozlesme>(`/${id}`);
export const sozlesmeOlustur = (item: SozlesmeOlusturIstek, aktor?: number) =>
  istek<Sozlesme>('/', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const sozlesmeDurumDegistir = (id: number, durum: SozlesmeDurumu, aktor?: number) =>
  istek<Sozlesme>(`/${id}/durum`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });
export const sozlesmeKalanBedel = (id: number) => istek<KalanBedel>(`/${id}/kalan-bedel`);

// --- Kalem ---
export const kalemleriGetir = (sozlesmeId: number) => istek<SozlesmeKalem[]>(`/${sozlesmeId}/kalemler`);
export const kalemEkle = (sozlesmeId: number, item: Partial<SozlesmeKalem>, aktor?: number) =>
  istek<SozlesmeKalem>(`/${sozlesmeId}/kalemler`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const kalemSil = (kalemId: number, aktor?: number) =>
  istek<{ ok: boolean }>(`/kalemler/${kalemId}${aktor ? `?aktor=${aktor}` : ''}`, { method: 'DELETE' });

// --- Versiyon / Zeyilname ---
export const versiyonlariGetir = (sozlesmeId: number) => istek<SozlesmeVersiyon[]>(`/${sozlesmeId}/versiyonlar`);
export const zeyilnameOlustur = (sozlesmeId: number, item: ZeyilnameIstek, aktor?: number) =>
  istek<{ sozlesme: Sozlesme; versiyon: SozlesmeVersiyon }>(`/${sozlesmeId}/zeyilname`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Madde ---
export const maddeleriGetir = (sozlesmeId: number) => istek<SozlesmeMadde[]>(`/${sozlesmeId}/maddeler`);
export const maddeEkle = (sozlesmeId: number, item: Partial<SozlesmeMadde>, aktor?: number) =>
  istek<SozlesmeMadde>(`/${sozlesmeId}/maddeler`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Teminat ---
export const teminatlariGetir = (sozlesmeId: number) => istek<SozlesmeTeminat[]>(`/${sozlesmeId}/teminatlar`);
export const teminatEkle = (sozlesmeId: number, item: Partial<SozlesmeTeminat>, aktor?: number) =>
  istek<SozlesmeTeminat>(`/${sozlesmeId}/teminatlar`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const teminatIadeIsaretle = (teminatId: number, durum: IadeDurumu, aktor?: number) =>
  istek<{ ok: boolean }>(`/teminatlar/${teminatId}/iade`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });

// --- Belge (mevcut tb_dokumanlar'a referans) ---
export const belgeleriGetir = (sozlesmeId: number) => istek<SozlesmeBelge[]>(`/${sozlesmeId}/belgeler`);
export const belgeBagla = (sozlesmeId: number, dokumanId: string, rol?: string, aktor?: number) =>
  istek<SozlesmeBelge>(`/${sozlesmeId}/belgeler`, { method: 'POST', body: JSON.stringify({ dokuman_id: dokumanId, rol, aktor }) });

// --- Kritik Tarihler ---
export const kritikTarihleriGetir = (projeId: string) => istek<KritikTarih[]>(`/kritik-tarihler/${encodeURIComponent(projeId)}`);

// --- Şablon ---
export const sablonlariListele = (tip?: SozlesmeTipi) => istek<SozlesmeSablon[]>(`/sablonlar/liste${tip ? `?tip=${tip}` : ''}`);
export const sablonGetir = (id: number) => istek<SozlesmeSablon>(`/sablonlar/${id}`);
export const sablonOlustur = (item: Partial<SozlesmeSablon>, aktor?: number) =>
  istek<SozlesmeSablon>('/sablonlar', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const sablonSil = (id: number, aktor?: number) =>
  istek<{ ok: boolean }>(`/sablonlar/${id}${aktor ? `?aktor=${aktor}` : ''}`, { method: 'DELETE' });
export const sablonBelgeUret = (sablonId: number, degiskenler: Record<string, string>) =>
  istek<{ sablon_id: string; metin: string }>(`/sablonlar/${sablonId}/belge-uret`, { method: 'POST', body: JSON.stringify({ degiskenler }) });
