import React, { useState, useEffect } from 'react';
import {
  Database, Users, TableProperties, Layers, Box, Zap, MapPin,
  Search, Plus, Trash2, Edit2, Shield, ShieldCheck, CheckCircle2,
  AlertCircle, Download, FileText, Check, X, RefreshCw, Key,
  Lock, HardDrive, Filter, Eye, Server, Cpu, Sparkles, Camera
} from 'lucide-react';
import { 
  ProjeRecord, Bina3DRecord, AltyapiHattiRecord, ProjeSiniriRecord, 
  PersonelRecord, YetkiRecord, TabloSutunRecord, UserRole,
  WbsGorevRecord, DokumanRecord, VarlikRecord, BakimKaydiRecord, BildirimRecord
} from '../types/index';
import * as api from '../services/api';
import { Badge } from '../design-system';

interface AdminPanelProps {
  theme: 'dark' | 'light';
  onClose?: () => void;
}

type MainAdminTab = 'veriler' | 'kullanicilar';
type VerilerSubTab = 'veri' | 'sutunlar';

// avatar_url ya gerçek bir fotoğraf (data: veya http(s) URL'i) ya da (henüz
// fotoğraf yüklenmemiş kullanıcılarda) baş harflerden oluşan kısa bir kod
// tutar — bu ikisini ayırt etmek için kullanılır.
function isAvatarImage(url?: string | null): boolean {
  return !!url && (url.startsWith('data:image') || url.startsWith('http://') || url.startsWith('https://'));
}
function getInitials(fullName?: string): string {
  if (!fullName) return 'U';
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

export default function AdminPanel({ theme, onClose }: AdminPanelProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainAdminTab>('veriler');

  // Tab 1: Veriler States
  const [verilerSubTab, setVerilerSubTab] = useState<VerilerSubTab>('veri');
  const [selectedTableKey, setSelectedTableKey] = useState<string>('tb_projeler');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataSearchQuery, setDataSearchQuery] = useState('');
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [showEditRowModal, setShowEditRowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<Record<string, any> | null>(null);

  // Tab 2: Kullanıcılar States
  const [personelList, setPersonelList] = useState<PersonelRecord[]>([]);
  const [selectedPersonel, setSelectedPersonel] = useState<PersonelRecord | null>(null);
  const [yetkilerList, setYetkilerList] = useState<YetkiRecord[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    full_name: '',
    email: '',
    role: '',
    department: 'Teknik Ofis & CBS',
    phone: '',
    user_role: 'standart_user' as UserRole
  });

  // Tab 1 (Sütunlar alt-sekmesi) States — eskiden ayrı "Veritabanı" ana sekmesindeydi
  const [allColumns, setAllColumns] = useState<TabloSutunRecord[]>([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnForm, setNewColumnForm] = useState({
    column_name: '',
    data_type: 'varchar(255)',
    is_nullable: true,
    column_default: '',
    description: ''
  });

  // Sütun İlişkilendirme (FK) States — bir sütunu başka bir tablonun id'sine
  // bağlayıp veri girişinde combobox olarak göstermek için.
  const [relationOptionsCache, setRelationOptionsCache] = useState<Record<string, { id: any; label: string }[]>>({});
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [relationEditingColumn, setRelationEditingColumn] = useState<TabloSutunRecord | null>(null);
  const [relationForm, setRelationForm] = useState({
    relation_table: '',
    relation_column: 'id',
    relation_display_column: 'name'
  });

  // Sütun Silme (kontrollü) — yalnızca sistem (STANDART 7) dışındaki
  // sütunlar için, onay adımından geçerek silinebilir.
  const [deleteColumnConfirm, setDeleteColumnConfirm] = useState<TabloSutunRecord | null>(null);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Data Loader
  const fetchTableData = async (tableKey: string): Promise<any[]> => {
    switch (tableKey) {
      case 'tb_projeler':
        return api.getProjeler();
      case 'tb_binalar_3d':
        return api.getBinalar3D();
      case 'tb_altyapi_hatlari':
        return api.getAltyapiHatlari();
      case 'tb_proje_sinirlari':
        return api.getProjeSinirlari();
      case 'tb_bloklar':
        return api.getBloklar();
      case 'tb_ruhsatlar':
        return api.getRuhsatlar();
      case 'tb_wbs_gorevler':
        return api.getWbsGorevler();
      case 'tb_dokumanlar':
        return api.getDokumanlar();
      case 'tb_varliklar':
        return api.getVarliklar();
      case 'tb_bakim_kayitlari':
        return api.getBakimKayitlari();
      case 'tb_bildirimler':
        return api.getBildirimler();
      case 'tb_personel':
        return api.getPersoneller();
      case 'tb_proje_durumlari':
        return api.getProjeDurumlari();
      case 'tb_risk_dereceleri':
        return api.getRiskDereceleri();
      case 'tb_data_status':
        return api.getVeriDurumlari();
      case 'tb_kullanici_rolleri':
        return api.getKullaniciRolleri();
      default:
        return api.getProjeler();
    }
  };

  const loadActiveTableData = async (tableKey: string) => {
    setLoadingData(true);
    try {
      const data = await fetchTableData(tableKey);
      setTableData(data);
    } catch (err) {
      console.error(err);
      showToast('Veriler yüklenirken hata oluştu.');
    } finally {
      setLoadingData(false);
    }
  };

  // İlişkili (FK) bir sütun için combobox seçeneklerini yükler ve önbelleğe alır.
  const loadRelationOptions = async (col: TabloSutunRecord) => {
    if (!col.relation_table || relationOptionsCache[col.relation_table]) return;
    try {
      const rows = await fetchTableData(col.relation_table);
      const displayKey = col.relation_display_column || 'name';
      const idKey = col.relation_column || 'id';
      const options = rows.map((r: any) => ({ id: r[idKey], label: r[displayKey] ?? String(r[idKey]) }));
      setRelationOptionsCache(prev => ({ ...prev, [col.relation_table as string]: options }));
    } catch (err) {
      console.error(err);
    }
  };

  // Seçili tablonun ilişkili (FK) sütunlarının seçeneklerini önceden yükler
  // (Ekle/Düzenle formu açıldığında combobox'ların dolu gelmesi için).
  const ensureRelationOptionsForTable = async (tableKey: string) => {
    const relCols = allColumns.filter(c => c.table_name === tableKey && c.relation_table);
    await Promise.all(relCols.map(loadRelationOptions));
  };

  // 2. Initial Data Load
  useEffect(() => {
    loadActiveTableData(selectedTableKey);
    loadUsersAndPermissions();
    loadSchemaColumns();
  }, []);

  useEffect(() => {
    loadActiveTableData(selectedTableKey);
  }, [selectedTableKey]);

  const loadUsersAndPermissions = async () => {
    try {
      const users = await api.getPersoneller();
      const perms = await api.getYetkiler();
      setPersonelList(users);
      setYetkilerList(perms);
      if (users.length > 0 && !selectedPersonel) {
        setSelectedPersonel(users[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSchemaColumns = async () => {
    try {
      const cols = await api.getTabloSutunlari();
      setAllColumns(cols);
    } catch (err) {
      console.error(err);
    }
  };

  // All Available Tables & GIS Layers definitions
  const availableTables = [
    { key: 'tb_projeler', name: 'Projeler', type: 'DATA', icon: Database, count: tableData.length, badge: 'İş Verisi' },
    { key: 'tb_binalar_3d', name: '3D Binalar & Yapılar', type: 'GEOMETRI', icon: Box, count: 12, badge: 'PostGIS Polygon' },
    { key: 'tb_altyapi_hatlari', name: 'Altyapı Şebekeleri', type: 'GEOMETRI', icon: Zap, count: 10, badge: 'PostGIS LineString' },
    { key: 'tb_proje_sinirlari', name: 'Proje Sınırları & Parsel', type: 'GEOMETRI', icon: Layers, count: 4, badge: 'PostGIS Polygon' },
    { key: 'tb_bloklar', name: 'İnşaat Blokları', type: 'GEOMETRI', icon: MapPin, count: 12, badge: 'PostGIS Polygon' },
    { key: 'tb_wbs_gorevler', name: 'WBS İş Paketleri', type: 'DATA', icon: TableProperties, count: 18, badge: 'İş Verisi' },
    { key: 'tb_ruhsatlar', name: 'Ruhsatlar & İzinler', type: 'DATA', icon: FileText, count: 8, badge: 'İş Verisi' },
    { key: 'tb_dokumanlar', name: 'CDE Dokümanlar', type: 'DATA', icon: FileText, count: 14, badge: 'İş Verisi' },
    { key: 'tb_varliklar', name: 'İşletme Varlıkları', type: 'DATA', icon: Server, count: 9, badge: 'İş Verisi' },
    { key: 'tb_bakim_kayitlari', name: 'Bakım Kayıtları', type: 'DATA', icon: RefreshCw, count: 6, badge: 'İş Verisi' },
    { key: 'tb_personel', name: 'Personel & Kullanıcılar', type: 'DATA', icon: Users, count: personelList.length, badge: 'Kullanıcı' },
    { key: 'tb_proje_durumlari', name: 'Proje Durumları', type: 'LISTE', icon: TableProperties, count: 4, badge: 'Sözel Liste' },
    { key: 'tb_risk_dereceleri', name: 'Risk Dereceleri', type: 'LISTE', icon: AlertCircle, count: 3, badge: 'Sözel Liste' },
    { key: 'tb_data_status', name: 'Veri Durumları', type: 'LISTE', icon: TableProperties, count: 4, badge: 'Sözel Liste' },
    { key: 'tb_kullanici_rolleri', name: 'Kullanıcı Rolleri', type: 'LISTE', icon: Key, count: 3, badge: 'Sözel Liste' }
  ];

  // Role Change Handler
  const handleRoleChange = async (userId: number | string, newRole: UserRole) => {
    try {
      await api.updatePersonel(userId, { user_role: newRole });
      setPersonelList(prev => prev.map(p => p.id === userId ? { ...p, user_role: newRole } : p));
      if (selectedPersonel?.id === userId) {
        setSelectedPersonel(prev => prev ? { ...prev, user_role: newRole } : null);
      }
      showToast(`Kullanıcı rolü başarıyla güncellendi: ${newRole.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      showToast('Rol güncellenirken hata oluştu.');
    }
  };

  // Permission Toggle Handler
  const handlePermissionToggle = async (
    userId: number | string,
    tableName: string,
    field: 'can_read' | 'can_write' | 'can_delete' | 'can_admin' | 'can_doc_add' | 'can_doc_manage'
  ) => {
    try {
      const existingPerm = yetkilerList.find(y => y.user_id === Number(userId) && y.table_or_layer_name === tableName);
      if (existingPerm) {
        const updatedVal = !existingPerm[field];
        await api.updateYetki(existingPerm.id, { [field]: updatedVal });
        setYetkilerList(prev => prev.map(y => y.id === existingPerm.id ? { ...y, [field]: updatedVal } : y));
      } else {
        const user = personelList.find(p => p.id === Number(userId));
        const newPerm = await api.createYetki({
          user_id: Number(userId),
          user_name: user?.full_name || 'Kullanıcı',
          table_or_layer_name: tableName,
          can_read: field === 'can_read',
          can_write: field === 'can_write',
          can_delete: field === 'can_delete',
          can_admin: field === 'can_admin',
          can_doc_add: field === 'can_doc_add',
          can_doc_manage: field === 'can_doc_manage'
        });
        setYetkilerList(prev => [...prev, newPerm]);
      }
      showToast(`Yetki güncellendi: ${tableName} (${field})`);
    } catch (err) {
      console.error(err);
      showToast('Yetki güncellenirken hata oluştu.');
    }
  };

  // Kullanıcı fotoğrafı ekleme/değiştirme — seçilen görsel base64 data URL'e
  // çevrilip avatar_url alanına yazılır (mock ortamda gerçek bir dosya
  // sunucusu olmadığından, dokümanlardaki file_data_url ile aynı yaklaşım).
  const handleAvatarFileChange = async (personId: number | string, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Lütfen bir görsel dosyası seçin.');
      return;
    }
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.updatePersonel(personId, { avatar_url: dataUrl });
      setPersonelList(prev => prev.map(p => p.id === personId ? { ...p, avatar_url: dataUrl } : p));
      setSelectedPersonel(prev => prev && prev.id === personId ? { ...prev, avatar_url: dataUrl } : prev);
      showToast('Kullanıcı fotoğrafı güncellendi.');
    } catch (err) {
      console.error(err);
      showToast('Fotoğraf yüklenirken hata oluştu.');
    }
  };

  // Row Create, Update, Delete Handlers for Tab 1
  const handleOpenAddRow = () => {
    // Determine default editable fields for the selected table
    const initialObj: Record<string, any> = {};
    if (selectedTableKey === 'tb_projeler') {
      initialObj.name = '';
      initialObj.code = `PRJ-${Date.now().toString().slice(-4)}`;
      initialObj.location = 'Bakırköy';
      initialObj.ada_parsel = '1200 / 1';
      initialObj.budget = 1500;
      initialObj.overall_progress = 0;
      initialObj.status = 'Planlama';
      initialObj.area = '50.000 m²';
      initialObj.risk_level = 'Düşük';
    } else if (selectedTableKey === 'tb_binalar_3d') {
      initialObj.name = 'Yeni Bina';
      initialObj.block_name = 'Yeni Blok';
      initialObj.building_type = 'Konut / Ticaret';
      initialObj.height_meters = 45;
      initialObj.floors_count = 12;
      initialObj.construction_progress = 0;
      initialObj.structural_status = 'Kaba Yapı';
      initialObj.footprint_area_sqm = 1800;
      initialObj.project_id = 'IGA-ETAP-1';
      initialObj.veri_durumu = 'Planlanan';
    } else if (selectedTableKey === 'tb_altyapi_hatlari') {
      initialObj.name = 'Yeni Altyapı Hattı';
      initialObj.network_name = 'Yeni Hat';
      initialObj.line_type = 'elektrik';
      initialObj.pipe_or_cable_spec = '154kV XLPE';
      initialObj.depth_meters = 2.0;
      initialObj.total_length_meters = 450;
      initialObj.status = 'Faal';
      initialObj.project_id = 'IGA-ETAP-1';
      initialObj.veri_durumu = 'Planlanan';
    } else if (selectedTableKey === 'tb_proje_sinirlari') {
      initialObj.name = 'Yeni Proje Sınırı';
      initialObj.project_name = 'Yeni Parsel Sınırı';
      initialObj.ada_parsel = '1500 / 12';
      initialObj.area_sqm = 75000;
      initialObj.project_id = 'IGA-ETAP-1';
      initialObj.veri_durumu = 'Planlanan';
    } else if (selectedTableKey === 'tb_bloklar') {
      initialObj.name = 'Yeni Blok';
      initialObj.height = 40;
      initialObj.floors = 10;
      initialObj.progress = 0;
      initialObj.status = 'Planlandı';
      initialObj.project_id = 'IGA-ETAP-1';
      initialObj.veri_durumu = 'Planlanan';
    } else if (selectedTableKey === 'tb_wbs_gorevler') {
      initialObj.wbs_code = '01.05';
      initialObj.name = 'Yeni İmalat Paketi';
      initialObj.progress = 0;
      initialObj.start_date = '2026-09-01';
      initialObj.end_date = '2026-10-31';
      initialObj.contractor = 'Ana Yüklenici';
      initialObj.responsible = 'Saha Şefi';
      initialObj.status = 'Başlanmadı';
      initialObj.cost = 15;
      initialObj.project_id = 'IGA-ETAP-1';
    } else if (selectedTableKey === 'tb_ruhsatlar') {
      initialObj.name = 'Yapı Ruhsatı';
      initialObj.authority = 'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı';
      initialObj.issue_date = '2026-01-15';
      initialObj.expiry_date = '2029-01-15';
      initialObj.status = 'Alındı';
      initialObj.geographic_scope = 'Tüm Saha';
      initialObj.project_id = 'IGA-ETAP-1';
    } else if (selectedTableKey === 'tb_dokumanlar') {
      initialObj.name = 'Mimari_Kesit_Detay.dwg';
      initialObj.version = 'v1.0';
      initialObj.file_size = '14.2 MB';
      initialObj.upload_date = '2026-08-27';
      initialObj.approval_status = 'Approved';
      initialObj.approver = 'BIM Koordinatörü';
    } else if (selectedTableKey === 'tb_varliklar') {
      initialObj.name = 'Yeni İklimlendirme Santrali';
      initialObj.asset_type = 'HVAC';
      initialObj.install_date = '2026-08-27';
      initialObj.manufacturer = 'Daikin / Carrier';
      initialObj.warranty_status = 'Aktif (2 Yıl)';
      initialObj.status = 'Sorunsuz';
      initialObj.maintenance_cost = 25000;
    } else if (selectedTableKey === 'tb_bakim_kayitlari') {
      initialObj.maintenance_date = '2026-08-27';
      initialObj.log_type = 'Planlı Bakım (PM)';
      initialObj.description = 'Periyodik filtre ve sensör kalibrasyonu';
      initialObj.cost = 14500;
      initialObj.technician = 'Teknik Ekip';
      initialObj.status = 'Tamamlandı';
    } else if (selectedTableKey === 'tb_personel') {
      initialObj.full_name = 'Yeni Personel';
      initialObj.email = 'yeni.personel@iga.aero';
      initialObj.role = 'İnşaat Mühendisi';
      initialObj.department = 'Saha Operasyonları';
      initialObj.phone = '+90 532 111 2233';
      initialObj.user_role = 'standart_user';
    } else if (selectedTableKey === 'tb_proje_durumlari') {
      initialObj.code = 'yeni_durum';
      initialObj.name = 'Yeni Durum';
      initialObj.notes = 'Açıklama notu';
    } else if (selectedTableKey === 'tb_risk_dereceleri') {
      initialObj.code = 'yeni_risk';
      initialObj.name = 'Özel Risk Seviyesi';
      initialObj.notes = 'Risk açıklaması';
    } else if (selectedTableKey === 'tb_data_status') {
      initialObj.code = 'yeni_durum';
      initialObj.name = 'Yeni Veri Durumu';
      initialObj.notes = 'Açıklama notu';
    } else if (selectedTableKey === 'tb_kullanici_rolleri') {
      initialObj.code = 'guest_user';
      initialObj.name = 'Misafir Kullanıcı';
      initialObj.description = 'Yalnızca genel izleme yapabilen rol';
    } else {
      initialObj.notes = 'Yeni kayıt notu';
    }
    setNewRowData(initialObj);
    setShowAddRowModal(true);
    ensureRelationOptionsForTable(selectedTableKey);
  };

  const handleCreateRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let created: any = null;
      switch (selectedTableKey) {
        case 'tb_projeler':
          created = await api.createProje(newRowData);
          break;
        case 'tb_binalar_3d':
          created = await api.createBina3D(newRowData);
          break;
        case 'tb_altyapi_hatlari':
          created = await api.createAltyapiHatti(newRowData);
          break;
        case 'tb_proje_sinirlari':
          created = await api.createProjeSiniri(newRowData);
          break;
        case 'tb_bloklar':
          created = await api.createBlok(newRowData);
          break;
        case 'tb_ruhsatlar':
          created = await api.createRuhsat(newRowData);
          break;
        case 'tb_wbs_gorevler':
          created = await api.createWbsGorev(newRowData);
          break;
        case 'tb_dokumanlar':
          created = await api.createDokuman(newRowData);
          break;
        case 'tb_varliklar':
          created = await api.createVarlik(newRowData);
          break;
        case 'tb_bakim_kayitlari':
          created = await api.createBakimKaydi(newRowData);
          break;
        case 'tb_personel':
          created = await api.createPersonel(newRowData);
          setPersonelList(prev => [...prev, created]);
          break;
        case 'tb_proje_durumlari':
          created = await api.createProjeDurumu(newRowData);
          break;
        case 'tb_risk_dereceleri':
          created = await api.createRiskDerecesi(newRowData);
          break;
        case 'tb_data_status':
          created = await api.createVeriDurumu(newRowData);
          break;
        case 'tb_kullanici_rolleri':
          created = await api.createKullaniciRolu(newRowData);
          break;
        default:
          created = await api.createProje(newRowData);
      }
      setShowAddRowModal(false);
      setNewRowData({});
      await loadActiveTableData(selectedTableKey);
      showToast(`'${selectedTableKey}' tablosuna yeni kayıt başarıyla eklendi.`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Kayıt eklenirken hata oluştu.');
    }
  };

  const handleOpenEditRow = (row: Record<string, any>) => {
    setEditingRow({ ...row });
    setShowEditRowModal(true);
    ensureRelationOptionsForTable(selectedTableKey);
  };

  const handleUpdateRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    const rowId = editingRow.id;
    try {
      switch (selectedTableKey) {
        case 'tb_projeler':
          await api.updateProje(rowId, editingRow);
          break;
        case 'tb_binalar_3d':
          await api.updateBina3D(rowId, editingRow);
          break;
        case 'tb_altyapi_hatlari':
          await api.updateAltyapiHatti(rowId, editingRow);
          break;
        case 'tb_proje_sinirlari':
          await api.updateProjeSiniri(rowId, editingRow);
          break;
        case 'tb_bloklar':
          await api.updateBlok(rowId, editingRow);
          break;
        case 'tb_ruhsatlar':
          await api.updateRuhsat(rowId, editingRow);
          break;
        case 'tb_wbs_gorevler':
          await api.updateWbsGorev(rowId, editingRow);
          break;
        case 'tb_dokumanlar':
          await api.updateDokuman(rowId, editingRow);
          break;
        case 'tb_varliklar':
          await api.updateVarlik(rowId, editingRow);
          break;
        case 'tb_bakim_kayitlari':
          await api.updateBakimKaydi(rowId, editingRow);
          break;
        case 'tb_personel':
          await api.updatePersonel(rowId, editingRow);
          setPersonelList(prev => prev.map(p => p.id === rowId ? { ...p, ...editingRow } as PersonelRecord : p));
          break;
        case 'tb_proje_durumlari':
          await api.updateProjeDurumu(rowId, editingRow);
          break;
        case 'tb_risk_dereceleri':
          await api.updateRiskDerecesi(rowId, editingRow);
          break;
        case 'tb_data_status':
          await api.updateVeriDurumu(rowId, editingRow);
          break;
        case 'tb_kullanici_rolleri':
          await api.updateKullaniciRolu(rowId, editingRow);
          break;
        default:
          await api.updateProje(rowId, editingRow);
      }
      setShowEditRowModal(false);
      setEditingRow(null);
      await loadActiveTableData(selectedTableKey);
      showToast(`Kayıt (ID: ${rowId}) başarıyla güncellendi.`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Kayıt güncellenirken hata oluştu.');
    }
  };

  const handleDeleteRow = async (row: Record<string, any>) => {
    const rowId = row.id;
    try {
      switch (selectedTableKey) {
        case 'tb_projeler':
          await api.deleteProje(rowId);
          break;
        case 'tb_binalar_3d':
          await api.deleteBina3D(rowId);
          break;
        case 'tb_altyapi_hatlari':
          await api.deleteAltyapiHatti(rowId);
          break;
        case 'tb_proje_sinirlari':
          await api.deleteProjeSiniri(rowId);
          break;
        case 'tb_bloklar':
          await api.deleteBlok(rowId);
          break;
        case 'tb_ruhsatlar':
          await api.deleteRuhsat(rowId);
          break;
        case 'tb_wbs_gorevler':
          await api.deleteWbsGorev(rowId);
          break;
        case 'tb_dokumanlar':
          await api.deleteDokuman(rowId);
          break;
        case 'tb_varliklar':
          await api.deleteVarlik(rowId);
          break;
        case 'tb_bakim_kayitlari':
          await api.deleteBakimKaydi(rowId);
          break;
        case 'tb_personel':
          await api.deletePersonel(rowId);
          setPersonelList(prev => prev.filter(p => p.id !== rowId));
          break;
        case 'tb_proje_durumlari':
          await api.deleteProjeDurumu(rowId);
          break;
        case 'tb_risk_dereceleri':
          await api.deleteRiskDerecesi(rowId);
          break;
        case 'tb_data_status':
          await api.deleteVeriDurumu(rowId);
          break;
        case 'tb_kullanici_rolleri':
          await api.deleteKullaniciRolu(rowId);
          break;
        default:
          await api.deleteProje(rowId);
      }
      setDeleteConfirmRow(null);
      await loadActiveTableData(selectedTableKey);
      showToast(`Kayıt (ID: ${rowId}) başarıyla silindi (soft-deleted).`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Kayıt silinirken hata oluştu.');
    }
  };

  // Add User Submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await api.createPersonel(newUserForm);
      setPersonelList(prev => [...prev, newUser]);
      setSelectedPersonel(newUser);
      setShowAddUserModal(false);
      setNewUserForm({
        full_name: '',
        email: '',
        role: '',
        department: 'Teknik Ofis & CBS',
        phone: '',
        user_role: 'standart_user'
      });
      showToast(`${newUser.full_name} sisteme başarıyla eklendi.`);
    } catch (err) {
      console.error(err);
      showToast('Kullanıcı eklenirken hata oluştu.');
    }
  };

  // Add Column Submit
  const handleAddColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnForm.column_name.trim()) return;

    // Convert to snake_case ascii
    const cleanColName = newColumnForm.column_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_');

    try {
      const newCol = await api.addTabloSutunu({
        table_name: selectedTableKey,
        column_name: cleanColName,
        data_type: newColumnForm.data_type,
        is_nullable: newColumnForm.is_nullable,
        column_default: newColumnForm.column_default || undefined,
        description: newColumnForm.description || 'Kullanıcı tanımlı sütun',
        is_standard: false
      });
      setAllColumns(prev => [...prev, newCol]);
      setShowAddColumnModal(false);
      setNewColumnForm({
        column_name: '',
        data_type: 'varchar(255)',
        is_nullable: true,
        column_default: '',
        description: ''
      });
      showToast(`'${cleanColName}' sütunu '${selectedTableKey}' tablosuna eklendi.`);
    } catch (err: any) {
      showToast(err.message || 'Sütun eklenirken hata oluştu.');
    }
  };

  // Sütun İlişkilendirme (FK) — bir sütunu başka bir tablonun anahtarına
  // bağlayarak veri girişinde combobox olarak göstermeyi sağlar.
  const handleOpenRelationModal = (col: TabloSutunRecord) => {
    setRelationEditingColumn(col);
    setRelationForm({
      relation_table: col.relation_table || '',
      relation_column: col.relation_column || 'id',
      relation_display_column: col.relation_display_column || 'name'
    });
    setShowRelationModal(true);
  };

  const handleSaveRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationEditingColumn || !relationForm.relation_table) return;
    try {
      const updated = await api.updateTabloSutunuRelation(
        relationEditingColumn.table_name,
        relationEditingColumn.column_name,
        relationForm
      );
      setAllColumns(prev => prev.map(c =>
        c.table_name === updated.table_name && c.column_name === updated.column_name ? updated : c
      ));
      setRelationOptionsCache(prev => {
        const next = { ...prev };
        delete next[relationForm.relation_table];
        return next;
      });
      setShowRelationModal(false);
      setRelationEditingColumn(null);
      showToast(`'${relationEditingColumn.column_name}' sütunu '${relationForm.relation_table}' tablosuyla ilişkilendirildi.`);
    } catch (err: any) {
      showToast(err.message || 'İlişki kaydedilirken hata oluştu.');
    }
  };

  const handleClearRelation = async (col: TabloSutunRecord) => {
    try {
      const updated = await api.updateTabloSutunuRelation(col.table_name, col.column_name, null);
      setAllColumns(prev => prev.map(c =>
        c.table_name === updated.table_name && c.column_name === updated.column_name ? updated : c
      ));
      showToast(`'${col.column_name}' sütunundaki ilişki kaldırıldı.`);
    } catch (err: any) {
      showToast(err.message || 'İlişki kaldırılırken hata oluştu.');
    }
  };

  const handleDeleteColumn = async (col: TabloSutunRecord) => {
    try {
      await api.deleteTabloSutunu(col.table_name, col.column_name);
      setAllColumns(prev => prev.filter(c =>
        !(c.table_name === col.table_name && c.column_name === col.column_name)
      ));
      setDeleteColumnConfirm(null);
      showToast(`'${col.column_name}' sütunu '${col.table_name}' tablosundan silindi.`);
    } catch (err: any) {
      showToast(err.message || 'Sütun silinirken hata oluştu.');
    }
  };

  // Filtered data for Tab 1
  const filteredData = tableData.filter(row => {
    if (!dataSearchQuery) return true;
    const q = dataSearchQuery.toLowerCase();
    return Object.values(row).some(val => 
      val !== null && val !== undefined && String(val).toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden transition-all duration-300">
      
      {/* TOAST POPUP */}
      {toastMessage && (
        <div className="absolute top-4 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP COMPACT TITLE BAR */}
      <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase tracking-wider border border-sky-500/20">SİSTEM YÖNETİMİ</span>
              <span className="text-[10px] text-[var(--text-secondary)]">one map • one timeline • one truth</span>
            </div>
            <h1 className="text-xs font-black tracking-tight text-[var(--text-primary)] flex items-center gap-2 uppercase">
              <span>ADMIN PANELİ</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                v2.4 (PostGIS 5257)
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            REST API & Veritabanı Canlı
          </span>
          <a
            href="/api/export/gpkg"
            download="oda_pys_cbs.gpkg"
            title="CBS/PostGIS katmanlarını (proje sınırları, binalar, altyapı hatları) gerçek bir OGC GeoPackage (.gpkg) dosyası olarak indir — QGIS vb. herhangi bir GIS aracında açılabilir."
            className="text-[11px] font-bold px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-sky-400 hover:border-sky-500/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Dışa Aktar (.gpkg)
          </a>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-[var(--text-secondary)] transition cursor-pointer"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTAINER (LEFT ICON TAB RAIL + CONTENT) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT ICON-ONLY TAB RAIL */}
        <div className="w-16 shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col items-center py-4 gap-4 select-none">
          
          {/* Tab 1: Veriler */}
          <button
            onClick={() => setActiveMainTab('veriler')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer relative group ${
              activeMainTab === 'veriler'
                ? 'bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] ring-2 ring-sky-400/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border)]'
            }`}
            title="Veriler (Katmanlar ve Tablolar)"
            id="admin-tab-veriler"
          >
            <TableProperties className="w-5 h-5" />
            {/* Tooltip */}
            <div className="absolute left-16 px-2.5 py-1 bg-[#1e293b] text-white text-[11px] font-bold rounded-lg whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
              1. Veriler (Katmanlar & Tablolar)
            </div>
          </button>

          {/* Tab 2: Kullanıcılar */}
          <button
            onClick={() => setActiveMainTab('kullanicilar')}
            className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer relative group ${
              activeMainTab === 'kullanicilar'
                ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border)]'
            }`}
            title="Kullanıcılar & Yetkilendirme"
            id="admin-tab-kullanicilar"
          >
            <Users className="w-5 h-5" />
            {/* Tooltip */}
            <div className="absolute left-16 px-2.5 py-1 bg-[#1e293b] text-white text-[11px] font-bold rounded-lg whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
              2. Kullanıcılar & Yetkilendirme
            </div>
          </button>

          <div className="mt-auto flex flex-col items-center gap-2">
            <div className="w-8 h-[1px] bg-[var(--border)]"></div>
            <div className="w-7 h-7 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center text-[10px] font-bold" title="Standart 7 Kolon Uyumlu">
              7K
            </div>
          </div>
        </div>

        {/* RIGHT CONTENT WORKSPACE */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ========================================================
              TAB 1: VERİLER (KATMANLAR VE TABLOLAR)
             ======================================================== */}
          {activeMainTab === 'veriler' && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Sub-list: Tables & Layers Sidebar */}
              <div className="w-72 shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col overflow-hidden">
                <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    Katmanlar & Tablolar ({availableTables.length})
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: 'thin' }}>
                  {availableTables.map(tbl => {
                    const IconComp = tbl.icon;
                    const isSelected = selectedTableKey === tbl.key;
                    return (
                      <button
                        key={tbl.key}
                        onClick={() => setSelectedTableKey(tbl.key)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-md'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : tbl.type === 'GEOMETRI' ? 'text-cyan-400' : 'text-sky-400'}`} />
                          <div className="truncate">
                            <p className="truncate font-extrabold">{tbl.name}</p>
                            <span className={`text-[10px] font-mono block ${isSelected ? 'text-sky-100' : 'opacity-60'}`}>
                              {tbl.key}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]'
                        }`}>
                          {tbl.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Content Area: alt-sekmeler (Tablo/Katman Verileri & Sütunlar) */}
              <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden">

                {/* Sub-tab bar */}
                <div className="flex items-center gap-2 px-4 pt-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <button
                    onClick={() => setVerilerSubTab('veri')}
                    className={`px-3.5 py-2 rounded-t-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer border-b-2 ${
                      verilerSubTab === 'veri'
                        ? 'text-sky-400 border-sky-400 bg-[var(--bg-primary)]'
                        : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
                    }`}
                    id="admin-subtab-veri"
                  >
                    <TableProperties className="w-3.5 h-3.5" />
                    Tablo/Katman Verileri
                  </button>
                  <button
                    onClick={() => setVerilerSubTab('sutunlar')}
                    className={`px-3.5 py-2 rounded-t-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer border-b-2 ${
                      verilerSubTab === 'sutunlar'
                        ? 'text-emerald-400 border-emerald-400 bg-[var(--bg-primary)]'
                        : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
                    }`}
                    id="admin-subtab-sutunlar"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Sütunlar
                  </button>
                </div>

              {verilerSubTab === 'veri' && (
              <>
                {/* Header Toolbar */}
                <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black font-mono text-[var(--text-primary)]">
                      {selectedTableKey}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      {filteredData.length} Kayıt
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                      (7 Standart Kolon: id, notes, row_status, create_uid, create_date, write_uid, write_date)
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Search input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                      <input 
                        type="text"
                        placeholder="Seçili tabloda ara..."
                        value={dataSearchQuery}
                        onChange={(e) => setDataSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-amber-500 w-52"
                      />
                    </div>

                    <button 
                      onClick={() => loadActiveTableData(selectedTableKey)}
                      className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition cursor-pointer"
                      title="Yenile"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Orange Add Record Button like in User Screenshot */}
                    <button
                      onClick={handleOpenAddRow}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      id="admin-btn-add-record"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Yeni Kayıt Ekle</span>
                    </button>
                  </div>
                </div>

                {/* Table Data View */}
                <div className="flex-1 overflow-auto p-4" style={{ scrollbarWidth: 'thin' }}>
                  {loadingData ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                      <span className="text-xs font-bold">Veritabanından canlı veriler yükleniyor...</span>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <span className="text-xs font-bold">Kayıt bulunamadı.</span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs border-collapse font-sans">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)] text-[10px] uppercase font-black tracking-wider text-[var(--text-secondary)]">
                            {Object.keys(filteredData[0]).map(key => (
                              <th key={key} className="p-3 whitespace-nowrap">
                                <span className={['id', 'notes', 'row_status', 'create_uid', 'create_date', 'write_uid', 'write_date'].includes(key) ? 'text-amber-400 font-mono' : 'text-[var(--text-primary)] font-bold'}>
                                  {key}
                                </span>
                              </th>
                            ))}
                            <th className="p-3 text-right sticky right-0 bg-[var(--bg-primary)] shadow-sm whitespace-nowrap min-w-[90px]">
                              <span className="text-[var(--text-primary)] font-black">İŞLEMLER</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] font-medium text-[var(--text-secondary)]">
                          {filteredData.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[var(--bg-primary)] transition group">
                              {Object.entries(row).map(([key, val], cIdx) => (
                                <td key={cIdx} className="p-3 whitespace-nowrap max-w-xs truncate">
                                  {typeof val === 'object' && val !== null ? (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                      {JSON.stringify(val).substring(0, 30)}...
                                    </span>
                                  ) : key === 'row_status' ? (
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-black ${val === 1 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                      {val === 1 ? 'Aktif (1)' : 'Silinmiş (0)'}
                                    </span>
                                  ) : key === 'id' || key.endsWith('id') || key.endsWith('code') || key.endsWith('date') || key === 'ada_parsel' || key === 'coordinates' || key === 'center' ? (
                                    <span className="font-mono font-bold text-sky-400">{String(val ?? '-')}</span>
                                  ) : (
                                    <span className="text-[var(--text-primary)]">{String(val ?? '-')}</span>
                                  )}
                                </td>
                              ))}
                              {/* ACTION BUTTONS: EDIT & DELETE */}
                              <td className="p-3 text-right whitespace-nowrap sticky right-0 bg-[var(--bg-secondary)] group-hover:bg-[var(--bg-primary)] transition shadow-sm">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditRow(row)}
                                    className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-sky-500/15 hover:border-sky-500/30 text-sky-400 transition cursor-pointer"
                                    title="Kaydı Düzenle"
                                    id={`admin-edit-row-${row.id}`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmRow(row)}
                                    className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] hover:bg-red-500/15 hover:border-red-500/30 text-red-400 transition cursor-pointer"
                                    title="Kaydı Sil"
                                    id={`admin-del-row-${row.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
              )}

              {verilerSubTab === 'sutunlar' && (
                <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
                  <div className="space-y-6 max-w-5xl">

                    {/* Table Schema Header HUD */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between flex-wrap gap-4 shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-[var(--text-primary)] font-mono">{selectedTableKey}</h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-bold">
                            PostgreSQL / PostGIS Uyumlu
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          ASCII snake_case kolon standartları ve zorunlu 7 standart sistem kolonu.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowAddColumnModal(true)}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-md cursor-pointer"
                        id="admin-btn-add-column"
                      >
                        <Plus className="w-4 h-4" />
                        Yeni Sütun Ekle
                      </button>
                    </div>

                    {/* Columns Definition List */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-emerald-400" />
                          Sütun Yapısı & Veri Tipleri
                        </h3>
                        <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                          {allColumns.filter(c => c.table_name === selectedTableKey).length} Sütun Tanımlı
                        </span>
                      </div>

                      <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-primary)]">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[10px] uppercase font-black text-[var(--text-secondary)]">
                              <th className="p-3">Sütun Adı (snake_case)</th>
                              <th className="p-3">Veri Tipi</th>
                              <th className="p-3">Boş Olabilir (Nullable)</th>
                              <th className="p-3">Varsayılan (Default)</th>
                              <th className="p-3">Açıklama / Standart</th>
                              <th className="p-3">İlişki (FK)</th>
                              <th className="p-3">İşlemler</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] font-medium text-[var(--text-secondary)]">
                            {allColumns.filter(c => c.table_name === selectedTableKey).map((col, idx) => (
                              <tr key={idx} className="hover:bg-[var(--bg-secondary)] transition">
                                <td className="p-3 font-mono font-bold text-[var(--text-primary)]">
                                  <div className="flex items-center gap-1.5">
                                    <span>{col.column_name}</span>
                                    {col.is_standard && (
                                      <span className="text-[10px] font-sans px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-black">
                                        STANDART 7
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-sky-400 font-bold">{col.data_type}</td>
                                <td className="p-3">
                                  <Badge tone={col.is_nullable ? 'neutral' : 'danger'} size="sm">
                                    {col.is_nullable ? 'EVET' : 'HAYIR (NOT NULL)'}
                                  </Badge>
                                </td>
                                <td className="p-3 font-mono text-[11px] text-[var(--text-secondary)]">{col.column_default || '-'}</td>
                                <td className="p-3 text-[var(--text-secondary)]">{col.description || '-'}</td>
                                <td className="p-3">
                                  {col.is_standard ? (
                                    <span className="text-[10px] text-[var(--text-secondary)]">-</span>
                                  ) : col.relation_table ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleOpenRelationModal(col)}
                                        className="text-[10px] font-mono px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition cursor-pointer flex items-center gap-1"
                                        title="İlişkiyi düzenle"
                                      >
                                        <Key className="w-3 h-3" />
                                        → {col.relation_table}.{col.relation_display_column}
                                      </button>
                                      <button
                                        onClick={() => handleClearRelation(col)}
                                        className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                        title="İlişkiyi kaldır"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenRelationModal(col)}
                                      className="text-[10px] font-bold px-2 py-1 rounded-lg border border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:border-violet-500/40 hover:text-violet-400 transition cursor-pointer flex items-center gap-1"
                                      title="Bu sütunu başka bir tabloyla ilişkilendir"
                                    >
                                      <Plus className="w-3 h-3" />
                                      İlişki Ekle
                                    </button>
                                  )}
                                </td>
                                <td className="p-3">
                                  {col.is_standard ? (
                                    <span className="text-[10px] text-[var(--text-secondary)]">-</span>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteColumnConfirm(col)}
                                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                      title="Sütunu sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SQL Schema Reference Card */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[#121316] text-slate-300 space-y-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          sqlScripts.sql Otomatik DDL Tanımı
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          -- TABLO_TIPI: {availableTables.find(t => t.key === selectedTableKey)?.type || 'DATA'}
                        </span>
                      </div>

                      <pre className="p-3 rounded-xl bg-black/60 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
{`-- TABLO_TIPI: ${availableTables.find(t => t.key === selectedTableKey)?.type || 'DATA'}
CREATE TABLE ${selectedTableKey} (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone${allColumns
      .filter(c => c.table_name === selectedTableKey && !c.is_standard)
      .map(c => `,\n    ${c.column_name} ${c.data_type}${c.is_nullable ? '' : ' not null'}${c.column_default ? ` default ${c.column_default}` : ''}`)
      .join('')}
);`}
                      </pre>
                    </div>

                  </div>
                </div>
              )}

              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: KULLANICILAR & YETKİLENDİRME
             ======================================================== */}
          {activeMainTab === 'kullanicilar' && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Column: Personnel List */}
              <div className="w-80 shrink-0 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col overflow-hidden">
                <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Personel & Kullanıcılar ({personelList.length})
                  </span>
                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[11px] font-bold hover:bg-amber-600 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Yeni Ekle
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                  {personelList.map(person => {
                    const isSelected = selectedPersonel?.id === person.id;
                    return (
                      <div
                        key={person.id}
                        onClick={() => setSelectedPersonel(person)}
                        className={`p-3 rounded-xl border text-xs transition cursor-pointer ${
                          isSelected 
                            ? 'bg-[var(--bg-primary)] border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                            : 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-[10px] shrink-0 cursor-pointer group overflow-hidden"
                              title="Fotoğrafı değiştir"
                            >
                              {isAvatarImage(person.avatar_url) ? (
                                <img src={person.avatar_url!} alt={person.full_name} className="w-full h-full object-cover" />
                              ) : (
                                getInitials(person.full_name)
                              )}
                              <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition">
                                <Camera className="w-3 h-3 text-white" />
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleAvatarFileChange(person.id, e.target.files?.[0])}
                              />
                            </label>
                            <div>
                              <h4 className="text-[12px] font-bold text-[var(--text-primary)]">{person.full_name}</h4>
                              <span className="text-[10px] text-[var(--text-secondary)]">{person.email}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[var(--border)]">
                          <span className="text-[var(--text-secondary)]">{person.department}</span>
                          <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                            person.user_role === 'super_user'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                              : person.user_role === 'power_user'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                          }`}>
                            {person.user_role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: User Details & Granular Permission Matrix */}
              <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
                {selectedPersonel ? (
                  <div className="space-y-6 max-w-5xl">
                    
                    {/* User Profile Card */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between flex-wrap gap-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <label
                          className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-lg font-black shadow-lg shrink-0 cursor-pointer group overflow-hidden"
                          title="Fotoğrafı değiştir"
                        >
                          {isAvatarImage(selectedPersonel.avatar_url) ? (
                            <img src={selectedPersonel.avatar_url!} alt={selectedPersonel.full_name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(selectedPersonel.full_name)
                          )}
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition">
                            <Camera className="w-5 h-5 text-white" />
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleAvatarFileChange(selectedPersonel.id, e.target.files?.[0])}
                          />
                        </label>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-[var(--text-primary)]">{selectedPersonel.full_name}</h2>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                              UID: {selectedPersonel.id}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)]">{selectedPersonel.role} • {selectedPersonel.department}</p>
                          <p className="text-[11px] text-sky-400 font-mono mt-0.5">{selectedPersonel.email} | {selectedPersonel.phone || '+90 532 000 0000'}</p>
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-[var(--text-secondary)]">Kullanıcı Rolü & Yetki Düzeyi:</label>
                        <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border)]">
                          {(['super_user', 'power_user', 'standart_user'] as UserRole[]).map(role => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(selectedPersonel.id, role)}
                              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                                selectedPersonel.user_role === role
                                  ? role === 'super_user'
                                    ? 'bg-red-500 text-white shadow'
                                    : role === 'power_user'
                                      ? 'bg-amber-500 text-white shadow'
                                      : 'bg-sky-500 text-white shadow'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {role === 'super_user' ? 'Super User' : role === 'power_user' ? 'Power User' : 'Standart User'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Katman & Tablo Bazında Granüler Yetkilendirme Matrisi */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] space-y-4 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-400" />
                            Katman & Tablo Bazında Granüler Yetki Matrisi
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Seçili kullanıcının her PostGIS katmanı ve veri tablosu üzerindeki okuma, yazma, silme ve yönetim izinleri.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold">
                            {yetkilerList.filter(y => y.user_id === Number(selectedPersonel.id)).length} Özel Kural
                          </span>
                        </div>
                      </div>

                      {/* Matrix Table */}
                      <div className="rounded-xl border border-[var(--border)] overflow-x-auto bg-[var(--bg-primary)]">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)] text-[10px] uppercase font-black text-[var(--text-secondary)]">
                              <th className="p-3">Katman / Tablo Adı</th>
                              <th className="p-3">Tür</th>
                              <th className="p-3 text-center">Okuma (Read)</th>
                              <th className="p-3 text-center">Yazma (Write)</th>
                              <th className="p-3 text-center">Silme (Delete)</th>
                              <th className="p-3 text-center">Yönetim (Admin)</th>
                              <th className="p-3 text-center">Doküman Ekle</th>
                              <th className="p-3 text-center">Doküman Sil/Düzenle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] font-medium text-[var(--text-secondary)]">
                            {availableTables.slice(0, 10).map(tbl => {
                              const perm = yetkilerList.find(y => y.user_id === Number(selectedPersonel.id) && y.table_or_layer_name === tbl.key);
                              const canRead = perm ? perm.can_read : selectedPersonel.user_role === 'super_user';
                              const canWrite = perm ? perm.can_write : (selectedPersonel.user_role === 'super_user' || selectedPersonel.user_role === 'power_user');
                              const canDelete = perm ? perm.can_delete : selectedPersonel.user_role === 'super_user';
                              const canAdmin = perm ? perm.can_admin : selectedPersonel.user_role === 'super_user';
                              const canDocAdd = perm ? perm.can_doc_add : (selectedPersonel.user_role === 'super_user' || selectedPersonel.user_role === 'power_user');
                              const canDocManage = perm ? perm.can_doc_manage : selectedPersonel.user_role === 'super_user';

                              return (
                                <tr key={tbl.key} className="hover:bg-[var(--bg-secondary)] transition">
                                  <td className="p-3 font-extrabold text-[var(--text-primary)]">
                                    <div className="flex items-center gap-2">
                                      <tbl.icon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span>{tbl.name}</span>
                                      <span className="text-[10px] font-mono text-[var(--text-secondary)] opacity-70">({tbl.key})</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)] font-mono">
                                      {tbl.badge}
                                    </span>
                                  </td>
                                  
                                  {/* Read Toggle */}
                                  <td className="p-3 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={canRead}
                                      onChange={() => handlePermissionToggle(selectedPersonel.id, tbl.key, 'can_read')}
                                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                    />
                                  </td>

                                  {/* Write Toggle */}
                                  <td className="p-3 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={canWrite}
                                      onChange={() => handlePermissionToggle(selectedPersonel.id, tbl.key, 'can_write')}
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </td>

                                  {/* Delete Toggle */}
                                  <td className="p-3 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={canDelete}
                                      onChange={() => handlePermissionToggle(selectedPersonel.id, tbl.key, 'can_delete')}
                                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                                    />
                                  </td>

                                  {/* Admin Toggle */}
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={canAdmin}
                                      onChange={() => handlePermissionToggle(selectedPersonel.id, tbl.key, 'can_admin')}
                                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                  </td>

                                  {/* Doküman Ekle Toggle */}
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={canDocAdd}
                                      onChange={() => handlePermissionToggle(selectedPersonel.id, tbl.key, 'can_doc_add')}
                                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                                    />
                                  </td>

                                  {/* Doküman Sil/Düzenle Toggle */}
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={canDocManage}
                                      onChange={() => handlePermissionToggle(selectedPersonel.id, tbl.key, 'can_doc_manage')}
                                      className="w-4 h-4 rounded text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
                    <Users className="w-8 h-8 opacity-40" />
                    <span>Lütfen listeden bir personel seçiniz.</span>
                  </div>
                )}
              </div>

            </div>
          )}


        </div>

      </div>

      {/* ========================================================
          MODAL: YENİ KULLANICI EKLE
         ======================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                Yeni Personel / Kullanıcı Ekle
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Ad Soyad:</label>
                <input 
                  type="text"
                  required
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  placeholder="Örn: Canan Demir"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Kurumsal E-Posta:</label>
                <input 
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="canan.demir@iga.aero"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">Ünvan:</label>
                  <input 
                    type="text"
                    required
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    placeholder="CBS Uzmanı"
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">Departman:</label>
                  <input 
                    type="text"
                    required
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    placeholder="Teknik Ofis & CBS"
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Kullanıcı Rolü:</label>
                <select
                  value={newUserForm.user_role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, user_role: e.target.value as UserRole })}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="standart_user">Standart User (Saha & Okuma)</option>
                  <option value="power_user">Power User (Gelişmiş Operasyon & EVM)</option>
                  <option value="super_user">Super User (Tam Yönetici & Şema Sahibi)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition shadow cursor-pointer font-extrabold"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: YENİ SÜTUN EKLE
         ======================================================== */}
      {showAddColumnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" />
                Tabloya Yeni Sütun Ekle ({selectedTableKey})
              </h3>
              <button onClick={() => setShowAddColumnModal(false)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddColumnSubmit} className="p-5 space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">
                  Sütun Adı (snake_case, ascii):
                </label>
                <input 
                  type="text"
                  required
                  value={newColumnForm.column_name}
                  onChange={(e) => setNewColumnForm({ ...newColumnForm, column_name: e.target.value })}
                  placeholder="örn: yuklenici_firma_kodu"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                  Otomatik olarak küçük harf ve alt çizgiye dönüştürülür.
                </span>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Veri Tipi:</label>
                <select
                  value={newColumnForm.data_type}
                  onChange={(e) => setNewColumnForm({ ...newColumnForm, data_type: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="varchar(255)">varchar(255) - Metin</option>
                  <option value="varchar(100)">varchar(100) - Kısa Metin</option>
                  <option value="text">text - Uzun Metin / Not</option>
                  <option value="integer">integer - Tam Sayı</option>
                  <option value="numeric(15,2)">numeric(15,2) - Para / Bütçe</option>
                  <option value="numeric(5,2)">numeric(5,2) - Yüzde (%)</option>
                  <option value="boolean">boolean - Evet / Hayır</option>
                  <option value="date">date - Tarih</option>
                  <option value="timestamp">timestamp - Zaman Damgası</option>
                  <option value="geometry(Point,5257)">geometry(Point, 5257) - PostGIS Nokta</option>
                  <option value="geometry(Polygon,5257)">geometry(Polygon, 5257) - PostGIS Çokgen</option>
                  <option value="geometry(LineString,5257)">geometry(LineString, 5257) - PostGIS Çizgi</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="chk-nullable"
                  checked={newColumnForm.is_nullable}
                  onChange={(e) => setNewColumnForm({ ...newColumnForm, is_nullable: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="chk-nullable" className="text-[var(--text-primary)] cursor-pointer">
                  Boş Bırakılabilir (NULL değer alabilir)
                </label>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Varsayılan Değer (Opsiyonel):</label>
                <input 
                  type="text"
                  value={newColumnForm.column_default}
                  onChange={(e) => setNewColumnForm({ ...newColumnForm, column_default: e.target.value })}
                  placeholder="örn: 'Aktif' veya 0"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Açıklama:</label>
                <input 
                  type="text"
                  value={newColumnForm.description}
                  onChange={(e) => setNewColumnForm({ ...newColumnForm, description: e.target.value })}
                  placeholder="Kolonun işlevi ve veri içeriği"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddColumnModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow cursor-pointer font-extrabold"
                >
                  Sütunu Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SÜTUN İLİŞKİLENDİRME (FK) — Sütunlar sekmesi
         ======================================================== */}
      {showRelationModal && relationEditingColumn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Key className="w-4 h-4 text-violet-400" />
                Sütunu İlişkilendir ({relationEditingColumn.table_name}.{relationEditingColumn.column_name})
              </h3>
              <button onClick={() => setShowRelationModal(false)} className="text-[var(--text-secondary)] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRelation} className="p-5 space-y-4 text-xs font-bold">
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium">
                Bu sütun, seçtiğiniz tablonun anahtar sütununa (genelde "id") bağlanır.
                Veri giriş formunda bu sütun için, ilişkili tablonun "görünen ad" sütununu
                (örn. "name") listeleyen bir combobox gösterilir.
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">İlişkili Tablo:</label>
                <select
                  required
                  value={relationForm.relation_table}
                  onChange={(e) => setRelationForm({ ...relationForm, relation_table: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="" disabled>Seçiniz...</option>
                  {availableTables.filter(t => t.key !== relationEditingColumn.table_name).map(t => (
                    <option key={t.key} value={t.key}>{t.name} ({t.key})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Anahtar Sütun (genelde id):</label>
                <input
                  type="text"
                  required
                  value={relationForm.relation_column}
                  onChange={(e) => setRelationForm({ ...relationForm, relation_column: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Combobox'ta Gösterilecek Sütun:</label>
                <input
                  type="text"
                  required
                  value={relationForm.relation_display_column}
                  onChange={(e) => setRelationForm({ ...relationForm, relation_display_column: e.target.value })}
                  placeholder="örn: name"
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRelationModal(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition shadow cursor-pointer font-extrabold"
                >
                  İlişkiyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: YENİ KAYIT EKLE (TAB 1 DİNAMİK)
         ======================================================== */}
      {showAddRowModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-primary)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                    Yeni Kayıt Ekle
                  </h3>
                  <p className="text-[11px] font-mono text-orange-400">
                    Tablo: {selectedTableKey}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddRowModal(false)} 
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRowSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs font-bold" style={{ scrollbarWidth: 'thin' }}>
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-medium flex items-center gap-2">
                <Database className="w-4 h-4 shrink-0" />
                <span>Standart sistem kolonları (id, row_status, create/write logları) arka planda otomatik yönetilecektir.</span>
              </div>

              {Object.keys(newRowData).length === 0 ? (
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">Not / Açıklama:</label>
                  <input
                    type="text"
                    value={newRowData.notes || ''}
                    onChange={(e) => setNewRowData({ ...newRowData, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500"
                    placeholder="Kayıt açıklaması..."
                  />
                </div>
              ) : (
                Object.entries(newRowData).map(([fieldKey, fieldVal]) => {
                  const label = fieldKey.replace(/_/g, ' ').toUpperCase();
                  const isNumber = typeof fieldVal === 'number';
                  const relationCol = allColumns.find(c => c.table_name === selectedTableKey && c.column_name === fieldKey && c.relation_table);
                  const relationOptions = relationCol ? (relationOptionsCache[relationCol.relation_table as string] || []) : [];
                  return (
                    <div key={fieldKey}>
                      <label className="block text-[var(--text-secondary)] mb-1 font-mono text-[11px]">
                        {label} ({fieldKey}):
                      </label>
                      {relationCol ? (
                        <select
                          value={fieldVal ?? ''}
                          onChange={(e) => setNewRowData({ ...newRowData, [fieldKey]: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500 cursor-pointer"
                          title={`İlişkili tablo: ${relationCol.relation_table}`}
                        >
                          <option value="" disabled>Seçiniz...</option>
                          {relationOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
                          ))}
                        </select>
                      ) : fieldKey === 'veri_durumu' ? (
                        <select
                          value={fieldVal ?? 'Planlanan'}
                          onChange={(e) => setNewRowData({ ...newRowData, [fieldKey]: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="Planlanan">Planlanan</option>
                          <option value="İnşaat">İnşaat</option>
                          <option value="İşletme">İşletme</option>
                          <option value="İptal">İptal</option>
                        </select>
                      ) : (
                        <input
                          type={isNumber ? 'number' : 'text'}
                          value={fieldVal ?? ''}
                          onChange={(e) => {
                            const val = isNumber ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value;
                            setNewRowData({ ...newRowData, [fieldKey]: val });
                          }}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500"
                          placeholder={`${fieldKey} giriniz...`}
                        />
                      )}
                    </div>
                  );
                })
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 font-extrabold transition shadow-lg shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: KAYIT DÜZENLE (TAB 1)
         ======================================================== */}
      {showEditRowModal && editingRow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-primary)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                    Kaydı Düzenle
                  </h3>
                  <p className="text-[11px] font-mono text-sky-400">
                    {selectedTableKey} • ID: {editingRow.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditRowModal(false)} 
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRowSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs font-bold" style={{ scrollbarWidth: 'thin' }}>
              {Object.entries(editingRow)
                .filter(([k]) => !['id', 'create_uid', 'create_date', 'write_uid', 'write_date'].includes(k))
                .map(([fieldKey, fieldVal]) => {
                  const label = fieldKey.replace(/_/g, ' ').toUpperCase();
                  const isNumber = typeof fieldVal === 'number';
                  const isObj = typeof fieldVal === 'object' && fieldVal !== null;
                  const relationCol = allColumns.find(c => c.table_name === selectedTableKey && c.column_name === fieldKey && c.relation_table);
                  const relationOptions = relationCol ? (relationOptionsCache[relationCol.relation_table as string] || []) : [];
                  return (
                    <div key={fieldKey}>
                      <label className="block text-[var(--text-secondary)] mb-1 font-mono text-[11px]">
                        {label} ({fieldKey}):
                      </label>
                      {relationCol ? (
                        <select
                          value={fieldVal ?? ''}
                          onChange={(e) => setEditingRow({ ...editingRow, [fieldKey]: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-sky-500 cursor-pointer"
                          title={`İlişkili tablo: ${relationCol.relation_table}`}
                        >
                          <option value="" disabled>Seçiniz...</option>
                          {relationOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
                          ))}
                        </select>
                      ) : fieldKey === 'veri_durumu' ? (
                        <select
                          value={fieldVal ?? 'Planlanan'}
                          onChange={(e) => setEditingRow({ ...editingRow, [fieldKey]: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-sky-500 cursor-pointer"
                        >
                          <option value="Planlanan">Planlanan</option>
                          <option value="İnşaat">İnşaat</option>
                          <option value="İşletme">İşletme</option>
                          <option value="İptal">İptal</option>
                        </select>
                      ) : isObj ? (
                        <textarea
                          rows={2}
                          value={JSON.stringify(fieldVal, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setEditingRow({ ...editingRow, [fieldKey]: parsed });
                            } catch {
                              // keep string during edit
                            }
                          }}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-[11px] focus:outline-none focus:border-sky-500"
                        />
                      ) : (
                        <input
                          type={isNumber ? 'number' : 'text'}
                          value={fieldVal ?? ''}
                          onChange={(e) => {
                            const val = isNumber ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value;
                            setEditingRow({ ...editingRow, [fieldKey]: val });
                          }}
                          className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                        />
                      )}
                    </div>
                  );
                })}

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowEditRowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-extrabold transition shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SİLME ONAYI (TAB 1)
         ======================================================== */}
      {deleteConfirmRow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[var(--bg-secondary)] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden animate-fade-in p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                Kaydı Silmek İstiyor Musunuz?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                <span className="font-mono text-amber-400 font-bold">{selectedTableKey}</span> tablosundan{' '}
                <span className="font-mono text-sky-400 font-bold">ID: {deleteConfirmRow.id}</span> numaralı kayıt silinecektir.
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-mono bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border)]">
                Güvenlik gereği kurumsal sistem standartlarında "row_status = 0" olarak pasife alınır.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmRow(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] font-bold text-xs cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleDeleteRow(deleteConfirmRow)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-red-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SÜTUN SİLME ONAYI (Sütunlar alt-sekmesi)
         ======================================================== */}
      {deleteColumnConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[var(--bg-secondary)] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden animate-fade-in p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                Sütunu Silmek İstiyor Musunuz?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                <span className="font-mono text-amber-400 font-bold">{deleteColumnConfirm.table_name}</span> tablosundan{' '}
                <span className="font-mono text-sky-400 font-bold">{deleteColumnConfirm.column_name}</span> sütunu kalıcı olarak silinecektir.
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-mono bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border)]">
                Bu işlem geri alınamaz — sütundaki mevcut veriler de birlikte kaybolur. Sistem (STANDART 7) sütunları bu işlemden hariçtir.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteColumnConfirm(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] font-bold text-xs cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleDeleteColumn(deleteColumnConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-red-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
