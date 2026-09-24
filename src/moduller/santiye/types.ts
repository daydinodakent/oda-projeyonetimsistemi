// Şantiye — TS tipleri. Görev, Günlük Rapor, İSG kayıtları, Kalite ve
// Ekipman'ın TEK sahibi. Kişi/firma/puantaj/malzeme burada TEKRAR
// TANIMLANMAZ (yalnızca ID ile referans).

export type SorumluTipi = 'kisi' | 'taseron_ekibi' | 'alt_yuklenici';

export interface PanoOzeti {
  proje_id: string; tarih: string; kisi_sayisi: number; acik_gorev: number; gecikmis_gorev: number; acik_ncr: number;
  isg_uyarilari: IsgUyari[]; kirimi_bekleyen_numune: number;
  hava: { durum: string | null; sicaklik_c: number | null } | null;
  gunluk_rapor_durumu: 'yok' | 'taslak' | 'onayli';
  ilerleme_celiski_sayisi: number; geride_aktivite_sayisi: number;
}

export interface IsgUyari { tur: string; mesaj: string; sayi?: number; olay_id?: number; son_tarih?: string; gecikti?: boolean }

export type RaporBolumTuru = 'calisan' | 'makine' | 'is' | 'malzeme' | 'fotograf';

export interface RaporBolum {
  id: number; rapor_id: number; tur: RaporBolumTuru; etiket: string; otomatik_sayi?: number | null; sayi?: number | null;
  gecerli_sayi?: number | null; duzeltildi_mi?: boolean; wbs_gorev_id?: string | null; lat?: number | null; lon?: number | null;
  dosya_url?: string | null; notes?: string | null;
}

export interface GunlukRapor {
  id: number; proje_id: string; tarih: string; hava_durumu?: string | null; sicaklik_c?: number | null; sorunlar?: string | null;
  durum: 'taslak' | 'onayli'; resmi_defter_taslagi?: string | null; bolumler: RaporBolum[];
}

export interface OtomatikBolum { tur: RaporBolumTuru; etiket: string; otomatik_sayi: number }

export interface TopluRaporIstek {
  proje_id: string; tarih: string; hava_durumu?: string; sicaklik_c?: number; sorunlar?: string;
  duzeltmeler?: { tur: RaporBolumTuru; etiket: string; sayi: number }[];
  bolumler?: { tur: RaporBolumTuru; etiket: string; sayi?: number; wbs_gorev_id?: string; lat?: number; lon?: number; dosya_url?: string; notes?: string }[];
  istemci_kayit_id?: string;
}

export type GorevDurumu = 'acik' | 'devam' | 'kapali' | 'iptal';

export interface Gorev {
  id: number; proje_id: string; baslik: string; aciklama?: string | null; sorumlu_tipi: SorumluTipi; sorumlu_id: number;
  wbs_gorev_id?: string | null; konum_blok?: string | null; konum_kat?: string | null; konum_daire?: string | null;
  lat?: number | null; lon?: number | null; son_tarih?: string | null; durum: GorevDurumu; kapanis_foto_url?: string | null;
}

export interface Aktivite {
  id: number; proje_id: string; wbs_gorev_id?: string | null; ad: string; plan_baslangic: string; plan_bitis: string;
  gerceklesen_yuzde: number; beklenen_yuzde?: number; sapma?: number; geride_mi?: boolean;
  celiski?: { mesaj: string; alt_yuklenici_yuzde: number; sozlesme_id: number } | null;
}
export interface PlanGerceklesen { tarih: string; esik: number; satirlar: Aktivite[]; celiski_sayisi: number }

export interface GirisKontrol { kisi_id: number; ad_soyad: string; rol: string; tarih: string; uygun: boolean; uyarilar: string[]; giris_izni?: boolean }

export interface IsgEgitim { id: number; kisi_id: number; egitim_tipi: string; tarih: string; gecerlilik_bitis: string }

export type IsIzniTuru = 'yuksekte_calisma' | 'sicak_calisma' | 'kazi' | 'kapali_alan';
export interface IsIzni { id: number; proje_id: string; tur: IsIzniTuru; aciklama?: string | null; konum?: string | null; baslangic: string; bitis: string; durum: 'talep' | 'onayli' | 'kapali' | 'iptal'; onaylayan?: string | null }

export interface RamakKala { id: number; proje_id: string; tarih: string; aciklama: string; anonim_mi: 0 | 1; bildiren_kisi_id?: number | null }
export interface IsgOlay { id: number; proje_id: string; tur: 'is_kazasi' | 'meslek_hastaligi' | 'yaralanmasiz_olay'; tarih: string; aciklama: string; yasal_bildirim_son_tarih?: string | null; bildirim_yapildi_mi: 0 | 1 }
export interface DuzelticiFaaliyet { id: number; proje_id: string; kaynak_tipi: string; aciklama: string; son_tarih?: string | null; durum: 'acik' | 'tamamlandi' | 'iptal'; kapanis_notu?: string | null }
export interface DenetimSablon { id: number; ad: string; periyot: 'gunluk' | 'haftalik'; maddeler: string[] }

export interface Ncr {
  id: number; proje_id: string; baslik: string; aciklama?: string | null; sorumlu_tipi: SorumluTipi; sorumlu_id: number;
  durum: 'acik' | 'duzeltildi' | 'kapali'; acilis_tarihi: string; kapanis_tarihi?: string | null; duzeltme_notu?: string | null;
  lat?: number | null; lon?: number | null;
}

export interface Ekipman {
  id: number; proje_id: string; ad: string; plaka_seri?: string | null; sahiplik: 'kiralik' | 'oz_mal';
  kira_sozlesme_id?: number | null; sayac_saat: number; durum: 'aktif' | 'arizali' | 'pasif';
}
export interface EkipmanCalisma { id: number; ekipman_id: number; tarih: string; calisma_saat: number; yakit_litre?: number | null; tutar_kurus?: number | null }

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: Record<string, unknown> }[];
}
