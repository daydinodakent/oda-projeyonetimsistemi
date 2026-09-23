// Depo — ince REST istemcisi. server/moduller/depo/routes.js altındaki
// uçları çağırır.
import type {
  MalzemeKarti, MalzemeBirimDonusum, Depo, StokBakiye, StokHareketi, GirisIstek, CikisIstek,
  Transfer, Sayim, SayimKalem, MalKabul, Zimmet, ZimmetAlanTipi,
} from './types';

const BASE = '/api/depo';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Depo API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

// --- Malzeme Kartı ---
export const malzemeleriListele = () => istek<MalzemeKarti[]>('/malzemeler');
export const malzemeGetir = (id: number) => istek<MalzemeKarti>(`/malzemeler/${id}`);
export const malzemeOlustur = (item: Partial<MalzemeKarti>, aktor?: number) =>
  istek<MalzemeKarti>('/malzemeler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const malzemePasifEt = (id: number, aktor?: number) =>
  istek<{ ok: boolean }>(`/malzemeler/${id}${aktor ? `?aktor=${aktor}` : ''}`, { method: 'DELETE' });
export const birimDonusumleriGetir = (malzemeId: number) => istek<MalzemeBirimDonusum[]>(`/malzemeler/${malzemeId}/birim-donusumleri`);
export const birimDonusumTanimla = (malzemeId: number, birim: string, katsayi: number, aktor?: number) =>
  istek<{ ok: boolean }>(`/malzemeler/${malzemeId}/birim-donusumleri`, { method: 'POST', body: JSON.stringify({ birim, katsayi, aktor }) });

// --- Depo ---
export const depolariListele = (projeId?: string) => istek<Depo[]>(`/depolar${projeId ? `?proje_id=${encodeURIComponent(projeId)}` : ''}`);
export const depoOlustur = (item: Partial<Depo>, aktor?: number) =>
  istek<Depo>('/depolar', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const depoPasifEt = (id: number, aktor?: number) =>
  istek<{ ok: boolean }>(`/depolar/${id}${aktor ? `?aktor=${aktor}` : ''}`, { method: 'DELETE' });

// --- Stok ---
export const depoStoklariGetir = (depoId: number) => istek<StokBakiye[]>(`/stok/${depoId}`);
export const stokBakiyeGetir = (depoId: number, malzemeId: number) => istek<StokBakiye>(`/stok/${depoId}/${malzemeId}`);
export const hareketGecmisiGetir = (depoId: number, malzemeId: number) => istek<StokHareketi[]>(`/stok/${depoId}/${malzemeId}/hareketler`);
export const stokGirisi = (item: GirisIstek, aktor?: number) =>
  istek<{ kayit: StokHareketi; tekrarGonderim: boolean }>('/stok/giris', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const stokCikisi = (item: CikisIstek, aktor?: number) =>
  istek<{ kayit: StokHareketi; tekrarGonderim: boolean }>('/stok/cikis', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const kesintiAdaylariniGetir = () => istek<StokHareketi[]>('/kesinti-adaylari');

// --- Transfer ---
export const transferleriGetir = (depoId: number) => istek<Transfer[]>(`/transferler/${depoId}`);
export const transferBaslat = (item: { kaynak_depo_id: number; hedef_depo_id: number; malzeme_id: number; miktar: number; birim: string; proje_id: string }, aktor?: number) =>
  istek<Transfer>('/transferler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const transferTeslimAl = (id: number, aktor?: number) =>
  istek<Transfer>(`/transferler/${id}/teslim-al`, { method: 'POST', body: JSON.stringify({ aktor }) });

// --- Sayım ---
export const sayimBaslat = (depoId: number, tarih: string, aktor?: number) =>
  istek<Sayim>('/sayim', { method: 'POST', body: JSON.stringify({ depo_id: depoId, tarih, aktor }) });
export const sayimKalemleriGetir = (sayimId: number) => istek<SayimKalem[]>(`/sayim/${sayimId}/kalemler`);
export const sayimKalemGir = (sayimId: number, malzemeId: number, sayilanMiktar: number) =>
  istek<SayimKalem>(`/sayim/${sayimId}/kalemler`, { method: 'POST', body: JSON.stringify({ malzeme_id: malzemeId, sayilan_miktar: sayilanMiktar }) });
export const sayimTamamla = (sayimId: number, aktor?: number) =>
  istek<{ sayim: Sayim; farklar: { malzeme_id: number; fark: number }[] }>(`/sayim/${sayimId}/tamamla`, { method: 'POST', body: JSON.stringify({ aktor }) });

// --- Mal Kabul ---
export const malKabulKaydet = (item: {
  siparis_kalem_id: number; depo_id?: number; gelen_miktar: number; kabul_miktar: number; red_miktar?: number;
  red_nedeni?: string; fotograf_url?: string; irsaliye_no?: string; tarih: string; notes?: string;
}, aktor?: number) => istek<MalKabul>('/mal-kabul', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const malKabulleriGetir = (siparisKalemId: number) => istek<MalKabul[]>(`/siparis-kalemleri/${siparisKalemId}/mal-kabul`);

// --- Zimmet ---
export const zimmetListele = (sadeceAcik?: boolean) => istek<Zimmet[]>(`/zimmet${sadeceAcik ? '?acik=true' : ''}`);
export const zimmetVer = (item: {
  malzeme_id: number; depo_id?: number; miktar?: number; zimmet_alan_tipi: ZimmetAlanTipi; zimmet_alan_kisi_id?: number;
  zimmet_alan_aciklama?: string; kkd_mi?: boolean; zimmet_tarihi: string; beklenen_iade_tarihi?: string; notes?: string;
}, aktor?: number) => istek<Zimmet>('/zimmet', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const zimmetIadeEt = (id: number, tarih: string, aktor?: number) =>
  istek<Zimmet>(`/zimmet/${id}/iade`, { method: 'POST', body: JSON.stringify({ tarih, aktor }) });
export const zimmetKayipIsaretle = (id: number, aktor?: number) =>
  istek<Zimmet>(`/zimmet/${id}/kayip`, { method: 'POST', body: JSON.stringify({ aktor }) });
