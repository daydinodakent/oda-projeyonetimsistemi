// Ortak Çekirdek (Shared Kernel) — TS tipleri.
//
// SAHİPLİK: bu tipler docs/moduller/CAKISMA_HARITASI.md'nin "Çekirdek"
// satırlarına (Firma, Kişi, Maliyet Kodu, Maliyet Hareketi, Ödeme, Puantaj,
// Audit Log) karşılık gelir. Diğer modüller (Alt Yüklenici, Taşeron,
// Satın Alma, İK, ...) bu tiplere yalnızca ID ile REFERANS verir — kendi
// tiplerinde bu alanları KOPYALAMAZ (bkz. server/moduller/_cekirdek/db.js
// başındaki aynı kural).
//
// Alan adları server/moduller/_cekirdek/db.js'teki SQLite şemasıyla
// (snake_case) birebir eşleşir — src/types/index.ts'teki mevcut kural ile
// tutarlı (bkz. o dosyanın başındaki "All field names are strictly
// snake_case" notu).

export type CekirdekRowStatus = 0 | 1;

export type FirmaRol = 'musteri' | 'tedarikci' | 'alt_yuklenici' | 'taseron' | 'arsa_sahibi' | 'danisman';

export interface YetkiliKisi {
  ad_soyad: string;
  telefon?: string;
  eposta?: string;
  unvan?: string;
}

export interface IbanKaydi {
  iban: string;
  banka: string;
  aciklama?: string;
}

/** Firma (Cari) — tek tablo + çoklu rol. VKN/TCKN tekildir (mükerrer kayıt engeli). */
export interface CariFirma {
  id: number;
  unvan: string;
  vkn_tckn: string;
  vergi_dairesi?: string | null;
  adres?: string | null;
  iban_listesi?: IbanKaydi[] | null;
  yetkili_kisiler?: YetkiliKisi[] | null;
  e_fatura_mukellefi: 0 | 1;
  kep_adresi?: string | null;
  sgk_isyeri_sicil_no?: string | null;
  kara_liste: 0 | 1;
  kara_liste_notu?: string | null;
  notes?: string | null;
  row_status: CekirdekRowStatus;
  create_uid?: number | null;
  create_date?: string | null;
  write_uid?: number | null;
  write_date?: string | null;
  /** API yanıtında hesaplanarak eklenir — cari_firma_rol tablosundan. */
  roller: FirmaRol[];
}

export type KisiRol = 'personel' | 'taseron_iscisi' | 'alt_yuklenici_iscisi' | 'musteri' | 'ziyaretci';

/**
 * Kişi — personel/taşeron işçisi/alt yüklenici işçisi/müşteri/ziyaretçi
 * rollerinin TAMAMINI kapsar. tckn_sifreli API yanıtında ASLA yer almaz
 * (bkz. server/moduller/_cekirdek/kisi.js#disaAktar) — yalnızca
 * tckn_maske (ör. "123******01") döner.
 */
export interface Kisi {
  id: number;
  ad_soyad: string;
  tckn_maske: string;
  rol: KisiRol;
  firma_id?: number | null;
  telefon?: string | null;
  eposta?: string | null;
  santiye_giris_yetkisi: 0 | 1;
  isg_egitim_tarihi?: string | null;
  isg_egitim_gecerlilik_tarihi?: string | null;
  notes?: string | null;
  row_status: CekirdekRowStatus;
  create_uid?: number | null;
  create_date?: string | null;
  write_uid?: number | null;
  write_date?: string | null;
}

/** Yeni kişi oluşturma isteği — DÜZ TCKN yalnızca burada (istemci→sunucu), sunucuda anında şifrelenir. */
export interface KisiOlusturIstek {
  ad_soyad: string;
  tckn: string;
  rol: KisiRol;
  firma_id?: number;
  telefon?: string;
  eposta?: string;
  santiye_giris_yetkisi?: boolean;
  isg_egitim_tarihi?: string;
  isg_egitim_gecerlilik_tarihi?: string;
  notes?: string;
}

export type ParametreBirim = 'yuzde' | 'gun' | 'sabit_kurus' | 'adet';

/** Yürürlük tarihli oran/limit (KDV, tevkifat, stopaj, SGK, izin günleri...). Koda GÖMÜLMEZ. */
export interface Parametre {
  id: number;
  kod: string;
  ad: string;
  deger: number;
  birim: ParametreBirim;
  gecerli_baslangic: string;
  gecerli_bitis?: string | null;
  notes?: string | null;
  row_status: CekirdekRowStatus;
}

export type MaliyetKaynakTipi = 'malzeme' | 'iscilik_kadro' | 'iscilik_taseron' | 'alt_yuklenici' | 'makine_ekipman' | 'genel_gider';

/** Maliyet Kodu = WBS düğümü × Kaynak Tipi. wbs_gorev_id, mevcut WBS kaydına (tb_wbs_gorevler) REFERANS verir. */
export interface MaliyetKodu {
  id: number;
  proje_id: string;
  wbs_gorev_id: string;
  kaynak_tipi: MaliyetKaynakTipi;
  kod: string;
  notes?: string | null;
  row_status: CekirdekRowStatus;
}

export type MaliyetHareketiTuru = 'BUTCE' | 'TAAHHUT' | 'GERCEKLESEN' | 'GELIR';

/**
 * Maliyet Defteri satırı. tutar_kurus HER ZAMAN tam sayı (ondalık YOK).
 * Diğer modüller bu tipi DOĞRUDAN oluşturmaz — yalnızca api.ts'teki
 * maliyetHareketiYaz()'ı (server'daki maliyetDefteri.yaz() sözleşmesi)
 * çağırır.
 */
export interface MaliyetHareketi {
  id: number;
  proje_id: string;
  maliyet_kodu_id?: number | null;
  tur: MaliyetHareketiTuru;
  tutar_kurus: number;
  para_birimi: string;
  kur: number;
  kur_tarihi: string;
  tarih: string;
  kaynak_modul: string;
  kaynak_id: string;
  iptal_edildi: 0 | 1;
  ters_kayit_id?: number | null;
  notes?: string | null;
}

/** maliyetDefteri.yaz() için giriş sözleşmesi. */
export interface MaliyetOlayi {
  proje_id: string;
  maliyet_kodu_id?: number;
  tur: MaliyetHareketiTuru;
  tutar_kurus: number;
  para_birimi?: string;
  kur?: number;
  kur_tarihi?: string;
  tarih: string;
  kaynak_modul: string;
  kaynak_id: string | number;
  notes?: string;
}

export type OdemeTalimatiDurumu = 'TASLAK' | 'ONAY_BEKLIYOR' | 'ONAYLANDI' | 'REDDEDILDI' | 'ODENDI' | 'IPTAL';

export interface KesintiKalemi {
  parametre_kodu: string;
  tutar_kurus: number;
}

export interface OdemeTalimati {
  id: number;
  proje_id: string;
  numara: string;
  firma_id: number;
  aciklama: string;
  kaynak_belge_modul?: string | null;
  kaynak_belge_id?: string | null;
  vade_tarihi: string;
  tutar_kurus: number;
  para_birimi: string;
  kesintiler_kurus: number;
  kesintiler?: KesintiKalemi[] | null;
  durum: OdemeTalimatiDurumu;
  notes?: string | null;
}

export interface Odeme {
  id: number;
  odeme_talimati_id: number;
  tutar_kurus: number;
  para_birimi: string;
  kur: number;
  kur_tarihi: string;
  odeme_tarihi: string;
  odeme_yontemi?: string | null;
  referans_no?: string | null;
  disa_aktarildi: 0 | 1;
}

export type PuantajKaynagi = 'pdks' | 'manuel' | 'mobil';
export type PuantajDurumu = 'TASLAK' | 'ONAYLANDI' | 'REDDEDILDI';

/**
 * Puantaj — ortak yapı (İK=personel, Taşeron=ekip AYNI bu tipi kullanır).
 * istemci_kayit_id, çevrimdışı kuyruktan (bkz. offlineQueue.ts) gelen
 * kayıtlarda idempotency anahtarıdır.
 */
export interface PuantajKaydi {
  id: number;
  proje_id: string;
  kisi_id: number;
  tarih: string;
  giris_saati?: string | null;
  cikis_saati?: string | null;
  gun_degeri: 0 | 0.5 | 1;
  fazla_mesai_saat: number;
  durum: PuantajDurumu;
  kaynak: PuantajKaynagi;
  istemci_kayit_id?: string | null;
}

export type BelgeTuru = 'is_sozlesmesi' | 'kimlik' | 'ikametgah' | 'diploma' | 'ehliyet' | 'src_operator' | 'mesleki_yeterlilik' | 'saglik_raporu' | 'isg_sertifikasi' | 'diger';

/** Belge — Çekirdek genel doküman metadata'sı (gerçek dosya baytı YOK, bkz. server/moduller/_cekirdek/belge.js). */
export interface Belge {
  id: number;
  ilgili_tip: string;
  ilgili_id: string;
  tur: BelgeTuru;
  dosya_adi: string;
  gecerlilik_baslangic?: string | null;
  gecerlilik_bitis?: string | null;
  notes?: string | null;
  row_status: CekirdekRowStatus;
}

export type AuditEylem = 'OLUSTUR' | 'GUNCELLE' | 'IPTAL';

export interface AuditKaydi {
  id: number;
  varlik: string;
  varlik_id: string;
  eylem: AuditEylem;
  aktor?: number | null;
  degisiklik?: Record<string, [unknown, unknown]> | null;
  zaman: string;
}
