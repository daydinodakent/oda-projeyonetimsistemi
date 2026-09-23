// Satın Alma — ince REST istemcisi. server/moduller/satinalma/routes.js
// altındaki uçları çağırır.
import type {
  SatinalmaTalep, SatinalmaTalepOlusturIstek, SatinalmaTalepKalem, TalepDurumu, SatinalmaTeklif, SatinalmaTeklifKalem, MukayeseSonucu,
  SatinalmaSiparis, SiparisDurumu, SatinalmaSiparisKalem, SatinalmaMalKabul, SatinalmaFatura, SatinalmaFaturaKalem,
  EslestirmeSonucu, EslesmeIstisnasi, TedarikciKarnesi,
} from './types';

const BASE = '/api/satinalma';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Satın Alma API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

// --- Talep ---
export const talepleriListele = (projeId: string) => istek<SatinalmaTalep[]>(`/talepler?proje_id=${encodeURIComponent(projeId)}`);
export const talepGetir = (id: number) => istek<SatinalmaTalep>(`/talepler/${id}`);
export const talepOlustur = (item: SatinalmaTalepOlusturIstek, aktor?: number) =>
  istek<SatinalmaTalep>('/talepler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const talepDurumDegistir = (id: number, durum: TalepDurumu, aktor?: number) =>
  istek<SatinalmaTalep>(`/talepler/${id}/durum`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });
export const talepKalemleriGetir = (talepId: number) => istek<SatinalmaTalepKalem[]>(`/talepler/${talepId}/kalemler`);
export const talepKalemEkle = (talepId: number, item: Partial<SatinalmaTalepKalem>, aktor?: number) =>
  istek<SatinalmaTalepKalem>(`/talepler/${talepId}/kalemler`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const mukayeseGetir = (talepId: number) => istek<MukayeseSonucu>(`/talepler/${talepId}/mukayese`);

// --- Teklif ---
export const teklifleriGetir = (talepId: number) => istek<SatinalmaTeklif[]>(`/talepler/${talepId}/teklifler`);
export const teklifTalepGonder = (item: { talep_id: number; firma_id: number; gecerlilik_tarihi?: string; vade_gun?: number; teslim_suresi_gun?: number; nakliye_dahil?: boolean }, aktor?: number) =>
  istek<SatinalmaTeklif>('/teklifler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const teklifiGir = (teklifId: number, kalemler: { talep_kalem_id: number; miktar: number; birim_fiyat_kurus: number; kdv_orani?: number }[], aktor?: number) =>
  istek<SatinalmaTeklif>(`/teklifler/${teklifId}/giris`, { method: 'POST', body: JSON.stringify({ kalemler, aktor }) });
export const teklifKalemleriGetir = (teklifId: number) => istek<SatinalmaTeklifKalem[]>(`/teklifler/${teklifId}/kalemler`);
export const teklifEle = (teklifId: number, aktor?: number) =>
  istek<{ ok: boolean }>(`/teklifler/${teklifId}/ele`, { method: 'POST', body: JSON.stringify({ aktor }) });

// --- Sipariş ---
export const siparisleriListele = (projeId: string) => istek<SatinalmaSiparis[]>(`/siparisler?proje_id=${encodeURIComponent(projeId)}`);
export const siparisGetir = (id: number) => istek<SatinalmaSiparis>(`/siparisler/${id}`);
export const siparisOlustur = (item: Partial<SatinalmaSiparis>, aktor?: number) =>
  istek<SatinalmaSiparis>('/siparisler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const siparisDurumDegistir = (id: number, durum: SiparisDurumu, aktor?: number) =>
  istek<SatinalmaSiparis>(`/siparisler/${id}/durum`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });
export const siparisKalemleriGetir = (siparisId: number) => istek<SatinalmaSiparisKalem[]>(`/siparisler/${siparisId}/kalemler`);
export const siparisKalemEkle = (siparisId: number, item: Partial<SatinalmaSiparisKalem>, aktor?: number) =>
  istek<SatinalmaSiparisKalem>(`/siparisler/${siparisId}/kalemler`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const siparisFaturalariGetir = (siparisId: number) => istek<SatinalmaFatura[]>(`/siparisler/${siparisId}/faturalar`);

// --- Mal Kabul (geçici/minimal) ---
export const malKabulKaydet = (item: Partial<SatinalmaMalKabul>, aktor?: number) =>
  istek<SatinalmaMalKabul>('/mal-kabul', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const malKabulleriGetir = (siparisKalemId: number) => istek<SatinalmaMalKabul[]>(`/siparis-kalemleri/${siparisKalemId}/mal-kabul`);

// --- Fatura ---
export const faturaGetir = (id: number) => istek<SatinalmaFatura>(`/faturalar/${id}`);
export const faturaKalemleriGetir = (faturaId: number) => istek<SatinalmaFaturaKalem[]>(`/faturalar/${faturaId}/kalemler`);
export const faturaKaydet = (item: {
  siparis_id: number; firma_id: number; fatura_no: string; fatura_tarihi: string; vade_tarihi: string; tevkifat_orani?: number;
  kalemler: { siparis_kalem_id?: number; aciklama?: string; miktar: number; birim_fiyat_kurus: number; kdv_orani?: number }[];
}, aktor?: number) => istek<SatinalmaFatura>('/faturalar', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const faturaEslestir = (faturaId: number, aktor?: number) =>
  istek<EslestirmeSonucu>(`/faturalar/${faturaId}/eslestir`, { method: 'POST', body: JSON.stringify({ aktor }) });
export const faturaIstisnalariGetir = (faturaId: number) => istek<EslesmeIstisnasi[]>(`/faturalar/${faturaId}/istisnalar`);
export const faturaOdemeTalimatiOlustur = (faturaId: number, aktor?: number) =>
  istek<{ id: number; numara: string }>(`/faturalar/${faturaId}/odeme-talimati`, { method: 'POST', body: JSON.stringify({ aktor }) });

// --- Tedarikçi Karnesi ---
export const tedarikciKarnesiGetir = (firmaId: number) => istek<TedarikciKarnesi>(`/tedarikci-karnesi/${firmaId}`);
