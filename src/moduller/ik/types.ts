// İK — TS tipleri. Personel, Vardiya, PDKS meta, İzin, Avans, Bordro
// Dönemi'nin TEK sahibi.
//
// PUANTAJ AYRI bir sistem DEĞİLDİR — Çekirdek `puantaj_kaydi`yı (bkz.
// src/moduller/_cekirdek/types.ts PuantajKaydi) DOĞRUDAN kullanır; bu
// modül yalnızca PDKS YÖNTEM detayını (PdksMeta) ekler.
//
// İSG eğitim alanları: P8 kurulana kadar Çekirdek Kişi.isg_egitim_tarihi/
// isg_egitim_gecerlilik_tarihi (bkz. _cekirdek/types.ts Kisi) SALT OKUNUR
// kullanılır — burada TEKRAR TANIMLANMADI.

export type CalismaSekli = 'tam_zamanli' | 'yari_zamanli' | 'gecici' | 'mevsimlik';

export interface Personel {
  id: number;
  kisi_id: number;
  sicil_no: string;
  departman?: string | null;
  unvan?: string | null;
  calisma_sekli: CalismaSekli;
  vardiya_id?: number | null;
  ise_giris_tarihi: string;
  cikis_tarihi?: string | null;
  cikis_nedeni?: string | null;
  biyometrik_riza_verildi_mi: 0 | 1;
  biyometrik_riza_tarihi?: string | null;
  notes?: string | null;
  row_status: 0 | 1;
}

export interface CikisSonucu {
  personel: Personel;
  kidem_gun: number;
  kidem_yil: number;
}

export interface Vardiya {
  id: number;
  ad: string;
  baslangic_saati: string;
  bitis_saati: string;
}

export interface PersonelProjeAtama {
  id: number;
  personel_id: number;
  proje_id: string;
  baslangic_tarihi: string;
  bitis_tarihi?: string | null;
  notes?: string | null;
}

export interface PersonelUcret {
  id: number;
  personel_id: number;
  gecerli_baslangic: string;
  gecerli_bitis?: string | null;
  brut_maas_kurus: number;
  odeme_periyodu: 'aylik' | 'haftalik' | 'gunluk';
}

export type PdksYontemi = 'kartli' | 'qr' | 'mobil_gps' | 'manuel_sef' | 'biyometrik';

export interface PdksMeta {
  id: number;
  puantaj_kaydi_id: number;
  yontem: PdksYontemi;
  geofence_icinde_mi?: 0 | 1 | null;
  konum_lat?: number | null;
  konum_lon?: number | null;
}

export interface IzinHakkiTablosu {
  id: number;
  kidem_yil_min: number;
  kidem_yil_max?: number | null;
  yillik_izin_gun: number;
  gecerli_baslangic: string;
  gecerli_bitis?: string | null;
}

export interface IzinBakiye {
  personel_id: number;
  yil: number;
  hak_edilen_gun: number;
  devreden_gun: number;
  kullanilan_gun: number;
}

export type IzinTuru = 'yillik' | 'mazeret' | 'ucretsiz' | 'rapor';
export type IzinDurumu = 'talep_edildi' | 'onaylandi' | 'reddedildi' | 'iptal';

export interface IzinTalebi {
  id: number;
  personel_id: number;
  tur: IzinTuru;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  gun_sayisi: number;
  aciklama?: string | null;
  durum: IzinDurumu;
  onaylayan?: number | null;
}

export type AvansDurumu = 'talep_edildi' | 'onaylandi' | 'reddedildi' | 'kapandi';

export interface AvansTaksit {
  id: number;
  avans_id: number;
  taksit_no: number;
  tutar_kurus: number;
  mahsup_edildi_mi: 0 | 1;
  bordro_donemi_id?: number | null;
}

export interface Avans {
  id: number;
  personel_id: number;
  tutar_kurus: number;
  talep_tarihi: string;
  taksit_sayisi: number;
  durum: AvansDurumu;
  onaylayan?: number | null;
  notes?: string | null;
  taksitler?: AvansTaksit[];
}

export type BordroDonemiDurumu = 'acik' | 'onaylandi' | 'disa_aktarildi';

export interface BordroDonemi {
  id: number;
  numara: string;
  donem_yil: number;
  donem_ay: number;
  durum: BordroDonemiDurumu;
  notes?: string | null;
}

export interface BordroDagitim {
  id: number;
  bordro_satiri_id: number;
  proje_id?: string | null;
  maliyet_kodu_id?: number | null;
  gun_sayisi: number;
  tutar_kurus: number;
}

export interface BordroSatiri {
  id: number;
  bordro_donemi_id: number;
  personel_id: number;
  brut_maas_kurus: number;
  calisilan_gun: number;
  fazla_mesai_saat: number;
  izinli_gun: number;
  ucretsiz_izin_gun: number;
  avans_kesinti_kurus: number;
  gerceklesen_yazildi_mi: 0 | 1;
  dagitim: BordroDagitim[];
}

export interface DisaAktarimSatiri {
  sicil_no: string;
  personel_id: number;
  brut_kurus: number;
  calisilan_gun: number;
  fazla_mesai_saat: number;
  izinli_gun: number;
  ucretsiz_izin_gun: number;
  avans_kesinti_kurus: number;
}
