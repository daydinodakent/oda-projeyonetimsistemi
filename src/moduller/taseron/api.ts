// Taşeron — ince REST istemcisi. server/moduller/taseron/routes.js
// altındaki uçları çağırır.
import type {
  TaseronEkip, OdemeTipi, EkipUye, RolSaha, EkipUyeYevmiye, EksikEvrakliUye, TaseronPuantajKaydi,
  TaseronMetraj, OdemeDonemi, OdemeDonemiKesinti, DonemKesintiTuru, VerimlilikRaporu, KayipZimmet,
} from './types';

const BASE = '/api/taseron';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Taşeron API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

// --- Ekip ---
export const ekipleriListele = (projeId: string) => istek<TaseronEkip[]>(`/ekipler?proje_id=${encodeURIComponent(projeId)}`);
export const ekipGetir = (id: number) => istek<TaseronEkip>(`/ekipler/${id}`);
export const ekipOlustur = (item: { sozlesme_id: number; ekip_basi_kisi_id?: number; is_kolu?: string; odeme_tipi?: OdemeTipi }, aktor?: number) =>
  istek<TaseronEkip>('/ekipler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Ekip Üyesi ---
export const ekipUyeleriGetir = (ekipId: number) => istek<EkipUye[]>(`/ekipler/${ekipId}/uyeler`);
export const uyeEkle = (ekipId: number, item: { kisi_id: number; rol_saha?: RolSaha; sgk_giris_bildirge_tarihi?: string; baslangic_tarihi: string }, aktor?: number) =>
  istek<EkipUye>(`/ekipler/${ekipId}/uyeler`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const sgkBildirgesiGuncelle = (ekipUyeId: number, tarih: string, aktor?: number) =>
  istek<EkipUye>(`/ekip-uyeleri/${ekipUyeId}/sgk-bildirge`, { method: 'POST', body: JSON.stringify({ tarih, aktor }) });
export const uyeAyril = (ekipUyeId: number, tarih: string, aktor?: number) =>
  istek<{ ok: boolean }>(`/ekip-uyeleri/${ekipUyeId}/ayril`, { method: 'POST', body: JSON.stringify({ tarih, aktor }) });
export const yevmiyeGecmisiGetir = (ekipUyeId: number) => istek<EkipUyeYevmiye[]>(`/ekip-uyeleri/${ekipUyeId}/yevmiye`);
export const yevmiyeTanimla = (ekipUyeId: number, yevmiyeKurus: number, gecerliBaslangic: string, aktor?: number) =>
  istek<EkipUyeYevmiye>(`/ekip-uyeleri/${ekipUyeId}/yevmiye`, { method: 'POST', body: JSON.stringify({ yevmiye_kurus: yevmiyeKurus, gecerli_baslangic: gecerliBaslangic, aktor }) });
export const eksikEvrakliUyeleriGetir = (ekipId: number, tarih?: string) => istek<EksikEvrakliUye[]>(`/ekipler/${ekipId}/eksik-evrakli-uyeler${tarih ? `?tarih=${tarih}` : ''}`);

// --- Puantaj ---
export const puantajKaydet = (item: {
  ekip_uye_id: number; tarih: string; gun_degeri: 0 | 0.5 | 1; gun_tipi?: string; bayram_pazar_mi?: boolean;
  maliyet_kodu_id: number; fazla_mesai_saat?: number; yetkiliOnayi?: boolean; gerekce?: string;
}, aktor?: number) => istek<{ kayit: TaseronPuantajKaydi; tekrarGonderim: boolean }>('/puantaj', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const tumEkibeUygula = (ekipId: number, tarih: string, gunDegeri: number, maliyetKoduId: number, aktor?: number) =>
  istek<{ basarili: TaseronPuantajKaydi[]; basarisiz: { ekip_uye_id: number; hata: string }[] }>(`/ekipler/${ekipId}/puantaj/tum-ekip`, { method: 'POST', body: JSON.stringify({ tarih, gun_degeri: gunDegeri, maliyet_kodu_id: maliyetKoduId, aktor }) });
export const kisiPuantajAraligiGetir = (kisiId: number, baslangic: string, bitis: string) =>
  istek<TaseronPuantajKaydi[]>(`/kisiler/${kisiId}/puantaj?baslangic=${baslangic}&bitis=${bitis}`);

// --- Metraj ---
export const metrajListele = (ekipId: number) => istek<TaseronMetraj[]>(`/ekipler/${ekipId}/metraj`);
export const metrajKaydet = (ekipId: number, item: { sozlesme_kalem_id: number; tarih: string; miktar: number; notes?: string }, aktor?: number) =>
  istek<TaseronMetraj>(`/ekipler/${ekipId}/metraj`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const metrajSefOnayi = (metrajId: number, onayMiktari: number, aktor?: number) =>
  istek<TaseronMetraj>(`/metraj/${metrajId}/onay`, { method: 'POST', body: JSON.stringify({ onay_miktari: onayMiktari, aktor }) });

// --- Ödeme Dönemi ---
export const donemleriListele = (ekipId: number) => istek<OdemeDonemi[]>(`/ekipler/${ekipId}/donemler`);
export const donemGetir = (id: number) => istek<OdemeDonemi>(`/donemler/${id}`);
export const donemOlustur = (item: { ekip_id: number; donem_baslangic: string; donem_bitis: string; notes?: string }, aktor?: number) =>
  istek<OdemeDonemi>('/donemler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const donemHesapla = (id: number, aktor?: number) => istek<OdemeDonemi>(`/donemler/${id}/hesapla`, { method: 'POST', body: JSON.stringify({ aktor }) });
export const donemDurumDegistir = (id: number, durum: string, aktor?: number) =>
  istek<OdemeDonemi>(`/donemler/${id}/durum`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });
export const donemOdemeTalimatiOlustur = (id: number, vadeTarihi: string, aktor?: number) =>
  istek<{ id: number; numara: string; tutar_kurus: number }>(`/donemler/${id}/odeme-talimati`, { method: 'POST', body: JSON.stringify({ vade_tarihi: vadeTarihi, aktor }) });

// --- Kesinti ---
export const donemKesintileriGetir = (donemId: number) => istek<OdemeDonemiKesinti[]>(`/donemler/${donemId}/kesintiler`);
export const donemKesintiEkle = (donemId: number, item: { tur: DonemKesintiTuru; tutar_kurus: number; aciklama?: string }, aktor?: number) =>
  istek<OdemeDonemi>(`/donemler/${donemId}/kesintiler`, { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const donemMalzemeFireKesintisiEkle = (donemId: number, sozlesmeId: number, aktor?: number) =>
  istek<OdemeDonemi>(`/donemler/${donemId}/kesintiler/malzeme-fire`, { method: 'POST', body: JSON.stringify({ sozlesme_id: sozlesmeId, aktor }) });
export const kayipZimmetleriGetir = (ekipId: number) => istek<KayipZimmet[]>(`/ekipler/${ekipId}/kayip-zimmetler`);

// --- Verimlilik ---
export const verimlilikRaporuGetir = (ekipId: number, sozlesmeKalemId: number, baslangic: string, bitis: string) =>
  istek<VerimlilikRaporu>(`/verimlilik?ekip_id=${ekipId}&sozlesme_kalem_id=${sozlesmeKalemId}&baslangic=${baslangic}&bitis=${bitis}`);
