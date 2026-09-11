// Standard PostGIS & Oda Enterprise Types
// All field names are strictly snake_case, ASCII, matching sqlScripts.sql

export type RowStatus = 0 | 1; // 1 = aktif, 0 = silinmis (soft-delete)
export type UserRole = 'super_user' | 'power_user' | 'standart_user';
export type ProjectStatusType = 'planlama' | 'devam_ediyor' | 'tamamlandi' | 'kritik';
export type RiskLevelType = 'dusuk' | 'orta' | 'yuksek';

// 7 Standart Kolon Arayüzü
export interface BaseEntity {
  id: number | string;
  notes?: string | null;
  row_status: number;
  create_uid?: number | null;
  create_date?: string | null;
  write_uid?: number | null;
  write_date?: string | null;
}

// 1. Proje Durumları (LISTE)
export interface DurumRecord extends BaseEntity {
  name: string;
  code: string;
}

// 2. Risk Dereceleri (LISTE)
export interface RiskRecord extends BaseEntity {
  name: string;
  code: string;
}

// 2b. Veri Durumları (LISTE) — tüm CBS/PostGIS tablolarındaki "veri_durumu"
// sütununun bağlandığı ortak durum listesi (bkz. tb_data_status).
export interface VeriDurumuRecord extends BaseEntity {
  name: string;
  code: string;
}

// 3. Kullanıcı Rolleri (LISTE)
export interface RolRecord extends BaseEntity {
  name: string;
  code: UserRole;
  description?: string;
}

// 4. Projeler (DATA)
export interface ProjeRecord extends BaseEntity {
  code: string;
  name: string;
  location: string;
  ada_parsel: string;
  area: string;
  risk_level: RiskLevelType | 'Düşük' | 'Orta' | 'Yüksek';
  overall_progress: number;
  budget: number;
  spent: number;
  planned_spent: number;
  earned_value: number;
  status: ProjectStatusType | 'Planlama' | 'Devam Ediyor' | 'Tamamlandı' | 'Kritik';
  center_lng: number;
  center_lat: number;
  // Geometri formatı: EPSG:4326 { tip, coordinates }
  the_geom?: {
    tip: 'Point' | 'Polygon';
    coordinates: [number, number] | [number, number][];
  };
}

// 5. Proje Sınırları (GEOMETRI - POLYGON)
export interface ProjeSiniriRecord extends BaseEntity {
  name: string;
  project_id: string;
  project_name: string;
  ada_parsel: string;
  area_sqm: number;
  srid: number; // 5257 / 4326
  veri_durumu?: 'Planlanan' | 'İnşaat' | 'İşletme' | 'İptal';
  the_geom?: {
    tip: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][];
  };
}

// 6. 3D Binalar (GEOMETRI - POLYGON)
export interface Bina3DRecord extends BaseEntity {
  name: string;
  project_id: string;
  block_name: string;
  building_type: string;
  height_meters: number;
  floors_count: number;
  construction_progress: number;
  structural_status: string;
  footprint_area_sqm: number;
  srid: number;
  veri_durumu?: 'Planlanan' | 'İnşaat' | 'İşletme' | 'İptal';
  // Standart (kapalı, dış halka [[...]] içinde sarılmış) GeoJSON Polygon
  // formatı — ProjeSiniriRecord.the_geom ile aynı (bkz. Bina3DRecord).
  the_geom?: {
    tip: 'Polygon';
    coordinates: number[][][];
  };
}

// 7. Altyapı Hatları (GEOMETRI - LINESTRING)
export interface AltyapiHattiRecord extends BaseEntity {
  name: string;
  project_id: string;
  line_type: 'elektrik' | 'su' | 'gaz' | 'yakit' | 'telekom' | 'drenaj';
  network_name: string;
  pipe_or_cable_spec: string;
  depth_meters: number;
  voltage_or_pressure: string;
  total_length_meters: number;
  status: 'Faal' | 'İnşaat Halinde' | 'Planlanan';
  srid: number;
  veri_durumu?: 'Planlanan' | 'İnşaat' | 'İşletme' | 'İptal';
  the_geom?: {
    tip: 'LineString';
    coordinates: [number, number][];
  };
}

// 8. Bloklar (GEOMETRI - POLYGON)
export interface BlokRecord extends BaseEntity {
  project_id: string;
  name: string;
  height: number;
  floors: number;
  progress: number;
  status: 'Planlandı' | 'İnce Yapı' | 'Kaba Yapı' | 'Tamamlandı' | 'Gecikme' | 'Risk';
  center_lng: number;
  center_lat: number;
  veri_durumu?: 'Planlanan' | 'İnşaat' | 'İşletme' | 'İptal';
  the_geom?: {
    tip: 'Polygon';
    coordinates: [number, number][];
  };
}

// 9. Ruhsatlar (DATA)
export interface RuhsatRecord extends BaseEntity {
  project_id: string;
  name: string;
  authority: string;
  issue_date: string;
  expiry_date: string;
  status: 'Alındı' | 'Bekliyor' | 'Süresi Doluyor' | 'Süresi Doldu';
  geographic_scope: string;
  document_url: string;
}

// 10. WBS Görevler (DATA)
export interface WbsGorevRecord extends BaseEntity {
  project_id: string;
  block_id?: string | null;
  wbs_code: string;
  name: string;
  progress: number;
  start_date: string;
  end_date: string;
  contractor: string;
  planned_quantity: number;
  actual_quantity: number;
  unit: string;
  responsible: string;
  duration_days: number;
  status: 'Talep' | 'Onay' | 'Devam' | 'Kontrol' | 'Kapanış';
  cost: number;
}

// 11. Dokümanlar (DATA)
export interface DokumanRecord extends BaseEntity {
  project_id: string;
  block_id?: string | null;
  task_id?: string | null;
  // Haritadaki (Kroki CBS aracı) bir objeye ("obje" = herhangi bir GIS
  // şekli — bina, altyapı hattı, proje sınırı vb.) doğrudan eklenen
  // dokümanlar için: o objenin harita üzerindeki kararlı feature id'si.
  feature_id?: string | null;
  name: string;
  version: string;
  file_size: string;
  upload_date: string;
  approval_status?: 'Approved' | 'Pending' | 'Rejected';
  approver?: string;
  // Doküman türü: resim, video, cad, gis, bim, diğer — harita üzerinden
  // obje bazlı doküman ekleme formundan gelir.
  doc_type?: 'resim' | 'video' | 'cad' | 'gis' | 'bim' | 'diger';
  // Küçük resimler için tarayıcıda üretilmiş data URL (base64) — mock/demo
  // ortamında gerçek bir dosya sunucusu olmadığından önizleme bu şekilde
  // sağlanır. Büyük/ikili dosyalarda (cad/bim vb.) boş bırakılır.
  file_data_url?: string | null;
}

// 12. Varlıklar (DATA)
export interface VarlikRecord extends BaseEntity {
  project_id: string;
  block_id?: string | null;
  name: string;
  asset_type: 'Bina' | 'Ekipman' | 'Altyapı';
  install_date: string;
  expected_life_years: number;
  warranty_status: string;
  manufacturer: string;
  tech_doc_url: string;
  maintenance_cost: number;
  energy_cost: number;
  status: 'Sorunsuz' | 'Bakım Bekliyor' | 'Arızalı';
  last_maintenance_date: string;
}

// 13. Bakım Kayıtları (DATA)
export interface BakimKaydiRecord extends BaseEntity {
  asset_id: string | number;
  maintenance_date: string;
  log_type: 'Planlı Bakım (PM)' | 'Arıza Bildirimi (CM)' | 'Revizyon (Overhaul)';
  description: string;
  cost: number;
  technician: string;
  status: 'Açık' | 'Tamamlandı';
}

// 14. Bildirimler (DATA)
export interface BildirimRecord extends BaseEntity {
  project_id?: string | null;
  notification_type: 'danger' | 'warning' | 'info';
  message: string;
  notification_date: string;
  is_read: boolean;
}

// 15. Personel ve Kullanıcılar (DATA)
export interface PersonelRecord extends BaseEntity {
  full_name: string;
  email: string;
  role: string;
  department: string;
  phone?: string;
  user_role: UserRole; // 'super_user' | 'power_user' | 'standart_user'
  allocation_percentage: number;
  avatar_url?: string;
}

// 16. Kullanıcı Yetkileri (DATA)
export interface YetkiRecord extends BaseEntity {
  user_id: string | number;
  user_name: string;
  table_or_layer_name: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_admin: boolean;
  // Haritadaki bir objeye (bkz. DokumanRecord.feature_id) doküman ekleme izni.
  can_doc_add: boolean;
  // Haritadaki bir objeye eklenmiş dokümanları silme/düzenleme izni.
  can_doc_manage: boolean;
}

// 17. Veritabanı Şema & Sütun Meta Tanımları
export interface TabloSutunRecord {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default?: string;
  description?: string;
  is_standard?: boolean;
  // Formlarda ve bilgi balonunda gösterilecek Türkçe, baş harfleri büyük etiket.
  display_name?: string;
  // true ise bu sütun Info / Veri Girişi / Güncelleme formlarında gösterilmez.
  // Sistem (is_standard) ve geometri sütunları için varsayılan olarak true'dur.
  is_hidden?: boolean;
  // true ise sütun formlarda GÖRÜNÜR ama pasif (salt okunur) — geometriden
  // otomatik hesaplanan alanlar (örn. area_sqm) için kullanılır.
  readonly?: boolean;
  // Yabancı anahtar ilişkisi (FK): bu sütun, relation_table tablosunun
  // relation_column'una referans verir; veri girişinde bir combobox olarak
  // gösterilir ve seçenekler relation_table'ın relation_display_column
  // alanıyla (örn. "name") listelenir.
  relation_table?: string;
  relation_column?: string;
  relation_display_column?: string;
}
