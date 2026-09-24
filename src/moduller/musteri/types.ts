// Müşteri — TS tipleri. Bağımsız Bölüm, Satış, Ödeme Planı, Teslim, Satış
// Sonrası Talep, KVKK Rıza'nın TEK sahibi. Müşteri = Çekirdek Kişi/Firma
// (rol: musteri) — burada TEKRAR TANIMLANMAZ.

export type BolumDurumu = 'musait' | 'opsiyonlu' | 'satildi' | 'teslim_edildi';

export interface Bolum {
  id: number; proje_id: string; blok: string; kat: string; kapi_no: string; tip: string;
  brut_m2?: number | null; net_m2?: number | null; cephe?: string | null; eklentiler?: Record<string, unknown> | null;
  sahiplik: 'firma' | 'arsa_sahibi'; arsa_sozlesme_id?: number | null; durum: BolumDurumu; geometri_ref?: string | null;
}
export interface IzgaraBolum extends Bolum { etiket: string; liste_fiyati_kurus: number | null; para_birimi: string | null; satisa_kapali: boolean }
export type Izgara = Record<string, Record<string, IzgaraBolum[]>>;
export interface BolumDetay extends Bolum { fiyat: { fiyat_kurus: number; para_birimi: string; gecerli_baslangic: string } | null; fiyat_gecmisi: { id: number; fiyat_kurus: number; para_birimi: string; gecerli_baslangic: string }[] }

export interface Rezervasyon { id: number; bolum_id: number; aday_id?: number | null; kisi_id?: number | null; kaparo_kurus: number; baslangic_tarihi: string; bitis_tarihi: string; durum: 'aktif' | 'satisa_donustu' | 'iptal' | 'suresi_doldu' }

export interface SatisMusteri { id: number; satis_id: number; kisi_id?: number | null; firma_id?: number | null; hisse_yuzde: number }
export interface Satis {
  id: number; proje_id: string; bolum_id: number; sozlesme_id: number; tutar_kurus: number; para_birimi: string; kur: number;
  satis_tarihi: string; kaparo_kurus: number; durum: 'taslak' | 'onayli' | 'iptal'; musteriler: SatisMusteri[];
}

export type TaksitTuru = 'pesinat' | 'taksit' | 'ara_odeme' | 'senet' | 'kredi' | 'takas';
export interface TaksitGirdisi { tur: TaksitTuru; vade_tarihi: string; tutar_kurus: number; kredi_onay_durumu?: string; aciklama?: string; endeksli_mi?: boolean }
export interface Taksit extends TaksitGirdisi { id: number; plan_id: number; sira: number; odenen_kurus: number; kalan_kurus: number; durum: 'acik' | 'kismi' | 'kapali' }
export interface PlanSurumu { id: number; satis_id: number; versiyon: number; durum: 'aktif' | 'eski'; revizyon_nedeni?: string | null }
export interface OdemePlaniDetay { plan: PlanSurumu; taksitler: Taksit[]; toplam_kurus: number; odenen_kurus: number; versiyonlar: PlanSurumu[] }

export interface Tahsilat { id: number; tutar_kurus: number; para_birimi: string; kur: number; tarih: string; yontem?: string | null; dagilim: { taksit_id: number; plan_id: number; tutar_kurus: number }[] }
export interface OdemeOzeti { satis_id: number; tutar_kurus: number; tahsil_edilen_kurus: number; kalan_kurus: number; yuzde: number }

export interface VadesiGecen {
  satis_id: number; bolum: string | null; taksit_id: number; tur: TaksitTuru; vade_tarihi: string; kalan_kurus: number; para_birimi: string;
  gecikme_gun: number; gecikme_faizi_kurus: number | null; kredi_bekliyor_mu: boolean; musteriler: { kisi_id?: number | null; firma_id?: number | null }[];
}
export interface Hatirlatma { id: number; taksit_id: number; ofset_gun: number; planlanan_tarih: string; kanal: string; sablon: string; durum: string }

export type AdayAsamasi = 'aday' | 'gorusme' | 'rezervasyon' | 'satis' | 'kayip';
export interface Aday { id: number; proje_id: string; ad_soyad: string; telefon?: string | null; eposta?: string | null; kaynak?: string | null; asama: AdayAsamasi; kisi_id?: number | null }
export type Huni = Record<AdayAsamasi, number>;

export interface EksikKalem { id: number; tutanak_id: number; aciklama: string; gorev_id?: number | null }
export interface TeslimTutanagi { id: number; satis_id: number; tarih: string; teslim_alan?: string | null; odeme_yuzdesi: number; istisna_onayi_mi: 0 | 1; istisna_gerekcesi?: string | null; eksikler: EksikKalem[] }
export interface SatisSonrasiTalep { id: number; satis_id: number; bolum_id: number; tur: 'ariza' | 'sikayet' | 'talep'; aciklama: string; wbs_gorev_id?: string | null; garanti_kapsaminda_mi?: 0 | 1 | null; durum: 'acik' | 'yonlendirildi' | 'kapali'; gorev_id?: number | null; yonlendirilen_sozlesme_id?: number | null; talep_tarihi: string }

export interface KvkkDurum { aydinlatma: boolean; pazarlama: boolean }
export interface MusteriKartiSatis { satis: Satis; bolum: (Bolum & { etiket: string }) | null; plan: OdemePlaniDetay | null; odeme: OdemeOzeti | null; tahsilatlar: Tahsilat[]; teslim: TeslimTutanagi | null; talepler: SatisSonrasiTalep[] }
export interface MusteriKarti { musteri: { id: number; ad_soyad?: string; unvan?: string }; tip: 'kisi' | 'firma'; satislar: MusteriKartiSatis[]; belgeler: { id: number; tur: string; dosya_adi: string; gecerlilik_bitis?: string | null }[]; kvkk: KvkkDurum | null }
