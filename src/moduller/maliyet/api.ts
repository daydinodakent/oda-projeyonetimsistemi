// Maliyet Yönetimi — ince REST istemcisi (server/moduller/maliyet/routes.js).
import type {
  ButceVersiyon, ButceSatir, MaliyetKoduTanim, MaliyetRaporu, DefterHareketi, KaynakBelge, Evm, NakitAkisi, Karlilik, UyariSonucu, Portfoy, MutabakatRaporu, KurBazi,
} from './types';

const BASE = '/api/maliyet';
async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let mesaj = body; try { mesaj = JSON.parse(body).error || body; } catch { /* düz metin */ }
    throw new Error(mesaj || `Maliyet API hatası (${res.status})`);
  }
  return res.json();
}
const post = <T>(path: string, body: unknown) => istek<T>(path, { method: 'POST', body: JSON.stringify(body) });
const q = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

export interface RaporSecenek { versiyonId?: number; kurBazi?: KurBazi; tarih?: string }
const sq = (projeId: string, s: RaporSecenek = {}) => q({ proje_id: projeId, versiyon_id: s.versiyonId, kur_bazi: s.kurBazi, tarih: s.tarih });

// Bütçe
export const versiyonlariListele = (projeId: string) => istek<ButceVersiyon[]>(`/butce/versiyonlar?${q({ proje_id: projeId })}`);
export const versiyonOlustur = (projeId: string, ad?: string) => post<ButceVersiyon>('/butce/versiyonlar', { proje_id: projeId, ad });
export const satirlariGetir = (versiyonId: number) => istek<ButceSatir[]>(`/butce/versiyonlar/${versiyonId}/satirlar`);
export const satirKaydet = (versiyonId: number, s: { maliyet_kodu_id: number; tutar_kurus: number; para_birimi?: string; kur?: number; kalan_tahmin_kurus?: number }) => post<ButceSatir>(`/butce/versiyonlar/${versiyonId}/satirlar`, s);
export const satirSil = (versiyonId: number, kodId: number) => istek<{ ok: boolean }>(`/butce/versiyonlar/${versiyonId}/satirlar/${kodId}`, { method: 'DELETE' });
export const butceOnayla = (versiyonId: number, onaylayan: string) => post<ButceVersiyon>(`/butce/versiyonlar/${versiyonId}/onay`, { onaylayan });
export const csvIceAktar = (versiyonId: number, csv: string) => post<{ eklenen: number; hatalar: { satir: number; hata: string }[] }>(`/butce/versiyonlar/${versiyonId}/ice-aktar`, { csv });
export const xlsxIceAktar = (versiyonId: number, base64: string) => post<{ eklenen: number; hatalar: { satir: number; hata: string }[] }>(`/butce/versiyonlar/${versiyonId}/ice-aktar`, { xlsx_base64: base64 });
export const maliyetKodlari = (projeId: string) => istek<MaliyetKoduTanim[]>(`/maliyet-kodlari?${q({ proje_id: projeId })}`);

// Raporlar
export const maliyetRaporu = (projeId: string, s?: RaporSecenek) => istek<MaliyetRaporu>(`/rapor?${sq(projeId, s)}`);
export const kodHareketleri = (projeId: string, kodId: number | 'kodsuz', s?: RaporSecenek) => istek<DefterHareketi[]>(`/rapor/hareketler?${sq(projeId, s)}&maliyet_kodu_id=${kodId}`);
export const hareketKaynagi = (hareketId: number) => istek<{ hareket: DefterHareketi; kaynak: KaynakBelge }>(`/hareketler/${hareketId}/kaynak`);
export const evm = (projeId: string, s?: RaporSecenek) => istek<Evm>(`/evm?${sq(projeId, s)}`);
export const nakitAkisi = (projeId: string, periyot: 'haftalik' | 'aylik') => istek<NakitAkisi>(`/nakit-akisi?${q({ proje_id: projeId, periyot })}`);
export const karlilik = (projeId: string, s?: RaporSecenek) => istek<Karlilik>(`/karlilik?${sq(projeId, s)}`);
export const uyarilar = (projeId: string, s?: RaporSecenek) => istek<UyariSonucu>(`/uyarilar?${sq(projeId, s)}`);
export const portfoy = (kurBazi?: KurBazi) => istek<Portfoy>(`/portfoy?${q({ kur_bazi: kurBazi })}`);
export const mutabakat = (projeId?: string) => istek<MutabakatRaporu>(`/mutabakat?${q({ proje_id: projeId })}`);
export const genelGiderDagit = (havuz: string, baslangic: string, bitis: string) => post('/genel-gider/dagit', { havuz_proje_id: havuz, donem_baslangic: baslangic, donem_bitis: bitis });
