// İK — ince REST istemcisi. server/moduller/ik/routes.js altındaki uçları
// çağırır. Belge işlemleri BURADA YOK — Çekirdek'in api.ts'inden
// (belgeleriListele/belgeOlustur/…) ilgili_tip='kisi' ile doğrudan çağrılır.
import type {
  Personel, CikisSonucu, Vardiya, PersonelProjeAtama, PersonelUcret, PdksYontemi,
  IzinHakkiTablosu, IzinBakiye, IzinTalebi, IzinTuru, Avans, BordroDonemi, BordroSatiri, DisaAktarimSatiri,
} from './types';
import type { PuantajKaydi } from '../_cekirdek/types';
import type { PdksMeta } from './types';

const BASE = '/api/ik';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`İK API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

// --- Personel ---
export const personelleriListele = () => istek<Personel[]>('/personel');
export const personelGetir = (id: number) => istek<Personel>(`/personel/${id}`);
export const personelKisiIcinGetir = (kisiId: number) => istek<Personel | null>(`/personel/kisi/${kisiId}`);
export const personelOlustur = (item: { kisi_id: number; sicil_no: string; departman?: string; unvan?: string; calisma_sekli?: string; vardiya_id?: number; ise_giris_tarihi: string; biyometrik_riza_verildi_mi?: boolean }, aktor?: number) =>
  istek<Personel>('/personel', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const personelGuncelle = (id: number, patch: Partial<Personel>, aktor?: number) =>
  istek<Personel>(`/personel/${id}`, { method: 'PUT', body: JSON.stringify({ ...patch, aktor }) });
export const personelCikisYap = (id: number, tarih: string, neden?: string, aktor?: number) =>
  istek<CikisSonucu>(`/personel/${id}/cikis`, { method: 'POST', body: JSON.stringify({ tarih, neden, aktor }) });

// --- Vardiya ---
export const vardiyalariListele = () => istek<Vardiya[]>('/vardiyalar');
export const vardiyaTanimla = (item: { ad: string; baslangic_saati: string; bitis_saati: string }, aktor?: number) =>
  istek<Vardiya>('/vardiyalar', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Proje Ataması ---
export const atamalariGetir = (personelId: number) => istek<PersonelProjeAtama[]>(`/personel/${personelId}/atamalar`);
export const projeyeAta = (personelId: number, item: { proje_id: string; baslangic_tarihi: string; bitis_tarihi?: string; notes?: string }, aktor?: number) =>
  istek<PersonelProjeAtama>(`/personel/${personelId}/atamalar`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Ücret Geçmişi ---
export const ucretGecmisiGetir = (personelId: number) => istek<PersonelUcret[]>(`/personel/${personelId}/ucret`);
export const ucretTanimla = (personelId: number, brutMaasKurus: number, gecerliBaslangic: string, aktor?: number) =>
  istek<PersonelUcret>(`/personel/${personelId}/ucret`, { method: 'POST', body: JSON.stringify({ brut_maas_kurus: brutMaasKurus, gecerli_baslangic: gecerliBaslangic, aktor }) });

// --- PDKS ---
export const pdksIcindekileriGetir = (projeId: string, tarih: string) =>
  istek<(PuantajKaydi & { pdks: PdksMeta | null })[]>(`/pdks/icindekiler?proje_id=${encodeURIComponent(projeId)}&tarih=${tarih}`);
export const pdksKaydet = (item: {
  personel_id: number; proje_id: string; tarih: string; yontem: PdksYontemi; giris_saati?: string; cikis_saati?: string;
  gun_degeri?: 0 | 0.5 | 1; fazla_mesai_saat?: number; maliyet_kodu_id?: number; konum_lat?: number; konum_lon?: number;
  geofence_icinde_mi?: boolean; istemci_kayit_id?: string; yetkiliOnayi?: boolean; gerekce?: string;
}, aktor?: number) => istek<PuantajKaydi & { pdks: PdksMeta; tekrarGonderim: boolean }>('/pdks', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const pdksDuzelt = (eskiPuantajId: number, yeniVeri: { personel_id: number; proje_id: string; tarih: string; yontem?: PdksYontemi; gun_degeri?: 0 | 0.5 | 1 }, onaylayan: string, aktor?: number) =>
  istek<PuantajKaydi>(`/pdks/${eskiPuantajId}/duzelt`, { method: 'POST', body: JSON.stringify({ ...yeniVeri, onaylayan, aktor }) });

// --- İzin ---
export const izinHakkiTablosunuListele = () => istek<IzinHakkiTablosu[]>('/izin-hakki-tablosu');
export const izinHakkiTanimla = (item: { kidem_yil_min: number; kidem_yil_max?: number; yillik_izin_gun: number; gecerli_baslangic: string }, aktor?: number) =>
  istek<IzinHakkiTablosu>('/izin-hakki-tablosu', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const izinBakiyesiniAcYadaGetir = (personelId: number, yil: number, kidemYil: number, yas?: number, aktor?: number) =>
  istek<IzinBakiye>(`/personel/${personelId}/izin-bakiyesi`, { method: 'POST', body: JSON.stringify({ yil, kidem_yil: kidemYil, yas, aktor }) });
export const izinBakiyesiGetir = (personelId: number, yil: number) => istek<IzinBakiye | null>(`/personel/${personelId}/izin-bakiyesi/${yil}`);
export const izinTalepleriGetir = (personelId: number) => istek<IzinTalebi[]>(`/personel/${personelId}/izin-talepleri`);
export const izinTalepEt = (item: { personel_id: number; tur: IzinTuru; baslangic_tarihi: string; bitis_tarihi: string; gun_sayisi: number; aciklama?: string }, aktor?: number) =>
  istek<IzinTalebi>('/izin-talepleri', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const izinOnayla = (id: number, onaylayan: string, aktor?: number) =>
  istek<IzinTalebi>(`/izin-talepleri/${id}/onay`, { method: 'POST', body: JSON.stringify({ onaylayan, aktor }) });
export const izinReddet = (id: number, aktor?: number) => istek<IzinTalebi>(`/izin-talepleri/${id}/red`, { method: 'POST', body: JSON.stringify({ aktor }) });

// --- Avans ---
export const avanslariGetir = (personelId: number) => istek<Avans[]>(`/personel/${personelId}/avanslar`);
export const avansTalepEt = (item: { personel_id: number; tutar_kurus: number; talep_tarihi: string; taksit_sayisi?: number; notes?: string }, aktor?: number) =>
  istek<Avans>('/avanslar', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const avansOnayla = (id: number, onaylayan: string, aktor?: number) => istek<Avans>(`/avanslar/${id}/onay`, { method: 'POST', body: JSON.stringify({ onaylayan, aktor }) });
export const avansReddet = (id: number, aktor?: number) => istek<Avans>(`/avanslar/${id}/red`, { method: 'POST', body: JSON.stringify({ aktor }) });

// --- Bordro Dönemi ---
export const bordroDonemleriniListele = () => istek<BordroDonemi[]>('/bordro-donemleri');
export const bordroDonemiGetir = (id: number) => istek<BordroDonemi>(`/bordro-donemleri/${id}`);
export const bordroDonemiOlustur = (item: { donem_yil: number; donem_ay: number; notes?: string }, aktor?: number) =>
  istek<BordroDonemi>('/bordro-donemleri', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const bordroSatirlariniGetir = (donemId: number) => istek<BordroSatiri[]>(`/bordro-donemleri/${donemId}/satirlar`);
export const bordroPersonelHesapla = (donemId: number, personelId: number, aktor?: number) =>
  istek<BordroSatiri>(`/bordro-donemleri/${donemId}/hesapla/${personelId}`, { method: 'POST', body: JSON.stringify({ aktor }) });
export const bordroDurumDegistir = (donemId: number, durum: string, aktor?: number) =>
  istek<BordroDonemi>(`/bordro-donemleri/${donemId}/durum`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });
export const bordroDisaAktarimGetir = (donemId: number) => istek<DisaAktarimSatiri[]>(`/bordro-donemleri/${donemId}/disa-aktarim`);
