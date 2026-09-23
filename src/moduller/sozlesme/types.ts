// Sözleşme — TS tipleri.
//
// SAHİPLİK: Bu modül TÜM sözleşmelerin TEK kaynağıdır — Alt Yüklenici,
// Satın Alma, Müşteri, Taşeron modülleri kendi sözleşme tipini TANIMLAMAZ,
// buradaki Sozlesme.id'ye REFERANS verir.
//
// Alan adları server/moduller/sozlesme/db.js'teki SQLite şemasıyla
// (snake_case) birebir eşleşir — src/moduller/_cekirdek/types.ts ile aynı
// kural.

export type SozlesmeRowStatus = 0 | 1;

export type SozlesmeTipi = 'musteri_satis' | 'alt_yuklenici' | 'taseron' | 'tedarikci_cerceve' | 'kira' | 'hizmet' | 'arsa_sahibi';

export type SozlesmeDurumu = 'taslak' | 'onayda' | 'imzali' | 'yururlukte' | 'askida' | 'feshedildi' | 'tamamlandi';

export type KdvDurumu = 'dahil' | 'haric' | 'istisna';

export interface Sozlesme {
  id: number;
  numara: string;
  tip: SozlesmeTipi;
  alt_tip?: string | null;
  proje_id: string;
  konu: string;
  /** Çekirdek cari_firma'ya REFERANS — kopyalanmaz. */
  taraf_firma_id?: number | null;
  /** Çekirdek kisi'ye REFERANS — kopyalanmaz. */
  taraf_kisi_id?: number | null;
  /** GÜNCEL toplam bedel (orijinal + tüm zeyilname farkları). */
  bedel_kurus: number;
  para_birimi: string;
  kur: number;
  kur_tarihi?: string | null;
  kdv_durumu: KdvDurumu;
  baslangic_tarihi: string;
  bitis_tarihi?: string | null;
  odeme_sartlari?: string | null;
  durum: SozlesmeDurumu;
  taahhut_yazildi: 0 | 1;
  notes?: string | null;
  row_status: SozlesmeRowStatus;
  olusturan?: number | null;
  olusturma_zamani: string;
  write_uid?: number | null;
  write_date?: string | null;
}

export interface SozlesmeOlusturIstek {
  tip: SozlesmeTipi;
  alt_tip?: string;
  proje_id: string;
  konu: string;
  taraf_firma_id?: number;
  taraf_kisi_id?: number;
  bedel_kurus: number;
  para_birimi?: string;
  kur?: number;
  kur_tarihi?: string;
  kdv_durumu?: KdvDurumu;
  baslangic_tarihi: string;
  bitis_tarihi?: string;
  odeme_sartlari?: string;
  notes?: string;
}

export type VersiyonTuru = 'orijinal' | 'zeyilname';

export interface SozlesmeVersiyon {
  id: number;
  sozlesme_id: number;
  versiyon_no: number;
  tur: VersiyonTuru;
  bedel_farki_kurus: number;
  sure_uzatimi_gun: number;
  yeni_bitis_tarihi?: string | null;
  aciklama: string;
  degisiklik?: Record<string, unknown> | null;
  olusturan?: number | null;
  olusturma_zamani: string;
}

export interface ZeyilnameIstek {
  bedel_farki_kurus?: number;
  sure_uzatimi_gun?: number;
  yeni_bitis_tarihi?: string;
  aciklama: string;
  degisiklik?: Record<string, unknown>;
}

export interface KalanBedel {
  orijinalBedelKurus: number;
  zeyilnameToplamFarkKurus: number;
  guncelToplamBedelKurus: number;
  /** Bkz. server/moduller/sozlesme/sozlesme.js#kalanBedel yorumu: bu geçişte
   * Hakediş/kullanım düşümü YOK — "kalan bedel" güncel toplam bedelle eşdeğerdir. */
  kalanBedelKurus: number;
}

export interface SozlesmeKalem {
  id: number;
  sozlesme_id: number;
  /** Mevcut tb_wbs_gorevler'e REFERANS — kopyalanmaz. */
  wbs_gorev_id?: string | null;
  aciklama: string;
  birim: string;
  miktar: number;
  birim_fiyat_kurus: number;
  row_status: SozlesmeRowStatus;
  olusturan?: number | null;
  olusturma_zamani: string;
}

export type MaddeTuru = 'ceza' | 'teminat' | 'avans' | 'fiyat_farki' | 'sigorta' | 'isg' | 'gizlilik' | 'diger';
export type SorumluTaraf = 'yuklenici' | 'isveren' | 'her_iki_taraf';

export interface SozlesmeMadde {
  id: number;
  sozlesme_id: number;
  tur: MaddeTuru;
  parametreler?: Record<string, unknown> | null;
  sorumlu_taraf: SorumluTaraf;
  kontrol_tarihi?: string | null;
  aciklama?: string | null;
  row_status: SozlesmeRowStatus;
  olusturan?: number | null;
  olusturma_zamani: string;
}

export type TeminatTuru = 'nakit' | 'teminat_mektubu' | 'cek_senet';
export type IadeDurumu = 'serbest' | 'iade_edildi' | 'irat_kaydedildi';

export interface SozlesmeTeminat {
  id: number;
  sozlesme_id: number;
  tur: TeminatTuru;
  banka?: string | null;
  tutar_kurus: number;
  para_birimi: string;
  bitis_tarihi?: string | null;
  iade_durumu: IadeDurumu;
  notes?: string | null;
  row_status: SozlesmeRowStatus;
  olusturan?: number | null;
  olusturma_zamani: string;
}

export interface SozlesmeBelge {
  id: number;
  sozlesme_id: number;
  /** Mevcut tb_dokumanlar'a REFERANS — kopyalanmaz. */
  dokuman_id: string;
  rol: 'ek' | 'imzali_nusha' | 'teklif' | 'diger';
  olusturan?: number | null;
  olusturma_zamani: string;
}

export type KritikTarihKaynagi = 'sozlesme_bitis' | 'teminat_bitis' | 'madde_kontrol';
export type KritikTarihAciliyeti = 'gecikti' | 'kritik' | 'yakin' | 'bilgi';

export interface KritikTarih {
  kaynak: KritikTarihKaynagi;
  sozlesme_id: number;
  sozlesme_numara: string;
  teminat_id?: number;
  madde_id?: number;
  madde_turu?: MaddeTuru;
  tarih: string;
  kalanGun: number;
  aciliyet: KritikTarihAciliyeti;
}

export interface SozlesmeSablon {
  id: number;
  tip: SozlesmeTipi;
  ad: string;
  madde_sablonlari?: unknown[] | null;
  belge_metni: string;
  row_status: SozlesmeRowStatus;
  olusturan?: number | null;
  olusturma_zamani: string;
  write_uid?: number | null;
  write_date?: string | null;
}
