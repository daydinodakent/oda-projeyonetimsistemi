export * from './types/index';

export type ProjectStatus = 'Planlama' | 'Devam Ediyor' | 'Tamamlandı' | 'Kritik';

export interface Project {
  id: string;
  code: string;
  name: string;
  location: string;
  coordinates: [number, number]; // [lng, lat]
  adaParcel: string;
  area: string;
  riskLevel: 'Düşük' | 'Orta' | 'Yüksek';
  overallProgress: number; // in %
  budget: number; // in Million TL
  spent: number; // in Million TL
  plannedSpent: number; // EVM values in Million TL
  earnedValue: number; // EVM values in Million TL
  status: ProjectStatus;
  blocks: Block[];
  permits: Permit[];
  employees: EmployeeAllocation[];
  permitStatus?: string;
  budgetStatus?: string;
}

export interface Block {
  id: string;
  name: string;
  height: number; // in meters
  floors: number;
  progress: number;
  status: 'Planlandı' | 'İnce Yapı' | 'Kaba Yapı' | 'Tamamlandı' | 'Gecikme' | 'Risk';
  coordinates: [number, number][]; // 3D polygon outline
  center: [number, number];
  veri_durumu?: string;
}

export interface Permit {
  id: string;
  name: string;
  authority: string; // Sorumlu Kurum
  issueDate: string;
  expiryDate: string;
  status: 'Alındı' | 'Bekliyor' | 'Süresi Doluyor' | 'Süresi Doldu';
  geographicScope: string;
  documentUrl: string;
}

export interface EmployeeAllocation {
  id: string;
  name: string;
  role: string;
  allocationPercentage: number; // e.g., 30 for 30%
  otherProjects: { projectName: string; percentage: number }[];
}

export interface WBSTask {
  id: string;
  wbsCode: string; // e.g., 21, 16
  name: string;
  progress: number;
  startDate: string;
  endDate: string;
  contractor: string;
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  responsible: string;
  durationDays: number;
  status: 'Talep' | 'Onay' | 'Devam' | 'Kontrol' | 'Kapanış';
  blockId?: string;
  cost: number; // in Million TL
}

export interface ProjectDocument {
  id: string;
  name: string;
  version: string;
  revisionHistory?: { version: string; date: string; author: string; note: string }[];
  approvalWorkflow?: { step: string; status: 'Approved' | 'Pending' | 'Rejected'; approver: string }[];
  associatedBlockId?: string;
  associatedTaskId?: string;
  fileSize: string;
  uploadDate: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'Bina' | 'Ekipman' | 'Altyapı';
  installDate: string;
  expectedLifeYears: number;
  warrantyStatus: string;
  manufacturer: string;
  techDocUrl: string;
  maintenanceCost: number; // cumulative in Million TL
  energyCost: number; // cumulative in Million TL
  status: 'Sorunsuz' | 'Bakım Bekliyor' | 'Arızalı';
  associatedProjectId: string;
  associatedBlockId?: string;
  lastMaintenanceDate: string;
}

export interface MaintenanceLog {
  id: string;
  assetId: string;
  date: string;
  type: 'Planlı Bakım (PM)' | 'Arıza Bildirimi (CM)' | 'Revizyon (Overhaul)';
  description: string;
  cost: number; // in TL
  technician: string;
  status: 'Açık' | 'Tamamlandı';
}

export interface Notification {
  id: string;
  projectId?: string;
  type: 'danger' | 'warning' | 'info';
  message: string;
  date: string;
  read: boolean;
  category?: 'Dosyalar' | 'Saha NCR' | 'Sistem';
  path?: string;
  badge?: string;
  badgeType?: string;
  title?: string;
  tags?: string[];
  actionText?: string;
  actionLink?: string;
}

// PostGIS / Spatial Database Layer Table definitions
export interface GISBoundaryRecord {
  id: string;
  table_name: 'tb_proje_sinirlari';
  project_id: string;
  project_name: string;
  ada_parsel: string;
  area_sqm: number;
  srid: number; // 4326
  geojson: any;
  veri_durumu?: 'Planlanan' | 'İnşaat' | 'İşletme' | 'İptal';
}

export interface GISBuildingRecord {
  id: string;
  table_name: 'tb_binalar_3d';
  project_id: string;
  block_name: string;
  building_type: string;
  height_meters: number;
  floors_count: number;
  construction_progress: number;
  structural_status: string;
  footprint_area_sqm: number;
  srid: number;
  coordinates: [number, number][];
  veri_durumu?: 'Planlanan' | 'İnşaat' | 'İşletme' | 'İptal';
}

export interface GISInfrastructureRecord {
  id: string;
  table_name: 'tb_altyapi_hatlari';
  project_id: string;
  line_type: 'elektrik' | 'su' | 'gaz' | 'yakit' | 'telekom' | 'drenaj';
  network_name: string;
  pipe_or_cable_spec: string;
  depth_meters: number;
  voltage_or_pressure: string;
  total_length_meters: number;
  status: 'Faal' | 'İnşaat Halinde' | 'Planlanan';
  coordinates: [number, number][];
  veri_durumu?: 'Planlanan' | 'İnşaat' | 'İşletme' | 'İptal';
}
