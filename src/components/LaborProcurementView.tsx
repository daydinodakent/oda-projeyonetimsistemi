import React, { useState } from 'react';
import { Project } from '../types';
import type { FormEvent, ReactNode } from 'react';
import MuiBox from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import { FormField, FieldRow } from './chrome/FormDialog';
import { toneColors, type Tone } from './ui/tone';
import { 
  Users, HardHat, ShieldCheck, Hammer, Truck, Plus, 
  Trash, Edit2, CheckCircle2, UserPlus, FileCheck, 
  Search, Sliders, ShoppingBag, Box, Clock, TrendingUp
} from 'lucide-react';

/** Satır içi (sayfa içinde açılan) ekleme formu: tonlu kenarlık, alanlar ve İptal/Kaydet eylemleri. */
function InlineForm({ tone, onSubmit, onCancel, children }: { tone: Tone; onSubmit: (e: FormEvent<HTMLFormElement>) => void; onCancel: () => void; children: ReactNode }) {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  return (
    <MuiBox
      component="form"
      onSubmit={onSubmit}
      sx={{ p: 4, mb: 4, bgcolor: 'background.paper', border: 1, borderColor: alpha(c.main, 0.25), borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      {children}
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', pt: 1 }}>
        <Button type="button" size="small" variant="outlined" color="inherit" onClick={onCancel} sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: 10, fontWeight: 700 }}>İptal</Button>
        <Button type="submit" size="small" variant="contained" color={tone === 'purple' ? 'secondary' : tone} sx={{ fontSize: 10, fontWeight: 700 }}>Kaydet</Button>
      </Stack>
    </MuiBox>
  );
}

interface LaborProcurementViewProps {
  project: Project;
  theme: 'dark' | 'light';
  onClose: () => void;
}

// Initial Mock Staff Assignments
interface StaffAssignment {
  id: string;
  name: string;
  role: string;
  blockName: string;
  phone: string;
  status: 'Aktif' | 'İzinli' | 'Nöbetçi';
}

// Initial Mock Subcontractor Resource Pool
interface Subcontractor {
  id: string;
  companyName: string;
  specialty: string;
  activeHeadcount: number;
  contactPerson: string;
  safetyRating: 'A+' | 'A' | 'B+';
  complianceStatus: 'Onaylı' | 'Denetimde' | 'Askıda';
}

// Initial Mock Procurement Orders
interface MaterialOrder {
  id: string;
  materialName: string;
  quantity: string;
  supplierName: string;
  deliveryDate: string;
  status: 'Sipariş Edildi' | 'Yolda' | 'Teslim Edildi' | 'Kalite Kontrolde';
}

export default function LaborProcurementView({ project, theme, onClose }: LaborProcurementViewProps) {
  // Staff State
  const [staffList, setStaffList] = useState<StaffAssignment[]>([
    { id: 'STF-101', name: 'Alper Yılmaz', role: 'Şantiye Şefi', blockName: 'Terminal Kompleksi', phone: '+90 532 111 22 33', status: 'Aktif' },
    { id: 'STF-102', name: 'Mustafa Kaya', role: 'HSE ÇSG Uzmanı', blockName: 'Hangar Alanı', phone: '+90 532 444 55 66', status: 'Aktif' },
    { id: 'STF-103', name: 'Büşra Demir', role: 'Harita Mühendisi', blockName: 'Alt Geçit Tüneli', phone: '+90 532 777 88 99', status: 'Aktif' },
    { id: 'STF-104', name: 'Serdar Çelik', role: 'Elektrik Formeni', blockName: 'Enerji Merkezi', phone: '+90 533 111 00 22', status: 'Aktif' },
    { id: 'STF-105', name: 'Zeynep Şahin', role: 'QA/QC Kalite Mühendisi', blockName: 'Terminal Kompleksi', phone: '+90 533 555 44 33', status: 'Nöbetçi' },
  ]);

  // Subcontractors State
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([
    { id: 'SUB-201', companyName: 'Beta Fore Kazık A.Ş.', specialty: 'Altyapı & Derin Temel', activeHeadcount: 42, contactPerson: 'Cihan T.', safetyRating: 'A+', complianceStatus: 'Onaylı' },
    { id: 'SUB-202', companyName: 'Kalyon Çelik Sanayi', specialty: 'Çelik Konstrüksiyon', activeHeadcount: 110, contactPerson: 'Levent K.', safetyRating: 'A', complianceStatus: 'Onaylı' },
    { id: 'SUB-203', companyName: 'Atlas Beton & Prefabrik', specialty: 'Kaba Yapı İmalatları', activeHeadcount: 85, contactPerson: 'Vedat S.', safetyRating: 'A+', complianceStatus: 'Onaylı' },
    { id: 'SUB-204', companyName: 'Sistem Cephe Kaplama', specialty: 'Cam ve Alüminyum Cephe', activeHeadcount: 28, contactPerson: 'Onur D.', safetyRating: 'B+', complianceStatus: 'Denetimde' },
    { id: 'SUB-205', companyName: 'Ege Mekanik Ltd.', specialty: 'HVAC & Yangın Tesisat', activeHeadcount: 34, contactPerson: 'Ayhan G.', safetyRating: 'A', complianceStatus: 'Onaylı' },
  ]);

  // Materials State
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([
    { id: 'MAT-301', materialName: 'Portland Çimento CEM I 42.5', quantity: '450 Ton', supplierName: 'Akçansa Çimento', deliveryDate: '2026-08-30', status: 'Teslim Edildi' },
    { id: 'MAT-302', materialName: 'S355JR Yapısal Çelik Profiller', quantity: '120 Ton', supplierName: 'Erdemir Çelik', deliveryDate: '2026-09-02', status: 'Yolda' },
    { id: 'MAT-303', materialName: 'Yalıtımlı Lamine Cephe Camları', quantity: '2,400 m²', supplierName: 'Şişecam Dış Tic.', deliveryDate: '2026-09-10', status: 'Sipariş Edildi' },
    { id: 'MAT-304', materialName: '350kW Çatı Tipi HVAC Paket Üniteler', quantity: '8 Adet', supplierName: 'Daikin Türkiye', deliveryDate: '2026-08-28', status: 'Kalite Kontrolde' },
  ]);

  // Modals / Form triggers
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);

  // Form Inputs
  const [newStaff, setNewStaff] = useState<Omit<StaffAssignment, 'id'>>({ name: '', role: '', blockName: 'Terminal Kompleksi', phone: '', status: 'Aktif' });
  const [newSub, setNewSub] = useState<Omit<Subcontractor, 'id'>>({ companyName: '', specialty: '', activeHeadcount: 10, contactPerson: '', safetyRating: 'A', complianceStatus: 'Onaylı' });
  const [newMaterial, setNewMaterial] = useState<Omit<MaterialOrder, 'id'>>({ materialName: '', quantity: '', supplierName: '', deliveryDate: '', status: 'Sipariş Edildi' });

  // Add Staff handler
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.role) return;
    const assignment: StaffAssignment = {
      id: `STF-${Math.floor(100 + Math.random() * 900)}`,
      ...newStaff
    };
    setStaffList([...staffList, assignment]);
    setNewStaff({ name: '', role: '', blockName: 'Terminal Kompleksi', phone: '', status: 'Aktif' });
    setShowStaffForm(false);
  };

  // Add Subcontractor handler
  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.companyName || !newSub.specialty) return;
    const sub: Subcontractor = {
      id: `SUB-${Math.floor(200 + Math.random() * 900)}`,
      ...newSub
    };
    setSubcontractors([...subcontractors, sub]);
    setNewSub({ companyName: '', specialty: '', activeHeadcount: 10, contactPerson: '', safetyRating: 'A', complianceStatus: 'Onaylı' });
    setShowSubForm(false);
  };

  // Add Material handler
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.materialName || !newMaterial.quantity) return;
    const order: MaterialOrder = {
      id: `MAT-${Math.floor(300 + Math.random() * 900)}`,
      ...newMaterial
    };
    setMaterialOrders([...materialOrders, order]);
    setNewMaterial({ materialName: '', quantity: '', supplierName: '', deliveryDate: '', status: 'Sipariş Edildi' });
    setShowMaterialForm(false);
  };

  // Remove staff assignment
  const handleRemoveStaff = (id: string) => {
    setStaffList(staffList.filter(s => s.id !== id));
  };

  // Remove subcontractor
  const handleRemoveSub = (id: string) => {
    setSubcontractors(subcontractors.filter(s => s.id !== id));
  };

  // Totals calculations
  const totalOnsiteWorkers = subcontractors.reduce((sum, s) => sum + s.activeHeadcount, 0);

  return (
    <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl relative select-none text-[var(--text-primary)] transition-all duration-300">
      
      {/* Absolute Close X-Button */}
      <button 
        onClick={onClose}
        className="native-btn absolute top-4 right-4 p-2 rounded-full bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-500/50 transition duration-200 cursor-pointer z-50 flex items-center justify-center shadow-lg hover:shadow-red-500/15"
        style={{ position: 'absolute' }}
        title="Kapat ve Haritaya Dön"
      >
        <svg className="w-5 h-5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--border)] mb-6 gap-4 pr-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">İş Gücü & Tedarik Portalı</span>
            <span className="text-xs text-[var(--text-secondary)]">{project.name}</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <HardHat className="w-5 h-5 text-emerald-500" />
            <span>İŞGÜCÜ & TEDARİK YÖNETİMİ</span>
          </h2>
        </div>
      </div>

      {/* Aggregate Overview statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
          <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-1 uppercase tracking-wider">TOPLAM SAHA ELEMAN SAYISI (Mavi Yaka)</span>
          <span className="text-3xl font-black tracking-tight text-emerald-400">{totalOnsiteWorkers} Personel</span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">Aktif 5 Taşeron Ekibi Bünyesinde</span>
        </div>

        <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
          <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-1 uppercase tracking-wider">KADROLU MÜHENDİS & TEKNİK PERSONEL</span>
          <span className="text-3xl font-black tracking-tight text-blue-400">{staffList.length} Aktif</span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">Şantiye Şefi, ÇSG ve Saha Kontrol Birimleri</span>
        </div>

        <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
          <span className="text-[10px] font-black text-[var(--text-secondary)] block mb-1 uppercase tracking-wider">ÇSG UYGUNLUK & GÜVENLİK SKORU</span>
          <span className="text-3xl font-black tracking-tight text-amber-400">99.8%</span>
          <span className="text-[10px] text-emerald-500 block mt-1 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> Sıfır İş Kazası Hedefi Sürdürülüyor
          </span>
        </div>
      </div>

      {/* Main double column split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: STAFF ASSIGNMENTS & MATERIAL ORDERS */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Section 1: Kadrolu Şantiye Personel Atamaları */}
          <div className="p-5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>KADROLU ŞANTİYE PERSONEL ATAMALARI</span>
              </span>
              <button
                onClick={() => setShowStaffForm(!showStaffForm)}
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition rounded-lg cursor-pointer flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                <span>Personel Ekle</span>
              </button>
            </div>

            {showStaffForm && (
              <InlineForm tone="info" onSubmit={handleAddStaff} onCancel={() => setShowStaffForm(false)}>
                <FieldRow>
                  <FormField size="small" label="Ad Soyad" required value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Örn: Mehmet Ak" slotProps={{ inputLabel: { shrink: true } }} />
                  <FormField size="small" label="Rol / Görev" required value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} placeholder="Örn: Elektrik Formeni" slotProps={{ inputLabel: { shrink: true } }} />
                </FieldRow>
                <FieldRow>
                  <FormField size="small" select label="Görev Yeri (Blok)" value={newStaff.blockName} onChange={e => setNewStaff({ ...newStaff, blockName: e.target.value })}>
                    {['Terminal Kompleksi', 'Hangar Alanı', 'Alt Geçit Tüneli', 'Enerji Merkezi'].map((b) => (
                      <MenuItem key={b} value={b}>{b}</MenuItem>
                    ))}
                  </FormField>
                  <FormField size="small" label="Telefon No" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} placeholder="Örn: +90 532 000 00 00" slotProps={{ inputLabel: { shrink: true } }} />
                </FieldRow>
              </InlineForm>
            )}

            <div className="space-y-2.5">
              {staffList.map(s => (
                <div key={s.id} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center justify-between hover:border-slate-700 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span>{s.name}</span>
                        <span className="text-[10px] font-mono bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] px-1 py-0.5 rounded uppercase">{s.id}</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-medium">{s.role} • <span className="text-slate-500">{s.blockName}</span></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">{s.phone}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        s.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>{s.status}</span>
                    </div>

                    <button 
                      onClick={() => handleRemoveStaff(s.id)}
                      className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                      title="Atamayı Kaldır"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Malzeme Siparişleri & Tedarik */}
          <div className="p-5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span>KRİTİK MALZEME TEDARİK & SEVKİYAT TAKİBİ</span>
              </span>
              <button
                onClick={() => setShowMaterialForm(!showMaterialForm)}
                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Sipariş Gir</span>
              </button>
            </div>

            {showMaterialForm && (
              <InlineForm tone="secondary" onSubmit={handleAddMaterial} onCancel={() => setShowMaterialForm(false)}>
                <FieldRow>
                  <FormField size="small" label="Malzeme Cinsi" required value={newMaterial.materialName} onChange={e => setNewMaterial({ ...newMaterial, materialName: e.target.value })} placeholder="Örn: C40 Hazır Beton" slotProps={{ inputLabel: { shrink: true } }} />
                  <FormField size="small" label="Miktar / Birim" required value={newMaterial.quantity} onChange={e => setNewMaterial({ ...newMaterial, quantity: e.target.value })} placeholder="Örn: 250 m³" slotProps={{ inputLabel: { shrink: true } }} />
                </FieldRow>
                <FieldRow>
                  <FormField size="small" label="Tedarikçi Firma" required value={newMaterial.supplierName} onChange={e => setNewMaterial({ ...newMaterial, supplierName: e.target.value })} placeholder="Örn: Çimentaş A.Ş." slotProps={{ inputLabel: { shrink: true } }} />
                  <FormField size="small" type="date" label="Öngörülen Sevk Tarihi" required value={newMaterial.deliveryDate} onChange={e => setNewMaterial({ ...newMaterial, deliveryDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                </FieldRow>
              </InlineForm>
            )}

            <div className="space-y-2.5">
              {materialOrders.map(m => (
                <div key={m.id} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center justify-between hover:border-slate-700 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <Box className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[var(--text-primary)] block">{m.materialName}</span>
                        <span className="text-[10px] font-mono bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] px-1 rounded uppercase">{m.id}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium">{m.quantity} • {m.supplierName}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[var(--text-secondary)] block mb-0.5 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-[var(--text-secondary)]" /> <span className="font-mono">{m.deliveryDate}</span>
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                      m.status === 'Teslim Edildi' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : m.status === 'Yolda' 
                          ? 'bg-blue-500/10 text-blue-400 animate-pulse' 
                          : 'bg-amber-500/10 text-amber-400'
                    }`}>{m.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TAŞERON KAYNAK HAVUZU */}
        <div className="lg:col-span-6">
          <div className="p-5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5">
                  <Hammer className="w-4 h-4 text-emerald-400" />
                  <span>TAŞERON KAYNAK HAVUZU & EKİP MEVCUTLARI</span>
                </span>
                <button
                  onClick={() => setShowSubForm(!showSubForm)}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Taşeron Ekle</span>
                </button>
              </div>

              {showSubForm && (
                <InlineForm tone="success" onSubmit={handleAddSub} onCancel={() => setShowSubForm(false)}>
                  <FieldRow>
                    <FormField size="small" label="Taşeron Şirket Ünvanı" required value={newSub.companyName} onChange={e => setNewSub({ ...newSub, companyName: e.target.value })} placeholder="Örn: Aras Elektromekanik" slotProps={{ inputLabel: { shrink: true } }} />
                    <FormField size="small" label="Uzmanlık Alanı" required value={newSub.specialty} onChange={e => setNewSub({ ...newSub, specialty: e.target.value })} placeholder="Örn: Zayıf Akım Sistemleri" slotProps={{ inputLabel: { shrink: true } }} />
                  </FieldRow>
                  <FieldRow cols={3}>
                    <FormField size="small" type="number" label="Saha Mevcudu" required value={newSub.activeHeadcount} onChange={e => setNewSub({ ...newSub, activeHeadcount: parseInt(e.target.value) || 0 })} />
                    <FormField size="small" label="İrtibat Kişisi" required value={newSub.contactPerson} onChange={e => setNewSub({ ...newSub, contactPerson: e.target.value })} placeholder="Örn: Ahmet Bey" slotProps={{ inputLabel: { shrink: true } }} />
                    <FormField size="small" select label="İSG Derecesi" value={newSub.safetyRating} onChange={e => setNewSub({ ...newSub, safetyRating: e.target.value as any })}>
                      {['A+', 'A', 'B+'].map((r) => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </FormField>
                  </FieldRow>
                </InlineForm>
              )}

              <div className="space-y-3">
                {subcontractors.map(sub => (
                  <div key={sub.id} className="p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg flex items-center justify-between hover:border-slate-700 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 flex-shrink-0">
                        <HardHat className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span className="truncate">{sub.companyName}</span>
                          <span className="text-[10px] font-mono bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] px-1 py-0.5 rounded flex-shrink-0">{sub.id}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] block">{sub.specialty} • Temsilci: {sub.contactPerson}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] font-extrabold text-[var(--text-primary)] block">{sub.activeHeadcount} Kişi</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">İSG: <span className="font-extrabold text-emerald-400">{sub.safetyRating}</span></span>
                      </div>
                      
                      <button 
                        onClick={() => handleRemoveSub(sub.id)}
                        className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                        title="Taşeronu Çıkar"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Taşeron evrak ve SGK girişleri onaylanmıştır.</span>
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">Ağustos 2026 Güncellemesi</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
