import {
  DurumRecord,
  RiskRecord,
  VeriDurumuRecord,
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
// YEREL DOSYA VERİTABANI API İSTEMCİSİ
// ==========================================
// Bu dosya artık tarayıcı belleğinde bir mock DEĞİL — server/index.js'in
// sunduğu gerçek bir yerel REST API'ye bağlanır; veriler server/data/
// oda_pys.gpkg dosyasına (bkz. server/db.js) kalıcı olarak yazılır — CBS
// katmanlarındaki (proje sınırları, binalar, altyapı hatları) geometriler
// GERÇEK GeoPackage WKB formatında saklanır. Sayfa yenilense veya sunucu
// yeniden başlasa bile veri kaybolmaz.
//
// Vite dev sunucusu `/api` isteklerini server'a proxy'ler (bkz. vite.config.ts)
// — bu yüzden burada sadece göreli '/api' kök yolu kullanılır, CORS/port
// bilmeye gerek yoktur.
//
// Tasarım: her tablo için aynı generic uç noktalar kullanılır (GET/POST
// /api/:table, GET/PUT/DELETE /api/:table/:id). Alan varsayılanları (id
// üretimi, boş alanlara varsayılan atama vb.) KASITLI OLARAK burada
// (istemci tarafında) kalır — sunucu sade bir kalıcı depolama katmanıdır;
// bu hem mevcut davranışı birebir korur hem de üretimde PostGIS'e geçerken
// (server/db.js'in üstündeki 4 generic fonksiyonu pg ile değiştirerek)
// bu dosyanın HİÇ değişmeden kalmasını sağlar.
const API_BASE = '/api';

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API hatası (${res.status}) ${path}: ${body}`);
  }
  return res.json();
}

function apiList<T>(table: string): Promise<T[]> {
  return apiRequest<T[]>(`/${table}`);
}
async function apiGet<T>(table: string, id: number | string): Promise<T | null> {
  try {
    return await apiRequest<T>(`/${table}/${encodeURIComponent(String(id))}`);
  } catch {
    return null;
  }
}
function apiCreate<T>(table: string, item: T): Promise<T> {
  return apiRequest<T>(`/${table}`, { method: 'POST', body: JSON.stringify(item) });
}
function apiUpdate<T>(table: string, id: number | string, patch: Partial<T>): Promise<T> {
  return apiRequest<T>(`/${table}/${encodeURIComponent(String(id))}`, { method: 'PUT', body: JSON.stringify(patch) });
}
async function apiSoftDelete(table: string, id: number | string): Promise<boolean> {
  try {
    const r = await apiRequest<{ ok: boolean }>(`/${table}/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
    return r.ok;
  } catch {
    return false;
  }
}

// Her tabloyu SADECE BİR KEZ, uygulama ilk açıldığında (data.ts kaynaklı
// varsayılan kayıtlarla) tohumlar — sunucu tarafındaki tablo zaten doluysa
// (önceki bir oturumdan kalan kalıcı veri) hiçbir şey yapmaz.
const seedPromises: Record<string, Promise<void>> = {};
function ensureSeeded(table: string, seedItems: any[]): Promise<void> {
  if (!seedPromises[table]) {
    seedPromises[table] = apiRequest(`/${table}/seed`, {
      method: 'POST',
      body: JSON.stringify({ items: seedItems })
    }).then(() => undefined).catch((err) => {
      console.error(`Tohumlama başarısız (${table}):`, err);
    });
  }
  return seedPromises[table];
}

// ==========================================
// VARSAYILAN (TOHUM) VERİ — sadece tablo sunucuda hiç doldurulmamışsa,
// uygulama ilk açıldığında bir kereliğine kullanılır (bkz. ensureSeeded).
// ==========================================

const durumlarSeed: DurumRecord[] = [
  { id: 1, notes: 'Planlama Aşaması', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'planlama', name: 'Planlama' },
  { id: 2, notes: 'İnşaat / Uygulama', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'devam_ediyor', name: 'Devam Ediyor' },
  { id: 3, notes: 'İşletmede', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'tamamlandi', name: 'Tamamlandı' },
  { id: 4, notes: 'Kritik Risk / Darboğaz', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'kritik', name: 'Kritik' }
];

const risklerSeed: RiskRecord[] = [
  { id: 1, notes: 'Düşük risk', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'dusuk', name: 'Düşük' },
  { id: 2, notes: 'Orta risk', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'orta', name: 'Orta' },
  { id: 3, notes: 'Yüksek risk', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'yuksek', name: 'Yüksek' }
];

// Veri Durumları (tb_data_status) — CBS/PostGIS tablolarındaki (tb_proje_sinirlari,
// tb_binalar_3d, tb_altyapi_hatlari) "veri_durumu" sütunu bu listeye FK ile
// bağlıdır (bkz. sutunlarSeed'deki relation_table='tb_data_status').
const veriDurumlariSeed: VeriDurumuRecord[] = [
  { id: 'Planlanan', notes: 'Henüz sahada uygulamaya başlanmamış', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'planlanan', name: 'Planlanan' },
  { id: 'İnşaat', notes: 'Sahada inşaat/uygulama aşamasında', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'insaat', name: 'İnşaat' },
  { id: 'İşletme', notes: 'Tamamlanmış, işletmede', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'isletme', name: 'İşletme' },
  { id: 'İptal', notes: 'İptal edilmiş / geçersiz kayıt', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'iptal', name: 'İptal' }
];

const rollerSeed: RolRecord[] = [
  { id: 1, notes: 'Sistem Yöneticisi', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'super_user', name: 'Super User', description: 'Tüm sistem ve şema yönetimi yetkisine sahip yönetici' },
  { id: 2, notes: 'İleri Düzey Kullanıcı', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'power_user', name: 'Power User', description: 'İleri düzey veri oluşturma, güncelleme ve analiz yetkisi' },
  { id: 3, notes: 'Standart Kullanıcı', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', code: 'standart_user', name: 'Standart User', description: 'Standart okuma ve saha veri giriş kullanıcısı' }
];

const projelerSeed: ProjeRecord[] = initialProjects.map((p) => ({
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

const sinirlarSeed: ProjeSiniriRecord[] = gisBoundaryRecords.map((b, idx) => ({
  id: b.id || `sinir-${idx + 1}`,
  name: 'PostGIS Çokgen Proje Sınır Kaydı',
  notes: null,
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

const binalarSeed: Bina3DRecord[] = gisBuildingRecords.map((b, idx) => ({
  id: b.id || `bina-${idx + 1}`,
  name: '3D Yapı Bloğu Varlığı',
  notes: null,
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
  // Not: standart (kapalı, dış halka [[...]] içinde sarılmış) GeoJSON Polygon
  // formatında saklanır — Kroki tarafından bir obje taşınıp/düzenlenip
  // veritabanına kaydedildiğinde (updateBina3D) gelen geometri de aynı
  // formatta olduğu için, orijinal (henüz düzenlenmemiş) ve sonradan
  // güncellenmiş kayıtlar haritada tutarlı şekilde render edilir.
  the_geom: {
    tip: 'Polygon',
    coordinates: [[...b.coordinates, b.coordinates[0]]]
  }
}));

const altyapiSeed: AltyapiHattiRecord[] = gisInfrastructureRecords.map((a, idx) => ({
  id: a.id || `altyapi-${idx + 1}`,
  name: 'PostGIS Altyapı Hattı Segmenti',
  notes: null,
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

const bloklarSeed: BlokRecord[] = initialProjects.flatMap((p) =>
  p.blocks.map((b) => ({
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

const ruhsatlarSeed: RuhsatRecord[] = initialProjects.flatMap((p) =>
  p.permits.map((pm) => ({
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

const wbsSeed: WbsGorevRecord[] = Object.entries(initialWbsTasks).flatMap(([pId, tasks]) =>
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

const dokumanlarSeed: DokumanRecord[] = initialDocuments.map((d) => ({
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

const varliklarSeed: VarlikRecord[] = initialAssets.map((a) => ({
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

const bakimSeed: BakimKaydiRecord[] = initialMaintenanceLogs.map((l) => ({
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

const bildirimlerSeed: BildirimRecord[] = initialNotifications.map((n) => ({
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

const personelSeed: PersonelRecord[] = [
  {
    id: 1, notes: 'Sistem Süper Yöneticisi', row_status: 1, create_uid: 1, create_date: '2026-01-01 00:00:00', write_uid: 1, write_date: '2026-08-27 12:00:00',
    full_name: 'Ahmet Yılmaz', email: 'ahmet.yilmaz@iga.aero', role: 'CBS & Sistem Başmimarı', department: 'Bilgi Teknolojileri & CBS', phone: '+90 532 100 2001',
    user_role: 'super_user', allocation_percentage: 100, avatar_url: 'AY'
  },
  {
    id: 2, notes: 'Proje Direktörü & EVM Yöneticisi', row_status: 1, create_uid: 1, create_date: '2026-01-01 00:00:00', write_uid: 1, write_date: '2026-08-27 12:00:00',
    full_name: 'Murat Erdem', email: 'murat.erdem@iga.aero', role: 'Proje Direktörü & Başmühendis', department: 'Proje Yönetim Ofisi (PMO)', phone: '+90 532 200 3002',
    user_role: 'power_user', allocation_percentage: 100, avatar_url: 'ME'
  },
  {
    id: 3, notes: 'BIM/GIS Koordinasyon Lideri', row_status: 1, create_uid: 1, create_date: '2026-01-01 00:00:00', write_uid: 1, write_date: '2026-08-27 12:00:00',
    full_name: 'Berrin Yücel', email: 'berrin.yucel@iga.aero', role: 'BIM / GIS Koordinatörü', department: 'Teknik Ofis & CBS', phone: '+90 532 300 4003',
    user_role: 'power_user', allocation_percentage: 100, avatar_url: 'BY'
  },
  {
    id: 4, notes: 'Elektromekanik Saha Şefi', row_status: 1, create_uid: 1, create_date: '2026-01-01 00:00:00', write_uid: 1, write_date: '2026-08-27 12:00:00',
    full_name: 'Selim Kara', email: 'selim.kara@iga.aero', role: 'Elektromekanik Saha Şefi', department: 'Saha Operasyonları', phone: '+90 532 400 5004',
    user_role: 'standart_user', allocation_percentage: 100, avatar_url: 'SK'
  },
  {
    id: 5, notes: 'Otel & Fitout Mimari Şefi', row_status: 1, create_uid: 1, create_date: '2026-01-01 00:00:00', write_uid: 1, write_date: '2026-08-27 12:00:00',
    full_name: 'Deniz Aktaş', email: 'deniz.aktas@iga.aero', role: 'Otel & Fitout Mimari Şefi', department: 'Mimari Grup', phone: '+90 532 500 6005',
    user_role: 'standart_user', allocation_percentage: 100, avatar_url: 'DA'
  }
];

const yetkilerSeed: YetkiRecord[] = [
  { id: 1, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_projeler', can_read: true, can_write: true, can_delete: true, can_admin: true, can_doc_add: true, can_doc_manage: true },
  { id: 2, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_binalar_3d', can_read: true, can_write: true, can_delete: true, can_admin: true, can_doc_add: true, can_doc_manage: true },
  { id: 3, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_altyapi_hatlari', can_read: true, can_write: true, can_delete: true, can_admin: true, can_doc_add: true, can_doc_manage: true },
  { id: 4, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_proje_sinirlari', can_read: true, can_write: true, can_delete: true, can_admin: true, can_doc_add: true, can_doc_manage: true },
  { id: 5, notes: 'Tam Yetki', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 1, user_name: 'Ahmet Yılmaz', table_or_layer_name: 'tb_wbs_gorevler', can_read: true, can_write: true, can_delete: true, can_admin: true, can_doc_add: true, can_doc_manage: true },
  { id: 6, notes: 'Proje Yönetim', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 2, user_name: 'Murat Erdem', table_or_layer_name: 'tb_projeler', can_read: true, can_write: true, can_delete: false, can_admin: true, can_doc_add: true, can_doc_manage: false },
  { id: 7, notes: 'Görev Düzenleme', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 2, user_name: 'Murat Erdem', table_or_layer_name: 'tb_wbs_gorevler', can_read: true, can_write: true, can_delete: true, can_admin: true, can_doc_add: true, can_doc_manage: true },
  { id: 8, notes: 'CBS Katman Yönetimi', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 3, user_name: 'Berrin Yücel', table_or_layer_name: 'tb_binalar_3d', can_read: true, can_write: true, can_delete: true, can_admin: false, can_doc_add: true, can_doc_manage: true },
  { id: 9, notes: 'Altyapı Düzenleme', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 3, user_name: 'Berrin Yücel', table_or_layer_name: 'tb_altyapi_hatlari', can_read: true, can_write: true, can_delete: false, can_admin: false, can_doc_add: true, can_doc_manage: false },
  { id: 10, notes: 'Saha Okuma', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 4, user_name: 'Selim Kara', table_or_layer_name: 'tb_altyapi_hatlari', can_read: true, can_write: true, can_delete: false, can_admin: false, can_doc_add: true, can_doc_manage: false },
  { id: 11, notes: 'Mimari Okuma', row_status: 1, create_uid: 1, create_date: '2026-01-01', write_uid: 1, write_date: '2026-08-27', user_id: 5, user_name: 'Deniz Aktaş', table_or_layer_name: 'tb_binalar_3d', can_read: true, can_write: false, can_delete: false, can_admin: false, can_doc_add: false, can_doc_manage: false }
];

const sutunlarSeed: TabloSutunRecord[] = [
  // Standart 7 kolonlar
  { table_name: 'tb_projeler', column_name: 'id', data_type: 'serial', is_nullable: false, column_default: 'nextval()', description: 'Birincil anahtar', is_standard: true, is_hidden: true, display_name: 'Id' },
  { table_name: 'tb_projeler', column_name: 'notes', data_type: 'text', is_nullable: true, description: 'Kayıt notları', is_standard: true, is_hidden: true, display_name: 'Notlar' },
  { table_name: 'tb_projeler', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', description: '1: Aktif, 0: Silinmiş', is_standard: true, is_hidden: true, display_name: 'Kayıt Durumu' },
  { table_name: 'tb_projeler', column_name: 'create_uid', data_type: 'integer', is_nullable: true, description: 'Oluşturan kullanıcı ID', is_standard: true, is_hidden: true, display_name: 'Oluşturan Kullanıcı' },
  { table_name: 'tb_projeler', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', description: 'Oluşturma zamanı', is_standard: true, is_hidden: true, display_name: 'Oluşturma Tarihi' },
  { table_name: 'tb_projeler', column_name: 'write_uid', data_type: 'integer', is_nullable: true, description: 'Son güncelleyen kullanıcı ID', is_standard: true, is_hidden: true, display_name: 'Güncelleyen Kullanıcı' },
  { table_name: 'tb_projeler', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, description: 'Son güncelleme zamanı', is_standard: true, is_hidden: true, display_name: 'Güncelleme Tarihi' },

  // tb_projeler iş kolonları
  { table_name: 'tb_projeler', column_name: 'project_code', data_type: 'varchar(50)', is_nullable: false, description: 'Proje benzersiz kodu', is_hidden: false, display_name: 'Proje Kodu' },
  { table_name: 'tb_projeler', column_name: 'name', data_type: 'varchar(255)', is_nullable: false, description: 'Proje tam adı', is_hidden: false, display_name: 'Proje Adı' },
  { table_name: 'tb_projeler', column_name: 'location', data_type: 'varchar(255)', is_nullable: false, description: 'Konum ve bölge', is_hidden: false, display_name: 'Konum' },
  { table_name: 'tb_projeler', column_name: 'ada_parsel', data_type: 'varchar(100)', is_nullable: false, description: 'Tapu ve kadastro ada/parsel', is_hidden: false, display_name: 'Ada Parsel' },
  { table_name: 'tb_projeler', column_name: 'area', data_type: 'varchar(100)', is_nullable: true, description: 'Toplam arsa alanı', is_hidden: false, display_name: 'Alan' },
  { table_name: 'tb_projeler', column_name: 'risk_level', data_type: 'varchar(50)', is_nullable: true, column_default: "'Düşük'", description: 'EVM Risk derecesi', is_hidden: false, display_name: 'Risk Seviyesi' },
  { table_name: 'tb_projeler', column_name: 'overall_progress', data_type: 'numeric(5,2)', is_nullable: false, column_default: '0', description: 'Fiziki gerçekleşme (%)', is_hidden: false, display_name: 'Genel İlerleme (%)' },
  { table_name: 'tb_projeler', column_name: 'budget', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Toplam bütçe (Milyon TL)', is_hidden: false, display_name: 'Bütçe (M TL)' },
  { table_name: 'tb_projeler', column_name: 'spent', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Fiili harcanan (Milyon TL)', is_hidden: false, display_name: 'Harcanan (M TL)' },
  { table_name: 'tb_projeler', column_name: 'planned_spent', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Planlanan maliyet (PV)', is_hidden: false, display_name: 'Planlanan Maliyet' },
  { table_name: 'tb_projeler', column_name: 'earned_value', data_type: 'numeric(15,2)', is_nullable: false, column_default: '0', description: 'Kazanılmış değer (EV)', is_hidden: false, display_name: 'Kazanılmış Değer' },
  { table_name: 'tb_projeler', column_name: 'status', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlama'", description: 'Proje aşaması', is_hidden: false, display_name: 'Durum' },
  { table_name: 'tb_projeler', column_name: 'center_lng', data_type: 'numeric(10,6)', is_nullable: true, description: 'Boylam', is_hidden: false, display_name: 'Boylam' },
  { table_name: 'tb_projeler', column_name: 'center_lat', data_type: 'numeric(10,6)', is_nullable: true, description: 'Enlem', is_hidden: false, display_name: 'Enlem' },

  // tb_binalar_3d
  { table_name: 'tb_binalar_3d', column_name: 'id', data_type: 'serial', is_nullable: false, is_standard: true, is_hidden: true, display_name: 'Id' },
  { table_name: 'tb_binalar_3d', column_name: 'notes', data_type: 'text', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Notlar' },
  { table_name: 'tb_binalar_3d', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', is_standard: true, is_hidden: true, display_name: 'Kayıt Durumu' },
  { table_name: 'tb_binalar_3d', column_name: 'create_uid', data_type: 'integer', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Oluşturan Kullanıcı' },
  { table_name: 'tb_binalar_3d', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', is_standard: true, is_hidden: true, display_name: 'Oluşturma Tarihi' },
  { table_name: 'tb_binalar_3d', column_name: 'write_uid', data_type: 'integer', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Güncelleyen Kullanıcı' },
  { table_name: 'tb_binalar_3d', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Güncelleme Tarihi' },
  { table_name: 'tb_binalar_3d', column_name: 'name', data_type: 'varchar(255)', is_nullable: false, description: 'Kayıt adı', is_hidden: false, display_name: 'Ad' },
  { table_name: 'tb_binalar_3d', column_name: 'project_id', data_type: 'varchar(50)', is_nullable: false, description: 'İlişkili proje kodu', relation_table: 'tb_projeler', relation_column: 'id', relation_display_column: 'name', is_hidden: false, display_name: 'Proje' },
  { table_name: 'tb_binalar_3d', column_name: 'block_name', data_type: 'varchar(150)', is_nullable: false, description: 'Blok veya kule adı', is_hidden: false, display_name: 'Blok Adı' },
  { table_name: 'tb_binalar_3d', column_name: 'building_type', data_type: 'varchar(100)', is_nullable: false, description: 'Bina fonksiyon tipi', is_hidden: false, display_name: 'Bina Tipi' },
  { table_name: 'tb_binalar_3d', column_name: 'height_meters', data_type: 'numeric(6,2)', is_nullable: false, description: 'Bina yüksekliği (m)', is_hidden: false, display_name: 'Yükseklik (m)' },
  { table_name: 'tb_binalar_3d', column_name: 'floors_count', data_type: 'integer', is_nullable: false, description: 'Toplam kat adedi', is_hidden: false, display_name: 'Kat Adedi' },
  { table_name: 'tb_binalar_3d', column_name: 'construction_progress', data_type: 'numeric(5,2)', is_nullable: false, column_default: '0', description: 'İnşaat tamamlama %', is_hidden: false, display_name: 'İnşaat İlerlemesi (%)' },
  { table_name: 'tb_binalar_3d', column_name: 'structural_status', data_type: 'varchar(100)', is_nullable: false, description: 'Kaba / İnce yapı durumu', is_hidden: false, display_name: 'Yapısal Durum' },
  { table_name: 'tb_binalar_3d', column_name: 'footprint_area_sqm', data_type: 'numeric(10,2)', is_nullable: false, description: 'Taban oturum alanı (m²)', is_hidden: false, display_name: 'Taban Alanı (m²)', readonly: true },
  { table_name: 'tb_binalar_3d', column_name: 'veri_durumu', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlanan'", is_hidden: false, display_name: 'Veri Durumu', relation_table: 'tb_data_status', relation_column: 'id', relation_display_column: 'name' },
  { table_name: 'tb_binalar_3d', column_name: 'the_geom', data_type: 'geometry(Polygon,5257)', is_nullable: true, description: 'PostGIS Çokgen Geometrisi', is_hidden: true, display_name: 'Geometri' },

  // tb_altyapi_hatlari
  { table_name: 'tb_altyapi_hatlari', column_name: 'id', data_type: 'serial', is_nullable: false, is_standard: true, is_hidden: true, display_name: 'Id' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'notes', data_type: 'text', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Notlar' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', is_standard: true, is_hidden: true, display_name: 'Kayıt Durumu' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'create_uid', data_type: 'integer', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Oluşturan Kullanıcı' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', is_standard: true, is_hidden: true, display_name: 'Oluşturma Tarihi' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'write_uid', data_type: 'integer', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Güncelleyen Kullanıcı' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Güncelleme Tarihi' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'name', data_type: 'varchar(255)', is_nullable: false, description: 'Kayıt adı', is_hidden: false, display_name: 'Ad' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'project_id', data_type: 'varchar(50)', is_nullable: false, description: 'Proje ID', relation_table: 'tb_projeler', relation_column: 'id', relation_display_column: 'name', is_hidden: false, display_name: 'Proje' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'line_type', data_type: 'varchar(50)', is_nullable: false, description: 'Hat türü (elektrik, su, gaz, telekom vb.)', is_hidden: false, display_name: 'Hat Türü' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'network_name', data_type: 'varchar(255)', is_nullable: false, description: 'Şebeke tanımı', is_hidden: false, display_name: 'Şebeke Adı' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'pipe_or_cable_spec', data_type: 'varchar(255)', is_nullable: false, description: 'Kablo veya boru kesit spesifikasyonu', is_hidden: false, display_name: 'Kablo/Boru Özelliği' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'depth_meters', data_type: 'numeric(6,2)', is_nullable: false, description: 'Gömü derinliği (m)', is_hidden: false, display_name: 'Gömü Derinliği (m)' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'voltage_or_pressure', data_type: 'varchar(100)', is_nullable: false, description: 'Gerilim veya işletme basıncı', is_hidden: false, display_name: 'Gerilim / Basınç' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'total_length_meters', data_type: 'numeric(10,2)', is_nullable: false, description: 'Hat metrajı (m)', is_hidden: false, display_name: 'Toplam Uzunluk (m)' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'status', data_type: 'varchar(50)', is_nullable: false, column_default: "'Faal'", description: 'İşletme durumu', is_hidden: false, display_name: 'İşletme Durumu' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'veri_durumu', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlanan'", is_hidden: false, display_name: 'Veri Durumu', relation_table: 'tb_data_status', relation_column: 'id', relation_display_column: 'name' },
  { table_name: 'tb_altyapi_hatlari', column_name: 'the_geom', data_type: 'geometry(LineString,5257)', is_nullable: true, description: 'PostGIS Çizgi Geometrisi', is_hidden: true, display_name: 'Geometri' },

  // tb_proje_sinirlari
  { table_name: 'tb_proje_sinirlari', column_name: 'id', data_type: 'serial', is_nullable: false, is_standard: true, is_hidden: true, display_name: 'Id' },
  { table_name: 'tb_proje_sinirlari', column_name: 'notes', data_type: 'text', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Notlar' },
  { table_name: 'tb_proje_sinirlari', column_name: 'row_status', data_type: 'integer', is_nullable: false, column_default: '1', is_standard: true, is_hidden: true, display_name: 'Kayıt Durumu' },
  { table_name: 'tb_proje_sinirlari', column_name: 'create_uid', data_type: 'integer', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Oluşturan Kullanıcı' },
  { table_name: 'tb_proje_sinirlari', column_name: 'create_date', data_type: 'timestamp', is_nullable: false, column_default: 'current_timestamp', is_standard: true, is_hidden: true, display_name: 'Oluşturma Tarihi' },
  { table_name: 'tb_proje_sinirlari', column_name: 'write_uid', data_type: 'integer', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Güncelleyen Kullanıcı' },
  { table_name: 'tb_proje_sinirlari', column_name: 'write_date', data_type: 'timestamp', is_nullable: true, is_standard: true, is_hidden: true, display_name: 'Güncelleme Tarihi' },
  { table_name: 'tb_proje_sinirlari', column_name: 'name', data_type: 'varchar(255)', is_nullable: false, description: 'Kayıt adı', is_hidden: false, display_name: 'Ad' },
  { table_name: 'tb_proje_sinirlari', column_name: 'project_id', data_type: 'varchar(50)', is_nullable: false, description: 'Proje ID', relation_table: 'tb_projeler', relation_column: 'id', relation_display_column: 'name', is_hidden: false, display_name: 'Proje' },
  { table_name: 'tb_proje_sinirlari', column_name: 'project_name', data_type: 'varchar(255)', is_nullable: false, description: 'Saha Adı', is_hidden: false, display_name: 'Saha Adı' },
  { table_name: 'tb_proje_sinirlari', column_name: 'ada_parsel', data_type: 'varchar(100)', is_nullable: false, description: 'Kadastral Parsel', is_hidden: false, display_name: 'Ada Parsel' },
  { table_name: 'tb_proje_sinirlari', column_name: 'area_sqm', data_type: 'numeric(12,2)', is_nullable: false, description: 'Alan (m²)', is_hidden: false, display_name: 'Alan (m²)', readonly: true },
  { table_name: 'tb_proje_sinirlari', column_name: 'veri_durumu', data_type: 'varchar(50)', is_nullable: false, column_default: "'Planlanan'", is_hidden: false, display_name: 'Veri Durumu', relation_table: 'tb_data_status', relation_column: 'id', relation_display_column: 'name' },
  { table_name: 'tb_proje_sinirlari', column_name: 'the_geom', data_type: 'geometry(Polygon,5257)', is_nullable: true, description: 'PostGIS Çokgen Sınırı', is_hidden: true, display_name: 'Geometri' }
];

// ==========================================
// API ASYNC FUNCTIONS BY TABLE
// ==========================================

// 1. TABLO ADI (tb_proje_durumlari)
export async function getProjeDurumlari(): Promise<DurumRecord[]> {
  await ensureSeeded('tb_proje_durumlari', durumlarSeed);
  return apiList<DurumRecord>('tb_proje_durumlari');
}
export async function getProjeDurumuById(id: number | string): Promise<DurumRecord | null> {
  await ensureSeeded('tb_proje_durumlari', durumlarSeed);
  return apiGet<DurumRecord>('tb_proje_durumlari', id);
}
export async function createProjeDurumu(item: Partial<DurumRecord>): Promise<DurumRecord> {
  await ensureSeeded('tb_proje_durumlari', durumlarSeed);
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
  return apiCreate('tb_proje_durumlari', newItem);
}
export async function updateProjeDurumu(id: number | string, item: Partial<DurumRecord>): Promise<DurumRecord> {
  await ensureSeeded('tb_proje_durumlari', durumlarSeed);
  return apiUpdate<DurumRecord>('tb_proje_durumlari', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteProjeDurumu(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_proje_durumlari', durumlarSeed);
  return apiSoftDelete('tb_proje_durumlari', id);
}

// 2. TABLO ADI (tb_risk_dereceleri)
export async function getRiskDereceleri(): Promise<RiskRecord[]> {
  await ensureSeeded('tb_risk_dereceleri', risklerSeed);
  return apiList<RiskRecord>('tb_risk_dereceleri');
}
export async function getRiskDerecesiById(id: number | string): Promise<RiskRecord | null> {
  await ensureSeeded('tb_risk_dereceleri', risklerSeed);
  return apiGet<RiskRecord>('tb_risk_dereceleri', id);
}
export async function createRiskDerecesi(item: Partial<RiskRecord>): Promise<RiskRecord> {
  await ensureSeeded('tb_risk_dereceleri', risklerSeed);
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
  return apiCreate('tb_risk_dereceleri', newItem);
}
export async function updateRiskDerecesi(id: number | string, item: Partial<RiskRecord>): Promise<RiskRecord> {
  await ensureSeeded('tb_risk_dereceleri', risklerSeed);
  return apiUpdate<RiskRecord>('tb_risk_dereceleri', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteRiskDerecesi(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_risk_dereceleri', risklerSeed);
  return apiSoftDelete('tb_risk_dereceleri', id);
}

// 2b. TABLO ADI (tb_data_status)
export async function getVeriDurumlari(): Promise<VeriDurumuRecord[]> {
  await ensureSeeded('tb_data_status', veriDurumlariSeed);
  return apiList<VeriDurumuRecord>('tb_data_status');
}
export async function getVeriDurumuById(id: number | string): Promise<VeriDurumuRecord | null> {
  await ensureSeeded('tb_data_status', veriDurumlariSeed);
  return apiGet<VeriDurumuRecord>('tb_data_status', id);
}
export async function createVeriDurumu(item: Partial<VeriDurumuRecord>): Promise<VeriDurumuRecord> {
  await ensureSeeded('tb_data_status', veriDurumlariSeed);
  const newItem: VeriDurumuRecord = {
    id: item.id || `durum_${Date.now()}`,
    notes: item.notes || null,
    row_status: 1,
    create_uid: 1,
    create_date: new Date().toISOString(),
    write_uid: 1,
    write_date: new Date().toISOString(),
    code: item.code || `veri_durumu_${Date.now()}`,
    name: item.name || 'Yeni Veri Durumu'
  };
  return apiCreate('tb_data_status', newItem);
}
export async function updateVeriDurumu(id: number | string, item: Partial<VeriDurumuRecord>): Promise<VeriDurumuRecord> {
  await ensureSeeded('tb_data_status', veriDurumlariSeed);
  return apiUpdate<VeriDurumuRecord>('tb_data_status', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteVeriDurumu(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_data_status', veriDurumlariSeed);
  return apiSoftDelete('tb_data_status', id);
}

// 3. TABLO ADI (tb_kullanici_rolleri)
export async function getKullaniciRolleri(): Promise<RolRecord[]> {
  await ensureSeeded('tb_kullanici_rolleri', rollerSeed);
  return apiList<RolRecord>('tb_kullanici_rolleri');
}
export async function getKullaniciRoluById(id: number | string): Promise<RolRecord | null> {
  await ensureSeeded('tb_kullanici_rolleri', rollerSeed);
  return apiGet<RolRecord>('tb_kullanici_rolleri', id);
}
export async function createKullaniciRolu(item: Partial<RolRecord>): Promise<RolRecord> {
  await ensureSeeded('tb_kullanici_rolleri', rollerSeed);
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
  return apiCreate('tb_kullanici_rolleri', newItem);
}
export async function updateKullaniciRolu(id: number | string, item: Partial<RolRecord>): Promise<RolRecord> {
  await ensureSeeded('tb_kullanici_rolleri', rollerSeed);
  return apiUpdate<RolRecord>('tb_kullanici_rolleri', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteKullaniciRolu(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_kullanici_rolleri', rollerSeed);
  return apiSoftDelete('tb_kullanici_rolleri', id);
}

// 4. TABLO ADI (tb_projeler)
export async function getProjeler(): Promise<ProjeRecord[]> {
  await ensureSeeded('tb_projeler', projelerSeed);
  return apiList<ProjeRecord>('tb_projeler');
}
export async function getProjeById(id: number | string): Promise<ProjeRecord | null> {
  const all = await getProjeler();
  return all.find(r => r.id === id || r.code === id) || null;
}
export async function createProje(item: Partial<ProjeRecord>): Promise<ProjeRecord> {
  await ensureSeeded('tb_projeler', projelerSeed);
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
  return apiCreate('tb_projeler', newItem);
}
export async function updateProje(id: number | string, item: Partial<ProjeRecord>): Promise<ProjeRecord> {
  const existing = await getProjeById(id);
  if (!existing) throw new Error(`Proje bulunamadı: ${id}`);
  return apiUpdate<ProjeRecord>('tb_projeler', existing.id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteProje(id: number | string): Promise<boolean> {
  const existing = await getProjeById(id);
  if (!existing) return false;
  return apiSoftDelete('tb_projeler', existing.id);
}

// 5. TABLO ADI (tb_proje_sinirlari)
export async function getProjeSinirlari(): Promise<ProjeSiniriRecord[]> {
  await ensureSeeded('tb_proje_sinirlari', sinirlarSeed);
  return apiList<ProjeSiniriRecord>('tb_proje_sinirlari');
}
export async function getProjeSiniriById(id: number | string): Promise<ProjeSiniriRecord | null> {
  await ensureSeeded('tb_proje_sinirlari', sinirlarSeed);
  return apiGet<ProjeSiniriRecord>('tb_proje_sinirlari', id);
}
export async function createProjeSiniri(item: Partial<ProjeSiniriRecord>): Promise<ProjeSiniriRecord> {
  await ensureSeeded('tb_proje_sinirlari', sinirlarSeed);
  const newItem: ProjeSiniriRecord = {
    id: item.id || `sinir-${Date.now()}`,
    name: item.name || item.project_name || 'Yeni Proje Sınırı',
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
  return apiCreate('tb_proje_sinirlari', newItem);
}
export async function updateProjeSiniri(id: number | string, item: Partial<ProjeSiniriRecord>): Promise<ProjeSiniriRecord> {
  await ensureSeeded('tb_proje_sinirlari', sinirlarSeed);
  return apiUpdate<ProjeSiniriRecord>('tb_proje_sinirlari', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteProjeSiniri(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_proje_sinirlari', sinirlarSeed);
  return apiSoftDelete('tb_proje_sinirlari', id);
}

// 6. TABLO ADI (tb_binalar_3d)
export async function getBinalar3D(): Promise<Bina3DRecord[]> {
  await ensureSeeded('tb_binalar_3d', binalarSeed);
  return apiList<Bina3DRecord>('tb_binalar_3d');
}
export async function getBina3DById(id: number | string): Promise<Bina3DRecord | null> {
  await ensureSeeded('tb_binalar_3d', binalarSeed);
  return apiGet<Bina3DRecord>('tb_binalar_3d', id);
}
export async function createBina3D(item: Partial<Bina3DRecord>): Promise<Bina3DRecord> {
  await ensureSeeded('tb_binalar_3d', binalarSeed);
  const newItem: Bina3DRecord = {
    id: item.id || `bina-${Date.now()}`,
    name: item.name || item.block_name || 'Yeni Bina',
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
  return apiCreate('tb_binalar_3d', newItem);
}
export async function updateBina3D(id: number | string, item: Partial<Bina3DRecord>): Promise<Bina3DRecord> {
  await ensureSeeded('tb_binalar_3d', binalarSeed);
  return apiUpdate<Bina3DRecord>('tb_binalar_3d', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteBina3D(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_binalar_3d', binalarSeed);
  return apiSoftDelete('tb_binalar_3d', id);
}

// 7. TABLO ADI (tb_altyapi_hatlari)
export async function getAltyapiHatlari(): Promise<AltyapiHattiRecord[]> {
  await ensureSeeded('tb_altyapi_hatlari', altyapiSeed);
  return apiList<AltyapiHattiRecord>('tb_altyapi_hatlari');
}
export async function getAltyapiHattiById(id: number | string): Promise<AltyapiHattiRecord | null> {
  await ensureSeeded('tb_altyapi_hatlari', altyapiSeed);
  return apiGet<AltyapiHattiRecord>('tb_altyapi_hatlari', id);
}
export async function createAltyapiHatti(item: Partial<AltyapiHattiRecord>): Promise<AltyapiHattiRecord> {
  await ensureSeeded('tb_altyapi_hatlari', altyapiSeed);
  const newItem: AltyapiHattiRecord = {
    id: item.id || `altyapi-${Date.now()}`,
    name: item.name || item.network_name || 'Yeni Altyapı Hattı',
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
  return apiCreate('tb_altyapi_hatlari', newItem);
}
export async function updateAltyapiHatti(id: number | string, item: Partial<AltyapiHattiRecord>): Promise<AltyapiHattiRecord> {
  await ensureSeeded('tb_altyapi_hatlari', altyapiSeed);
  return apiUpdate<AltyapiHattiRecord>('tb_altyapi_hatlari', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteAltyapiHatti(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_altyapi_hatlari', altyapiSeed);
  return apiSoftDelete('tb_altyapi_hatlari', id);
}

// 8. TABLO ADI (tb_bloklar)
export async function getBloklar(): Promise<BlokRecord[]> {
  await ensureSeeded('tb_bloklar', bloklarSeed);
  return apiList<BlokRecord>('tb_bloklar');
}
export async function getBlokById(id: number | string): Promise<BlokRecord | null> {
  await ensureSeeded('tb_bloklar', bloklarSeed);
  return apiGet<BlokRecord>('tb_bloklar', id);
}
export async function createBlok(item: Partial<BlokRecord>): Promise<BlokRecord> {
  await ensureSeeded('tb_bloklar', bloklarSeed);
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
  return apiCreate('tb_bloklar', newItem);
}
export async function updateBlok(id: number | string, item: Partial<BlokRecord>): Promise<BlokRecord> {
  await ensureSeeded('tb_bloklar', bloklarSeed);
  return apiUpdate<BlokRecord>('tb_bloklar', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteBlok(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_bloklar', bloklarSeed);
  return apiSoftDelete('tb_bloklar', id);
}

// 9. TABLO ADI (tb_ruhsatlar)
export async function getRuhsatlar(): Promise<RuhsatRecord[]> {
  await ensureSeeded('tb_ruhsatlar', ruhsatlarSeed);
  return apiList<RuhsatRecord>('tb_ruhsatlar');
}
export async function getRuhsatById(id: number | string): Promise<RuhsatRecord | null> {
  await ensureSeeded('tb_ruhsatlar', ruhsatlarSeed);
  return apiGet<RuhsatRecord>('tb_ruhsatlar', id);
}
export async function createRuhsat(item: Partial<RuhsatRecord>): Promise<RuhsatRecord> {
  await ensureSeeded('tb_ruhsatlar', ruhsatlarSeed);
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
  return apiCreate('tb_ruhsatlar', newItem);
}
export async function updateRuhsat(id: number | string, item: Partial<RuhsatRecord>): Promise<RuhsatRecord> {
  await ensureSeeded('tb_ruhsatlar', ruhsatlarSeed);
  return apiUpdate<RuhsatRecord>('tb_ruhsatlar', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteRuhsat(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_ruhsatlar', ruhsatlarSeed);
  return apiSoftDelete('tb_ruhsatlar', id);
}

// 10. TABLO ADI (tb_wbs_gorevler)
export async function getWbsGorevler(): Promise<WbsGorevRecord[]> {
  await ensureSeeded('tb_wbs_gorevler', wbsSeed);
  return apiList<WbsGorevRecord>('tb_wbs_gorevler');
}
export async function getWbsGorevById(id: number | string): Promise<WbsGorevRecord | null> {
  await ensureSeeded('tb_wbs_gorevler', wbsSeed);
  return apiGet<WbsGorevRecord>('tb_wbs_gorevler', id);
}
export async function createWbsGorev(item: Partial<WbsGorevRecord>): Promise<WbsGorevRecord> {
  await ensureSeeded('tb_wbs_gorevler', wbsSeed);
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
  return apiCreate('tb_wbs_gorevler', newItem);
}
export async function updateWbsGorev(id: number | string, item: Partial<WbsGorevRecord>): Promise<WbsGorevRecord> {
  await ensureSeeded('tb_wbs_gorevler', wbsSeed);
  return apiUpdate<WbsGorevRecord>('tb_wbs_gorevler', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteWbsGorev(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_wbs_gorevler', wbsSeed);
  return apiSoftDelete('tb_wbs_gorevler', id);
}

// 11. TABLO ADI (tb_dokumanlar)
export async function getDokumanlar(): Promise<DokumanRecord[]> {
  await ensureSeeded('tb_dokumanlar', dokumanlarSeed);
  return apiList<DokumanRecord>('tb_dokumanlar');
}
export async function getDokumanById(id: number | string): Promise<DokumanRecord | null> {
  await ensureSeeded('tb_dokumanlar', dokumanlarSeed);
  return apiGet<DokumanRecord>('tb_dokumanlar', id);
}
// Haritadaki bir objeye (feature_id) bağlı dokümanları döner — Kroki CBS
// aracının "Doküman Ekle" akışı ve Bilgi panelindeki doküman listesi/önizleme
// alanı için kullanılır.
export async function getDokumanlarByFeature(featureId: string): Promise<DokumanRecord[]> {
  const all = await getDokumanlar();
  return all.filter(r => r.feature_id === featureId);
}
export async function createDokuman(item: Partial<DokumanRecord>): Promise<DokumanRecord> {
  await ensureSeeded('tb_dokumanlar', dokumanlarSeed);
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
    feature_id: item.feature_id || null,
    name: item.name || 'Yeni Teknik Çizim / CDE Dosyası',
    version: item.version || 'v1.0',
    file_size: item.file_size || '5.0 MB',
    upload_date: item.upload_date || '2026-08-27',
    approval_status: item.approval_status || 'Approved',
    approver: item.approver || 'BIM Koordinatörü',
    doc_type: item.doc_type,
    file_data_url: item.file_data_url || null,
    lat: item.lat ?? null,
    lng: item.lng ?? null
  };
  return apiCreate('tb_dokumanlar', newItem);
}
export async function updateDokuman(id: number | string, item: Partial<DokumanRecord>): Promise<DokumanRecord> {
  await ensureSeeded('tb_dokumanlar', dokumanlarSeed);
  return apiUpdate<DokumanRecord>('tb_dokumanlar', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteDokuman(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_dokumanlar', dokumanlarSeed);
  return apiSoftDelete('tb_dokumanlar', id);
}

// 12. TABLO ADI (tb_varliklar)
export async function getVarliklar(): Promise<VarlikRecord[]> {
  await ensureSeeded('tb_varliklar', varliklarSeed);
  return apiList<VarlikRecord>('tb_varliklar');
}
export async function getVarlikById(id: number | string): Promise<VarlikRecord | null> {
  await ensureSeeded('tb_varliklar', varliklarSeed);
  return apiGet<VarlikRecord>('tb_varliklar', id);
}
export async function createVarlik(item: Partial<VarlikRecord>): Promise<VarlikRecord> {
  await ensureSeeded('tb_varliklar', varliklarSeed);
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
  return apiCreate('tb_varliklar', newItem);
}
export async function updateVarlik(id: number | string, item: Partial<VarlikRecord>): Promise<VarlikRecord> {
  await ensureSeeded('tb_varliklar', varliklarSeed);
  return apiUpdate<VarlikRecord>('tb_varliklar', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteVarlik(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_varliklar', varliklarSeed);
  return apiSoftDelete('tb_varliklar', id);
}

// 13. TABLO ADI (tb_bakim_kayitlari)
export async function getBakimKayitlari(): Promise<BakimKaydiRecord[]> {
  await ensureSeeded('tb_bakim_kayitlari', bakimSeed);
  return apiList<BakimKaydiRecord>('tb_bakim_kayitlari');
}
export async function getBakimKaydiById(id: number | string): Promise<BakimKaydiRecord | null> {
  await ensureSeeded('tb_bakim_kayitlari', bakimSeed);
  return apiGet<BakimKaydiRecord>('tb_bakim_kayitlari', id);
}
export async function createBakimKaydi(item: Partial<BakimKaydiRecord>): Promise<BakimKaydiRecord> {
  await ensureSeeded('tb_bakim_kayitlari', bakimSeed);
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
  return apiCreate('tb_bakim_kayitlari', newItem);
}
export async function updateBakimKaydi(id: number | string, item: Partial<BakimKaydiRecord>): Promise<BakimKaydiRecord> {
  await ensureSeeded('tb_bakim_kayitlari', bakimSeed);
  return apiUpdate<BakimKaydiRecord>('tb_bakim_kayitlari', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteBakimKaydi(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_bakim_kayitlari', bakimSeed);
  return apiSoftDelete('tb_bakim_kayitlari', id);
}

// 14. TABLO ADI (tb_bildirimler)
export async function getBildirimler(): Promise<BildirimRecord[]> {
  await ensureSeeded('tb_bildirimler', bildirimlerSeed);
  return apiList<BildirimRecord>('tb_bildirimler');
}
export async function getBildirimById(id: number | string): Promise<BildirimRecord | null> {
  await ensureSeeded('tb_bildirimler', bildirimlerSeed);
  return apiGet<BildirimRecord>('tb_bildirimler', id);
}
export async function createBildirim(item: Partial<BildirimRecord>): Promise<BildirimRecord> {
  await ensureSeeded('tb_bildirimler', bildirimlerSeed);
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
  return apiCreate('tb_bildirimler', newItem);
}
export async function updateBildirim(id: number | string, item: Partial<BildirimRecord>): Promise<BildirimRecord> {
  await ensureSeeded('tb_bildirimler', bildirimlerSeed);
  return apiUpdate<BildirimRecord>('tb_bildirimler', id, { ...item, write_date: new Date().toISOString() });
}
export async function deleteBildirim(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_bildirimler', bildirimlerSeed);
  return apiSoftDelete('tb_bildirimler', id);
}

// 15. TABLO ADI (tb_personel)
export async function getPersoneller(): Promise<PersonelRecord[]> {
  await ensureSeeded('tb_personel', personelSeed);
  return apiList<PersonelRecord>('tb_personel');
}
export async function getPersonelById(id: number | string): Promise<PersonelRecord | null> {
  await ensureSeeded('tb_personel', personelSeed);
  return apiGet<PersonelRecord>('tb_personel', Number(id));
}
export async function createPersonel(item: Partial<PersonelRecord>): Promise<PersonelRecord> {
  await ensureSeeded('tb_personel', personelSeed);
  const existing = await getPersoneller();
  const newId = existing.length > 0 ? Math.max(...existing.map(p => Number(p.id))) + 1 : 1;
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
  return apiCreate('tb_personel', newItem);
}
export async function updatePersonel(id: number | string, item: Partial<PersonelRecord>): Promise<PersonelRecord> {
  await ensureSeeded('tb_personel', personelSeed);
  return apiUpdate<PersonelRecord>('tb_personel', Number(id), { ...item, write_date: new Date().toISOString() });
}
export async function deletePersonel(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_personel', personelSeed);
  return apiSoftDelete('tb_personel', Number(id));
}

// 16. TABLO ADI (tb_yetkiler)
export async function getYetkiler(): Promise<YetkiRecord[]> {
  await ensureSeeded('tb_yetkiler', yetkilerSeed);
  return apiList<YetkiRecord>('tb_yetkiler');
}
export async function getYetkiById(id: number | string): Promise<YetkiRecord | null> {
  await ensureSeeded('tb_yetkiler', yetkilerSeed);
  return apiGet<YetkiRecord>('tb_yetkiler', Number(id));
}
export async function createYetki(item: Partial<YetkiRecord>): Promise<YetkiRecord> {
  await ensureSeeded('tb_yetkiler', yetkilerSeed);
  const existing = await getYetkiler();
  const newId = existing.length > 0 ? Math.max(...existing.map(y => Number(y.id))) + 1 : 1;
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
    can_admin: item.can_admin ?? false,
    can_doc_add: item.can_doc_add ?? false,
    can_doc_manage: item.can_doc_manage ?? false
  };
  return apiCreate('tb_yetkiler', newItem);
}
export async function updateYetki(id: number | string, item: Partial<YetkiRecord>): Promise<YetkiRecord> {
  await ensureSeeded('tb_yetkiler', yetkilerSeed);
  return apiUpdate<YetkiRecord>('tb_yetkiler', Number(id), { ...item, write_date: new Date().toISOString() });
}
export async function deleteYetki(id: number | string): Promise<boolean> {
  await ensureSeeded('tb_yetkiler', yetkilerSeed);
  return apiSoftDelete('tb_yetkiler', Number(id));
}

// 17. TABLO SÜTUN META YÖNETİMİ (tb_tablo_sutunlari)
// Not: TabloSutunRecord'un doğal anahtarı (table_name, column_name) ikilisidir
// (BaseEntity'den türemez, kendi id'si yoktur) — generic depolama katmanının
// gerektirdiği id için bu ikiliden sentetik bir anahtar üretilir.
function sutunKey(tableName: string, columnName: string): string {
  return `${tableName}::${columnName}`;
}
export async function getTabloSutunlari(tableName?: string): Promise<TabloSutunRecord[]> {
  await ensureSeeded('tb_tablo_sutunlari', sutunlarSeed.map(c => ({ ...c, id: sutunKey(c.table_name, c.column_name) })));
  const all = await apiList<TabloSutunRecord>('tb_tablo_sutunlari');
  return tableName ? all.filter(c => c.table_name === tableName) : all;
}
export async function addTabloSutunu(newCol: TabloSutunRecord): Promise<TabloSutunRecord> {
  const all = await getTabloSutunlari();
  const existing = all.find(c => c.table_name === newCol.table_name && c.column_name === newCol.column_name);
  if (existing) {
    throw new Error(`'${newCol.column_name}' kolonu '${newCol.table_name}' tablosunda zaten mevcut.`);
  }
  const withId = { ...newCol, id: sutunKey(newCol.table_name, newCol.column_name) };
  return apiCreate('tb_tablo_sutunlari', withId);
}
// Bir sütuna yabancı anahtar (FK) ilişkisi tanımlar/günceller veya (relation
// null gönderilirse) kaldırır. Bu sayede "Sütunlar" sekmesinden arayüz
// üzerinden ilişki kurulabilir; veri giriş formunda o sütun otomatik olarak
// ilişkili tablonun relation_display_column'unu gösteren bir combobox'a döner.
export async function updateTabloSutunuRelation(
  tableName: string,
  columnName: string,
  relation: { relation_table: string; relation_column: string; relation_display_column: string } | null
): Promise<TabloSutunRecord> {
  const all = await getTabloSutunlari();
  const col = all.find(c => c.table_name === tableName && c.column_name === columnName);
  if (!col) {
    throw new Error(`'${columnName}' kolonu '${tableName}' tablosunda bulunamadı.`);
  }
  const patch = relation
    ? { relation_table: relation.relation_table, relation_column: relation.relation_column, relation_display_column: relation.relation_display_column }
    : { relation_table: null as any, relation_column: null as any, relation_display_column: null as any };
  return apiUpdate<TabloSutunRecord>('tb_tablo_sutunlari', sutunKey(tableName, columnName), patch);
}
// Bir sütunu tablodan kalıcı olarak siler. Sistem (STANDART 7: id, notes,
// row_status, create_uid, create_date, write_uid, write_date) sütunları asla
// silinemez — bu sütunlar tüm tabloların ortak altyapısıdır.
export async function deleteTabloSutunu(tableName: string, columnName: string): Promise<void> {
  const all = await getTabloSutunlari();
  const col = all.find(c => c.table_name === tableName && c.column_name === columnName);
  if (!col) {
    throw new Error(`'${columnName}' kolonu '${tableName}' tablosunda bulunamadı.`);
  }
  if (col.is_standard) {
    throw new Error(`'${columnName}' bir sistem sütunudur ve silinemez.`);
  }
  await apiSoftDelete('tb_tablo_sutunlari', sutunKey(tableName, columnName));
}
