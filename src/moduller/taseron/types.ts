// Taşeron — TS tipleri. Ekip, Metraj Kaydı, Ödeme Dönemi'nin TEK sahibi.
//
// TANIM AYRIMI: Taşeron = sahada ekip, puantaj/yevmiye ile ödenir; Alt
// Yüklenici (P5) = tüzel kişilik, iş kalemi/metraj üzerinden hakediş alır.
// Ölçüt Sözleşme'nin `tip` alanıdır. PUANTAJ AYRI bir sistem DEĞİLDİR —
// Çekirdek `puantaj_kaydi`yı (bkz. src/moduller/_cekirdek/types.ts
// PuantajKaydi) DOĞRUDAN kullanır.

export type OdemeTipi = 'yevmiye' | 'metraj' | 'goturu' | 'karma';

export interface TaseronEkip {
  id: number;
  sozlesme_id: number;
  proje_id: string;
  ekip_basi_kisi_id?: number | null;
  is_kolu?: string | null;
  odeme_tipi: OdemeTipi;
  notes?: string | null;
  olusturma_zamani: string;
}

export type RolSaha = 'usta_basi' | 'usta' | 'kalfa' | 'duz_isci';

export interface EkipUye {
  id: number;
  ekip_id: number;
  kisi_id: number;
  rol_saha: RolSaha;
  sgk_giris_bildirge_tarihi?: string | null;
  baslangic_tarihi: string;
  bitis_tarihi?: string | null;
  notes?: string | null;
}

export interface EkipUyeYevmiye {
  id: number;
  ekip_uye_id: number;
  gecerli_baslangic: string;
  gecerli_bitis?: string | null;
  yevmiye_kurus: number;
}

export interface SgkIsgKontrol {
  uygun: boolean;
  nedenler: string[];
}

export interface EksikEvrakliUye {
  uye: EkipUye;
  kontrol: SgkIsgKontrol;
}

export type GunTipi = 'tam' | 'yarim' | 'hava_muhalefeti' | 'iptal';

/** Çekirdek PuantajKaydi ile AYNI şekil (bkz. _cekirdek/types.ts) — burada yalnızca P6'nın kullandığı alanlar. */
export interface TaseronPuantajKaydi {
  id: number;
  proje_id: string;
  kisi_id: number;
  tarih: string;
  gun_degeri: 0 | 0.5 | 1;
  gun_tipi: GunTipi;
  bayram_pazar_mi: 0 | 1;
  fazla_mesai_saat: number;
  maliyet_kodu_id?: number | null;
  durum: 'TASLAK' | 'ONAYLANDI' | 'REDDEDILDI';
}

export interface TaseronMetraj {
  id: number;
  ekip_id: number;
  sozlesme_kalem_id: number;
  proje_id: string;
  tarih: string;
  miktar: number;
  sef_onay_miktar?: number | null;
  sef_onayli_mi: 0 | 1;
  notes?: string | null;
}

export type OdemeDonemiDurumu = 'acik' | 'sef_onayi' | 'proje_muduru_onayi' | 'kapandi';

export interface OdemeDonemi {
  id: number;
  numara: string;
  ekip_id: number;
  proje_id: string;
  donem_baslangic: string;
  donem_bitis: string;
  durum: OdemeDonemiDurumu;
  brut_tutar_kurus: number;
  kesintiler_toplam_kurus: number;
  net_tutar_kurus: number;
  para_birimi: string;
  taahhut_dusuldu_mu: 0 | 1;
  odeme_talimati_olusturuldu_mu: 0 | 1;
  notes?: string | null;
}

export type DonemKesintiTuru = 'avans' | 'yemek' | 'barinma' | 'malzeme_fire' | 'alet_kaybi' | 'ceza' | 'diger';

export interface OdemeDonemiKesinti {
  id: number;
  odeme_donemi_id: number;
  tur: DonemKesintiTuru;
  tutar_kurus: number;
  aciklama?: string | null;
  kaynak_modul?: string | null;
  kaynak_id?: string | null;
}

export interface VerimlilikRaporu {
  ekip_id: number;
  sozlesme_kalem_id: number;
  birim: string;
  toplamMetraj: number;
  toplamAdamGun: number;
  adamGunBirim: number | null;
}

export interface KayipZimmet {
  id: number;
  malzeme_id: number;
  zimmet_alan_kisi_id?: number | null;
  zimmet_tarihi: string;
  durum: string;
}
