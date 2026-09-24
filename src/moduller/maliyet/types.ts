// Maliyet Yönetimi — TS tipleri. Bu modül kaynak veri ÜRETMEZ (bütçe hariç):
// taahhüt/gerçekleşen/gelir Maliyet Defteri'nden okunur. Tüm tutarlar TL kuruş.

export type KurBazi = 'nominal' | 'sabit' | 'guncel';

export interface ButceVersiyon { id: number; proje_id: string; versiyon_no: number; ad: string; durum: 'taslak' | 'onayli' | 'arsivlendi'; onaylayan?: string | null; onay_tarihi?: string | null }
export interface ButceSatir { id: number; versiyon_id: number; maliyet_kodu_id: number; tutar_kurus: number; para_birimi: string; kur: number; kalan_tahmin_kurus?: number | null }
export interface MaliyetKoduTanim { id: number; proje_id: string; wbs_gorev_id: string; kaynak_tipi: string; kod: string }

export interface Metrik { butce: number; taahhut: number; gerceklesen: number; kalan_taahhut: number; tahmin_kalan: number; eac: number; kalan: number; sapma: number; sapma_yuzde: number | null }
export interface KodSatiri extends Metrik { maliyet_kodu_id: number | null; kod: string; kaynak_tipi: string | null; wbs_gorev_id: string | null; para_birimi: string }
export interface WbsSatiri { wbs_kod: string; ad: string; derinlik: number; kodlar: KodSatiri[]; ozet: Metrik }
export interface MaliyetRaporu {
  proje_id: string; tarih: string; kur_bazi: KurBazi; butce_versiyon: { id: number; versiyon_no: number; ad: string; durum: string } | null;
  satirlar: WbsSatiri[]; kodsuz: KodSatiri | null; toplam: Metrik; gelir: { beklenen_kurus: number; tahsil_edilen_kurus: number }; uyarilar: string[];
}
export interface DefterHareketi { id: number; proje_id: string; maliyet_kodu_id?: number | null; tur: string; tutar_kurus: number; para_birimi: string; kur: number; tarih: string; kaynak_modul: string; kaynak_id: string; notes?: string | null; tl_kurus?: number; iptal_edildi: 0 | 1 }
export interface KaynakBelge {
  modul: string; bulundu: boolean; iptal: boolean; etiket: string; belge_tipi: string; belge_id: number | string; durum?: string;
  ozet?: Record<string, unknown>; zincir: { belge_tipi: string; belge_id: number | string; etiket: string }[];
}

export interface Evm {
  proje_id: string; tarih: string; bac: number; pv: number; ev: number; ac: number; cpi: number | null; spi: number | null;
  maliyet_sapmasi: number; program_sapmasi: number; aktivite_sayisi: number; hesaplanan_aktivite: number;
  agirliksiz: { id: number; ad: string; neden: string }[]; seri: { tarih: string; pv: number; ac: number | null; ev: number | null }[];
  ev_noktasi: { tarih: string; ev: number }; not: string; butce_versiyon: { id: number; versiyon_no: number; ad: string } | null;
}

export interface NakitKalem { yon: 'giris' | 'cikis'; tarih: string; tutar_kurus: number; etiket: string; kesin: boolean }
export interface NakitDonem { baslangic: string; giris: number; cikis: number; net: number; kumulatif: number; kalemler: NakitKalem[] }
export interface NakitAkisi { proje_id: string; periyot: string; donemler: NakitDonem[]; toplam_giris_kurus: number; toplam_cikis_kurus: number; en_dusuk_kumulatif_kurus: number; not: string }

export interface Karlilik {
  proje_id: string; gelir_beklenen_kurus: number; gelir_tahsil_edilen_kurus: number; eac_kurus: number; genel_gider_payi_kurus: number;
  toplam_maliyet_tahmini_kurus: number; beklenen_kar_kurus: number; marj_yuzde: number | null; toplam_m2: number; m2_maliyet_kurus: number | null;
  bolumler: { bolum_id: number; etiket: string; tip: string; m2: number; sahiplik: string; durum: string; tahsis_edilen_maliyet_kurus: number | null; satis_tutari_kurus: number | null; kar_kurus: number | null }[];
}

export interface Uyari { seviye: 'kritik' | 'uyari'; tur: string; mesaj: string; kod?: string; maliyet_kodu_id?: number }
export interface UyariSonucu { proje_id: string; tarih: string; uyarilar: Uyari[]; esikler: Record<string, { deger: number; varsayilan: boolean }> }

export interface PortfoyProje { proje_id: string; butce_versiyon: { versiyon_no: number; ad: string } | null; butce: number; taahhut: number; gerceklesen: number; eac: number; genel_gider_payi: number; sapma: number; sapma_yuzde: number | null; gelir_beklenen: number; beklenen_kar: number; marj_yuzde: number | null; cpi: number | null; spi: number | null }
export interface Portfoy { tarih: string; projeler: PortfoyProje[]; toplam: { butce: number; taahhut: number; gerceklesen: number; eac: number; gelir: number; beklenen_kar: number; marj_yuzde: number | null } }

export interface MutabakatBulgu { tur: string; seviye: 'hata' | 'uyari'; proje_id?: string; modul?: string; kaynak_id?: string; hareket_id?: number; etiket?: string; mesaj: string; tutar_kurus?: number }
export interface MutabakatRaporu { proje_id: string | null; taranan_hareket: number; bulgu_sayisi: number; sayim: Record<string, number>; temiz: boolean; bulgular: MutabakatBulgu[] }
