// Alt Yüklenici — TS tipleri. Hakediş'in TEK sahibi bu modüldür.
//
// TANIM AYRIMI: Alt Yüklenici = tüzel kişilikli, iş kalemi/metraj üzerinden
// hakediş alan firma; Taşeron (P6) = ekip, puantaj/yevmiye ile ödenir.
// Ölçüt Sözleşme'nin `tip` alanıdır (bkz. src/moduller/sozlesme/types.ts) —
// bu modül yalnızca tip='alt_yuklenici' sözleşmeler için çalışır.

export type HakedisDurumu = 'taslak' | 'alt_yuklenici_beyani' | 'santiye_onayi' | 'teknik_ofis' | 'onayli' | 'reddedildi';

export interface Hakedis {
  id: number;
  numara: string;
  sozlesme_id: number;
  proje_id: string;
  hakedis_no: number;
  donem_baslangic: string;
  donem_bitis: string;
  son_hakedis_mi: 0 | 1;
  durum: HakedisDurumu;
  brut_tutar_kurus: number;
  kesintiler_toplam_kurus: number;
  net_tutar_kurus: number;
  para_birimi: string;
  kur: number;
  blokaj_mi: 0 | 1;
  blokaj_nedeni?: string | null;
  blokaj_asildi_mi: 0 | 1;
  blokaj_asma_gerekcesi?: string | null;
  taahhut_dusuldu_mu: 0 | 1;
  odeme_talimati_olusturuldu_mu: 0 | 1;
  notes?: string | null;
  olusturma_zamani: string;
}

export interface HakedisKalem {
  id: number;
  hakedis_id: number;
  sozlesme_kalem_id: number;
  birim_fiyat_kurus: number;
  onceki_kumulatif_miktar: number;
  bu_donem_beyan_miktar?: number | null;
  bu_donem_onay_miktar?: number | null;
  kumulatif_miktar: number;
  tutar_kurus: number;
  notes?: string | null;
}

export interface OnayUyarisi {
  asimMiktari: number;
  mesaj: string;
}

export type KesintiTuru = 'avans_mahsubu' | 'teminat_kesintisi' | 'malzeme_kesintisi' | 'ceza' | 'sgk_bekletme' | 'stopaj' | 'kdv_tevkifati' | 'diger';

export interface HakedisKesinti {
  id: number;
  hakedis_id: number;
  tur: KesintiTuru;
  parametre_kodu?: string | null;
  oran_yuzde?: number | null;
  tutar_kurus: number;
  aciklama?: string | null;
  kaynak_modul?: string | null;
  kaynak_id?: string | null;
  olusturma_zamani: string;
}

export type EvrakTuru = 'sgk_isyeri_sicili' | 'sigorta' | 'isg_uzmani_atamasi' | 'calisan_listesi' | 'iliskiksizlik_belgesi';
export type EvrakDurumu = 'tamam' | 'eksik' | 'suresi_gecmis';

export interface EvrakKaydi {
  id: number;
  sozlesme_id: number;
  tur: EvrakTuru;
  gecerlilik_baslangic?: string | null;
  gecerlilik_bitis?: string | null;
  dokuman_id?: string | null;
  notes?: string | null;
}

export interface EvrakDurumSatiri {
  tur: EvrakTuru;
  kayit: EvrakKaydi | null;
  durum: EvrakDurumu;
}

export interface IlerlemeKaydi {
  id: number;
  sozlesme_id: number;
  wbs_gorev_id: string;
  tarih: string;
  planlanan_yuzde: number;
  gerceklesen_yuzde: number;
  notes?: string | null;
}

export interface GecikmeOzetSatiri extends IlerlemeKaydi {
  gecikmeYuzde: number;
}

export interface PerformansKarti {
  id: number;
  sozlesme_id: number;
  donem: string;
  zaman_puani: number;
  kalite_puani: number;
  isg_puani: number;
  belge_puani: number;
  ncr_acik_sayisi: number;
  ncr_ortalama_kapanma_gun?: number | null;
  isg_ihlal_sayisi: number;
  toplam_puan: number;
  notes?: string | null;
}
