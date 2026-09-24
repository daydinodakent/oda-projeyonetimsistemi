// Müşteri — ince REST istemcisi (server/moduller/musteri/routes.js).
import type {
  Izgara, BolumDetay, Bolum, Rezervasyon, Satis, TaksitGirdisi, OdemePlaniDetay, Tahsilat, OdemeOzeti, VadesiGecen, Hatirlatma,
  Aday, AdayAsamasi, Huni, TeslimTutanagi, SatisSonrasiTalep, MusteriKarti, KvkkDurum,
} from './types';

const BASE = '/api/musteri';
async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let mesaj = body; try { mesaj = JSON.parse(body).error || body; } catch { /* düz metin */ }
    throw new Error(mesaj || `Müşteri API hatası (${res.status})`);
  }
  return res.json();
}
const post = <T>(path: string, body: unknown) => istek<T>(path, { method: 'POST', body: JSON.stringify(body) });
const q = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

// Bölüm / satış tablosu
export const satisTablosu = (projeId: string) => istek<Izgara>(`/satis-tablosu?${q({ proje_id: projeId })}`);
export const bolumGetir = (id: number) => istek<BolumDetay>(`/bolumler/${id}`);
export const bolumOlustur = (b: { proje_id: string; blok: string; kat: string; kapi_no: string; tip: string; brut_m2?: number; net_m2?: number; cephe?: string }) => post<Bolum>('/bolumler', b);
export const fiyatTanimla = (bolumId: number, fiyatKurus: number, gecerliBaslangic: string, paraBirimi = 'TRY') => post(`/bolumler/${bolumId}/fiyat`, { fiyat_kurus: fiyatKurus, gecerli_baslangic: gecerliBaslangic, para_birimi: paraBirimi });
export const arsaSahibineAyir = (bolumId: number, arsaSozlesmeId: number) => post<Bolum>(`/bolumler/${bolumId}/arsa-sahibine-ayir`, { arsa_sozlesme_id: arsaSozlesmeId });
export const paylasimUygula = (arsaSozlesmeId: number) => post<{ ayrilan: string[]; bulunamayan: string[]; atlanan: string[] }>(`/arsa-sozlesmeleri/${arsaSozlesmeId}/paylasim-uygula`, {});

// Rezervasyon
export const rezervasyonOlustur = (r: { bolum_id: number; aday_id?: number; kisi_id?: number; kaparo_kurus?: number; baslangic_tarihi: string; bitis_tarihi: string }) => post<Rezervasyon>('/rezervasyonlar', r);
export const rezervasyonIptal = (id: number) => post<Rezervasyon>(`/rezervasyonlar/${id}/iptal`, {});
export const rezervasyonlariListele = (projeId: string) => istek<Rezervasyon[]>(`/rezervasyonlar?${q({ proje_id: projeId })}`);

// Satış / plan / tahsilat
export const satislariListele = (projeId: string) => istek<Satis[]>(`/satislar?${q({ proje_id: projeId })}`);
export const satisOlustur = (s: { bolum_id: number; musteriler: { kisi_id?: number; firma_id?: number; hisse_yuzde?: number }[]; tutar_kurus?: number; para_birimi?: string; kur?: number; satis_tarihi: string; rezervasyon_id?: number }) => post<Satis>('/satislar', s);
export const satisOnayla = (id: number) => post<Satis>(`/satislar/${id}/onay`, {});
export const satisIptal = (id: number) => post<Satis>(`/satislar/${id}/iptal`, {});
export const planGetir = (satisId: number) => istek<OdemePlaniDetay | null>(`/satislar/${satisId}/plan`);
export const planOlustur = (satisId: number, taksitler: TaksitGirdisi[]) => post<OdemePlaniDetay>(`/satislar/${satisId}/plan`, { taksitler });
export const planRevize = (satisId: number, taksitler: TaksitGirdisi[], nedeni: string) => post<OdemePlaniDetay>(`/satislar/${satisId}/plan/revize`, { taksitler, nedeni });
export const krediDurumu = (taksitId: number, durum: string) => post(`/taksitler/${taksitId}/kredi-durumu`, { durum });
export const tahsilatlariGetir = (satisId: number) => istek<Tahsilat[]>(`/satislar/${satisId}/tahsilatlar`);
export const odemeOzeti = (satisId: number) => istek<OdemeOzeti>(`/satislar/${satisId}/odeme-ozeti`);
export const tahsilatKaydet = (satisId: number, t: { tutar_kurus: number; tarih: string; kur?: number; yontem?: string; taksit_id?: number; endeks_farki_kurus?: number }) => post<{ tahsilat: Tahsilat }>(`/satislar/${satisId}/tahsilatlar`, t);

// Vade / hatırlatma
export const vadesiGecenler = (projeId: string, tarih?: string) => istek<VadesiGecen[]>(`/vadesi-gecenler?${q({ proje_id: projeId, tarih })}`);
export const hatirlatmaUret = (projeId: string, tarih?: string) => post<{ eklenen: number }>('/hatirlatmalar/uret', { proje_id: projeId, tarih });
export const bekleyenHatirlatmalar = (tarih?: string) => istek<Hatirlatma[]>(`/hatirlatmalar/bekleyen?${q({ tarih })}`);

// Teslim / talep
export const teslimGetir = (satisId: number) => istek<TeslimTutanagi | null>(`/satislar/${satisId}/teslim`);
export const teslimYap = (satisId: number, t: { tarih: string; teslim_alan?: string; eksikler?: string[]; istisnaOnayi?: boolean; gerekce?: string }) => post<TeslimTutanagi>(`/satislar/${satisId}/teslim`, t);
export const eksikleriGoreveDonustur = (tutanakId: number, s: { sorumlu_tipi: string; sorumlu_id: number; son_tarih?: string }) => post<{ eksik_id: number; gorev_id: number }[]>(`/teslim-tutanaklari/${tutanakId}/goreve-donustur`, s);
export const talepleriListele = (projeId: string) => istek<SatisSonrasiTalep[]>(`/talepler?${q({ proje_id: projeId })}`);
export const talepAc = (t: { satis_id: number; tur: string; aciklama: string; wbs_gorev_id?: string; talep_tarihi: string }) => post<SatisSonrasiTalep>('/talepler', t);
export const talepYonlendir = (id: number, manuel?: { sorumlu_tipi?: string; sorumlu_id?: number }) => post<SatisSonrasiTalep>(`/talepler/${id}/yonlendir`, manuel || {});

// Aday
export const adaylariListele = (projeId: string) => istek<Aday[]>(`/adaylar?${q({ proje_id: projeId })}`);
export const huniGetir = (projeId: string) => istek<Huni>(`/adaylar/huni?${q({ proje_id: projeId })}`);
export const adayOlustur = (a: { proje_id: string; ad_soyad: string; telefon?: string; eposta?: string; kaynak?: string }) => post<Aday>('/adaylar', a);
export const adayAsama = (id: number, asama: AdayAsamasi) => post<Aday>(`/adaylar/${id}/asama`, { asama });
export const etkilesimEkle = (id: number, e: { tur: string; tarih: string; ozet: string }) => post(`/adaylar/${id}/etkilesimler`, e);

// Müşteri kartı / KVKK
export const musteriKarti = (o: { kisi_id?: number; firma_id?: number }) => istek<MusteriKarti>(`/musteri-karti?${q(o)}`);
export const kvkkDurumu = (tip: string, id: number) => istek<{ durum: KvkkDurum }>(`/kvkk?${q({ ilgili_tip: tip, ilgili_id: id })}`);
export const kvkkRizaKaydet = (r: { ilgili_tip: string; ilgili_id: number; tur: string; metin_versiyon: string; verildi_tarihi: string }) => post('/kvkk', r);
