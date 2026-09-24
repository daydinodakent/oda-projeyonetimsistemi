// Şantiye — ince REST istemcisi. server/moduller/santiye/routes.js uçlarını çağırır.
import type {
  PanoOzeti, GunlukRapor, OtomatikBolum, TopluRaporIstek, Gorev, SorumluTipi, PlanGerceklesen, Aktivite, GirisKontrol,
  IsgEgitim, IsIzni, IsIzniTuru, RamakKala, IsgOlay, DuzelticiFaaliyet, DenetimSablon, Ncr, Ekipman, EkipmanCalisma,
  IsgUyari, GeoJsonFeatureCollection, RaporBolumTuru,
} from './types';

const BASE = '/api/santiye';

async function istek<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let mesaj = body;
    try { mesaj = JSON.parse(body).error || body; } catch { /* düz metin */ }
    throw new Error(mesaj || `Şantiye API hatası (${res.status}) ${path}`);
  }
  return res.json();
}
const post = <T>(path: string, body: unknown) => istek<T>(path, { method: 'POST', body: JSON.stringify(body) });
const q = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

// --- Pano / GeoJSON ---
export const panoGetir = (projeId: string, tarih?: string) => istek<PanoOzeti>(`/pano?${q({ proje_id: projeId, tarih })}`);
export const geojsonGetir = (projeId: string, katmanlar?: string[]) => istek<GeoJsonFeatureCollection>(`/geojson?${q({ proje_id: projeId, katmanlar: katmanlar?.join(',') })}`);

// --- Günlük Rapor ---
export const raporGunGetir = (projeId: string, tarih: string) => istek<GunlukRapor | null>(`/gunluk-raporlar/gun?${q({ proje_id: projeId, tarih })}`);
export const raporOtomatikOnizleme = (projeId: string, tarih: string) => istek<OtomatikBolum[]>(`/gunluk-raporlar/otomatik-onizleme?${q({ proje_id: projeId, tarih })}`);
export const raporTopluKaydet = (p: TopluRaporIstek) => post<{ rapor: GunlukRapor; tekrarGonderim: boolean }>('/gunluk-raporlar/toplu', p);
export const raporOnayla = (id: number) => post<GunlukRapor>(`/gunluk-raporlar/${id}/onay`, {});
export const raporResmiDefterTaslagi = (id: number) => post<{ taslak: string }>(`/gunluk-raporlar/${id}/resmi-defter-taslagi`, {});
export type { RaporBolumTuru };

// --- Görev ---
export const gorevleriListele = (projeId: string) => istek<Gorev[]>(`/gorevler?${q({ proje_id: projeId })}`);
export const gorevOlustur = (g: { proje_id: string; baslik: string; sorumlu_tipi: SorumluTipi; sorumlu_id: number; wbs_gorev_id?: string; konum_blok?: string; konum_kat?: string; konum_daire?: string; lat?: number; lon?: number; son_tarih?: string }) => post<Gorev>('/gorevler', g);
export const gorevDurum = (id: number, durum: string) => post<Gorev>(`/gorevler/${id}/durum`, { durum });
export const gorevKapat = (id: number, fotoUrl: string) => post<Gorev>(`/gorevler/${id}/kapat`, { foto_url: fotoUrl });

// --- İş Programı ---
export const planGerceklesenGetir = (projeId: string, tarih?: string) => istek<PlanGerceklesen>(`/is-programi/plan-gerceklesen?${q({ proje_id: projeId, tarih })}`);
export const aktiviteEkle = (a: { proje_id: string; ad: string; plan_baslangic: string; plan_bitis: string; gerceklesen_yuzde?: number; wbs_gorev_id?: string }) => post<Aktivite>('/is-programi', a);
export const csvIceAktar = (projeId: string, csv: string) => post<{ eklenen: number; hatalar: { satir: number; hata: string }[] }>('/is-programi/csv', { proje_id: projeId, csv });
export const aktiviteYuzde = (id: number, yuzde: number) => post<Aktivite>(`/is-programi/${id}/yuzde`, { yuzde });

// --- İSG ---
export const isgUyarilari = (projeId: string) => istek<IsgUyari[]>(`/isg/uyarilar?${q({ proje_id: projeId })}`);
export const girisKontrolu = (kisiId: number, tarih?: string) => istek<GirisKontrol>(`/isg/giris-kontrolu?${q({ kisi_id: kisiId, tarih })}`);
export const girisKaydet = (projeId: string, kisiId: number, tarih: string, yetkiliOnayi?: boolean, gerekce?: string) => post<GirisKontrol>('/isg/giris', { proje_id: projeId, kisi_id: kisiId, tarih, yetkiliOnayi, gerekce });
export const egitimEkle = (e: { kisi_id: number; egitim_tipi?: string; tarih: string; gecerlilik_bitis: string }) => post<IsgEgitim>('/isg/egitimler', e);
export const egitimleriGetir = (kisiId: number) => istek<IsgEgitim[]>(`/isg/kisiler/${kisiId}/egitimler`);
export const suresiDolanEgitimler = (gunOncesi?: number) => istek<IsgEgitim[]>(`/isg/egitimler/suresi-dolanlar?${q({ gun_oncesi: gunOncesi })}`);
export const isIzinleriGetir = (projeId: string) => istek<IsIzni[]>(`/isg/is-izinleri?${q({ proje_id: projeId })}`);
export const isIzniTalepEt = (i: { proje_id: string; tur: IsIzniTuru; aciklama?: string; konum?: string; baslangic: string; bitis: string }) => post<IsIzni>('/isg/is-izinleri', i);
export const isIzniDurum = (id: number, durum: string, onaylayan?: string) => post<IsIzni>(`/isg/is-izinleri/${id}/durum`, { durum, onaylayan });
export const ramakKalalariGetir = (projeId: string) => istek<RamakKala[]>(`/isg/ramak-kala?${q({ proje_id: projeId })}`);
export const ramakKalaBildir = (r: { proje_id: string; tarih: string; aciklama: string; anonim: boolean; bildiren_kisi_id?: number; lat?: number; lon?: number }) => post<{ id: number; anonim_mi: number }>('/isg/ramak-kala', r);
export const olaylariGetir = (projeId: string) => istek<IsgOlay[]>(`/isg/olaylar?${q({ proje_id: projeId })}`);
export const olayKaydet = (o: { proje_id: string; tur: string; tarih: string; aciklama: string; kisi_id?: number; ilgili_alt_yuklenici_sozlesme_id?: number; lat?: number; lon?: number }) => post<IsgOlay>('/isg/olaylar', o);
export const olayBildirimYapildi = (id: number, tarih: string) => post<IsgOlay>(`/isg/olaylar/${id}/bildirim-yapildi`, { tarih });
export const duzelticileriGetir = (projeId: string) => istek<DuzelticiFaaliyet[]>(`/isg/duzeltici-faaliyetler?${q({ proje_id: projeId })}`);
export const duzelticiEkle = (d: { proje_id: string; aciklama: string; kaynak_tipi?: string; son_tarih?: string }) => post<DuzelticiFaaliyet>('/isg/duzeltici-faaliyetler', d);
export const duzelticiKapat = (id: number, kapanisNotu: string) => post<DuzelticiFaaliyet>(`/isg/duzeltici-faaliyetler/${id}/kapat`, { kapanis_notu: kapanisNotu });
export const denetimSablonlariGetir = () => istek<DenetimSablon[]>('/isg/denetim-sablonlari');
export const denetimSablonEkle = (s: { ad: string; periyot: 'gunluk' | 'haftalik'; maddeler: string[] }) => post<DenetimSablon>('/isg/denetim-sablonlari', s);
export const denetimYanitla = (d: { sablon_id: number; proje_id: string; tarih: string; yanitlar: { madde: string; uygun: boolean; not?: string }[] }) => post<{ uygunsuz_sayisi: number }>('/isg/denetimler', d);

// --- Kalite ---
export const ncrListele = (projeId: string) => istek<Ncr[]>(`/ncr?${q({ proje_id: projeId })}`);
export const ncrAc = (n: { proje_id: string; baslik: string; aciklama?: string; sorumlu_tipi: SorumluTipi; sorumlu_id: number; lat?: number; lon?: number }) => post<Ncr>('/ncr', n);
export const ncrDuzelt = (id: number, notu: string) => post<Ncr>(`/ncr/${id}/duzelt`, { duzeltme_notu: notu });
export const ncrKapat = (id: number) => post<Ncr>(`/ncr/${id}/kapat`, {});

// --- Ekipman ---
export const ekipmanlariListele = (projeId: string) => istek<Ekipman[]>(`/ekipmanlar?${q({ proje_id: projeId })}`);
export const ekipmanOlustur = (e: { proje_id: string; ad: string; sahiplik: 'kiralik' | 'oz_mal'; kira_sozlesme_id?: number; ozmal_saat_maliyeti_kurus?: number }) => post<Ekipman>('/ekipmanlar', e);
export const ekipmanCalismalari = (id: number) => istek<EkipmanCalisma[]>(`/ekipmanlar/${id}/calismalar`);
export const ekipmanCalismaKaydet = (c: { ekipman_id: number; tarih: string; calisma_saat: number; yakit_litre?: number; operator_kisi_id?: number; maliyet_kodu_id?: number; istemci_kayit_id?: string }) =>
  post<{ kayit: EkipmanCalisma; tekrarGonderim: boolean; uyarilar: string[] }>('/ekipman-calismalari', c);
