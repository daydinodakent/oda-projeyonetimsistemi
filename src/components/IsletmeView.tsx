import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { Box, Wrench, AlertTriangle, TrendingUp, Plus, FileText, CheckCircle, Info, Play, Pencil, X, Save } from 'lucide-react';
import { Project, Asset, MaintenanceLog } from '../types';
import FilterSelect from './ui/FilterSelect';
import MuiBox from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import FormDialog, { FormField, FieldRow } from './chrome/FormDialog';

interface IsletmeViewProps {
  project: Project;
  projects?: Project[];
  assets: Asset[];
  maintenanceLogs: MaintenanceLog[];
  onAddMaintenanceLog: (log: MaintenanceLog) => void;
  onUpdateAssetStatus: (assetId: string, status: 'Sorunsuz' | 'Bakım Bekliyor' | 'Arızalı') => void;
  onUpdateProject?: (updatedProject: Partial<Project>) => void;
  onUpdateAsset?: (updatedAsset: Asset) => void;
  onUpdateMaintenanceLog?: (updatedLog: MaintenanceLog) => void;
  theme: 'dark' | 'light';
}

export default function IsletmeView({ 
  project, 
  projects = [],
  assets, 
  maintenanceLogs, 
  onAddMaintenanceLog, 
  onUpdateAssetStatus, 
  onUpdateProject,
  onUpdateAsset,
  onUpdateMaintenanceLog,
  theme 
}: IsletmeViewProps) {
  const [activeTab, setActiveTab] = useState<'ceo_summary' | 'inventory' | 'maintenance' | 'tco'>('ceo_summary');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');

  // Local state for project syncing
  const [localProject, setLocalProject] = useState<Project>(project);
  useEffect(() => {
    setLocalProject(project);
  }, [project]);

  // Filter state for assets
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');

  // EVM & Budget modal states
  const [showEvmModal, setShowEvmModal] = useState(false);
  const [evmForm, setEvmForm] = useState({
    plannedSpent: project.plannedSpent || 120,
    spent: project.spent || 135,
    earnedValue: project.earnedValue || 128,
    budget: project.budget || 180,
    overallProgress: project.overallProgress || 70,
    status: project.status || 'Aktif'
  });

  const openEvmModal = () => {
    setEvmForm({
      plannedSpent: localProject.plannedSpent,
      spent: localProject.spent,
      earnedValue: localProject.earnedValue,
      budget: localProject.budget,
      overallProgress: localProject.overallProgress,
      status: localProject.status
    });
    setShowEvmModal(true);
  };

  const handleEvmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...localProject,
      plannedSpent: Number(evmForm.plannedSpent),
      spent: Number(evmForm.spent),
      earnedValue: Number(evmForm.earnedValue),
      budget: Number(evmForm.budget),
      overallProgress: Number(evmForm.overallProgress),
      status: evmForm.status
    };
    setLocalProject(updated);
    if (onUpdateProject) {
      onUpdateProject(updated);
    }
    setShowEvmModal(false);
  };

  // Asset Editing states
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleEditAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    if (onUpdateAsset) {
      onUpdateAsset(editingAsset);
    }
    setEditingAsset(null);
  };

  // Maintenance Log editing states
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);

  const handleEditLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;

    if (onUpdateMaintenanceLog) {
      onUpdateMaintenanceLog(editingLog);
    }
    setEditingLog(null);
  };

  // TCO Data state for the comparative Area Chart
  const [tco, setTco] = useState([
    { id: '1', year: '2024', insaat: 420, isletme: 5, enerji: 8 },
    { id: '2', year: '2025', insaat: 1120, isletme: 18, enerji: 24 },
    { id: '3', year: '2026 (Bugün)', insaat: 1120, isletme: 45, enerji: 58 },
    { id: '4', year: '2027 (Hedef)', insaat: 1850, isletme: 80, enerji: 120 },
    { id: '5', year: '2028 (Yıl 5)', insaat: 1850, isletme: 140, enerji: 210 },
    { id: '6', year: '2030 (Yıl 7)', insaat: 1850, isletme: 260, enerji: 380 }
  ]);
  const [showTcoModal, setShowTcoModal] = useState(false);
  const [editingTco, setEditingTco] = useState([...tco]);

  const handleTcoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTco(editingTco);
    setShowTcoModal(false);
  };

  // New maintenance log form state
  const [newLog, setNewLog] = useState({
    type: 'Planlı Bakım (PM)' as 'Planlı Bakım (PM)' | 'Arıza Bildirimi (CM)' | 'Revizyon (Overhaul)',
    description: '',
    cost: 5000,
    technician: ''
  });

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const log: MaintenanceLog = {
      id: `log-${Date.now()}`,
      assetId: selectedAssetId,
      date: new Date().toISOString().split('T')[0],
      type: newLog.type,
      description: newLog.description,
      cost: newLog.cost,
      technician: newLog.technician,
      status: 'Açık'
    };
    onAddMaintenanceLog(log);
    
    // Also trigger asset status modification automatically based on maintenance log type
    if (newLog.type === 'Arıza Bildirimi (CM)') {
      onUpdateAssetStatus(selectedAssetId, 'Arızalı');
    } else {
      onUpdateAssetStatus(selectedAssetId, 'Bakım Bekliyor');
    }
    
    setShowLogModal(false);
  };

  const resolveLog = (logId: string, assetId: string) => {
    onUpdateAssetStatus(assetId, 'Sorunsuz');
    alert('Arıza bakım ekibince çözüldü, varlık durumu "Sorunsuz" olarak güncellendi.');
  };

  return (
    <div className="flex flex-col gap-5 transition-all duration-300">
      {/* View Header Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">İşletme & Varlık Yönetimi (O&M / Asset Control)</h2>
          <p className="text-xs text-[var(--text-secondary)]">Varlık Kimlik Kartları, Planlı/Arıza Bakım Defterleri ve TCO Toplam Sahiplik Analizi</p>
        </div>
        <div className="flex gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border)] flex-wrap">
          <button 
            onClick={() => setActiveTab('ceo_summary')}
            className={`px-3 py-1.5 rounded-md text-xs font-black transition flex items-center gap-1.5 uppercase tracking-wide border ${activeTab === 'ceo_summary' ? 'bg-[#221711] border-[#e67e22] text-[#e67e22] shadow-[0_0_10px_rgba(230,126,34,0.15)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'}`}
            id="isletme-tab-ceo-summary"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#e67e22]" />
            CEO PORTFÖY ÖZETİ
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="isletme-tab-inv"
          >
            <Box className="w-3.5 h-3.5" />
            Varlık Envanteri
          </button>
          <button 
            onClick={() => setActiveTab('maintenance')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === 'maintenance' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="isletme-tab-maint"
          >
            <Wrench className="w-3.5 h-3.5" />
            Bakım Günlüğü
          </button>
          <button 
            onClick={() => setActiveTab('tco')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === 'tco' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="isletme-tab-tco"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            TCO Ömür Devri Maliyeti
          </button>
        </div>
      </div>

      {/* CEO PORTFÖY ÖZETİ Tab Content */}
      {activeTab === 'ceo_summary' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <span className="text-[10px] font-black tracking-widest bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase block w-max mb-1">CEO Portföy Özeti</span>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase flex items-center gap-1.5">
                <span>DİNAMİK KAZANILAN DEĞER (EVM) VE FİNANSAL SAPMALAR</span>
                <button 
                  onClick={openEvmModal}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                  title="EVM ve Bütçe Verilerini Düzenle"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </h3>
            </div>
            <span className="px-2 py-0.5 bg-[#e67e22]/10 text-[#e67e22] text-[10px] font-black rounded uppercase border border-[#e67e22]/20">CBS Senkron</span>
          </div>

          {/* EVM Scorecards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[10px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Proje Durumu</span>
              <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase">{localProject.status}</span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[10px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Zaman İndeksi (SPI)</span>
              <span className={`text-xs font-black ${localProject.earnedValue >= localProject.plannedSpent ? 'text-emerald-500' : 'text-red-500'}`}>
                {(localProject.plannedSpent > 0 ? (localProject.earnedValue / localProject.plannedSpent) : 1.00).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[10px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Maliyet İndeksi (CPI)</span>
              <span className={`text-xs font-black ${localProject.earnedValue >= localProject.spent ? 'text-emerald-500' : 'text-red-500'}`}>
                {(localProject.spent > 0 ? (localProject.earnedValue / localProject.spent) : 1.02).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="text-[10px] text-[var(--text-secondary)] block mb-0.5 font-semibold">Kazanılan Değer</span>
              <span className="text-xs font-black text-indigo-500">₺{localProject.earnedValue}M</span>
            </div>
          </div>

          {/* Visual Recharts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* İşletme Amortisman ve Bütçe Emilimi */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xs">
              <span className="text-[10px] font-black text-[var(--text-primary)] block mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>PORTFÖY İŞLETME MALİYETİ VE AMORTİSMAN ANALİZİ (Milyon ₺)</span>
                <button 
                  onClick={openEvmModal}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                  title="Verileri Düzenle"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projects.length > 0 ? projects : [localProject]} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorIsletmeBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIsletmeSpent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#cbd5e1'} opacity={0.3} />
                    <XAxis dataKey="code" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} fontStyle="bold" />
                    <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', 
                        fontSize: '11px', 
                        borderRadius: '8px',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="budget" name="Toplam İşletme Bütçesi" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorIsletmeBudget)" />
                    <Area type="monotone" dataKey="spent" name="Harcanan Amortisman" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorIsletmeSpent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operasyonel EVM Analizi */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xs">
              <span className="text-[10px] font-black text-[var(--text-primary)] block mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>OPERASYONEL EVM ANALİZİ VE VERİMLİLİK TRENDİ (Milyon ₺)</span>
                <button 
                  onClick={openEvmModal}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                  title="Verileri Düzenle"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projects.length > 0 ? projects : [localProject]} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorIsletmePV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIsletmeEV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIsletmeAC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#cbd5e1'} opacity={0.3} />
                    <XAxis dataKey="code" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                    <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                        borderColor: theme === 'dark' ? '#334155' : '#e2e8f0', 
                        fontSize: '11px', 
                        borderRadius: '8px',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="plannedSpent" name="Plandaki Harcama (PV)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIsletmePV)" />
                    <Area type="monotone" dataKey="earnedValue" name="Kazanılan Değer (EV)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIsletmeEV)" />
                    <Area type="monotone" dataKey="spent" name="Gerçekleşen Harcama (AC)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorIsletmeAC)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-lg text-[10px] text-[var(--text-secondary)] flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>EVM Doğrulaması: {localProject.name} CBS sahasında bütçesel sapmalar tolerans limitleri dâhilinde olup, projenin tamamlanma oranı kümülatif eğriyle %100 as-built uyumludur.</span>
          </div>
        </div>
      )}

      {/* Tab: Varlık Envanteri */}
      {activeTab === 'inventory' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">Varlık Türü Sınıflandırma:</span>
              <FilterSelect value={assetTypeFilter} onChange={setAssetTypeFilter} options={[{ value: "all", label: "Tüm Sınıflar (Bina / Altyapı / Cihaz)" }, { value: "Bina", label: "Sadece Yapı / Bloklar" }, { value: "Ekipman", label: "Saha Ekipmanları" }, { value: "Altyapı", label: "Mekanik/Elektrik Altyapısı" }]} />
            </div>

            <button 
              onClick={() => {
                setSelectedAssetId(assets[0]?.id || '');
                setShowLogModal(true);
              }}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-700 transition cursor-pointer"
              id="isletme-btn-addlog"
            >
              <Wrench className="w-3.5 h-3.5" />
              Arıza / Bakım Bildirimi Yap
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets
              .filter(a => assetTypeFilter === 'all' || a.type === assetTypeFilter)
              .map((asset) => {
                const isFaulty = asset.status === 'Arızalı';
                const isMaintPending = asset.status === 'Bakım Bekliyor';

                return (
                  <div key={asset.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl flex gap-3 hover:shadow-sm group relative">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{asset.name}</span>
                          <button 
                            onClick={() => setEditingAsset(asset)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                            title="Varlığı Düzenle"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isFaulty 
                            ? 'bg-red-500 text-white' 
                            : isMaintPending 
                              ? 'bg-amber-500 text-slate-900' 
                              : 'bg-emerald-500/15 text-emerald-500'
                        }`}>
                          {asset.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-[var(--text-secondary)] border-t border-[var(--border)] pt-2 mt-2">
                        <div>Üretici/Marka: <strong className="text-[var(--text-primary)]">{asset.manufacturer}</strong></div>
                        <div>Kurulum Tarihi: <strong className="text-[var(--text-primary)] font-mono">{asset.installDate}</strong></div>
                        <div>Garanti Durumu: <span className="text-blue-400 font-bold">{asset.warrantyStatus}</span></div>
                        <div>Beklenen Ömür: <span className="text-[var(--text-primary)]">{asset.expectedLifeYears} Yıl</span></div>
                        <div>Kümülatif Bakım: <strong className="text-amber-500">₺{asset.maintenanceCost}M</strong></div>
                        <div>Enerji Gideri: <strong className="text-red-500">₺{asset.energyCost || 0}M</strong></div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end border-l border-[var(--border)] pl-3 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">ID: <span className="font-mono">{asset.id.split('-').pop()?.toUpperCase()}</span></span>
                      <div className="flex flex-col gap-1 items-end">
                        <button 
                          onClick={() => setEditingAsset(asset)}
                          className="text-[10px] text-slate-400 hover:text-blue-500 font-semibold"
                        >
                          Düzenle
                        </button>
                        <button 
                          onClick={() => alert(`Teknik kılavuz indiriliyor: ${asset.techDocUrl}`)}
                          className="text-blue-500 hover:underline text-[10px] font-bold flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          PDF Kılavuz
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab: Bakım Günlüğü */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* VISUAL CHRONOLOGICAL MAINTENANCE TIMELINE CARD */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  KRONOLOJİK BAKIM VE SERVİS ZAMAN ÇİZELGESİ (TIMELINE)
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">İşletmedeki tüm varlıkların geçmişten günümüze gerçekleştirilen tüm müdahale ve periyodik bakımlarının kronolojik takvimi</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] bg-[var(--bg-primary)]/60 px-3 py-1.5 rounded-lg border border-[var(--border)]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Arıza (CM)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Planlı (PM)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Periyodik</span>
              </div>
            </div>

            {/* Timeline Track container */}
            <div className="relative overflow-x-auto py-6 px-4 scrollbar-thin flex gap-6 items-stretch min-h-[170px]" style={{ scrollbarWidth: 'thin' }}>
              
              {/* Central horizontal timeline line */}
              <div className="absolute top-[52px] left-8 right-8 h-1 bg-gradient-to-r from-blue-500/20 via-indigo-500/35 to-emerald-500/20 rounded z-0" />

              {maintenanceLogs && maintenanceLogs.length > 0 ? (
                maintenanceLogs
                  .slice()
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((log) => {
                    const asset = assets.find(as => as.id === log.assetId);
                    const isCm = log.type === 'Arıza Bildirimi (CM)';
                    const isPm = log.type === 'Planlı Bakım (PM)';
                    const colorClass = isCm 
                      ? 'border-red-500 text-red-400 bg-red-500/10' 
                      : isPm 
                        ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
                        : 'border-purple-500 text-purple-400 bg-purple-500/10';
                    
                    return (
                      <div key={log.id} className="relative flex flex-col items-center min-w-[210px] max-w-[240px] shrink-0 z-10 select-none group/node">
                        
                        {/* Date label above step */}
                        <span className="text-[10px] font-mono font-bold text-slate-400 mb-2 group-hover/node:text-[var(--text-primary)] transition duration-200">
                          {log.date}
                        </span>

                        {/* Interactive Step Dot on Timeline Line */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${colorClass} z-20 cursor-help transform group-hover/node:scale-125 transition-all duration-300 shadow-md shadow-slate-900/50`}>
                          <Wrench className="w-3.5 h-3.5" />
                        </div>

                        {/* Info bubble below step */}
                        <div className="mt-3 p-3 rounded-xl bg-[var(--bg-primary)]/80 border border-[var(--border)] w-full text-left transition-all duration-300 group-hover/node:border-indigo-500/50 group-hover/node:shadow-lg group-hover/node:shadow-indigo-500/5">
                          <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex justify-between items-center">
                            <span>{log.type.split(' ')[0]}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Açık' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                          </div>
                          <h4 className="text-[11px] font-extrabold text-[var(--text-primary)] mt-1 truncate" title={asset?.name}>
                            {asset?.name || 'Bilinmeyen Varlık'}
                          </h4>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2 h-[30px]" title={log.description}>
                            {log.description}
                          </p>
                          <div className="mt-2 pt-1.5 border-t border-[var(--border)] flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span>👤 {log.technician.split(' ')[0]}</span>
                            <span className="text-emerald-500 font-bold">₺{log.cost.toLocaleString('tr-TR')} TL</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-xs text-[var(--text-secondary)] italic py-4 w-full text-center">Görüntülenecek bakım geçmişi bulunmuyor.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Maintenance Work Orders list */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Aktif Bakım Emirleri & Tamir Geçmişi</h3>
            
            <div className="space-y-3">
              {maintenanceLogs.map((log) => {
                const asset = assets.find(a => a.id === log.assetId);
                const isOpen = log.status === 'Açık';

                return (
                  <div key={log.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl flex items-start gap-3 justify-between group relative">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          log.type === 'Arıza Bildirimi (CM)' 
                            ? 'bg-red-500 text-white' 
                            : log.type === 'Planlı Bakım (PM)' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-purple-600 text-white'
                        }`}>
                          {log.type}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{asset?.name || 'Bilinmeyen Varlık'}</span>
                          <button 
                            onClick={() => setEditingLog(log)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                            title="Bakım Emrini Düzenle"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </h4>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] mt-1.5">{log.description}</p>
                      
                      <div className="flex gap-4 text-[10px] text-slate-400 mt-2.5 flex-wrap">
                        <span>Servis / Tekniker: <strong className="text-[var(--text-primary)]">{log.technician}</strong></span>
                        <span>Maliyet: <strong className="text-emerald-500">₺{log.cost.toLocaleString('tr-TR')} TL</strong></span>
                        <span>Tarih: <strong className="font-mono">{log.date}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end h-full pl-2 border-l border-[var(--border)] shrink-0 self-stretch min-h-[70px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOpen ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {isOpen ? 'Müdahale Bekliyor' : 'Tamamlandı'}
                      </span>
                      
                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => setEditingLog(log)}
                          className="text-[10px] text-slate-400 hover:text-blue-500 font-semibold"
                        >
                          Düzenle
                        </button>
                        {isOpen && (
                          <>
                            <span className="text-slate-600 text-[10px]">•</span>
                            <button 
                              onClick={() => resolveLog(log.id, log.assetId)}
                              className="bg-emerald-600 text-white font-bold py-1 px-2.5 rounded text-[10px] hover:bg-emerald-700 transition shadow cursor-pointer"
                            >
                              Tamamla
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IoT Smart Alerts */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-red-500 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Sanal IoT Öngörücü Bakım Alarmları
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs">
                <div className="font-bold text-amber-400 mb-1">A-Kule Kompresör Vibrasyonu Yüksek</div>
                <p className="text-[10px] text-[var(--text-secondary)]">Daikin VRV ünitesi dış ünite fan rulmanında anormal titreşim dalgası tespit edildi. Sonraki 15 gün içinde PM planlı bakım önerilir.</p>
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs">
                <div className="font-bold text-red-500 mb-1">C-Blok Yangın İstasyonu Basınç Kaybı</div>
                <p className="text-[10px] text-[var(--text-secondary)]">Grundfos hidrofor grubundaki basma hattı basıncı 0.4 bar eşiğinin altına düştü. Su tazyik kaybı alarmı aktif.</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Tab: TCO Ömür Devri Maliyeti */}
      {activeTab === 'tco' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
          {/* TCO comparative Area Chart */}
          <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center justify-between uppercase">
              <span>TCO (Total Cost of Ownership) Ömür Devri Maliyet Analizi</span>
              <button 
                onClick={() => {
                  setEditingTco([...tco]);
                  setShowTcoModal(true);
                }}
                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                title="TCO Projeksiyon Değerlerini Düzenle"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Bir yapının gerçek maliyeti sadece inşaat maliyeti değildir. Bakım ve Enerji giderlerinin kümülatif büyümesini inceleyin (Milyon ₺)</p>

            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tco} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInsaat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorIsletme" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEnerji" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="year" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                  <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                      borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" dataKey="insaat" name="Kümülatif İnşaat Maliyeti" stroke="#3b82f6" fillOpacity={1} fill="url(#colorInsaat)" />
                  <Area type="monotone" dataKey="isletme" name="Kümülatif İşletme & Bakım" stroke="#ef4444" fillOpacity={1} fill="url(#colorIsletme)" />
                  <Area type="monotone" dataKey="enerji" name="Kümülatif Enerji Giderleri" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEnerji)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operational optimization advices */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-500 mb-3">TCO Optimizasyon Tavsiyeleri</h3>
            <ul className="text-xs text-[var(--text-secondary)] space-y-3.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong>Fotovoltaik Güneş Çatısı:</strong> 7. yıldan itibaren kümülatif enerji giderini %35 azaltarak TCO eğrisini aşağı yönde bükecektir.
              </li>
              <li>
                <strong>Akıllı Kojenerasyon:</strong> Atık sıcak suyun ısıtmaya verilmesiyle doğalgaz harcamalarında yıllık ₺4.2M tasarruf mümkündür.
              </li>
              <li>
                <strong>IoT Entegre Bakım:</strong> Arıza meydana geldikten sonra tamir etmek yerine, kestirimci bakım uygulamak O&M bütçesini %18 düşürür.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* EVM Editor Modal */}
      <FormDialog
        open={showEvmModal}
        onClose={() => setShowEvmModal(false)}
        title="EVM & BÜTÇE EDİTÖRÜ (SpU)"
        icon={<Pencil className="w-4 h-4" />}
        onSubmit={handleEvmSubmit}
        cancelLabel="Vazgeç"
        submitLabel="Güncelle"
        submitIcon={<Save className="w-4 h-4" />}
      >
        <FormField type="number" label="Kümülatif Atanan Bütçe (Milyon ₺)" value={evmForm.budget} onChange={(e) => setEvmForm(p => ({ ...p, budget: Number(e.target.value) }))} required />
        <FormField type="number" label="Planlanan Harcama (PV) (Milyon ₺)" value={evmForm.plannedSpent} onChange={(e) => setEvmForm(p => ({ ...p, plannedSpent: Number(e.target.value) }))} required />
        <FieldRow>
          <FormField type="number" label="Gerçekleşen Değer (EV) (Milyon ₺)" value={evmForm.earnedValue} onChange={(e) => setEvmForm(p => ({ ...p, earnedValue: Number(e.target.value) }))} required />
          <FormField type="number" label="Gerçekleşen Harcama (AC) (Milyon ₺)" value={evmForm.spent} onChange={(e) => setEvmForm(p => ({ ...p, spent: Number(e.target.value) }))} required />
        </FieldRow>
        <FieldRow>
          <FormField type="number" label="İlerleme Oranı (%)" value={evmForm.overallProgress} onChange={(e) => setEvmForm(p => ({ ...p, overallProgress: Number(e.target.value) }))} required slotProps={{ htmlInput: { min: 0, max: 100 } }} />
          <FormField select label="Proje Durumu" value={evmForm.status} onChange={(e) => setEvmForm(p => ({ ...p, status: e.target.value }))}>
            {['Planlama', 'İnşaat', 'İşletme', 'Askıda'].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </FormField>
        </FieldRow>
      </FormDialog>

      {/* Asset Editing Modal */}
      <FormDialog
        open={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        title="Varlık Kartı Düzenleme (SpU)"
        icon={<Pencil className="w-4 h-4" />}
        onSubmit={handleEditAssetSubmit}
        cancelLabel="Vazgeç"
        submitLabel="Değişiklikleri Kaydet"
        submitIcon={<Save className="w-4 h-4" />}
      >
        {editingAsset && (
          <>
            <FormField label="Varlık Adı / Etiketi" value={editingAsset.name} onChange={(e) => setEditingAsset(p => p ? ({ ...p, name: e.target.value }) : null)} required />
            <FieldRow>
              <FormField label="Üretici / Marka" value={editingAsset.manufacturer} onChange={(e) => setEditingAsset(p => p ? ({ ...p, manufacturer: e.target.value }) : null)} required />
              <FormField label="Garanti Durumu" value={editingAsset.warrantyStatus} onChange={(e) => setEditingAsset(p => p ? ({ ...p, warrantyStatus: e.target.value }) : null)} required />
            </FieldRow>
            <FieldRow>
              <FormField type="number" label="Beklenen Faydalı Ömür (Yıl)" value={editingAsset.expectedLifeYears} onChange={(e) => setEditingAsset(p => p ? ({ ...p, expectedLifeYears: Number(e.target.value) }) : null)} required />
              <FormField select label="Varlık Sınıfı" value={editingAsset.type} onChange={(e) => setEditingAsset(p => p ? ({ ...p, type: e.target.value as any }) : null)}>
                <MenuItem value="Bina">Bina / Yapı</MenuItem>
                <MenuItem value="Ekipman">Ekipman</MenuItem>
                <MenuItem value="Altyapı">Altyapı</MenuItem>
              </FormField>
            </FieldRow>
            <FieldRow>
              <FormField type="number" label="Küm. Bakım Gideri (₺M)" value={editingAsset.maintenanceCost} onChange={(e) => setEditingAsset(p => p ? ({ ...p, maintenanceCost: Number(e.target.value) }) : null)} required slotProps={{ htmlInput: { step: 0.01 } }} />
              <FormField type="number" label="Enerji Gideri (₺M)" value={editingAsset.energyCost || 0} onChange={(e) => setEditingAsset(p => p ? ({ ...p, energyCost: Number(e.target.value) }) : null)} required slotProps={{ htmlInput: { step: 0.01 } }} />
            </FieldRow>
          </>
        )}
      </FormDialog>

      {/* Maintenance Log Editing Modal */}
      <FormDialog
        open={!!editingLog}
        onClose={() => setEditingLog(null)}
        title="Bakım Kaydı Düzenleme (SpU)"
        icon={<Pencil className="w-4 h-4" />}
        onSubmit={handleEditLogSubmit}
        cancelLabel="Vazgeç"
        submitLabel="Değişiklikleri Kaydet"
        submitIcon={<Save className="w-4 h-4" />}
      >
        {editingLog && (
          <>
            <FormField label="Bakım / Arıza Açıklaması" value={editingLog.description} onChange={(e) => setEditingLog(p => p ? ({ ...p, description: e.target.value }) : null)} required multiline rows={3} />
            <FieldRow>
              <FormField type="number" label="Hizmet Maliyeti (TL)" value={editingLog.cost} onChange={(e) => setEditingLog(p => p ? ({ ...p, cost: Number(e.target.value) }) : null)} required />
              <FormField label="Sorumlu Servis / Teknisyen" value={editingLog.technician} onChange={(e) => setEditingLog(p => p ? ({ ...p, technician: e.target.value }) : null)} required />
            </FieldRow>
            <FieldRow>
              <FormField select label="Emir Durumu" value={editingLog.status} onChange={(e) => setEditingLog(p => p ? ({ ...p, status: e.target.value as any }) : null)}>
                <MenuItem value="Açık">Açık (Müdahale Bekliyor)</MenuItem>
                <MenuItem value="Kapalı">Kapalı (Tamamlandı)</MenuItem>
              </FormField>
              <FormField select label="Hizmet Sınıfı" value={editingLog.type} onChange={(e) => setEditingLog(p => p ? ({ ...p, type: e.target.value as any }) : null)}>
                <MenuItem value="Planlı Bakım (PM)">Planlı Bakım (PM)</MenuItem>
                <MenuItem value="Arıza Bildirimi (CM)">Arıza Bildirimi (CM)</MenuItem>
                <MenuItem value="Revizyon (Overhaul)">Revizyon (Overhaul)</MenuItem>
              </FormField>
            </FieldRow>
          </>
        )}
      </FormDialog>

      {/* TCO comparative Area Chart Editor Modal */}
      <FormDialog
        open={showTcoModal}
        onClose={() => setShowTcoModal(false)}
        title="TCO KÜMÜLATİF MALİYET SİMÜLASYONU EDİTÖRÜ (SpU)"
        icon={<Pencil className="w-4 h-4" />}
        maxWidth="sm"
        onSubmit={handleTcoSubmit}
        cancelLabel="Vazgeç"
        submitLabel="Güncelle"
        submitIcon={<Save className="w-4 h-4" />}
      >
        {editingTco.map((tItem, index) => (
          <MuiBox key={tItem.id} sx={{ p: 3, bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <Typography sx={{ mb: 2, fontSize: 11, fontWeight: 800 }}>{tItem.year} Projeksiyonu</Typography>
            <FieldRow cols={3}>
              <FormField
                type="number"
                label="İnşaat Maliyeti (₺M)"
                value={tItem.insaat}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEditingTco(prev => prev.map((item, idx) => idx === index ? { ...item, insaat: val } : item));
                }}
                required
              />
              <FormField
                type="number"
                label="İşletme & Bakım (₺M)"
                value={tItem.isletme}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEditingTco(prev => prev.map((item, idx) => idx === index ? { ...item, isletme: val } : item));
                }}
                required
              />
              <FormField
                type="number"
                label="Enerji Giderleri (₺M)"
                value={tItem.enerji}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEditingTco(prev => prev.map((item, idx) => idx === index ? { ...item, enerji: val } : item));
                }}
                required
              />
            </FieldRow>
          </MuiBox>
        ))}
      </FormDialog>

      {/* Maintenance Log Creation Modal */}
      <FormDialog
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Yeni Saha Arıza / Bakım Bildirimi Kaydı"
        onSubmit={handleLogSubmit}
        cancelLabel="Geri Dön"
        submitLabel="Bildirimi Kaydet"
      >
        <FormField select label="Bildirim Yapılan Envanter Varlığı" value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)}>
          {assets.map(a => (
            <MenuItem key={a.id} value={a.id}>{a.name} (ID: {a.id.split('-').pop()?.toUpperCase()})</MenuItem>
          ))}
        </FormField>
        <FormField select label="Bildirim/Bakım Türü" value={newLog.type} onChange={(e) => setNewLog(l => ({ ...l, type: e.target.value as any }))}>
          <MenuItem value="Planlı Bakım (PM)">Planlı Bakım (PM)</MenuItem>
          <MenuItem value="Arıza Bildirimi (CM)">Arıza Bildirimi (CM)</MenuItem>
          <MenuItem value="Revizyon (Overhaul)">Revizyon (Overhaul)</MenuItem>
        </FormField>
        <FormField
          label="Hizmet / Arıza Detayı Açıklaması"
          value={newLog.description}
          onChange={(e) => setNewLog(l => ({ ...l, description: e.target.value }))}
          required
          multiline
          rows={2}
          placeholder="Kompresör basınç kaybı kontrolü ve karter yağı değişimi yapılacak."
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FieldRow>
          <FormField type="number" label="Tahmini Hizmet Gideri (TL)" value={newLog.cost} onChange={(e) => setNewLog(l => ({ ...l, cost: Number(e.target.value) }))} required />
          <FormField label="Sorumlu Servis / Teknisyen" value={newLog.technician} onChange={(e) => setNewLog(l => ({ ...l, technician: e.target.value }))} required placeholder="Daikin Yetkili Servis" slotProps={{ inputLabel: { shrink: true } }} />
        </FieldRow>
      </FormDialog>
    </div>
  );
}
