// Satın Alma — TS tipleri. Alan adları server/moduller/satinalma/db.js'teki
// SQLite şemasıyla (snake_case) birebir eşleşir.
//
// SAHİPLİK: firma_id/talep_eden_kisi_id Çekirdek'e, malzeme_id Depo'ya
// (bkz. src/moduller/depo/types.ts — GEÇİCİ/minimal), sozlesme_id Sözleşme
// modülüne REFERANS verir; hiçbiri burada KOPYALANMAZ.

export type SatinalmaRowStatus = 0 | 1;

export type TalepDurumu = 'taslak' | 'onay_bekliyor' | 'onaylandi' | 'reddedildi' | 'iptal';

export interface SatinalmaTalep {
  id: number;
  numara: string;
  proje_id: string;
  maliyet_kodu_id?: number | null;
  talep_eden_kisi_id?: number | null;
  ihtiyac_tarihi: string;
  teslim_yeri?: string | null;
  durum: TalepDurumu;
  min_teklif_istisna: 0 | 1;
  istisna_gerekcesi?: string | null;
  istisna_onaylayan?: number | null;
  aciklama?: string | null;
  notes?: string | null;
  row_status: SatinalmaRowStatus;
  olusturan?: number | null;
  olusturma_zamani: string;
}

export interface SatinalmaTalepOlusturIstek {
  proje_id: string;
  maliyet_kodu_id?: number;
  talep_eden_kisi_id?: number;
  ihtiyac_tarihi: string;
  teslim_yeri?: string;
  min_teklif_istisna?: boolean;
  istisna_gerekcesi?: string;
  aciklama?: string;
  notes?: string;
}

export interface SatinalmaTalepKalem {
  id: number;
  talep_id: number;
  malzeme_id?: number | null;
  aciklama: string;
  miktar: number;
  birim: string;
  tahmini_birim_fiyat_kurus?: number | null;
  row_status: SatinalmaRowStatus;
  olusturma_zamani: string;
}

export type TeklifDurumu = 'istendi' | 'geldi' | 'elendi' | 'kazandi';

export interface SatinalmaTeklif {
  id: number;
  talep_id: number;
  firma_id: number;
  durum: TeklifDurumu;
  gecerlilik_tarihi?: string | null;
  para_birimi: string;
  kur: number;
  vade_gun?: number | null;
  teslim_suresi_gun?: number | null;
  nakliye_dahil: 0 | 1;
  notes?: string | null;
  olusturma_zamani: string;
}

export interface SatinalmaTeklifKalem {
  id: number;
  teklif_id: number;
  talep_kalem_id: number;
  miktar: number;
  birim_fiyat_kurus: number;
  kdv_orani: number;
}

export interface MukayeseTeklifFiyati {
  teklif_id: number;
  firma_id: number;
  girildi: boolean;
  birim_fiyat_kurus?: number;
  kdv_orani?: number;
  kdv_dahil_toplam_kurus?: number;
}

export interface MukayeseKalemSatiri {
  talep_kalem_id: number;
  aciklama: string;
  miktar: number;
  birim: string;
  teklifler: MukayeseTeklifFiyati[];
  onerilenTeklifId: number | null;
}

export interface MukayeseSonucu {
  talep_id: number;
  teklifSayisi: number;
  teklifler: { id: number; firma_id: number; durum: TeklifDurumu; vade_gun: number | null; teslim_suresi_gun: number | null; nakliye_dahil: 0 | 1 }[];
  kalemler: MukayeseKalemSatiri[];
}

export type SiparisDurumu = 'taslak' | 'onaylandi' | 'kismi_teslim' | 'tamamlandi' | 'iptal';

export interface SatinalmaSiparis {
  id: number;
  numara: string;
  proje_id: string;
  talep_id?: number | null;
  teklif_id?: number | null;
  sozlesme_id?: number | null;
  maliyet_kodu_id?: number | null;
  firma_id: number;
  teslim_tarihi?: string | null;
  durum: SiparisDurumu;
  taahhut_yazildi: 0 | 1;
  toplam_tutar_kurus: number;
  para_birimi: string;
  kur: number;
  kur_tarihi?: string | null;
  notes?: string | null;
  row_status: SatinalmaRowStatus;
  olusturma_zamani: string;
}

export interface SatinalmaSiparisKalem {
  id: number;
  siparis_id: number;
  malzeme_id?: number | null;
  aciklama: string;
  birim: string;
  miktar: number;
  birim_fiyat_kurus: number;
  kdv_orani: number;
  teslim_edilen_miktar: number;
  faturalanan_miktar: number;
}

// SatinalmaMalKabul: P4'te Depo'ya taşındı — bkz. src/moduller/depo/types.ts (MalKabul).

export type FaturaDurumu = 'kaydedildi' | 'eslestirildi' | 'eslesme_istisna' | 'odeme_talimati_olusturuldu';

export interface SatinalmaFatura {
  id: number;
  siparis_id: number;
  firma_id: number;
  fatura_no: string;
  fatura_tarihi: string;
  vade_tarihi: string;
  para_birimi: string;
  kur: number;
  kur_tarihi?: string | null;
  tutar_kurus: number;
  kdv_tutari_kurus: number;
  tevkifat_orani: number;
  tevkifat_tutari_kurus: number;
  genel_toplam_kurus: number;
  durum: FaturaDurumu;
  notes?: string | null;
  olusturma_zamani: string;
}

export interface SatinalmaFaturaKalem {
  id: number;
  fatura_id: number;
  siparis_kalem_id?: number | null;
  aciklama?: string | null;
  miktar: number;
  birim_fiyat_kurus: number;
  kdv_orani: number;
}

export type EslesmeIstisnaTuru = 'siparis_bulunamadi' | 'miktar_asimi' | 'fiyat_sapmasi' | 'teslim_alinmamis';

export interface EslesmeIstisnasi {
  id: number;
  fatura_id: number;
  fatura_kalem_id: number;
  tur: EslesmeIstisnaTuru;
  detay: Record<string, unknown> | null;
  cozuldu_mu: 0 | 1;
  olusturma_zamani: string;
}

export interface EslestirmeSonucu {
  durum: FaturaDurumu;
  istisnalar: EslesmeIstisnasi[];
}

export interface TedarikciKarnesi {
  firma_id: number;
  siparisSayisi: number;
  toplamTutarKurus: number;
  degerlendirilebilirSiparisSayisi: number;
  zamanindaTeslimYuzdesi: number | null;
  /** P4 (Depo/Kalite Kontrol) kurulmadan hesaplanamaz. */
  kaliteRedOrani: null;
}
