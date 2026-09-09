import {
  DurumRecord,
  RiskRecord,
  RolRecord,
  ProjeRecord,
  ProjeSiniriRecord,
  Bina3DRecord,
  AltyapiHattiRecord,
  BlokRecord,
  RuhsatRecord,
  WbsGorevRecord,
  DokumanRecord,
  VarlikRecord,
  BakimKaydiRecord,
  BildirimRecord,
  PersonelRecord,
  YetkiRecord,
  TabloSutunRecord
} from '../types/index';

import {
  initialProjects,
  gisBoundaryRecords,
  gisBuildingRecords,
  gisInfrastructureRecords,
  initialWbsTasks,
  initialDocuments,
  initialAssets,
  initialMaintenanceLogs,
  initialNotifications
} from '../data';

// ==========================================
// IN-MEMORY ACTIVE REPOSITORY STORE
// ==========================================

let durumlarStore: DurumRecord[] = [
  { id: 1, notes: 'Planlama Aşaması', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'planlama', name: 'Planlama' },
  { id: 2, notes: 'İnşaat / Uygulama', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'devam_ediyor', name: 'Devam Ediyor' },
  { id: 3, notes: 'İşletmede', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'tamamlandi', name: 'Tamamlandı' },
  { id: 4, notes: 'Kritik Risk / Darboğaz', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'kritik', name: 'Kritik' }
];

let risklerStore: RiskRecord[] = [
  { id: 1, notes: 'Düşük risk', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'dusuk', name: 'Düşük' },
  { id: 2, notes: 'Orta risk', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'orta', name: 'Orta' },
  { id: 3, notes: 'Yüksek risk', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'yuksek', name: 'Yüksek' }
];

let rollerStore: RolRecord[] = [
  { id: 1, notes: 'Sistem Yöneticisi', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'super_user', name: 'Super User', description: 'Tüm sistem ve şema yönetimi yetkisine sahip yönetici' },
  { id: 2, notes: 'İleri Düzey Kullanıcı', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'power_user', name: 'Power User', description: 'İleri düzey veri oluşturma, güncelleme ve analiz yetkisi' },
  { id: 3, notes: 'Standart Kullanıcı', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'standart_user', name: 'Standart User', description: 'Standart okuma ve saha veri giriş kullanıcısı' }
];

let projelerStore: ProjeRecord[] = initialProjects.map((p, idx) => ({
  id: p.id,
  notes: `İGA CBS Sahası ${p.name}`,
  row_status: 1,
  create_uid: 1,
  create_date: '2026-01-10 09:00:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  code: p.code,
  name: p.name,
  location: p.location,
  ada_parsel: p.adaParcel,
  area: p.area,
  risk_level: p.riskLevel,
  overall_progress: p.overallProgress,
  budget: p.budget,
  spent: p.spent,
  planned_spent: p.plannedSpent,
  earned_value: p.earnedValue,
  status: p.status,
  center_lng: p.coordinates[0],
  center_lat: p.coordinates[1],
  the_geom: {
    tip: 'Point',
    coordinates: p.coordinates
  }
}));

let sinirlarStore: ProjeSiniriRecord[] = gisBoundaryRecords.map((b, idx) => ({
  id: b.id || `sinir-${idx + 1}`,
  notes: 'PostGIS Çokgen Proje Sınır Kaydı',
  row_status: 1,
  create_uid: 1,
  create_date: '2026-01-15 10:00:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  project_id: b.project_id,
  project_name: b.project_name,
  ada_parsel: b.ada_parsel,
  area_sqm: b.area_sqm,
  srid: 5257,
  veri_durumu: (b as any).veri_durumu || 'Planlanan',
  the_geom: {
    tip: 'Polygon',
    coordinates: b.geojson?.coordinates || []
  }
}));

let binalarStore: Bina3DRecord[] = gisBuildingRecords.map((b, idx) => ({
  id: b.id || `bina-${idx + 1}`,
  notes: '3D Yapı Bloğu Varlığı',
  row_status: 1,
  create_uid: 1,
  create_date: '2026-02-01 11:00:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  project_id: b.project_id,
  block_name: b.block_name,
  building_type: b.building_type,
  height_meters: b.height_meters,
  floors_count: b.floors_count,
  construction_progress: b.construction_progress,
  structural_status: b.structural_status,
  footprint_area_sqm: b.footprint_area_sqm,
  srid: 5257,
  veri_durumu: (b as any).veri_durumu || 'Planlanan',
  the_geom: {
    tip: 'Polygon',
    coordinates: b.coordinates
  }
}));

let altyapiStore: AltyapiHattiRecord[] = gisInfrastructureRecords.map((a, idx) => ({
  id: a.id || `altyapi-${idx + 1}`,
  notes: 'PostGIS Altyapı Hattı Segmenti',
  row_status: 1,
  create_uid: 1,
  create_date: '2026-02-15 14:00:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  project_id: a.project_id,
  line_type: a.line_type,
  network_name: a.network_name,
  pipe_or_cable_spec: a.pipe_or_cable_spec,
  depth_meters: a.depth_meters,
  voltage_or_pressure: a.voltage_or_pressure,
  total_length_meters: a.total_length_meters,
  status: a.status,
  srid: 5257,
  veri_durumu: (a as any).veri_durumu || 'Planlanan',
  the_geom: {
    tip: 'LineString',
    coordinates: a.coordinates
  }
}));

let bloklarStore: BlokRecord[] = initialProjects.flatMap((p) => 
  p.blocks.map((b, idx) => ({
    id: b.id,
    notes: `${p.name} - ${b.name}`,
    row_status: 1,
    create_uid: 1,
    create_date: '2026-02-01 10:00:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    project_id: p.id,
    name: b.name,
    height: b.height,
    floors: b.floors,
    progress: b.progress,
    status: b.status,
    center_lng: b.center[0],
    center_lat: b.center[1],
    veri_durumu: (b as any).veri_durumu || 'Planlanan',
    the_geom: {
      tip: 'Polygon',
      coordinates: b.coordinates
    }
  }))
);

let ruhsatlarStore: RuhsatRecord[] = initialProjects.flatMap((p) =>
  p.permits.map((pm, idx) => ({
    id: pm.id,
    notes: `${pm.name} (${pm.authority})`,
    row_status: 1,
    create_uid: 1,
    create_date: '2026-01-20 09:00:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    project_id: p.id,
    name: pm.name,
    authority: pm.authority,
    issue_date: pm.issueDate,
    expiry_date: pm.expiryDate,
    status: pm.status,
    geographic_scope: pm.geographicScope,
    document_url: pm.documentUrl
  }))
);

let wbsStore: WbsGorevRecord[] = Object.entries(initialWbsTasks).flatMap(([pId, tasks]) =>
  tasks.map((t) => ({
    id: t.id,
    notes: `WBS ${t.wbsCode} - ${t.name}`,
    row_status: 1,
    create_uid: 1,
    create_date: '2026-03-01 08:30:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    project_id: pId,
    block_id: t.blockId || null,
    wbs_code: t.wbsCode,
    name: t.name,
    progress: t.progress,
    start_date: t.startDate,
    end_date: t.endDate,
    contractor: t.contractor,
    planned_quantity: t.plannedQuantity,
    actual_quantity: t.actualQuantity,
    unit: t.unit,
    responsible: t.responsible,
    duration_days: t.durationDays,
    status: t.status,
    cost: t.cost
  }))
);

let dokumanlarStore: DokumanRecord[] = initialDocuments.map((d, idx) => ({
  id: d.id,
  notes: `Doküman versiyonu ${d.version}`,
  row_status: 1,
  create_uid: 1,
  create_date: '2026-03-10 11:15:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  project_id: 'IGA-ETAP-1',
  block_id: d.associatedBlockId || null,
  task_id: d.associatedTaskId || null,
  name: d.name,
  version: d.version,
  file_size: d.fileSize,
  upload_date: d.uploadDate,
  approval_status: d.approvalWorkflow?.[0]?.status || 'Approved',
  approver: d.approvalWorkflow?.[0]?.approver || 'İnşaat Koordinatörü'
}));

let varliklarStore: VarlikRecord[] = initialAssets.map((a) => ({
  id: a.id,
  notes: `Varlık Kaydı ${a.name} (${a.type})`,
  row_status: 1,
  create_uid: 1,
  create_date: '2026-04-01 10:00:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  project_id: a.associatedProjectId || 'IGA-ETAP-1',
  block_id: a.associatedBlockId || null,
  name: a.name,
  asset_type: a.type,
  install_date: a.installDate,
  expected_life_years: a.expectedLifeYears,
  warranty_status: a.warrantyStatus,
  manufacturer: a.manufacturer,
  tech_doc_url: a.techDocUrl,
  maintenance_cost: a.maintenanceCost,
  energy_cost: a.energyCost,
  status: a.status,
  last_maintenance_date: a.lastMaintenanceDate
}));

let bakimStore: BakimKaydiRecord[] = initialMaintenanceLogs.map((l) => ({
  id: l.id,
  notes: `${l.type} - ${l.description}`,
  row_status: 1,
  create_uid: 1,
  create_date: '2026-05-01 14:30:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  asset_id: l.assetId,
  maintenance_date: l.date,
  log_type: l.type,
  description: l.description,
  cost: l.cost,
  technician: l.technician,
  status: l.status
}));

let bildirimlerStore: BildirimRecord[] = initialNotifications.map((n) => ({
  id: n.id,
  notes: `Sistem Bildirimi: ${n.type}`,
  row_status: 1,
  create_uid: 1,
  create_date: '2026-08-01 09:00:00',
  write_uid: 1,
  write_date: '2026-08-27 12:00:00',
  project_id: n.projectId || null,
  notification_type: n.type,
  message: n.message,
  notification_date: n.date,
  is_read: n.read
}));

let personelStore: PersonelRecord[] = [
  {
    id: 1,
    notes: 'Sistem Süper Yöneticisi',
    row_status: 1,
    create_uid: 1,
    create_date: '2026-01-01 00:00:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    full_name: 'Ahmet Yılmaz',
    email: 'ahmet.yilmaz@iga.aero',
    role: 'CBS & Sistem Başmimarı',
    department: 'Bilgi Teknolojileri & CBS',
    phone: '+90 532 100 2001',
    user_role: 'super_user',
    allocation_percentage: 100,
    avatar_url: 'AY'
  },
  {
    id: 2,
    notes: 'Proje Direktörü & EVM Yöneticisi',
    row_status: 1,
    create_uid: 1,
    create_date: '2026-01-01 00:00:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    full_name: 'Murat Erdem',
    email: 'murat.erdem@iga.aero',
    role: 'Proje Direktörü & Başmühendis',
    department: 'Proje Yönetim Ofisi (PMO)',
    phone: '+90 532 200 3002',
    user_role: 'power_user',
    allocation_percentage: 100,
    avatar_url: 'ME'
  },
  {
    id: 3,
    notes: 'BIM/GIS Koordinasyon Lideri',
    row_status: 1,
    create_uid: 1,
    create_date: '2026-01-01 00:00:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    full_name: 'Berrin Yücel',
    email: 'berrin.yucel@iga.aero',
    role: 'BIM / GIS Koordinatörü',
    department: 'Teknik Ofis & CBS',
    phone: '+90 532 300 4003',
    user_role: 'power_user',
    allocation_percentage: 100,
    avatar_url: 'BY'
  },
  {
    id: 4,
    notes: 'Elektromekanik Saha Şefi',
    row_status: 1,
    create_uid: 1,
    create_date: '2026-01-01 00:00:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    full_name: 'Selim Kara',
    email: 'selim.kara@iga.aero',
    role: 'Elektromekanik Saha Şefi',
    department: 'Saha Operasyonları',
    phone: '+90 532 400 5004',
    user_role: 'standart_user',
    allocation_percentage: 100,
    avatar_url: 'SK'
  },
  {
    id: 5,
    notes: 'Otel & Fitout Mimari Şefi',
    row_status: 1,
    create_uid: 1,
    create_date: '2026-01-01 00:00:00',
    write_uid: 1,
    write_date: '2026-08-27 12:00:00',
    full_name: 'Deniz Aktaş',
    email: 'deniz.aktas@iga.aero',
    role: 'Otel & Fitout Mimari Şefi',
    department: 'Mimari Grup',
    phone: '+90 532 500 6005',
    user_role: 'standart_user',
    allocation_percentage: 100,
    avatar_url: 'DA'
  }
];

let yetkilerStore: YetkiRecord[] = [
  { id: 1, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_projeler', can_read: true, can_write: true, can_delete: true, can_admin: true },
  { id: 2, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_binalar_3d', can_read: true, can_write: true, can_delete: true, can_admin: true },
  { id: 3, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_altyapi_hatlari', can_read: true, can_write: true, can_delete: true, can_admin: true },
  { id: 4, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_proje_sinirlari', can_read: true, can_write: true, can_delete: true, can_admin: true },
  { id: 5, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_wbs_gorevler', can_read: true, can_write: true, can_delete: true, can_admin: true },
  { id: 6, notes: 'Proje Yönetim', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 2, user_name: 'Murat Erdem', table_or_layer_name: 'tb_projeler', can_read: true, can_write: true, can_delete: false, can_admin: true },
  { id: 7, notes: 'Görev Düzenleme', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 2, user_name: 'Murat Erdem', table_or_layer_name: 'tb_wbs_gorevler', can_read: true, can_write: true, can_delete: true, can_admin: true },
  { id: 8, notes: 'CBS Katman Yönetimi', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 3, user_name: 'Berrin Yücel', table_or_layer_name: 'tb_binalar_3d', can_read: true, can_write: true, can_delete: true, can_admin: false },
  { id: 9, notes: 'Altyapı Düzenleme', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 3, user_name: 'Berrin Yücel', table_or_layer_name: 'tb_altyapi_hatlari', can_read: true, can_write: true, can_delete: false, can_admin: false },
  { id: 10, notes: 'Saha Okuma', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 4, user_name: 'Selim Kara', table_or_layer_name: 'tb_altyapi_hatlari', can_read: true, can_write: true, can_delete: false, can_admin: false },
  { id: 11, notes: 'Mimari Okuma', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 5, user_name: 'Deniz Aktaş', table_or_layer_name: 'tb_binalar_3d', can_read: true, can_write: false, can_delete: false, can_admin: false }
];

let sutunlarStore: TabloSutunRecord[] = [
  // Standart 7 kolonlar
  { table_name: 'tb_projeler', column_name: 'id', data_type: 'serial', is_nullable: false, column_default: 'nextval()', description: 'Birincil anahtar', is_standard: true },
  { table_name: 'tb_projeler', column_name: 'notes', data_type: 'text', is_nullable: true, description: 'Kayıt notları', is_standard: true },
  { table_name: 'tb_projeler', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', description: '1: Aktif, 0: Silinmiş', is_standard: true },
  { table_name: 'tb_projeler', column_name: 'create_uid', data_type: 'integer', is_nullable: true, description: 'Oluşturan kullanıcı ID', is_standard: true },
  { table_name: 'tb_projeler', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', description: 'Oluşturma zamanı', is_standard: true },
  { table_name: 'tb_projeler', column_name: 'write_uid', data_type: 'integer', is_nullable: true, description: 'Son güncelleyen kullanıcı ID', is_standard: true },
  { table_name: 'tb_projeler', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, description: 'Son güncelleme zamanı', is_standard: true },
  
  // tb_projeler iş kolonları
  { table_name: 'tb_projeler', column_name: 'project_code', data_type: 'varchar(50)', is_nullable: false, description: 'Proje benzersiz kodu' },
  { table_name: 'tb_projeler', column_name: 'name', data_type: 'varchar(255)', is_nullable: false, description: 'Proje tam adı' },
  { table_name: 'tb_projeler', column_name: 'location', data_type: 'varchar(255)', is_nullable: false, description: 'Konum ve bölge' },
  { table_name: 'tb_projeler', column_name: 'ada_parsel', data_type: 'varchar(100)', is_nullable: false, description: 'Tapu ve kadastro ada/parsel' },
  { table_name: 'tb_projeler', column_name: 'area', data_type: 'varchar(100)', is_nullable: true, description: 'Toplam arsa alanı' },
  { table_name: 'tb_projeler', column_name: 'risk_level', data_type: 'varchar(50)', is_nullable: true, column_default: "'Düşük'", description: 'EVM Risk derecesi' },
  { table_name: 'tb_projeler', column_name: 'overall_progress', data_type: 'numeric(5,2)', is_nullable: false, column_default: '0', description: 'Fiziki gerçekleşme (%)' },
  { table_name: 'tb_projeler', column_name: 'budget', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Toplam bütçe (Milyon TL)' },
  { table_name: 'tb_projeler', column_name: 'spent', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Fiili harcanan (Milyon TL)' },
  { table_name: 'tb_projeler', column_name: 'planned_spent', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Planlanan maliyet (PV)' },
  { table_name: 'tb_projeler', column_name: 'earned_value', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Kazanılmış değer (EV)' },
  { table_name: 'tb_projeler', column_name: 'status', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlama'", description: 'Proje aşaması' },
  { table_name: 'tb_projeler', column_name: 'center_lng', data_type: 'numeric(10,6)', is_nullable: true, description: 'Boylam' },
  { table_name: 'tb_projeler', column_name: 'center_lat', data_type: 'numeric(10,6)', is_nullable: true, description: 'Enlem' },

  // tb_binalar_3d
  { table_name: 'tb_binalar_3d', column_name: 'id', data_type: 'serial', is_nullable: false, is_standard: true },
  { table_name: 'tb_binalar_3d', column_name: 'notes', data_type: 'text', is_nullable: true, is_standard: true },
  { table_name: 'tb_binalar_3d', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', is_standard: true },
  { table_name: 'tb_binalar_3d', column_name: 'create_uid', data_type: 'integer', is_nullable: true, is_standard: true },
  { table_name: 'tb_binalar_3d', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', is_standard: true },
  { table_name: 'tb_binalar_3d', column_name: 'write_uid', data_type: 'integer', is_nullable: true, is_standard: true },
  { table_name: 'tb_binalar_3d', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, is_standard: true },
  { table_name: 'tb_binalar_3d', column_name: 'project_id', data_type: 'varchar(50)', is_nullable: false, description: 'İlişkili proje kodu' },
  { table_name: 'tb_binalar_3d', column_name: 'block_name', data_type: 'varchar(150)', is_nullable: false, description: 'Blok veya kule adı' },
  { table_name: 'tb_binalar_3d', column_name: 'building_type', data_type: 'varchar(100)', is_nullable: false, description: 'Bina fonksiyon tipi' },
  { table_name: 'tb_binalar_3d', column_name: 'height_meters', data_type: 'numeric(6,2)', is_nullable: false, description: 'Bina yüksekliği (m)' },
  { table_name: 'tb_binalar_3d', column_name: 'floors_count', data_type: 'integer', is_nullable: false, description: 'Toplam kat adedi' },
  { table_name: 'tb_binalar_3d', column_name: 'construction_progress', data_type: 'numeric(5,2)', is_nullable: false, column_default: '0', description: 'İnşaat tamamlama %' },
  { table_name: 'tb_binalar_3d', column_name: 'structural_status', data_type: 'varchar(100)', is_nullable: false, description: 'Kaba / İnce yapı durumu' },
  { table_name: 'tb_binalar_3d', column_name: 'footprint_area_sqm', data_type: 'numeric(10,2)', is_nullable: false, description: 'Taban oturum alanı (m²)' },
  { table_name: 'tb_binalar_3d', column_name: 'veri_durumu', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlanan'", description: 'Veri Durumu (Planlanan, İnşaat, İşletme, İptal)' },
  { table_name: 'tb_binalar_3d', column_name: 'the_geom', data_type: 'geometry(Polygon,5257)', is_nullable: true, description: 'PostGIS Çokgen Geometrisi' },

  // tb_altyapi_hatlari
  { table_name: 'tb_altyapi_hatlari', column_name: 'id', data_type: 'serial', is_nullable: false, is_standard: true },
  { table_name: 'tb_altyapi_hatlari', column_name: 'notes', data_type: 'text', is_nullable: true, is_standard: true },
  { table_name: 'tb_altyapi_hatlari', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', is_standard: true },
  { table_name: 'tb_altyapi_hatlari', column_name: 'create_uid', data_type: 'integer', is_nullable: true, is_standard: true },
  { table_name: 'tb_altyapi_hatlari', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', is_standard: true },
  { table_name: 'tb_altyapi_hatlari', column_name: 'write_uid', data_type: 'integer', is_nullable: true, is_standard: true },
  { table_name: 'tb_altyapi_hatlari', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, is_standard: true },
  { table_name: 'tb_altyapi_hatlari', column_name: 'project_id', data_type: 'varchar(50)', is_nullable: false, description: 'Proje ID' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'line_type', data_type: 'varchar(50)', is_nullable: false, description: 'Hat türü (elektrik, su, gaz, telekom vb.)' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'network_name', data_type: 'varchar(255)', is_nullable: false, description: 'Şebeke tanımı' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'pipe_or_cable_spec', data_type: 'varchar(255)', is_nullable: false, description: 'Kablo veya boru kesit spesifikasyonu' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'depth_meters', data_type: 'numeric(6,2)', is_nullable: false, description: 'Gömü derinliği (m)' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'voltage_or_pressure', data_type: 'varchar(100)', is_nullable: false, description: 'Gerilim veya işletme basıncı' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'total_length_meters', data_type: 'numeric(10,2)', is_nullable: false, description: 'Hat metrajı (m)' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'status', data_type: 'varchar(50)', is_nullable: false, column_default: "'Faal'", description: 'İşletme durumu' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'veri_durumu', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlanan'", description: 'Veri Durumu (Planlanan, İnşaat, İşletme, İptal)' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'the_geom', data_type: 'geometry(LineString,5257)', is_nullable: true, description: 'PostGIS Çizgi Geometrisi' },

  // tb_proje_sinirlari
  { table_name: 'tb_proje_sinirlari', column_name: 'id', data_type: 'serial', is_nullable: false, is_standard: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'notes', data_type: 'text', is_nullable: true, is_standard: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', is_standard: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'create_uid', data_type: 'integer', is_nullable: true, is_standard: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', is_standard: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'write_uid', data_type: 'integer', is_nullable: true, is_standard: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, is_standard: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'project_id', data_type: 'varchar(50)', is_nullable: false, description: 'Proje ID' },
  { table_name: 'tb_proje_sinirlari', column_name: 'project_name', data_type: 'varchar(255)', is_nullable: false, description: 'Saha Adı' },
  { table_name: 'tb_proje_sinirlari', column_name: 'ada_parsel', data_type: 'varchar(100)', is_nullable: false, description: 'Kadastral Parsel' },
  { table_name: 'tb_proje_sinirlari', column_name: 'area_sqm', data_type: 'numeric(12,2)', is_nullable: false, description: 'Alan (m²)' },
  { table_name: 'tb_proje_sinirlari', column_name: 'veri_durumu', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlanan'", description: 'Veri Durumu (Planlanan, İnşaat, İşletme, İptal)' },
  { table_name: 'tb_proje_sinirlari', column_name: 'the_geom', data_type: 'geometry(Polygon,5257)', is_nullable: true, description: 'PostGIS Çokgen Sınırı' }
];

// ==========================================
// API ASYNC FUNCTIONS BY TABLE
// ==========================================

// 1. TABLO ADI (tb_proje_durumlari)
export async function getProjeDurumlari(): Promise<DurumRecord[]> {
  return durumlarStore.filter(r => r.row_status === 1);
}
export async function getProjeDurumuById(id: number | string): Promise<DurumRecord | null> {
  return durumlarStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createProjeDurumu(item: Partial<DurumRecord>): Promise<DurumRecord> {
  const newItem: DurumRecord = {
    id: Date.now(),
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    code: item.code || `durum_${Date.now()}`,
    name: item.name || 'Yeni Durum'
  };
  durumlarStore.push(newItem);
  return newItem;
}
export async function updateProjeDurumu(id: number | string, item: Partial<DurumRecord>): Promise<DurumRecord> {
  const idx = durumlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    durumlarStore[idx] = { ...durumlarStore[idx], ...item, write_date: new Date().toISOString() };
    return durumlarStore[idx];
  }
  throw new Error(`Kayıt bulunamadı: ${id}`);
}
export async function deleteProjeDurumu(id: number | string): Promise<boolean> {
  const idx = durumlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    durumlarStore[idx].row_status = 0; // soft delete
    return true;
  }
  return false;
}

// 2. TABLO ADI (tb_risk_dereceleri)
export async function getRiskDereceleri(): Promise<RiskRecord[]> {
  return risklerStore.filter(r => r.row_status === 1);
}
export async function getRiskDerecesiById(id: number | string): Promise<RiskRecord | null> {
  return risklerStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createRiskDerecesi(item: Partial<RiskRecord>): Promise<RiskRecord> {
  const newItem: RiskRecord = {
    id: Date.now(),
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    code: item.code || `risk_${Date.now()}`,
    name: item.name || 'Yeni Risk Derecesi'
  };
  risklerStore.push(newItem);
  return newItem;
}
export async function updateRiskDerecesi(id: number | string, item: Partial<RiskRecord>): Promise<RiskRecord> {
  const idx = risklerStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    risklerStore[idx] = { ...risklerStore[idx], ...item, write_date: new Date().toISOString() };
    return risklerStore[idx];
  }
  throw new Error(`Kayıt bulunamadı: ${id}`);
}
export async function deleteRiskDerecesi(id: number | string): Promise<boolean> {
  const idx = risklerStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    risklerStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 3. TABLO ADI (tb_kullanici_rolleri)
export async function getKullaniciRolleri(): Promise<RolRecord[]> {
  return rollerStore.filter(r => r.row_status === 1);
}
export async function getKullaniciRoluById(id: number | string): Promise<RolRecord | null> {
  return rollerStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createKullaniciRolu(item: Partial<RolRecord>): Promise<RolRecord> {
  const newItem: RolRecord = {
    id: Date.now(),
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    code: item.code || 'standart_user',
    name: item.name || 'Yeni Rol',
    description: item.description || ''
  };
  rollerStore.push(newItem);
  return newItem;
}
export async function updateKullaniciRolu(id: number | string, item: Partial<RolRecord>): Promise<RolRecord> {
  const idx = rollerStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    rollerStore[idx] = { ...rollerStore[idx], ...item, write_date: new Date().toISOString() };
    return rollerStore[idx];
  }
  throw new Error(`Kayıt bulunamadı: ${id}`);
}
export async function deleteKullaniciRolu(id: number | string): Promise<boolean> {
  const idx = rollerStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    rollerStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 4. TABLO ADI (tb_projeler)
export async function getProjeler(): Promise<ProjeRecord[]> {
  return projelerStore.filter(r => r.row_status === 1);
}
export async function getProjeById(id: number | string): Promise<ProjeRecord | null> {
  return projelerStore.find(r => (r.id === id || r.code === id) && r.row_status === 1) || null;
}
export async function createProje(item: Partial<ProjeRecord>): Promise<ProjeRecord> {
  const newId = item.id || `IGA-ETAP-${Date.now()}`;
  const newItem: ProjeRecord = {
    id: newId,
    notes: item.notes || `Proje ${item.name || ''}`,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    code: item.code || String(newId),
    name: item.name || 'Yeni İGA Projesi',
    location: item.location || 'Arnavutköy',
    ada_parsel: item.ada_parsel || '4100 / 1',
    area: item.area || '100.000 m²',
    risk_level: item.risk_level || 'Düşük',
    overall_progress: item.overall_progress || 0,
    budget: item.budget || 1000,
    spent: item.spent || 0,
    planned_spent: item.planned_spent || 100,
    earned_value: item.earned_value || 0,
    status: item.status || 'Planlama',
    center_lng: item.center_lng || 28.7680,
    center_lat: item.center_lat || 41.2680,
    the_geom: item.the_geom || { tip: 'Point', coordinates: [28.7680, 41.2680] }
  };
  projelerStore.push(newItem);
  return newItem;
}
export async function updateProje(id: number | string, item: Partial<ProjeRecord>): Promise<ProjeRecord> {
  const idx = projelerStore.findIndex(r => r.id === id || r.code === id);
  if (idx !== -1) {
    projelerStore[idx] = { ...projelerStore[idx], ...item, write_date: new Date().toISOString() };
    return projelerStore[idx];
  }
  throw new Error(`Proje bulunamadı: ${id}`);
}
export async function deleteProje(id: number | string): Promise<boolean> {
  const idx = projelerStore.findIndex(r => r.id === id || r.code === id);
  if (idx !== -1) {
    projelerStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 5. TABLO ADI (tb_proje_sinirlari)
export async function getProjeSinirlari(): Promise<ProjeSiniriRecord[]> {
  return sinirlarStore.filter(r => r.row_status === 1);
}
export async function getProjeSiniriById(id: number | string): Promise<ProjeSiniriRecord | null> {
  return sinirlarStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createProjeSiniri(item: Partial<ProjeSiniriRecord>): Promise<ProjeSiniriRecord> {
  const newItem: ProjeSiniriRecord = {
    id: item.id || `sinir-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    project_name: item.project_name || 'İGA Saha Sınırı',
    ada_parsel: item.ada_parsel || '4100 / 1',
    area_sqm: item.area_sqm || 100000,
    srid: 5257,
    the_geom: item.the_geom
  };
  sinirlarStore.push(newItem);
  return newItem;
}
export async function updateProjeSiniri(id: number | string, item: Partial<ProjeSiniriRecord>): Promise<ProjeSiniriRecord> {
  const idx = sinirlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    sinirlarStore[idx] = { ...sinirlarStore[idx], ...item, write_date: new Date().toISOString() };
    return sinirlarStore[idx];
  }
  throw new Error(`Sınır kaydı bulunamadı: ${id}`);
}
export async function deleteProjeSiniri(id: number | string): Promise<boolean> {
  const idx = sinirlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    sinirlarStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 6. TABLO ADI (tb_binalar_3d)
export async function getBinalar3D(): Promise<Bina3DRecord[]> {
  return binalarStore.filter(r => r.row_status === 1);
}
export async function getBina3DById(id: number | string): Promise<Bina3DRecord | null> {
  return binalarStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createBina3D(item: Partial<Bina3DRecord>): Promise<Bina3DRecord> {
  const newItem: Bina3DRecord = {
    id: item.id || `bina-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    block_name: item.block_name || 'Yeni Blok',
    building_type: item.building_type || 'Ticaret',
    height_meters: item.height_meters || 50,
    floors_count: item.floors_count || 12,
    construction_progress: item.construction_progress || 0,
    structural_status: item.structural_status || 'Kaba Yapı',
    footprint_area_sqm: item.footprint_area_sqm || 2500,
    srid: 5257,
    the_geom: item.the_geom
  };
  binalarStore.push(newItem);
  return newItem;
}
export async function updateBina3D(id: number | string, item: Partial<Bina3DRecord>): Promise<Bina3DRecord> {
  const idx = binalarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    binalarStore[idx] = { ...binalarStore[idx], ...item, write_date: new Date().toISOString() };
    return binalarStore[idx];
  }
  throw new Error(`3D Bina kaydı bulunamadı: ${id}`);
}
export async function deleteBina3D(id: number | string): Promise<boolean> {
  const idx = binalarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    binalarStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 7. TABLO ADI (tb_altyapi_hatlari)
export async function getAltyapiHatlari(): Promise<AltyapiHattiRecord[]> {
  return altyapiStore.filter(r => r.row_status === 1);
}
export async function getAltyapiHattiById(id: number | string): Promise<AltyapiHattiRecord | null> {
  return altyapiStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createAltyapiHatti(item: Partial<AltyapiHattiRecord>): Promise<AltyapiHattiRecord> {
  const newItem: AltyapiHattiRecord = {
    id: item.id || `altyapi-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    line_type: item.line_type || 'elektrik',
    network_name: item.network_name || 'Yeni Altyapı Şebekesi',
    pipe_or_cable_spec: item.pipe_or_cable_spec || 'Standart Kablo',
    depth_meters: item.depth_meters || 1.5,
    voltage_or_pressure: item.voltage_or_pressure || 'Standart',
    total_length_meters: item.total_length_meters || 500,
    status: item.status || 'Faal',
    srid: 5257,
    the_geom: item.the_geom
  };
  altyapiStore.push(newItem);
  return newItem;
}
export async function updateAltyapiHatti(id: number | string, item: Partial<AltyapiHattiRecord>): Promise<AltyapiHattiRecord> {
  const idx = altyapiStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    altyapiStore[idx] = { ...altyapiStore[idx], ...item, write_date: new Date().toISOString() };
    return altyapiStore[idx];
  }
  throw new Error(`Altyapı kaydı bulunamadı: ${id}`);
}
export async function deleteAltyapiHatti(id: number | string): Promise<boolean> {
  const idx = altyapiStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    altyapiStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 8. TABLO ADI (tb_bloklar)
export async function getBloklar(): Promise<BlokRecord[]> {
  return bloklarStore.filter(r => r.row_status === 1);
}
export async function getBlokById(id: number | string): Promise<BlokRecord | null> {
  return bloklarStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createBlok(item: Partial<BlokRecord>): Promise<BlokRecord> {
  const newItem: BlokRecord = {
    id: item.id || `blok-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    name: item.name || 'Yeni Blok',
    height: item.height || 40,
    floors: item.floors || 10,
    progress: item.progress || 0,
    status: item.status || 'Planlandı',
    center_lng: item.center_lng || 28.7680,
    center_lat: item.center_lat || 41.2680,
    the_geom: item.the_geom
  };
  bloklarStore.push(newItem);
  return newItem;
}
export async function updateBlok(id: number | string, item: Partial<BlokRecord>): Promise<BlokRecord> {
  const idx = bloklarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    bloklarStore[idx] = { ...bloklarStore[idx], ...item, write_date: new Date().toISOString() };
    return bloklarStore[idx];
  }
  throw new Error(`Blok bulunamadı: ${id}`);
}
export async function deleteBlok(id: number | string): Promise<boolean> {
  const idx = bloklarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    bloklarStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 9. TABLO ADI (tb_ruhsatlar)
export async function getRuhsatlar(): Promise<RuhsatRecord[]> {
  return ruhsatlarStore.filter(r => r.row_status === 1);
}
export async function getRuhsatById(id: number | string): Promise<RuhsatRecord | null> {
  return ruhsatlarStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createRuhsat(item: Partial<RuhsatRecord>): Promise<RuhsatRecord> {
  const newItem: RuhsatRecord = {
    id: item.id || `ruhsat-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    name: item.name || 'Yeni İzin & Ruhsat',
    authority: item.authority || 'Resmi Kurum',
    issue_date: item.issue_date || '2026-01-01',
    expiry_date: item.expiry_date || '2029-01-01',
    status: item.status || 'Alındı',
    geographic_scope: item.geographic_scope || 'Proje Sahası',
    document_url: item.document_url || 'belge.pdf'
  };
  ruhsatlarStore.push(newItem);
  return newItem;
}
export async function updateRuhsat(id: number | string, item: Partial<RuhsatRecord>): Promise<RuhsatRecord> {
  const idx = ruhsatlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    ruhsatlarStore[idx] = { ...ruhsatlarStore[idx], ...item, write_date: new Date().toISOString() };
    return ruhsatlarStore[idx];
  }
  throw new Error(`Ruhsat bulunamadı: ${id}`);
}
export async function deleteRuhsat(id: number | string): Promise<boolean> {
  const idx = ruhsatlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    ruhsatlarStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 10. TABLO ADI (tb_wbs_gorevler)
export async function getWbsGorevler(): Promise<WbsGorevRecord[]> {
  return wbsStore.filter(r => r.row_status === 1);
}
export async function getWbsGorevById(id: number | string): Promise<WbsGorevRecord | null> {
  return wbsStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createWbsGorev(item: Partial<WbsGorevRecord>): Promise<WbsGorevRecord> {
  const newItem: WbsGorevRecord = {
    id: item.id || `task-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    block_id: item.block_id || null,
    wbs_code: item.wbs_code || '01',
    name: item.name || 'Yeni İş Paketi',
    progress: item.progress || 0,
    start_date: item.start_date || '2026-08-01',
    end_date: item.end_date || '2026-08-31',
    contractor: item.contractor || 'Ana Yüklenici',
    planned_quantity: item.planned_quantity || 100,
    actual_quantity: item.actual_quantity || 0,
    unit: item.unit || 'm²',
    responsible: item.responsible || 'Saha Şefi',
    duration_days: item.duration_days || 10,
    status: item.status || 'Talep',
    cost: item.cost || 10
  };
  wbsStore.push(newItem);
  return newItem;
}
export async function updateWbsGorev(id: number | string, item: Partial<WbsGorevRecord>): Promise<WbsGorevRecord> {
  const idx = wbsStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    wbsStore[idx] = { ...wbsStore[idx], ...item, write_date: new Date().toISOString() };
    return wbsStore[idx];
  }
  throw new Error(`WBS Görevi bulunamadı: ${id}`);
}
export async function deleteWbsGorev(id: number | string): Promise<boolean> {
  const idx = wbsStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    wbsStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 11. TABLO ADI (tb_dokumanlar)
export async function getDokumanlar(): Promise<DokumanRecord[]> {
  return dokumanlarStore.filter(r => r.row_status === 1);
}
export async function getDokumanById(id: number | string): Promise<DokumanRecord | null> {
  return dokumanlarStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createDokuman(item: Partial<DokumanRecord>): Promise<DokumanRecord> {
  const newItem: DokumanRecord = {
    id: item.id || `doc-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    block_id: item.block_id || null,
    task_id: item.task_id || null,
    name: item.name || 'Yeni Teknik Çizim / CDE Dosyası',
    version: item.version || 'v1.0',
    file_size: item.file_size || '5.0 MB',
    upload_date: item.upload_date || '2026-08-27',
    approval_status: item.approval_status || 'Approved',
    approver: item.approver || 'BIM Koordinatörü'
  };
  dokumanlarStore.push(newItem);
  return newItem;
}
export async function updateDokuman(id: number | string, item: Partial<DokumanRecord>): Promise<DokumanRecord> {
  const idx = dokumanlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    dokumanlarStore[idx] = { ...dokumanlarStore[idx], ...item, write_date: new Date().toISOString() };
    return dokumanlarStore[idx];
  }
  throw new Error(`Doküman bulunamadı: ${id}`);
}
export async function deleteDokuman(id: number | string): Promise<boolean> {
  const idx = dokumanlarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    dokumanlarStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 12. TABLO ADI (tb_varliklar)
export async function getVarliklar(): Promise<VarlikRecord[]> {
  return varliklarStore.filter(r => r.row_status === 1);
}
export async function getVarlikById(id: number | string): Promise<VarlikRecord | null> {
  return varliklarStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createVarlik(item: Partial<VarlikRecord>): Promise<VarlikRecord> {
  const newItem: VarlikRecord = {
    id: item.id || `asset-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || 'IGA-ETAP-1',
    block_id: item.block_id || null,
    name: item.name || 'Yeni İşletme Varlığı',
    asset_type: item.asset_type || 'Ekipman',
    install_date: item.install_date || '2026-08-01',
    expected_life_years: item.expected_life_years || 20,
    warranty_status: item.warranty_status || 'Aktif',
    manufacturer: item.manufacturer || 'Üretici Firma',
    tech_doc_url: item.tech_doc_url || 'manual.pdf',
    maintenance_cost: item.maintenance_cost || 0,
    energy_cost: item.energy_cost || 0,
    status: item.status || 'Sorunsuz',
    last_maintenance_date: item.last_maintenance_date || '2026-08-20'
  };
  varliklarStore.push(newItem);
  return newItem;
}
export async function updateVarlik(id: number | string, item: Partial<VarlikRecord>): Promise<VarlikRecord> {
  const idx = varliklarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    varliklarStore[idx] = { ...varliklarStore[idx], ...item, write_date: new Date().toISOString() };
    return varliklarStore[idx];
  }
  throw new Error(`Varlık bulunamadı: ${id}`);
}
export async function deleteVarlik(id: number | string): Promise<boolean> {
  const idx = varliklarStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    varliklarStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 13. TABLO ADI (tb_bakim_kayitlari)
export async function getBakimKayitlari(): Promise<BakimKaydiRecord[]> {
  return bakimStore.filter(r => r.row_status === 1);
}
export async function getBakimKaydiById(id: number | string): Promise<BakimKaydiRecord | null> {
  return bakimStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createBakimKaydi(item: Partial<BakimKaydiRecord>): Promise<BakimKaydiRecord> {
  const newItem: BakimKaydiRecord = {
    id: item.id || `maint-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    asset_id: item.asset_id || 1,
    maintenance_date: item.maintenance_date || '2026-08-27',
    log_type: item.log_type || 'Planlı Bakım (PM)',
    description: item.description || 'Rutin kontrol ve filtre değişimi',
    cost: item.cost || 12000,
    technician: item.technician || 'Teknik Ekip',
    status: item.status || 'Açık'
  };
  bakimStore.push(newItem);
  return newItem;
}
export async function updateBakimKaydi(id: number | string, item: Partial<BakimKaydiRecord>): Promise<BakimKaydiRecord> {
  const idx = bakimStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    bakimStore[idx] = { ...bakimStore[idx], ...item, write_date: new Date().toISOString() };
    return bakimStore[idx];
  }
  throw new Error(`Bakım kaydı bulunamadı: ${id}`);
}
export async function deleteBakimKaydi(id: number | string): Promise<boolean> {
  const idx = bakimStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    bakimStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 14. TABLO ADI (tb_bildirimler)
export async function getBildirimler(): Promise<BildirimRecord[]> {
  return bildirimlerStore.filter(r => r.row_status === 1);
}
export async function getBildirimById(id: number | string): Promise<BildirimRecord | null> {
  return bildirimlerStore.find(r => r.id === id && r.row_status === 1) || null;
}
export async function createBildirim(item: Partial<BildirimRecord>): Promise<BildirimRecord> {
  const newItem: BildirimRecord = {
    id: item.id || `notif-${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    project_id: item.project_id || null,
    notification_type: item.notification_type || 'info',
    message: item.message || 'Yeni sistem bildirimi',
    notification_date: item.notification_date || 'Bugün',
    is_read: false
  };
  bildirimlerStore.unshift(newItem);
  return newItem;
}
export async function updateBildirim(id: number | string, item: Partial<BildirimRecord>): Promise<BildirimRecord> {
  const idx = bildirimlerStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    bildirimlerStore[idx] = { ...bildirimlerStore[idx], ...item, write_date: new Date().toISOString() };
    return bildirimlerStore[idx];
  }
  throw new Error(`Bildirim bulunamadı: ${id}`);
}
export async function deleteBildirim(id: number | string): Promise<boolean> {
  const idx = bildirimlerStore.findIndex(r => r.id === id);
  if (idx !== -1) {
    bildirimlerStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 15. TABLO ADI (tb_personel)
export async function getPersoneller(): Promise<PersonelRecord[]> {
  return personelStore.filter(r => r.row_status === 1);
}
export async function getPersonelById(id: number | string): Promise<PersonelRecord | null> {
  return personelStore.find(r => r.id === Number(id) && r.row_status === 1) || null;
}
export async function createPersonel(item: Partial<PersonelRecord>): Promise<PersonelRecord> {
  const newId = personelStore.length > 0 ? Math.max(...personelStore.map(p => Number(p.id))) + 1 : 1;
  const newItem: PersonelRecord = {
    id: newId,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    full_name: item.full_name || 'Yeni Personel',
    email: item.email || `kullanici${newId}@iga.aero`,
    role: item.role || 'Mühendis',
    department: item.department || 'Proje Grubu',
    phone: item.phone || '+90 532 000 0000',
    user_role: item.user_role || 'standart_user',
    allocation_percentage: item.allocation_percentage || 100,
    avatar_url: item.full_name ? item.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'YP'
  };
  personelStore.push(newItem);
  return newItem;
}
export async function updatePersonel(id: number | string, item: Partial<PersonelRecord>): Promise<PersonelRecord> {
  const idx = personelStore.findIndex(r => r.id === Number(id));
  if (idx !== -1) {
    personelStore[idx] = { ...personelStore[idx], ...item, write_date: new Date().toISOString() };
    return personelStore[idx];
  }
  throw new Error(`Personel bulunamadı: ${id}`);
}
export async function deletePersonel(id: number | string): Promise<boolean> {
  const idx = personelStore.findIndex(r => r.id === Number(id));
  if (idx !== -1) {
    personelStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 16. TABLO ADI (tb_yetkiler)
export async function getYetkiler(): Promise<YetkiRecord[]> {
  return yetkilerStore.filter(r => r.row_status === 1);
}
export async function getYetkiById(id: number | string): Promise<YetkiRecord | null> {
  return yetkilerStore.find(r => r.id === Number(id) && r.row_status === 1) || null;
}
export async function createYetki(item: Partial<YetkiRecord>): Promise<YetkiRecord> {
  const newId = yetkilerStore.length > 0 ? Math.max(...yetkilerStore.map(y => Number(y.id))) + 1 : 1;
  const newItem: YetkiRecord = {
    id: newId,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    user_id: item.user_id || 1,
    user_name: item.user_name || 'Kullanıcı',
    table_or_layer_name: item.table_or_layer_name || 'tb_projeler',
    can_read: item.can_read ?? true,
    can_write: item.can_write ?? false,
    can_delete: item.can_delete ?? false,
    can_admin: item.can_admin ?? false
  };
  yetkilerStore.push(newItem);
  return newItem;
}
export async function updateYetki(id: number | string, item: Partial<YetkiRecord>): Promise<YetkiRecord> {
  const idx = yetkilerStore.findIndex(r => r.id === Number(id));
  if (idx !== -1) {
    yetkilerStore[idx] = { ...yetkilerStore[idx], ...item, write_date: new Date().toISOString() };
    return yetkilerStore[idx];
  }
  throw new Error(`Yetki kaydı bulunamadı: ${id}`);
}
export async function deleteYetki(id: number | string): Promise<boolean> {
  const idx = yetkilerStore.findIndex(r => r.id === Number(id));
  if (idx !== -1) {
    yetkilerStore[idx].row_status = 0;
    return true;
  }
  return false;
}

// 17. TABLO SÜTUN META YÖNETİMİ
export async function getTabloSutunlari(tableName?: string): Promise<TabloSutunRecord[]> {
  if (tableName) {
    return sutunlarStore.filter(c => c.table_name === tableName);
  }
  return sutunlarStore;
}
export async function addTabloSutunu(newCol: TabloSutunRecord): Promise<TabloSutunRecord> {
  const existing = sutunlarStore.find(c => c.table_name === newCol.table_name && c.column_name === newCol.column_name);
  if (existing) {
    throw new Error(`'${newCol.column_name}' kolonu '${newCol.table_name}' tablosunda zaten mevcut.`);
  }
  sutunlarStore.push(newCol);
  return newCol;
}
