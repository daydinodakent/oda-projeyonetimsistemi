import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Users, FileText, AlertTriangle, ChevronRight, Upload, Clock, Plus, Pencil, Save, X, Trash2, Edit2, Check, CheckCircle, TrendingUp } from 'lucide-react';
import { Project, WBSTask, ProjectDocument, EmployeeAllocation } from '../types';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import FormDialog, { FormField, FieldRow } from './chrome/FormDialog';

interface PlanViewProps {
  project: Project;
  projects?: Project[];
  tasks: WBSTask[];
  documents: ProjectDocument[];
  onAddTask?: (task: WBSTask) => void;
  onAddDocument?: (doc: ProjectDocument) => void;
  onUpdateProject?: (updatedProject: Partial<Project>) => void;
  onUpdateTask?: (task: WBSTask) => void;
  onDeleteTask?: (taskId: string) => void;
  theme: 'dark' | 'light';
}

export default function PlanView({ 
  project: initialProject, 
  projects = [],
  tasks: initialTasks, 
  documents: initialDocuments, 
  onAddTask, 
  onAddDocument, 
  onUpdateProject,
  onUpdateTask,
  onDeleteTask,
  theme 
}: PlanViewProps) {
  const [activeTab, setActiveTab] = useState<'ceo_summary' | 'kpi' | 'ekip' | 'wbs' | 'dokuman'>('ceo_summary');
  
  // Local editable states initialized from props
  const [localProject, setLocalProject] = useState<Project>(initialProject);
  const [localTasks, setLocalTasks] = useState<WBSTask[]>(initialTasks);
  const [localDocs, setLocalDocs] = useState<ProjectDocument[]>(initialDocuments);

  useEffect(() => {
    setLocalProject(initialProject);
  }, [initialProject]);

  useEffect(() => {
    setLocalTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setLocalDocs(initialDocuments);
  }, [initialDocuments]);

  // States for interactive modals
  const [wbsFilterStatus, setWbsFilterStatus] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingTask, setEditingTask] = useState<WBSTask | null>(null);
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeAllocation | null>(null);
  const [showEvmModal, setShowEvmModal] = useState(false);
  const [showSCurveModal, setShowSCurveModal] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    wbsCode: '',
    name: '',
    contractor: '',
    plannedQuantity: 100,
    unit: 'm³',
    responsible: 'Ahmet Yılmaz',
    durationDays: 10,
    cost: 5
  });

  // New doc form state
  const [newDoc, setNewDoc] = useState({
    name: '',
    version: 'v1.0',
    fileSize: '5.2 MB',
    associatedBlockId: 'block-a'
  });

  // Editable S-Curve data
  const [sCurveData, setSCurveData] = useState([
    { name: '2025 Q1', plan: 10, hakedis: 10, maliyet: 12 },
    { name: '2025 Q2', plan: 25, hakedis: 22, maliyet: 24 },
    { name: '2025 Q3', plan: 45, hakedis: 42, maliyet: 46 },
    { name: '2025 Q4', plan: 60, hakedis: 55, maliyet: 58 },
    { name: '2026 Q1', plan: 75, hakedis: 70, maliyet: 72 },
    { name: '2026 Q2 (Bugün)', plan: 90, hakedis: localProject.overallProgress, maliyet: Math.round((localProject.spent / (localProject.budget || 1)) * 100) },
    { name: '2026 Q3 (Hedef)', plan: 100, hakedis: null as number | null, maliyet: null as number | null }
  ]);

  // Form states for EVM Editor
  const [evmForm, setEvmForm] = useState({
    plannedSpent: localProject.plannedSpent || 120,
    spent: localProject.spent || 135,
    earnedValue: localProject.earnedValue || 128,
    budget: localProject.budget || 180,
    overallProgress: localProject.overallProgress || 70
  });

  // Calculate EVM metrics
  const pv = localProject.plannedSpent; // Planned Value
  const ac = localProject.spent;        // Actual Cost
  const ev = localProject.earnedValue;  // Earned Value
  
  const sv = ev - pv; // Schedule Variance
  const cv = ev - ac; // Cost Variance
  const spi = pv > 0 ? (ev / pv) : 1; // Schedule Performance Index
  const cpi = ac > 0 ? (ev / ac) : 1; // Cost Performance Index

  // Resource conflict alerts
  const conflictedEmployees = (localProject.employees || []).filter(emp => {
    const totalAlloc = emp.allocationPercentage + (emp.otherProjects || []).reduce((sum, p) => sum + p.percentage, 0);
    return totalAlloc > 100;
  });

  // Handlers
  const handleSaveEvm = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...localProject,
      plannedSpent: Number(evmForm.plannedSpent),
      spent: Number(evmForm.spent),
      earnedValue: Number(evmForm.earnedValue),
      budget: Number(evmForm.budget),
      overallProgress: Number(evmForm.overallProgress)
    };
    setLocalProject(updated);
    if (onUpdateProject) onUpdateProject(updated);
    
    // Also update S-Curve current point
    setSCurveData(prev => prev.map(item => {
      if (item.name.includes('Bugün')) {
        return {
          ...item,
          hakedis: updated.overallProgress,
          maliyet: Math.round((updated.spent / (updated.budget || 1)) * 100)
        };
      }
      return item;
    }));

    setShowEvmModal(false);
  };

  const handleSaveSCurve = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSCurveModal(false);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const updatedEmployees = localProject.employees.map(emp => 
      emp.id === editingEmployee.id ? editingEmployee : emp
    );

    const updatedProject = { ...localProject, employees: updatedEmployees };
    setLocalProject(updatedProject);
    if (onUpdateProject) onUpdateProject(updatedProject);
    setEditingEmployee(null);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const task: WBSTask = {
      id: `task-${Date.now()}`,
      wbsCode: newTask.wbsCode,
      name: newTask.name,
      progress: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + newTask.durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contractor: newTask.contractor,
      plannedQuantity: newTask.plannedQuantity,
      actualQuantity: 0,
      unit: newTask.unit,
      responsible: newTask.responsible,
      durationDays: newTask.durationDays,
      status: 'Talep',
      cost: newTask.cost
    };
    
    setLocalTasks(prev => [task, ...prev]);
    if (onAddTask) onAddTask(task);
    setShowTaskModal(false);
    setNewTask({
      wbsCode: '',
      name: '',
      contractor: '',
      plannedQuantity: 100,
      unit: 'm³',
      responsible: 'Ahmet Yılmaz',
      durationDays: 10,
      cost: 5
    });
  };

  const handleSaveEditedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    setLocalTasks(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));
    if (onUpdateTask) onUpdateTask(editingTask);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setLocalTasks(prev => prev.filter(t => t.id !== taskId));
    if (onDeleteTask) onDeleteTask(taskId);
  };

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doc: ProjectDocument = {
      id: `doc-${Date.now()}`,
      name: newDoc.name,
      version: newDoc.version,
      revisionHistory: [
        { version: newDoc.version, date: new Date().toISOString().split('T')[0], author: 'Yükleyici', note: 'Sisteme yüklenen yeni revizyon' }
      ],
      approvalWorkflow: [
        { step: 'BIM / CBS Uyumluluk', status: 'Pending', approver: 'Zeynep Kaya' },
        { step: 'Yönetici Onayı', status: 'Pending', approver: 'Ahmet Yılmaz' }
      ],
      fileSize: newDoc.fileSize,
      uploadDate: new Date().toISOString().split('T')[0],
      associatedBlockId: newDoc.associatedBlockId
    };
    
    setLocalDocs(prev => [doc, ...prev]);
    if (onAddDocument) onAddDocument(doc);
    setShowDocModal(false);
    setNewDoc({
      name: '',
      version: 'v1.0',
      fileSize: '5.2 MB',
      associatedBlockId: 'block-a'
    });
  };

  const handleSaveEditedDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setLocalDocs(prev => prev.map(d => d.id === editingDoc.id ? editingDoc : d));
    setEditingDoc(null);
  };

  const handleDeleteDoc = (docId: string) => {
    setLocalDocs(prev => prev.filter(d => d.id !== docId));
  };

  return (
    <div className="flex flex-col gap-5 transition-all duration-300">
      {/* View Header Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 flex-wrap gap-2">
        <div>
          <h2 className="window-main-title">Plan Yönetimi (WBS & Kaynak Havuzu)</h2>
          <p className="window-main-subtitle mt-0.5">Mekansal Planlama, Earned Value Analizi ve CDE Doküman Yönetim Merkezi</p>
        </div>
        <div className="flex gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border)] flex-wrap">
          <button 
            onClick={() => setActiveTab('ceo_summary')}
            className={`px-3 py-1.5 rounded-md text-xs font-black transition flex items-center gap-1.5 uppercase tracking-wide border ${activeTab === 'ceo_summary' ? 'bg-[#221711] border-[#e67e22] text-[#e67e22] shadow-[0_0_10px_rgba(230,126,34,0.15)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'}`}
            id="plan-tab-ceo-summary"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#e67e22]" />
            CEO PORTFÖY ÖZETİ
          </button>
          <button 
            onClick={() => setActiveTab('kpi')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'kpi' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="plan-tab-kpi"
          >
            S-Curve & EVM
          </button>
          <button 
            onClick={() => setActiveTab('ekip')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === 'ekip' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="plan-tab-ekip"
          >
            <Users className="w-3.5 h-3.5" />
            Kaynak Havuzu {conflictedEmployees.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('wbs')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'wbs' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="plan-tab-wbs"
          >
            İş Kalemleri (WBS)
          </button>
          <button 
            onClick={() => setActiveTab('dokuman')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${activeTab === 'dokuman' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            id="plan-tab-dokuman"
          >
            <FileText className="w-3.5 h-3.5" />
            CDE Ortak Arşiv
          </button>
        </div>
      </div>

      {/* View Content Panels */}
      {activeTab === 'ceo_summary' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col gap-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <span className="text-[10px] font-black tracking-widest bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase block w-max mb-1">CEO Portföy Özeti</span>
              <h3 className="card-header-title uppercase flex items-center gap-1.5">
                <span>DİNAMİK KAZANILAN DEĞER (EVM) VE FİNANSAL SAPMALAR</span>
                <button 
                  onClick={() => {
                    setEvmForm({
                      plannedSpent: localProject.plannedSpent,
                      spent: localProject.spent,
                      earnedValue: localProject.earnedValue,
                      budget: localProject.budget,
                      overallProgress: localProject.overallProgress
                    });
                    setShowEvmModal(true);
                  }}
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
              <span className="micro-label block mb-0.5">Proje Durumu</span>
              <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase">{localProject.status}</span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="micro-label block mb-0.5">Zaman İndeksi (SPI)</span>
              <span className={`text-xs font-black ${localProject.earnedValue >= localProject.plannedSpent ? 'text-emerald-500' : 'text-red-500'}`}>
                {(localProject.plannedSpent > 0 ? (localProject.earnedValue / localProject.plannedSpent) : 1.00).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="micro-label block mb-0.5">Maliyet İndeksi (CPI)</span>
              <span className={`text-xs font-black ${localProject.earnedValue >= localProject.spent ? 'text-emerald-500' : 'text-red-500'}`}>
                {(localProject.spent > 0 ? (localProject.earnedValue / localProject.spent) : 1.02).toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
              <span className="micro-label block mb-0.5">Kazanılan Değer</span>
              <span className="text-xs font-black text-indigo-500">₺{localProject.earnedValue}M</span>
            </div>
          </div>

          {/* Visual Recharts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Portföy Bütçesi AreaChart */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xs">
              <span className="text-[10px] font-black text-[var(--text-primary)] block mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>TÜM PROJELERİN BÜTÇE ve HAKEDİŞ DAĞILIMI (Milyon ₺)</span>
                <button 
                  onClick={() => {
                    setEvmForm({
                      plannedSpent: localProject.plannedSpent,
                      spent: localProject.spent,
                      earnedValue: localProject.earnedValue,
                      budget: localProject.budget,
                      overallProgress: localProject.overallProgress
                    });
                    setShowEvmModal(true);
                  }}
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
                      <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
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
                    <Area type="monotone" dataKey="budget" name="Toplam Bütçe" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" />
                    <Area type="monotone" dataKey="spent" name="Ödenen Hakediş" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorSpent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* EVM Earned Value Trend AreaChart */}
            <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-xs">
              <span className="text-[10px] font-black text-[var(--text-primary)] block mb-3 uppercase tracking-wider flex items-center justify-between">
                <span>MÜHENDİSLİK EVM PERFORMANS ANALİZİ (Kümülatif % Trendi)</span>
                <button 
                  onClick={() => setShowSCurveModal(true)}
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                  title="S-Curve Trend Verilerini Düzenle"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </span>
              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sCurveData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorPV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#cbd5e1'} opacity={0.3} />
                    <XAxis dataKey="name" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
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
                    <Area type="monotone" dataKey="plan" name="Planlanan Değer (PV) %" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPV)" />
                    <Area type="monotone" dataKey="hakedis" name="Kazanılan Değer (EV) %" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEV)" />
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

      {activeTab === 'kpi' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* EVM Financial Dashboard Card */}
          <div className="lg:col-span-1 bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl flex flex-col justify-between shadow-sm transition-all duration-300 relative group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Earned Value (EVM) Göstergeleri</span>
                  <button 
                    onClick={() => {
                      setEvmForm({
                        plannedSpent: localProject.plannedSpent,
                        spent: localProject.spent,
                        earnedValue: localProject.earnedValue,
                        budget: localProject.budget,
                        overallProgress: localProject.overallProgress
                      });
                      setShowEvmModal(true);
                    }}
                    title="EVM Verilerini Düzenle"
                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="px-2 py-0.5 bg-blue-600/15 text-blue-400 text-[10px] font-bold rounded">Hakediş Modeli</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Planned Value (PV)</span>
                  <span className="text-base font-bold text-[var(--text-primary)]">₺{pv}M</span>
                </div>
                <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Earned Value (EV)</span>
                  <span className="text-base font-bold text-emerald-500">₺{ev}M</span>
                </div>
                <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Actual Cost (AC)</span>
                  <span className="text-base font-bold text-amber-500">₺{ac}M</span>
                </div>
                <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Bütçe (BAC)</span>
                  <span className="text-base font-bold text-[var(--text-primary)]">₺{localProject.budget}M</span>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-[var(--border)] pt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)]">Schedule Variance (SV):</span>
                  <span className={`font-bold ${sv >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {sv >= 0 ? '+' : ''}₺{sv.toFixed(1)}M {sv >= 0 ? '(Plandan Önde)' : '(Geride)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)]">Cost Variance (CV):</span>
                  <span className={`font-bold ${cv >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {cv >= 0 ? '+' : ''}₺{cv.toFixed(1)}M {cv >= 0 ? '(Bütçe Tasarrufu)' : '(Bütçe Aşımı)'}
                  </span>
                </div>

                {/* SPI / CPI Progress indicators with 1.00 Target Threshold & Auto-Coloring */}
                <div className="mt-4 space-y-3.5 pt-2">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-secondary)] font-medium">SPI (Zaman Performans İndeksi)</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          spi >= 1.00 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                        }`}>
                          {spi >= 1.00 ? '✅ Hedefte' : '⚠️ Eşik Altı'}
                        </span>
                      </div>
                      <span className={`font-mono font-black ${spi >= 1.00 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {spi.toFixed(2)}
                      </span>
                    </div>
                    {/* Meter bar with 1.00 dashed threshold mark (scale 0 to 1.25, 1.00 = 80%) */}
                    <div className="relative w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${spi >= 1.00 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.min((spi / 1.25) * 100, 100)}%` }}
                      ></div>
                      {/* 1.00 Target Threshold Dashed Marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 border-r-2 border-dashed border-red-500 z-10" 
                        style={{ left: '80%' }}
                        title="Hedef Eşik: 1.00"
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                      <span>0.00</span>
                      <span className="text-red-400 font-bold">Hedef: 1.00 (Eşik)</span>
                      <span>1.25</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-secondary)] font-medium">CPI (Maliyet Performans İndeksi)</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          cpi >= 1.00 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                        }`}>
                          {cpi >= 1.00 ? '✅ Hedefte' : '⚠️ Eşik Altı'}
                        </span>
                      </div>
                      <span className={`font-mono font-black ${cpi >= 1.00 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {cpi.toFixed(2)}
                      </span>
                    </div>
                    {/* Meter bar with 1.00 dashed threshold mark (scale 0 to 1.25, 1.00 = 80%) */}
                    <div className="relative w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${cpi >= 1.00 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                        style={{ width: `${Math.min((cpi / 1.25) * 100, 100)}%` }}
                      ></div>
                      {/* 1.00 Target Threshold Dashed Marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 border-r-2 border-dashed border-red-500 z-10" 
                        style={{ left: '80%' }}
                        title="Hedef Eşik: 1.00"
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
                      <span>0.00</span>
                      <span className="text-red-400 font-bold">Hedef: 1.00 (Eşik)</span>
                      <span>1.25</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[11px] text-[var(--text-secondary)] flex items-center justify-between mt-4">
              <span>CPI: {cpi.toFixed(2)} | SPI: {spi.toFixed(2)} — Metrikler anlık güncellenir.</span>
              <button 
                onClick={() => {
                  setEvmForm({
                    plannedSpent: localProject.plannedSpent,
                    spent: localProject.spent,
                    earnedValue: localProject.earnedValue,
                    budget: localProject.budget,
                    overallProgress: localProject.overallProgress
                  });
                  setShowEvmModal(true);
                }}
                className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Düzenle
              </button>
            </div>
          </div>

          {/* S-Curve Graph */}
          <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300 relative group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500">S-Curve İlerleme Eğrisi (Planlanan vs. Gerçekleşen)</span>
                <button 
                  onClick={() => setShowSCurveModal(true)}
                  title="S-Curve Verilerini Düzenle"
                  className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <button 
                onClick={() => setShowSCurveModal(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-md"
              >
                <Edit2 className="w-3 h-3" /> Verileri Düzenle
              </button>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] block mb-4">Mevcut çeyreklik kümülatif fiziksel tamamlanma oranı (%) ve bütçe harcaması trendi</span>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sCurveData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} />
                  <XAxis dataKey="name" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                  <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
                      borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="plan" name="Plandaki İlerleme (%)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="hakedis" name="Gerçekleşen Hakediş (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="maliyet" name="Toplam Maliyet Sapması (%)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Active Tab: Ekip & Yetkinlik Havuzu */}
      {activeTab === 'ekip' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* List of Resource Capacity */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Şirket Mühendislik & Taşeron Kaynak Dağılımları</h3>
              </div>
              <button
                onClick={() => {
                  const newEmp: EmployeeAllocation = {
                    id: `emp-${Date.now()}`,
                    name: 'Yeni Personel',
                    role: 'Saha Mühendisi',
                    allocationPercentage: 50,
                    otherProjects: []
                  };
                  const updatedProject = { ...localProject, employees: [...localProject.employees, newEmp] };
                  setLocalProject(updatedProject);
                  if (onUpdateProject) onUpdateProject(updatedProject);
                  setEditingEmployee(newEmp);
                }}
                className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Personel Ekle
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(localProject.employees || []).map((emp) => {
                const otherAlloc = (emp.otherProjects || []).reduce((sum, p) => sum + p.percentage, 0);
                const totalAlloc = emp.allocationPercentage + otherAlloc;
                const isConflicted = totalAlloc > 100;

                return (
                  <div 
                    key={emp.id} 
                    className={`p-4 rounded-xl border transition-all duration-300 bg-[var(--bg-secondary)] relative group ${
                      isConflicted ? 'border-red-500/40 shadow-red-500/5' : 'border-[var(--border)]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-extrabold text-[var(--text-primary)]">{emp.name}</h4>
                          <button 
                            onClick={() => setEditingEmployee(emp)}
                            className="p-1 text-slate-400 hover:text-blue-500 rounded transition"
                            title="Personeli Düzenle"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] block">{emp.role}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isConflicted ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500'
                        }`}>
                          Kapasite: %{totalAlloc}
                        </span>
                        <button
                          onClick={() => {
                            const updatedProject = {
                              ...localProject,
                              employees: localProject.employees.filter(e => e.id !== emp.id)
                            };
                            setLocalProject(updatedProject);
                            if (onUpdateProject) onUpdateProject(updatedProject);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                          title="Sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 mt-3 pt-2.5 border-t border-[var(--border)]">
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                        <span>Bu Projedeki Yükü:</span>
                        <span className="font-bold text-[var(--text-primary)]">%{emp.allocationPercentage}</span>
                      </div>
                      
                      {(emp.otherProjects || []).map((op, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[120px]">{op.projectName}:</span>
                          <span className="font-bold">%{op.percentage}</span>
                        </div>
                      ))}
                    </div>

                    {/* Progress Bar indicating load */}
                    <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden mt-3">
                      <div 
                        className={`h-full rounded-full ${isConflicted ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(totalAlloc, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CEO Warning Card / Dispatch Panel */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-red-500">KAYNAK ÇAKIŞMA PANELİ</h3>
            </div>
            
            {conflictedEmployees.length > 0 ? (
              <div className="space-y-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                  <strong>CEO Uyarısı:</strong> {conflictedEmployees.length} personel %100 kullanım sınırının üzerindedir!
                </div>

                <div className="space-y-3">
                  {conflictedEmployees.map(emp => (
                    <div key={emp.id} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs">
                      <div className="font-bold text-[var(--text-primary)] mb-1">{emp.name}</div>
                      <p className="text-[10px] text-[var(--text-secondary)] mb-3">Toplam yükü %{emp.allocationPercentage + emp.otherProjects.reduce((s, p) => s + p.percentage, 0)} olarak sınırın üzerindedir.</p>
                      
                      {/* Interactive Capacity Balancer Simulation */}
                      <div className="flex gap-2">
                        <button 
                          className="flex-1 bg-red-600 text-white py-1 rounded text-[10px] font-bold hover:bg-red-700 transition"
                          onClick={() => {
                            const updated = localProject.employees.map(e => e.id === emp.id ? { ...e, allocationPercentage: 35 } : e);
                            const updatedProject = { ...localProject, employees: updated };
                            setLocalProject(updatedProject);
                            if (onUpdateProject) onUpdateProject(updatedProject);
                          }}
                        >
                          Dengele (%35'e Çek)
                        </button>
                        <button 
                          className="flex-1 border border-[var(--border)] text-[var(--text-secondary)] py-1 rounded text-[10px] font-bold hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition"
                          onClick={() => setEditingEmployee(emp)}
                        >
                          Düzenle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 text-center py-8">
                Tüm kaynak atamaları stabil durumdadır. Çakışma bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Tab: WBS İş Kalemleri */}
      {activeTab === 'wbs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)]">WBS Durum Filtresi:</span>
              <select 
                value={wbsFilterStatus}
                onChange={(e) => setWbsFilterStatus(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none text-[var(--text-primary)]"
              >
                <option value="all">Tüm Süreçler</option>
                <option value="Talep">Talep Aşaması</option>
                <option value="Onay">Onay Aşaması</option>
                <option value="Devam">Devam Edenler</option>
                <option value="Kontrol">Kontrol Aşaması</option>
                <option value="Kapanış">Kapananlar</option>
              </select>
            </div>
            
            <button 
              onClick={() => setShowTaskModal(true)}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-700 transition"
              id="wbs-btn-addtask"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni İş Kalemi Ekle
            </button>
          </div>

          {/* Tasks Workflow Board */}
          <div className="space-y-3">
            {localTasks
              .filter(t => wbsFilterStatus === 'all' || t.status === wbsFilterStatus)
              .map((task) => {
                const steps: ('Talep' | 'Onay' | 'Devam' | 'Kontrol' | 'Kapanış')[] = ['Talep', 'Onay', 'Devam', 'Kontrol', 'Kapanış'];
                const activeStepIdx = steps.indexOf(task.status as any) >= 0 ? steps.indexOf(task.status as any) : 0;

                return (
                  <div key={task.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl hover:shadow transition-shadow relative group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border)] mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-600/10 text-blue-500 text-[10px] font-extrabold rounded">WBS {task.wbsCode}</span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{task.name}</span>
                          <button 
                            onClick={() => setEditingTask(task)}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition"
                            title="İş Kalemini Düzenle"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] flex-wrap">
                          <span>Yüklenici: <strong className="text-[var(--text-primary)]">{task.contractor}</strong></span>
                          <span>Planlanan Hacim: <strong className="text-[var(--text-primary)]">{task.plannedQuantity} {task.unit}</strong></span>
                          <span>Harcama: <strong className="text-emerald-500">₺{task.cost}M</strong></span>
                          <span>Sorumlu: <strong className="text-[var(--text-primary)]">{task.responsible}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-[var(--text-secondary)] block">İlerleme Oranı</span>
                          <span className="text-xs font-extrabold text-emerald-500">%{task.progress}</span>
                        </div>
                        <div className="w-24 bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${task.progress}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* WBS State Machine workflow steps visualization */}
                    <div className="flex items-center justify-between text-[10px] md:text-xs">
                      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto w-full pr-10 py-1">
                        {steps.map((step, idx) => {
                          const isCompleted = idx < activeStepIdx;
                          const isActive = idx === activeStepIdx;
                          return (
                            <React.Fragment key={step}>
                              <div 
                                onClick={() => {
                                  const updatedTask = { ...task, status: step };
                                  setLocalTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                                  if (onUpdateTask) onUpdateTask(updatedTask);
                                }}
                                className="flex items-center gap-1.5 shrink-0 cursor-pointer"
                                title={`Aşamayı ${step} olarak ayarla`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  isCompleted 
                                    ? 'bg-emerald-500 text-white' 
                                    : isActive 
                                      ? 'bg-blue-600 text-white animate-pulse' 
                                      : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)]'
                                }`}>
                                  {isCompleted ? '✓' : idx + 1}
                                </span>
                                <span className={`font-bold ${isActive ? 'text-blue-500' : isCompleted ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}`}>
                                  {step}
                                </span>
                              </div>
                              {idx < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Control dispatch to advance task status */}
                      <button 
                        onClick={() => {
                          const nextIdx = Math.min(activeStepIdx + 1, steps.length - 1);
                          const nextStatus = steps[nextIdx];
                          const updatedTask = { 
                            ...task, 
                            status: nextStatus,
                            progress: nextStatus === 'Kapanış' ? 100 : Math.min(task.progress + 25, 100)
                          };
                          setLocalTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
                          if (onUpdateTask) onUpdateTask(updatedTask);
                        }}
                        className="bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold transition shrink-0"
                      >
                        İlerlet
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Active Tab: Documents CDE */}
      {activeTab === 'dokuman' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* List of drawings & specs */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Şantiye CDE Ortak Klasörü (Sürüm Kontrolü)</h3>
              <button 
                onClick={() => setShowDocModal(true)}
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition"
                id="doc-btn-upload"
              >
                <Upload className="w-3.5 h-3.5" />
                Dosya Yükle
              </button>
            </div>

            <div className="space-y-3">
              {localDocs.map(doc => (
                <div key={doc.id} className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl flex items-start gap-3 hover:shadow-sm relative group">
                  <div className="p-2.5 bg-blue-600/10 rounded-xl">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-extrabold text-[var(--text-primary)] truncate max-w-[250px] md:max-w-[400px]">{doc.name}</h4>
                        <span className="px-1.5 py-0.5 bg-blue-600/15 text-blue-400 text-[10px] font-bold rounded">{doc.version}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{doc.fileSize}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setEditingDoc(doc)}
                          className="p-1 text-slate-400 hover:text-blue-500 rounded transition"
                          title="Dokümanı Düzenle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                          title="Dokümanı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-[var(--text-secondary)] mb-2">
                      Yükleme: {doc.uploadDate} | Referans Blok ID: <strong className="text-[var(--text-primary)]">{doc.associatedBlockId}</strong>
                    </p>

                    {/* Show Revision History inline */}
                    <div className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text-secondary)] space-y-1.5 mt-1">
                      <span className="font-bold text-[var(--text-primary)] block">Revizyon Geçmişi</span>
                      {doc.revisionHistory.map((rev, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-[var(--border)] last:border-0 pb-1 last:pb-0">
                          <span>{rev.version} - {rev.note}</span>
                          <span className="text-slate-400">{rev.date} ({rev.author})</span>
                        </div>
                      ))}
                    </div>

                    {/* Show approval status inline */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">Onay Akışı:</span>
                      {doc.approvalWorkflow.map((step, idx) => (
                        <span 
                          key={idx} 
                          onClick={() => {
                            const newStatus = step.status === 'Approved' ? 'Pending' : 'Approved';
                            const updatedWorkflow = doc.approvalWorkflow.map((s, i) => i === idx ? { ...s, status: newStatus as any } : s);
                            const updatedDoc = { ...doc, approvalWorkflow: updatedWorkflow };
                            setLocalDocs(prev => prev.map(d => d.id === doc.id ? updatedDoc : d));
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border cursor-pointer ${
                            step.status === 'Approved' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                          title="Onay durumunu değiştirmek için tıklayın"
                        >
                          {step.step}: {step.status === 'Approved' ? 'Onaylandı ✓' : 'Bekliyor ⧗'} ({step.approver})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CDE Upload Dropzone simulation */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-sm transition-all duration-300">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-[var(--text-primary)] mb-3 pb-1 border-b border-[var(--border)]">Hızlı Doküman Yükleme</h3>
            
            <div 
              className="border-2 border-dashed border-[var(--border)] hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors"
              onClick={() => setShowDocModal(true)}
            >
              <Upload className="w-8 h-8 text-[var(--text-secondary)] mx-auto mb-2" />
              <p className="text-xs font-bold text-[var(--text-primary)] mb-1">Dosyayı buraya sürükleyin</p>
              <p className="text-[10px] text-[var(--text-secondary)]">DWG, IFC, PDF veya Excel (Maks. 50MB)</p>
            </div>

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-[var(--text-secondary)] flex gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Yüklenen teknik çizimler, şantiye personeli tarafından sahada tabletlerden anlık olarak offline senkronize edilebilir.</span>
            </div>
          </div>
        </div>
      )}

      {/* EVM & Metrics Edit Modal */}
      <FormDialog
        open={showEvmModal}
        onClose={() => setShowEvmModal(false)}
        title="EVM & Bütçe Verilerini Düzenle"
        icon={<Pencil className="w-4 h-4" />}
        onSubmit={handleSaveEvm}
        submitLabel="Kaydet"
        submitIcon={<Save className="w-3.5 h-3.5" />}
      >
        <FieldRow>
          <FormField type="number" label="Planned Value (PV) [M₺]" value={evmForm.plannedSpent} onChange={(e) => setEvmForm(p => ({ ...p, plannedSpent: Number(e.target.value) }))} required slotProps={{ htmlInput: { step: 0.1 } }} />
          <FormField type="number" label="Earned Value (EV) [M₺]" value={evmForm.earnedValue} onChange={(e) => setEvmForm(p => ({ ...p, earnedValue: Number(e.target.value) }))} required slotProps={{ htmlInput: { step: 0.1 } }} />
          <FormField type="number" label="Actual Cost (AC) [M₺]" value={evmForm.spent} onChange={(e) => setEvmForm(p => ({ ...p, spent: Number(e.target.value) }))} required slotProps={{ htmlInput: { step: 0.1 } }} />
          <FormField type="number" label="Toplam Bütçe (BAC) [M₺]" value={evmForm.budget} onChange={(e) => setEvmForm(p => ({ ...p, budget: Number(e.target.value) }))} required slotProps={{ htmlInput: { step: 0.1 } }} />
        </FieldRow>
        <FormField type="number" label="Genel Tamamlanma Oranı (%)" value={evmForm.overallProgress} onChange={(e) => setEvmForm(p => ({ ...p, overallProgress: Number(e.target.value) }))} required slotProps={{ htmlInput: { min: 0, max: 100 } }} />
      </FormDialog>

      {/* S-Curve Chart Data Modal */}
      <FormDialog
        open={showSCurveModal}
        onClose={() => setShowSCurveModal(false)}
        title="S-Curve Çeyreklik Veri Noktalarını Düzenle"
        icon={<Pencil className="w-4 h-4" />}
        maxWidth="sm"
        onSubmit={handleSaveSCurve}
        cancelLabel="Kapat"
        submitLabel="Grafiğe Uygula"
        submitIcon={<Save className="w-3.5 h-3.5" />}
      >
        {sCurveData.map((pt, idx) => (
          <Box key={idx} sx={{ p: 3, bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <Typography sx={{ mb: 2, fontSize: 12, fontWeight: 700 }}>{pt.name}</Typography>
            <FieldRow cols={3}>
              <FormField
                type="number"
                label="Plan (%)"
                value={pt.plan}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSCurveData(prev => prev.map((item, i) => i === idx ? { ...item, plan: val } : item));
                }}
              />
              <FormField
                type="number"
                label="Gerçekleşen Hakediş (%)"
                placeholder="Hedef/Boş"
                value={pt.hakedis !== null ? pt.hakedis : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setSCurveData(prev => prev.map((item, i) => i === idx ? { ...item, hakedis: val } : item));
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormField
                type="number"
                label="Maliyet (%)"
                placeholder="Hedef/Boş"
                value={pt.maliyet !== null ? pt.maliyet : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setSCurveData(prev => prev.map((item, i) => i === idx ? { ...item, maliyet: val } : item));
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FieldRow>
          </Box>
        ))}
      </FormDialog>

      {/* Employee Edit Modal */}
      <FormDialog
        open={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        title="Personel / Kaynak Bilgisini Düzenle"
        icon={<Pencil className="w-4 h-4" />}
        onSubmit={handleSaveEmployee}
        submitLabel="Kaydet"
        submitIcon={<Save className="w-3.5 h-3.5" />}
      >
        {editingEmployee && (
          <>
            <FormField label="Personel Ad Soyad" value={editingEmployee.name} onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })} required />
            <FormField label="Görevi / Pozisyonu" value={editingEmployee.role} onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })} required />
            <FormField type="number" label="Bu Projedeki Çalışma Payı (%)" value={editingEmployee.allocationPercentage} onChange={(e) => setEditingEmployee({ ...editingEmployee, allocationPercentage: Number(e.target.value) })} required slotProps={{ htmlInput: { min: 0, max: 150 } }} />
          </>
        )}
      </FormDialog>

      {/* Task Creation Modal */}
      <FormDialog
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Yeni WBS İş Kalemi Oluştur"
        onSubmit={handleTaskSubmit}
        cancelLabel="Vazgeç"
        submitLabel="WBS'e Kaydet"
      >
        <FormField label="WBS Kodu (Örn: 21)" value={newTask.wbsCode} onChange={(e) => setNewTask(p => ({ ...p, wbsCode: e.target.value }))} required />
        <FormField label="İş Kalemi Başlığı" value={newTask.name} onChange={(e) => setNewTask(p => ({ ...p, name: e.target.value }))} required />
        <FieldRow>
          <FormField label="Taşeron Firma" value={newTask.contractor} onChange={(e) => setNewTask(p => ({ ...p, contractor: e.target.value }))} />
          <FormField type="number" label="Birim Maliyet (Milyon ₺)" value={newTask.cost} onChange={(e) => setNewTask(p => ({ ...p, cost: Number(e.target.value) }))} />
        </FieldRow>
      </FormDialog>

      {/* Task Edit Modal */}
      <FormDialog
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        title={`İş Kalemini Düzenle (WBS ${editingTask?.wbsCode ?? ''})`}
        icon={<Pencil className="w-4 h-4" />}
        onSubmit={handleSaveEditedTask}
        submitLabel="Değişiklikleri Kaydet"
        submitIcon={<Save className="w-3.5 h-3.5" />}
      >
        {editingTask && (
          <>
            <FieldRow>
              <FormField label="WBS Kodu" value={editingTask.wbsCode} onChange={(e) => setEditingTask({ ...editingTask, wbsCode: e.target.value })} required />
              <FormField select label="Aşama / Durum" value={editingTask.status} onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}>
                {['Talep', 'Onay', 'Devam', 'Kontrol', 'Kapanış'].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </FormField>
            </FieldRow>
            <FormField label="İş Kalemi Adı" value={editingTask.name} onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })} required />
            <FieldRow>
              <FormField label="Yüklenici / Taşeron" value={editingTask.contractor} onChange={(e) => setEditingTask({ ...editingTask, contractor: e.target.value })} />
              <FormField label="Sorumlu" value={editingTask.responsible} onChange={(e) => setEditingTask({ ...editingTask, responsible: e.target.value })} />
            </FieldRow>
            <FieldRow cols={3}>
              <FormField type="number" label="Harcama (M₺)" value={editingTask.cost} onChange={(e) => setEditingTask({ ...editingTask, cost: Number(e.target.value) })} />
              <FormField type="number" label={`Miktar (${editingTask.unit})`} value={editingTask.plannedQuantity} onChange={(e) => setEditingTask({ ...editingTask, plannedQuantity: Number(e.target.value) })} />
              <FormField type="number" label="İlerleme (%)" value={editingTask.progress} onChange={(e) => setEditingTask({ ...editingTask, progress: Number(e.target.value) })} slotProps={{ htmlInput: { min: 0, max: 100 } }} />
            </FieldRow>
          </>
        )}
      </FormDialog>

      {/* Doc Creation Modal */}
      <FormDialog
        open={showDocModal}
        onClose={() => setShowDocModal(false)}
        title="Ortak Veri Ortamına (CDE) Dosya Yükle"
        onSubmit={handleDocSubmit}
        submitLabel="Arşive Ekle"
      >
        <FormField label="Belge / Dosya Adı" value={newDoc.name} onChange={(e) => setNewDoc(p => ({ ...p, name: e.target.value }))} required placeholder="Mimari_Plan_AsBuilt_signed.pdf" slotProps={{ inputLabel: { shrink: true } }} />
        <FieldRow>
          <FormField select label="Referans Yapı / Blok" value={newDoc.associatedBlockId} onChange={(e) => setNewDoc(p => ({ ...p, associatedBlockId: e.target.value }))}>
            {(localProject.blocks || []).map(b => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </FormField>
          <FormField label="Sürüm No" value={newDoc.version} onChange={(e) => setNewDoc(p => ({ ...p, version: e.target.value }))} />
        </FieldRow>
      </FormDialog>

      {/* Doc Edit Modal */}
      <FormDialog
        open={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        title="CDE Dokümanını Düzenle"
        icon={<Pencil className="w-4 h-4" />}
        onSubmit={handleSaveEditedDoc}
        submitLabel="Kaydet"
        submitIcon={<Save className="w-3.5 h-3.5" />}
      >
        {editingDoc && (
          <>
            <FormField label="Belge / Dosya Adı" value={editingDoc.name} onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })} required />
            <FieldRow>
              <FormField label="Sürüm (Versiyon)" value={editingDoc.version} onChange={(e) => setEditingDoc({ ...editingDoc, version: e.target.value })} />
              <FormField label="Dosya Boyutu" value={editingDoc.fileSize} onChange={(e) => setEditingDoc({ ...editingDoc, fileSize: e.target.value })} />
            </FieldRow>
            <FormField label="Referans Blok ID" value={editingDoc.associatedBlockId} onChange={(e) => setEditingDoc({ ...editingDoc, associatedBlockId: e.target.value })} />
          </>
        )}
      </FormDialog>
    </div>
  );
}

