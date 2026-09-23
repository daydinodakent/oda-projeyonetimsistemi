// Depo — P4: Malzeme Kartı, Stok, Mal Kabul ve Zimmet'in TEK sahibi (bkz.
// server/moduller/depo/db.js başındaki sahiplik geçmişi notu).

export interface MalzemeKarti {
  id: number;
  kod: string;
  ad: string;
  /** ANA BİRİM — farklı birimlerle giriş/çıkış yapılabilmesi için MalzemeBirimDonusum kullanılır. */
  birim: string;
  kategori?: string | null;
  /** MALİYET KURALI'nın kalbi — bkz. server/moduller/satinalma/db.js başı. */
  stoklu_mu: 0 | 1;
  grup?: string | null;
  demirbas_mi: 0 | 1;
  min_stok?: number | null;
  max_stok?: number | null;
  fire_toleransi_yuzde: number;
  notes?: string | null;
  row_status: 0 | 1;
  create_uid?: number | null;
  create_date: string;
}

export interface MalzemeBirimDonusum {
  id: number;
  malzeme_id: number;
  birim: string;
  /** 1 [birim] = katsayi × [ana birim]. */
  katsayi: number;
}

export type DepoTuru = 'merkez' | 'santiye' | 'acik_saha' | 'konteyner';

export interface Depo {
  id: number;
  proje_id?: string | null;
  ad: string;
  tur: DepoTuru;
  notes?: string | null;
  row_status: 0 | 1;
  olusturma_zamani: string;
}

export interface StokBakiye {
  depo_id: number;
  malzeme_id: number;
  mevcut_miktar: number;
  agirlikli_ortalama_maliyet_kurus: number;
  guncelleme_zamani?: string;
}

export type StokHareketTuru = 'giris' | 'cikis' | 'transfer_cikis' | 'transfer_giris' | 'iade' | 'sayim_farki' | 'fire';
export type TeslimAlanTipi = 'personel' | 'taseron_ekibi' | 'alt_yuklenici' | 'sarf';

export interface StokHareketi {
  id: number;
  depo_id: number;
  malzeme_id: number;
  tur: StokHareketTuru;
  miktar: number;
  girilen_birim: string;
  girilen_miktar: number;
  birim_maliyet_kurus: number;
  toplam_maliyet_kurus: number;
  proje_id?: string | null;
  maliyet_kodu_id?: number | null;
  teslim_alan_tipi?: TeslimAlanTipi | null;
  teslim_alan_aciklama?: string | null;
  teslim_alan_kisi_id?: number | null;
  teslim_alan_firma_id?: number | null;
  emanet_mi: 0 | 1;
  kesinti_adayi_mi: 0 | 1;
  sozlesme_id?: number | null;
  kaynak_belge_modul?: string | null;
  kaynak_belge_id?: string | null;
  istemci_kayit_id?: string | null;
  notes?: string | null;
  olusturma_zamani: string;
}

export interface GirisIstek {
  depo_id: number;
  malzeme_id: number;
  miktar: number;
  birim: string;
  birim_maliyet_kurus: number;
  proje_id: string;
  emanet_mi?: boolean;
  kaynak_belge_modul?: string;
  kaynak_belge_id?: string;
  istemci_kayit_id?: string;
  notes?: string;
}

export interface CikisIstek {
  depo_id: number;
  malzeme_id: number;
  miktar: number;
  birim: string;
  proje_id: string;
  maliyet_kodu_id: number;
  teslim_alan_tipi: TeslimAlanTipi;
  teslim_alan_aciklama?: string;
  teslim_alan_kisi_id?: number;
  teslim_alan_firma_id?: number;
  emanet_mi?: boolean;
  kesinti_adayi_mi?: boolean;
  sozlesme_id?: number;
  negatifStokOnayi?: boolean;
  istemci_kayit_id?: string;
  notes?: string;
}

export type TransferDurumu = 'yolda' | 'tamamlandi' | 'iptal';

export interface Transfer {
  id: number;
  kaynak_depo_id: number;
  hedef_depo_id: number;
  malzeme_id: number;
  miktar: number;
  birim_maliyet_kurus: number;
  durum: TransferDurumu;
  olusturma_zamani: string;
  teslim_alma_zamani?: string | null;
}

export type SayimDurumu = 'acik' | 'tamamlandi';

export interface Sayim {
  id: number;
  depo_id: number;
  tarih: string;
  durum: SayimDurumu;
  olusturma_zamani: string;
}

export interface SayimKalem {
  id: number;
  sayim_id: number;
  malzeme_id: number;
  sistem_miktar: number;
  sayilan_miktar?: number | null;
}

export interface MalKabul {
  id: number;
  siparis_kalem_id: number;
  depo_id?: number | null;
  gelen_miktar: number;
  kabul_miktar: number;
  red_miktar: number;
  red_nedeni?: string | null;
  fotograf_url?: string | null;
  irsaliye_no?: string | null;
  tarih: string;
  stok_hareketi_id?: number | null;
  notes?: string | null;
  olusturma_zamani: string;
}

export type ZimmetAlanTipi = 'personel' | 'taseron_ekibi' | 'alt_yuklenici_ekibi';
export type ZimmetDurumu = 'zimmette' | 'iade_edildi' | 'kayip';

export interface Zimmet {
  id: number;
  malzeme_id: number;
  depo_id?: number | null;
  miktar: number;
  zimmet_alan_tipi: ZimmetAlanTipi;
  zimmet_alan_kisi_id?: number | null;
  zimmet_alan_aciklama?: string | null;
  kkd_mi: 0 | 1;
  zimmet_tarihi: string;
  beklenen_iade_tarihi?: string | null;
  iade_tarihi?: string | null;
  durum: ZimmetDurumu;
  notes?: string | null;
  olusturma_zamani: string;
}
