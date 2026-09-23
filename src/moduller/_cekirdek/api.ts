// Ortak Çekirdek — ince REST istemcisi. server/moduller/_cekirdek/routes.js
// altındaki uçları çağırır (bkz. o dosyanın başındaki not: generic
// '/api/:table' deseninden ÖNCE mount edilmiştir). src/services/api.ts ile
// AYNI kalıp (apiRequest → fetch, '/api' kökü, Vite proxy'si) — burada
// TEKRAR YAZILMADI, aynı deseni izleyen bağımsız bir istemci.
import type {
  CariFirma, Kisi, KisiOlusturIstek, Parametre, MaliyetKodu, MaliyetHareketi, MaliyetOlayi,
  OdemeTalimati, Odeme, OdemeTalimatiDurumu, PuantajKaydi, AuditKaydi,
} from './types';

const BASE = '/api/cekirdek';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Çekirdek API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

// --- Firma (Cari) ---
export const firmalariListele = () => istek<CariFirma[]>('/firmalar');
export const firmaGetir = (id: number) => istek<CariFirma>(`/firmalar/${id}`);
export const firmaOlustur = (item: Partial<CariFirma>, aktor?: number) =>
  istek<CariFirma>('/firmalar', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const firmaGuncelle = (id: number, patch: Partial<CariFirma>, aktor?: number) =>
  istek<CariFirma>(`/firmalar/${id}`, { method: 'PUT', body: JSON.stringify({ ...patch, aktor }) });
export const firmaPasifEt = (id: number) => istek<{ ok: boolean }>(`/firmalar/${id}`, { method: 'DELETE' });
export const firmaKaraListeIsaretle = (id: number, karaListe: boolean, notu: string, aktor?: number) =>
  istek<CariFirma>(`/firmalar/${id}/kara-liste`, { method: 'POST', body: JSON.stringify({ kara_liste: karaListe, notu, aktor }) });

// --- Kişi ---
export const kisileriListele = (rol?: string) => istek<Kisi[]>(`/kisiler${rol ? `?rol=${encodeURIComponent(rol)}` : ''}`);
export const kisiGetir = (id: number) => istek<Kisi>(`/kisiler/${id}`);
export const kisiOlustur = (item: KisiOlusturIstek, aktor?: number) =>
  istek<Kisi>('/kisiler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const kisiGuncelle = (id: number, patch: Partial<KisiOlusturIstek>, aktor?: number) =>
  istek<Kisi>(`/kisiler/${id}`, { method: 'PUT', body: JSON.stringify({ ...patch, aktor }) });
export const kisiPasifEt = (id: number) => istek<{ ok: boolean }>(`/kisiler/${id}`, { method: 'DELETE' });

// --- Parametre ---
export const parametreleriListele = (kod?: string) => istek<Parametre[]>(`/parametreler${kod ? `?kod=${encodeURIComponent(kod)}` : ''}`);
export const parametreDegerAl = (kod: string, tarih?: string) =>
  istek<Parametre>(`/parametreler/deger?kod=${encodeURIComponent(kod)}${tarih ? `&tarih=${tarih}` : ''}`);
export const parametreOlustur = (item: Partial<Parametre>, aktor?: number) =>
  istek<Parametre>('/parametreler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Numara serileri ---
export const sonrakiNumara = (seriKodu: string, yil?: number) =>
  istek<{ numara: string }>(`/numara-serileri/${seriKodu}/sonraki`, { method: 'POST', body: JSON.stringify({ yil }) }).then((r) => r.numara);

// --- Maliyet Kodu ---
export const maliyetKodlariniListele = (projeId: string) => istek<MaliyetKodu[]>(`/maliyet-kodlari?proje_id=${encodeURIComponent(projeId)}`);
export const maliyetKoduOlustur = (item: { proje_id: string; wbs_gorev_id: string; kaynak_tipi: string }, aktor?: number) =>
  istek<MaliyetKodu>('/maliyet-kodlari', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Maliyet Defteri ---
export const maliyetHareketleriniListele = (projeId: string) => istek<MaliyetHareketi[]>(`/maliyet-hareketleri?proje_id=${encodeURIComponent(projeId)}`);
export const maliyetOzetiGetir = (maliyetKoduId: number) => istek<Record<string, number>>(`/maliyet-hareketleri/ozet/${maliyetKoduId}`);
/** Sözleşme: server'daki maliyetDefteri.yaz(olay) — diğer modüller SADECE bunu çağırır. */
export const maliyetHareketiYaz = (olay: MaliyetOlayi, aktor?: number) =>
  istek<{ kayit: MaliyetHareketi; tekrarGonderim: boolean }>('/maliyet-hareketleri', { method: 'POST', body: JSON.stringify({ ...olay, aktor }) });
export const maliyetHareketiIptalEt = (id: number, aktor?: number, notes?: string) =>
  istek<MaliyetHareketi>(`/maliyet-hareketleri/${id}/iptal`, { method: 'POST', body: JSON.stringify({ aktor, notes }) });

// --- Ödeme ---
export const odemeTalimatlariniListele = (projeId: string) => istek<OdemeTalimati[]>(`/odeme-talimatlari?proje_id=${encodeURIComponent(projeId)}`);
export const odemeTalimatiOlustur = (item: Partial<OdemeTalimati>, aktor?: number) =>
  istek<OdemeTalimati>('/odeme-talimatlari', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const odemeTalimatiDurumDegistir = (id: number, durum: OdemeTalimatiDurumu, aktor?: number) =>
  istek<OdemeTalimati>(`/odeme-talimatlari/${id}/durum`, { method: 'POST', body: JSON.stringify({ durum, aktor }) });
export const odemeleriListele = (talimatId: number) => istek<Odeme[]>(`/odeme-talimatlari/${talimatId}/odemeler`);
export const odemeKaydet = (item: Partial<Odeme>, aktor?: number) =>
  istek<Odeme>('/odemeler', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });

// --- Puantaj ---
export const puantajGunuGetir = (projeId: string, tarih: string) =>
  istek<PuantajKaydi[]>(`/puantaj?proje_id=${encodeURIComponent(projeId)}&tarih=${tarih}`);
export const puantajKaydet = (item: Partial<PuantajKaydi>, aktor?: number) =>
  istek<{ kayit: PuantajKaydi; tekrarGonderim: boolean }>('/puantaj', { method: 'POST', body: JSON.stringify({ ...item, aktor }) });
export const puantajOnayla = (id: number, aktor?: number) =>
  istek<PuantajKaydi>(`/puantaj/${id}/onay`, { method: 'POST', body: JSON.stringify({ aktor }) });

// --- Audit log (salt okunur) ---
export const auditGecmisiniGetir = (varlik: string, varlikId: string | number) =>
  istek<AuditKaydi[]>(`/audit?varlik=${encodeURIComponent(varlik)}&varlik_id=${encodeURIComponent(String(varlikId))}`);
