import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit, Calendar, CheckCircle, Clock, 
  User, ShieldAlert, Sliders, ChevronRight, ChevronLeft, Activity, 
  Clock3, FileCheck2, Cpu, Wrench, AlertTriangle, Printer,
  Check, X
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, Area 
} from 'recharts';
import { WBSTask } from '../types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FormField } from './chrome/FormDialog';

interface GanttViewProps {
  project: {
    id: string;
    name: string;
  };
  tasks: WBSTask[];
  onUpdateTasks: (updatedTasks: WBSTask[]) => void;
  theme: 'light' | 'dark';
  onClose?: () => void;
}

export interface GanttTask {
  id: string;
  name: string;
  phase: 'planlama' | 'insaat' | 'isletme';
  startDate: string;
  endDate: string;
  progress: number;
  responsible: string;
  contractor: string;
  cost: number;
  dependencies: string; // ID of dependent task or comma-separated
  status: 'Talep' | 'Onay' | 'Devam' | 'Kontrol' | 'Kapanış';
}

export default function GanttView({ project, tasks, onUpdateTasks, theme, onClose }: GanttViewProps) {
  // We can enrich initial state with phase-specific tasks mapped from WbsTasks or generated specifically for high-fidelity Gantt usage
  const [activePhase, setActivePhase] = useState<'all' | 'planlama' | 'insaat' | 'isletme'>('all');
  const [isSuperuser, setIsSuperuser] = useState<boolean>(true); // Superuser active by default for editing
  
  // Custom Gantt tasks state (using in-memory persistence in state, but synced if necessary)
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([
    // Planlama Phase Tasks
    {
      id: 'g-plan-1',
      name: 'Konsept Tasarım ve Çevresel Etki Değerlendirme (ÇED)',
      phase: 'planlama',
      startDate: '2026-07-01',
      endDate: '2026-08-15',
      progress: 100,
      responsible: 'Urb. Plan Deniz A.',
      contractor: 'İGA Planlama & Proje Grubu',
      cost: 4.5,
      dependencies: '',
      status: 'Kapanış'
    },
    {
      id: 'g-plan-2',
      name: 'Zemin Etütleri, Jeoteknik Raporlama ve Statik Hesaplama',
      phase: 'planlama',
      startDate: '2026-08-01',
      endDate: '2026-08-25',
      progress: 95,
      responsible: 'Jeo. Müh. Hakan Y.',
      contractor: 'Fugro Jeoteknik A.Ş.',
      cost: 3.2,
      dependencies: 'g-plan-1',
      status: 'Kontrol'
    },
    {
      id: 'g-plan-3',
      name: 'Mimari Ruhsat ve 1/1000 İmar Planı Belediye Onay Süreci',
      phase: 'planlama',
      startDate: '2026-08-10',
      endDate: '2026-09-10',
      progress: 75,
      responsible: 'Mimar Melis S.',
      contractor: 'Arnavutköy Bld. / İBB İmar Müd.',
      cost: 1.8,
      dependencies: 'g-plan-2',
      status: 'Devam'
    },
    // İnşaat Phase Tasks
    {
      id: 'g-ins-1',
      name: 'Sky Tower [K-1] Temel Kazısı ve Radye Temel Demir Bağlanması',
      phase: 'insaat',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      progress: 82,
      responsible: 'İnş. Müh. Murat E.',
      contractor: 'Limak-Kalyon Konsorsiyumu',
      cost: 28.5,
      dependencies: 'g-plan-3',
      status: 'Devam'
    },
    {
      id: 'g-ins-2',
      name: 'Airport Plaza [K-2] Çelik Kolon ve Kompozit Döşeme Beton İşleri',
      phase: 'insaat',
      startDate: '2026-08-05',
      endDate: '2026-10-15',
      progress: 60,
      responsible: 'Saha Şefi Caner T.',
      contractor: 'Schüco & Cetaş Yapı',
      cost: 14.2,
      dependencies: 'g-plan-3',
      status: 'Devam'
    },
    {
      id: 'g-ins-3',
      name: 'Duty Free Mall Cephe Kaplama ve Isı Yalıtım Mantolama',
      phase: 'insaat',
      startDate: '2026-08-15',
      endDate: '2026-09-20',
      progress: 40,
      responsible: 'Mimar Sinan O.',
      contractor: 'Yenigün İnşaat A.Ş.',
      cost: 9.8,
      dependencies: 'g-ins-1',
      status: 'Devam'
    },
    // İşletme Phase Tasks
    {
      id: 'g-isl-1',
      name: 'Mekanik Havalandırma ve Chiller Grubu Soğutma Devreye Alma',
      phase: 'isletme',
      startDate: '2026-08-18',
      endDate: '2026-09-05',
      progress: 30,
      responsible: 'Mak. Müh. Selim K.',
      contractor: 'Alarko Carrier Sanayi',
      cost: 12.5,
      dependencies: 'g-ins-2',
      status: 'Devam'
    },
    {
      id: 'g-isl-2',
      name: 'Akıllı Bina Otomasyon (BMS) SCADA Sistem Entegrasyonu',
      phase: 'isletme',
      startDate: '2026-08-22',
      endDate: '2026-09-15',
      progress: 15,
      responsible: 'Elek. Müh. Burak F.',
      contractor: 'Honeywell Türkiye',
      cost: 8.6,
      dependencies: 'g-isl-1',
      status: 'Onay'
    },
    {
      id: 'g-isl-3',
      name: 'Enerji Altyapısı Trafo Odaları Kabul ve TEDAŞ Enerjilendirme',
      phase: 'isletme',
      startDate: '2026-08-25',
      endDate: '2026-08-30',
      progress: 90,
      responsible: 'Saha Müd. Faruk Ç.',
      contractor: 'BEDAŞ Entegrasyon',
      cost: 5.4,
      dependencies: '',
      status: 'Kontrol'
    }
  ]);

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<GanttTask>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  // Quick Edit popup states
  const [quickEditTaskId, setQuickEditTaskId] = useState<string | null>(null);
  const [quickEditName, setQuickEditName] = useState<string>('');
  const [quickEditProgress, setQuickEditProgress] = useState<number>(0);

  const handleQuickSave = () => {
    if (!quickEditTaskId) return;
    const updated = ganttTasks.map(t => 
      t.id === quickEditTaskId 
        ? { ...t, name: quickEditName, progress: quickEditProgress } 
        : t
    );
    setGanttTasks(updated);
    setQuickEditTaskId(null);

    // Propagate changes to parent project's WBS tasks
    const matchedTask = updated.find(t => t.id === quickEditTaskId);
    if (matchedTask) {
      const matchedParentTask = tasks.find(pt => pt.name === matchedTask.name || pt.id === matchedTask.id);
      if (matchedParentTask && onUpdateTasks) {
        const parentUpdated = tasks.map(pt => {
          if (pt.id === matchedParentTask.id) {
            return {
              ...pt,
              progress: quickEditProgress
            };
          }
          return pt;
        });
        onUpdateTasks(parentUpdated);
      }
    }
  };

  // HTML5 Drag & Drop states for interactive schedule updates
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<{ taskId: string; day: number } | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(25); // default 25%, resizable up to 35%
  
  // Recharts interactive analytics states
  const [selectedChartTaskId, setSelectedChartTaskId] = useState<string>('g-plan-1');
  const [analyticsTab, setAnalyticsTab] = useState<'tasks' | 'phases'>('tasks');

  // Interactive Gantt Bar drag date shifter
  const handleTaskDateShift = (taskId: string, targetDay: number) => {
    const task = ganttTasks.find(t => t.id === taskId);
    if (!task) return;

    // Parse current start date
    const currentStart = new Date(task.startDate);
    const currentEnd = new Date(task.endDate);

    // Target Year & Month
    const targetYear = 2026;
    const targetMonth = 8; // August

    // Create a robust Date for August {targetDay}, 2026
    const newStart = new Date(targetYear, targetMonth - 1, targetDay);

    // Calculate duration in days
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Format to YYYY-MM-DD
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const newStartStr = formatYMD(newStart);
    const newEndStr = formatYMD(newEnd);

    const updated = ganttTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          startDate: newStartStr,
          endDate: newEndStr
        };
      }
      return t;
    });

    setGanttTasks(updated);

    // Propagate changes to the parent project's WbsTasks
    const matchedParentTask = tasks.find(pt => pt.name === task.name);
    if (matchedParentTask && onUpdateTasks) {
      const parentUpdated = tasks.map(pt => {
        if (pt.id === matchedParentTask.id) {
          return {
            ...pt,
            startDate: newStartStr,
            endDate: newEndStr
          };
        }
        return pt;
      });
      onUpdateTasks(parentUpdated);
    }
  };

  // New task form state
  const [newForm, setNewForm] = useState<Omit<GanttTask, 'id'>>({
    name: '',
    phase: 'planlama',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    progress: 0,
    responsible: '',
    contractor: '',
    cost: 1.0,
    dependencies: '',
    status: 'Talep'
  });

  const filteredTasks = activePhase === 'all' 
    ? ganttTasks 
    : ganttTasks.filter(t => t.phase === activePhase);

  // Form handlers
  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    const taskWithId: GanttTask = {
      ...newForm,
      id: `g-task-${Date.now()}`
    };
    setGanttTasks([...ganttTasks, taskWithId]);
    setShowAddForm(false);
    // Reset form
    setNewForm({
      name: '',
      phase: activePhase !== 'all' ? activePhase : 'planlama',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      progress: 0,
      responsible: '',
      contractor: '',
      cost: 1.0,
      dependencies: '',
      status: 'Talep'
    });
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Bu görev zaman çizelgesinden kalıcı olarak silinecektir. Emin misiniz?')) {
      setGanttTasks(ganttTasks.filter(t => t.id !== id));
    }
  };

  const startEdit = (task: GanttTask) => {
    setEditingTaskId(task.id);
    setEditFormData({ ...task });
  };

  const saveEdit = (id: string) => {
    setGanttTasks(ganttTasks.map(t => t.id === id ? { ...t, ...editFormData } as GanttTask : t));
    setEditingTaskId(null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
  };

  // Timeline representation helper (assuming August 2026 timeline)
  const getTimelineDays = () => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i);
    }
    return days;
  };

  const daysInAugust = getTimelineDays();

  // Helper to map date to percent of the width in August 2026
  const getTaskLeftAndWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Timeline boundary: August 1, 2026 to August 31, 2026
    const minDate = new Date('2026-08-01');
    const maxDate = new Date('2026-08-31');
    
    let startDiff = (start.getTime() - minDate.getTime()) / (1000 * 3600 * 24);
    let duration = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);

    if (startDiff < 0) {
      duration += startDiff;
      startDiff = 0;
    }
    if (startDiff > 31) {
      return { left: 0, width: 0, invisible: true };
    }
    if (startDiff + duration > 31) {
      duration = 31 - startDiff;
    }

    const leftPercent = (startDiff / 31) * 100;
    const widthPercent = (duration / 31) * 100;

    return { 
      left: Math.max(0, leftPercent), 
      width: Math.max(2, widthPercent),
      invisible: false 
    };
  };

  return (
    <div className="space-y-5 animate-fade-in text-content-main">
      
      {/* Upper Command Header */}
      <div className="flex items-center justify-between border-b border-border-ui pb-3 flex-wrap gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className="text-sm font-black tracking-wider text-content-main">
              İŞ-ZAMAN ÇİZELGESİ
            </h3>
          </div>
          <p className="text-[10px] text-content-muted font-bold font-mono">
            Proje: {project.name.toUpperCase()} / Ağustos 2026 Canlı Planlama
          </p>
        </div>

        {/* Superuser & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Phase Filter Toggle */}
          <div className="flex rounded-none border border-border-ui p-0.5 bg-surface-subtle text-[10px] font-bold">
            <button
              onClick={() => setActivePhase('all')}
              className={`px-2.5 py-1 rounded-none transition-colors cursor-pointer ${activePhase === 'all' ? 'bg-indigo-600 text-white' : 'text-content-muted hover:text-content-main'}`}
            >
              TÜM SÜREÇLER
            </button>
            <button
              onClick={() => setActivePhase('planlama')}
              className={`px-2.5 py-1 rounded-none transition-colors cursor-pointer flex items-center gap-1 ${activePhase === 'planlama' ? 'bg-blue-600 text-white font-black' : 'text-content-muted hover:text-content-main'}`}
            >
              <FileCheck2 className="w-2.5 h-2.5" /> PLANLAMA
            </button>
            <button
              onClick={() => setActivePhase('insaat')}
              className={`px-2.5 py-1 rounded-none transition-colors cursor-pointer flex items-center gap-1 ${activePhase === 'insaat' ? 'bg-amber-600 text-white font-black' : 'text-content-muted hover:text-content-main'}`}
            >
              <Cpu className="w-2.5 h-2.5" /> İNŞAAT
            </button>
            <button
              onClick={() => setActivePhase('isletme')}
              className={`px-2.5 py-1 rounded-none transition-colors cursor-pointer flex items-center gap-1 ${activePhase === 'isletme' ? 'bg-emerald-600 text-white font-black' : 'text-content-muted hover:text-content-main'}`}
            >
              <Wrench className="w-2.5 h-2.5" /> İŞLETME
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(p => !p)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-lg hover:shadow-blue-500/15"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>YENİ GÖREV EKLE</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-lg hover:shadow-indigo-500/15"
            title="Mevcut zaman çizelgesini resmi A4 Landscape formatında PDF olarak kaydet veya yazdır"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-red-600/15 hover:bg-red-600/25 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-lg hover:shadow-red-500/15"
              title="Kapat ve Haritaya Dön"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          )}


        </div>
      </div>

      {/* Conditional Add Form Box */}
      {showAddForm && (
        <Box
          component="form"
          onSubmit={handleAddNewTask}
          className="animate-fade-in"
          sx={{ p: 4, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'warning.main' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Yeni Görev Planlama Kartı oluşturuluyor</span>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            <FormField label="Görev Adı" required placeholder="Örn: Sky Tower Çatı Çelik Karkas Montajı" value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <FormField select label="Süreç Kategorisi" value={newForm.phase} onChange={e => setNewForm({ ...newForm, phase: e.target.value as any })}>
              <MenuItem value="planlama">📐 Planlama Süreçleri</MenuItem>
              <MenuItem value="insaat">🏗️ İnşaat Süreçleri</MenuItem>
              <MenuItem value="isletme">⚙️ İşletme Süreçleri</MenuItem>
            </FormField>
            <FormField label="Sorumlu Mühendis / Mimar" required placeholder="Örn: Saha Müd. Serdar B." value={newForm.responsible} onChange={e => setNewForm({ ...newForm, responsible: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <FormField label="Yüklenici / Taşeron Firma" placeholder="Örn: Kalyon Yapı A.Ş." value={newForm.contractor} onChange={e => setNewForm({ ...newForm, contractor: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <FormField type="date" label="Başlangıç Tarihi (Ağustos 2026)" value={newForm.startDate} onChange={e => setNewForm({ ...newForm, startDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <FormField type="date" label="Bitiş Tarihi (Ağustos 2026)" value={newForm.endDate} onChange={e => setNewForm({ ...newForm, endDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <FormField type="number" label="Maliyet Etkisi (Milyon TL)" value={newForm.cost} onChange={e => setNewForm({ ...newForm, cost: parseFloat(e.target.value) || 0 })} slotProps={{ htmlInput: { step: 0.1 } }} />
            <FormField select label="Öncelikli Görev Bağlantısı" value={newForm.dependencies} onChange={e => setNewForm({ ...newForm, dependencies: e.target.value })}>
              <MenuItem value="">Bağlantı Yok</MenuItem>
              {ganttTasks.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </FormField>
            <FormField select label="Sistem Statüsü" value={newForm.status} onChange={e => setNewForm({ ...newForm, status: e.target.value as any })}>
              <MenuItem value="Talep">Talep Edildi</MenuItem>
              <MenuItem value="Onay">Onay Bekliyor</MenuItem>
              <MenuItem value="Devam">Devam Ediyor</MenuItem>
              <MenuItem value="Kontrol">Kontrol Aşamasında</MenuItem>
              <MenuItem value="Kapanış">Tamamlandı</MenuItem>
            </FormField>
          </Box>

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Button type="button" variant="outlined" color="inherit" onClick={() => setShowAddForm(false)} sx={{ borderColor: 'divider', color: 'text.secondary' }}>
              İptal Et
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Zaman Çizelgesine Kaydet
            </Button>
          </Stack>
        </Box>
      )}

      {/* Main Gantt Split View */}
      <div id="gantt-main-container" className="flex flex-col xl:flex-row gap-4 relative w-full items-start" style={{ '--left-panel-w': isLeftPanelOpen ? `${leftPanelWidth}%` : '0%' } as React.CSSProperties}>
        
        {/* 1. Left Grid Side: Detailed Task Information & Live Inputs */}
        {isLeftPanelOpen && (
          <div className="w-full xl:w-[var(--left-panel-w)] xl:shrink-0 space-y-3 animate-fade-in">
            <div className="flex justify-between items-center mb-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                GÖREV YÖNETİM MATRİSİ
                <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20">
                  {Math.round(leftPanelWidth)}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsLeftPanelOpen(false)}
                className="w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500/25 border border-red-500/25 text-red-400 hover:text-red-300 flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
                title="Sol Matris Paneli Gizle"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {filteredTasks.length === 0 ? (
              <div className="p-8 border border-[var(--border)] rounded-xl text-center text-slate-500 italic text-xs card">
                Seçili kategoride planlanmış görev bulunamadı.
              </div>
            ) : (
              filteredTasks.map(task => {
                const isEditing = editingTaskId === task.id;
                
                return (
                  <div 
                    key={task.id} 
                    className={`card p-3 rounded-xl border ${
                      task.phase === 'planlama' 
                        ? 'border-l-4 border-l-blue-500' 
                        : task.phase === 'insaat' 
                          ? 'border-l-4 border-l-amber-500' 
                          : 'border-l-4 border-l-emerald-500'
                    } relative group transition-all duration-300 ${
                      dragOverDay?.taskId === task.id
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.18)] scale-[1.015]'
                        : draggedTaskId === task.id
                          ? 'opacity-40 border-dashed'
                          : ''
                    }`}
                  >
                    {isEditing ? (
                      <Stack spacing={2.5}>
                        <FormField size="small" value={editFormData.name || ''} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} slotProps={{ htmlInput: { 'aria-label': 'Görev adı' } }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <FormField size="small" label="Yüklenici" value={editFormData.contractor || ''} onChange={e => setEditFormData({ ...editFormData, contractor: e.target.value })} />
                          <FormField size="small" label="Sorumlu" value={editFormData.responsible || ''} onChange={e => setEditFormData({ ...editFormData, responsible: e.target.value })} />
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <FormField size="small" type="number" label="Bütçe (mTL)" value={editFormData.cost || 0} onChange={e => setEditFormData({ ...editFormData, cost: parseFloat(e.target.value) || 0 })} slotProps={{ htmlInput: { step: 0.1 } }} />
                          <FormField size="small" select label="Durum" value={editFormData.status} onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}>
                            {['Talep', 'Onay', 'Devam', 'Kontrol', 'Kapanış'].map((s) => (
                              <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                          </FormField>
                        </Box>

                        {/* Drag and slide progress state */}
                        <Box>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>İlerleme Oranı</Typography>
                            <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: 'warning.main' }}>{editFormData.progress}%</Typography>
                          </Stack>
                          <Slider size="small" color="warning" min={0} max={100} value={editFormData.progress || 0} onChange={(_, v) => setEditFormData({ ...editFormData, progress: v as number })} aria-label="İlerleme oranı" />
                        </Box>

                        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                          <Button type="button" size="small" variant="outlined" color="inherit" onClick={cancelEdit} sx={{ borderColor: 'divider', color: 'text.secondary' }}>İptal</Button>
                          <Button type="button" size="small" variant="contained" color="primary" onClick={() => saveEdit(task.id)}>Kaydet</Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                            task.phase === 'planlama' 
                              ? 'bg-blue-600/15 text-blue-400' 
                              : task.phase === 'insaat' 
                                ? 'bg-amber-600/15 text-amber-400' 
                                : 'bg-emerald-600/15 text-emerald-400'
                          }`}>
                            {task.phase}
                          </span>
                          
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
                            <button
                              onClick={() => startEdit(task)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                              title="Görevi Düzenle"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-500 transition"
                              title="Görevi Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">
                          {task.name}
                        </h4>

                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] font-mono font-bold text-slate-400">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[120px]">{task.responsible}</span>
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{task.startDate} / {task.endDate.split('-')[2]}</span>
                          </div>
                          <div className="col-span-2 text-[10px] truncate">
                            Taşeron: <span className="text-slate-300 font-sans">{task.contractor}</span>
                          </div>
                        </div>

                        {/* Interactive Direct Slider */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                task.phase === 'planlama' 
                                  ? 'bg-blue-500' 
                                  : task.phase === 'insaat' 
                                    ? 'bg-amber-500' 
                                    : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${task.progress}%` }} 
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-300 w-7 text-right">
                            {task.progress}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}

        {/* Drag Resizer Handle - supports dragging between 25% and 35% */}
        {isLeftPanelOpen && (
          <div 
            className="hidden xl:flex flex-col items-center justify-center cursor-col-resize select-none w-1.5 hover:w-2.5 bg-slate-800/20 hover:bg-indigo-500/30 transition-all duration-150 active:bg-indigo-500 self-stretch rounded-full z-30 relative mx-0.5"
            title="Sürükleyerek Genişliği Ayarla (%25 - %35)"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = leftPanelWidth;
              
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const container = document.getElementById('gantt-main-container');
                if (container) {
                  const containerWidth = container.getBoundingClientRect().width;
                  const percentageDelta = (deltaX / containerWidth) * 100;
                  let newWidth = startWidth + percentageDelta;
                  if (newWidth < 25) newWidth = 25;
                  if (newWidth > 35) newWidth = 35;
                  setLeftPanelWidth(newWidth);
                }
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            {/* Visual separator dots inside the divider */}
            <div className="w-[2px] h-10 bg-slate-700/60 rounded" />
          </div>
        )}

        {/* 2. Right Grid Side: Visual Gantt Diagram Canvas */}
        <div className="w-full xl:flex-1 flex flex-col h-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow-panel)] relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {!isLeftPanelOpen && (
                <button
                  type="button"
                  onClick={() => setIsLeftPanelOpen(true)}
                  className="px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/20 transition cursor-pointer flex items-center gap-1 shrink-0"
                  title="Sol Matris Paneli Göster"
                >
                  <ChevronRight className="w-3 h-3" />
                  <span>Matrisi Göster</span>
                </button>
              )}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                AĞUSTOS 2026 GANTT ZAMAN ÇİZELGESİ DIZILIMI
              </span>
            </div>
            <span className="text-[10px] font-bold text-blue-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              Güncel Tarih: 28 Ağustos 2026
            </span>
          </div>

          <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
            <div className="min-w-[550px] space-y-2 h-full">
              
              {/* Timeline Days Header */}
              <div className="grid grid-cols-31 border-b border-[var(--border)] pb-2 text-[10px] font-black text-slate-500 font-mono text-center">
                {daysInAugust.map(day => {
                  const isHoveredDay = dragOverDay?.day === day;
                  return (
                    <div 
                      key={day} 
                      className={`p-0.5 border-r border-slate-800/40 relative transition-all duration-300 ${
                        day === 28 ? 'bg-blue-600/10 text-blue-400 border-x border-blue-500/30' : ''
                      } ${
                        isHoveredDay
                          ? 'bg-indigo-600/20 text-indigo-400 font-extrabold scale-110 shadow-[0_0_12px_rgba(99,102,241,0.25)] border-x border-indigo-500/40 rounded-sm z-10'
                          : ''
                      }`}
                    >
                      {day}
                      {day === 28 && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tasks Horizontal Gantt Bars */}
              <div className="space-y-3 pt-2 relative max-h-[420px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                
                {/* 28 August current timeline vertical overlay stripe */}
                <div 
                  className="absolute top-0 bottom-0 z-10 w-[2px] bg-blue-500/40 border-l border-dashed border-blue-500 pointer-events-none" 
                  style={{ left: `${(27/31)*100}%` }} 
                />

                {filteredTasks.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-slate-600 text-xs italic">
                    Görüntülenecek çubuk bulunamadı.
                  </div>
                ) : (
                  filteredTasks.map((task, idx) => {
                    const { left, width, invisible } = getTaskLeftAndWidth(task.startDate, task.endDate);
                    if (invisible) return null;

                    const isLowerHalf = idx > filteredTasks.length / 2;

                    return (
                      <div 
                        key={task.id} 
                        className={`relative h-10 group/bar flex items-center rounded-xl transition-all duration-300 ${
                          dragOverDay?.taskId === task.id
                            ? 'bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-indigo-500/30 ring-1 ring-indigo-500/20 scale-[1.01] z-20' 
                            : draggedTaskId === task.id
                              ? 'opacity-30'
                              : 'hover:bg-slate-800/10'
                        }`}
                      >
                        {/* 31 drop zones for the daily columns track */}
                        <div className={`absolute inset-0 grid grid-cols-31 h-full w-full rounded transition-all duration-300 ${draggedTaskId ? 'pointer-events-auto z-40' : 'pointer-events-none z-10'}`}>
                          {daysInAugust.map((day) => {
                            const isHovered = dragOverDay?.taskId === task.id && dragOverDay?.day === day;
                            return (
                              <div
                                key={day}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (draggedTaskId) {
                                    setDragOverDay({ taskId: task.id, day });
                                  }
                                }}
                                onDragLeave={() => {
                                  if (dragOverDay?.taskId === task.id && dragOverDay?.day === day) {
                                    setDragOverDay(null);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedTaskId) {
                                    handleTaskDateShift(draggedTaskId, day);
                                  }
                                  setDraggedTaskId(null);
                                  setDragOverDay(null);
                                }}
                                className={`h-full border-r border-slate-800/10 transition-all duration-300 ${
                                  isHovered 
                                    ? 'bg-indigo-500/30 border-x border-indigo-400/50 shadow-[inset_0_0_12px_rgba(99,102,241,0.4)] z-20 scale-y-105' 
                                    : dragOverDay?.day === day && dragOverDay?.taskId === task.id
                                      ? 'bg-indigo-500/15 border-r border-indigo-500/20'
                                      : 'hover:bg-slate-800/5'
                                }`}
                                title={`${day} Ağustos 2026`}
                              />
                            );
                          })}
                        </div>

                        {/* Gantt Colored Bar */}
                        {(() => {
                          const plannedProgress = (() => {
                            const start = new Date(task.startDate).getTime();
                            const end = new Date(task.endDate).getTime();
                            const current = new Date('2026-08-28').getTime();

                            if (current <= start) return 0;
                            if (current >= end) return 100;
                            
                            const totalDuration = end - start;
                            if (totalDuration <= 0) return 100;
                            
                            const elapsedDuration = current - start;
                            return Math.round((elapsedDuration / totalDuration) * 100);
                          })();

                          const isDelayed = task.progress < plannedProgress;

                          return (
                            <div
                              key={task.id}
                              draggable={isSuperuser}
                              onDragStart={(e) => {
                                setDraggedTaskId(task.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => {
                                setDraggedTaskId(null);
                                setDragOverDay(null);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickEditTaskId(task.id);
                                setQuickEditName(task.name);
                                setQuickEditProgress(task.progress);
                              }}
                              className={`absolute h-[26px] rounded-lg shadow-md transition-all duration-300 flex flex-col justify-center px-2 cursor-grab active:cursor-grabbing border select-none z-30 hover:scale-[1.01] ${
                                isDelayed 
                                  ? 'border-red-500/40 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.4)] hover:shadow-[0_0_16px_rgba(239,68,68,0.65)] animate-[pulse_2.5s_infinite]' 
                                  : 'border-white/5 bg-slate-950/40 hover:shadow-indigo-500/20 hover:border-indigo-500/40'
                              } ${draggedTaskId === task.id ? 'opacity-40 scale-95 shadow-none' : ''}`}
                              style={{ 
                                left: `${left}%`, 
                                width: `${width}%`,
                                pointerEvents: 'auto'
                              }}
                              title={`${task.name}: Planlanan %${plannedProgress}, Gerçekleşen %${task.progress} ${isDelayed ? '(GECİKMELİ)' : ''} (Düzenlemek için TIKLAYIN)`}
                            >
                              {/* Track 1: Planned Progress (Top Layer, Sky/Cyan) */}
                              <div 
                                className="absolute left-1 top-1 h-[3px] bg-sky-400/40 border-b border-sky-400/10 transition-all duration-300 pointer-events-none rounded-full"
                                style={{ width: `calc(${plannedProgress}% - 8px)` }}
                              />

                              {/* Track 2: Actual/Realized Progress (Bottom Layer, Red if delayed, else phase-color) */}
                              <div 
                                className={`absolute left-1 bottom-1 h-[4px] transition-all duration-300 pointer-events-none rounded-full ${
                                  isDelayed
                                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                                    : task.phase === 'planlama' 
                                      ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' 
                                      : task.phase === 'insaat' 
                                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                                        : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                }`}
                                style={{ width: `calc(${task.progress}% - 8px)` }}
                              />

                              {/* Combined Text Labels */}
                              <div className="relative z-10 text-[10px] font-black text-white truncate max-w-full drop-shadow-sm flex items-center justify-between w-full gap-1.5 pointer-events-none">
                                <span className="flex items-center gap-1 shrink-0">
                                  {isDelayed && (
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                    </span>
                                  )}
                                  <span className={isDelayed ? "text-red-400 font-extrabold" : "text-emerald-400"}>
                                    G: %{task.progress}
                                  </span>
                                  <span className="text-sky-300/80 font-bold">
                                    (P: %{plannedProgress})
                                  </span>
                                </span>
                                <span className="opacity-95 font-medium truncate">| {task.name}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Drag-and-drop live preview ghost bar */}
                        {draggedTaskId === task.id && dragOverDay && (
                          <div 
                            className="absolute h-[26px] rounded-lg border-2 border-dashed border-indigo-500/60 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.35)] z-30 pointer-events-none flex items-center justify-between px-2.5 text-[10px] font-black text-indigo-300 font-sans tracking-wide"
                            style={{
                              left: `${((dragOverDay.day - 1) / 31) * 100}%`,
                              width: `${width}%`
                            }}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                              YENİ BAŞLANGIÇ: {dragOverDay.day} AĞUSTOS
                            </span>
                            <span className="opacity-70 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded border border-slate-700">
                              BIRAKIN
                            </span>
                          </div>
                        )}

                        {/* Quick Edit Popup Form Overlay */}
                        {quickEditTaskId === task.id && (
                          <div 
                            className="absolute z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-3 shadow-2xl flex flex-col gap-2.5 w-64 text-xs select-none animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]"
                            style={{
                              left: `calc(${left}% + (${width}% / 2))`,
                              transform: 'translateX(-50%)',
                              ...(isLowerHalf 
                                ? { bottom: '2.5rem' } 
                                : { top: '2.5rem' }
                              )
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Little Arrow */}
                            <div className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[var(--bg-secondary)] border-[var(--border)] rotate-45 ${
                              isLowerHalf 
                                ? '-bottom-1.5 border-b border-r' 
                                : '-top-1.5 border-t border-l'
                            }`} />

                            <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                              <span className="font-extrabold text-[10px] text-blue-400 tracking-wider uppercase">HIZLI DÜZENLEME</span>
                              <button 
                                onClick={() => setQuickEditTaskId(null)}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer p-0.5 rounded-md hover:bg-[var(--bg-primary)]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <FormField size="small" label="Görev Adı" value={quickEditName} onChange={(e) => setQuickEditName(e.target.value)} placeholder="Görev adı..." slotProps={{ inputLabel: { shrink: true } }} />

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">İlerleme</label>
                                <span className="text-[10px] font-mono font-black text-blue-400">{quickEditProgress}%</span>
                              </div>
                              <Slider size="small" min={0} max={100} step={5} value={quickEditProgress} onChange={(_, v) => setQuickEditProgress(v as number)} aria-label="İlerleme" />
                              
                              {/* Quick % Pills */}
                              <div className="flex justify-between gap-1 mt-1">
                                {[0, 25, 50, 75, 100].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setQuickEditProgress(val)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black transition-all cursor-pointer ${
                                      quickEditProgress === val 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)]'
                                    }`}
                                  >
                                    {val}%
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-[var(--border)]">
                              <button
                                onClick={() => setQuickEditTaskId(null)}
                                className="px-2.5 py-1 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-[10px] font-bold rounded transition cursor-pointer"
                              >
                                İptal
                              </button>
                              <button
                                onClick={handleQuickSave}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded transition flex items-center gap-1 cursor-pointer shadow-md"
                              >
                                <Check className="w-3 h-3" />
                                Kaydet
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
          {/* Gantt Footer Legend */}
          <div className="mt-auto border-t border-[var(--border)] pt-3 flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-600/30 border border-blue-500" /> Planlama
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500" /> İnşaat
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500" /> İşletme
              </span>
            </div>
            <span>* Çubuklar üstünden ilerleme oranları dinamik güncellenebilir.</span>
          </div>
        </div>

      </div>

      {/* INTERACTIVE PROGRESS & BUDGET ANALYTICS SECTION */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--shadow-panel)] relative overflow-hidden select-none">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-[60px] pointer-events-none rounded-full" />

        {/* Header and Toggle Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border)] mb-4 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                Recharts İnteraktif Motoru
              </span>
              <span className="text-[10px] text-slate-500 font-bold font-mono">Gerçek Zamanlı Senkronizasyon</span>
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
              PROJE İLERLEME & BÜTÇE ANALİTİKLERİ
            </h4>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-lg border border-[var(--border)] p-0.5 bg-[var(--bg-primary)] text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setAnalyticsTab('tasks')}
              className={`px-3 py-1.5 rounded-md transition duration-200 cursor-pointer ${
                analyticsTab === 'tasks' 
                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-extrabold' 
                  : 'text-slate-400 hover:text-[var(--text-primary)]'
              }`}
            >
              GÖREV BAZLI KARŞILAŞTIRMA
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsTab('phases')}
              className={`px-3 py-1.5 rounded-md transition duration-200 cursor-pointer ${
                analyticsTab === 'phases' 
                  ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-extrabold' 
                  : 'text-slate-400 hover:text-[var(--text-primary)]'
              }`}
            >
              AŞAMA BAZLI KÜMÜLATİF
            </button>
          </div>
        </div>

        {/* Main Grid: Chart and Live Simulator Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 1. Chart Canvas */}
          <div className="lg:col-span-8 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3.5 relative min-h-[280px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
              {analyticsTab === 'tasks' ? 'GÖREV MALİYETLERİ (mTL) VE FİZİKİ İLERLEME ORANLARI (%)' : 'SÜREÇ AŞAMALARI KÜMÜLATİF MALİYET VE ORTALAMA İLERLEME'}
            </span>

            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={
                    analyticsTab === 'tasks'
                      ? ganttTasks.map(t => ({
                          id: t.id,
                          name: t.name.length > 25 ? t.name.substring(0, 22) + '...' : t.name,
                          fullName: t.name,
                          bütçe: t.cost,
                          ilerleme: t.progress,
                          sorumlu: t.responsible,
                          durum: t.status,
                          contractor: t.contractor
                        }))
                      : ['planlama', 'insaat', 'isletme'].map(phase => {
                          const phaseTasks = ganttTasks.filter(t => t.phase === phase);
                          const totalCost = phaseTasks.reduce((sum, t) => sum + t.cost, 0);
                          const avgProgress = phaseTasks.length > 0 
                            ? Math.round(phaseTasks.reduce((sum, t) => sum + t.progress, 0) / phaseTasks.length) 
                            : 0;
                          return {
                            id: phase,
                            name: phase === 'planlama' ? '📐 Planlama' : phase === 'insaat' ? '🏗️ İnşaat' : '⚙️ İşletme',
                            bütçe: parseFloat(totalCost.toFixed(1)),
                            ilerleme: avgProgress
                          };
                        })
                  } 
                  margin={{ top: 10, right: -5, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#cbd5e1' : '#1e293b'} opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={8.5} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={8.5} tickLine={false} label={{ value: 'Bütçe (mTL)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '8px', fill: '#64748b', fontWeight: 'bold' } }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={8.5} tickLine={false} label={{ value: 'İlerleme (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: '8px', fill: '#64748b', fontWeight: 'bold' } }} />
                  
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a', 
                      borderColor: theme === 'light' ? '#cbd5e1' : '#334155', 
                      fontSize: '10px', 
                      borderRadius: '8px', 
                      color: theme === 'light' ? '#0f172a' : '#f8fafc',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                    }} 
                    formatter={(value: any, name: any) => {
                      if (name === 'bütçe') return [`₺${value} mTL`, 'Bütçe'];
                      return [`%${value}`, 'Fiziki İlerleme'];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '8.5px', paddingTop: '5px' }} />
                  
                  <Bar yAxisId="left" dataKey="bütçe" name="Bütçe (mTL)" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={35} fillOpacity={0.85}>
                    {ganttTasks.map((entry, index) => {
                      const isSelected = entry.id === selectedChartTaskId && analyticsTab === 'tasks';
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isSelected ? '#3b82f6' : entry.phase === 'planlama' ? '#3b82f6' : entry.phase === 'insaat' ? '#f59e0b' : '#10b981'} 
                          stroke={isSelected ? '#ffffff' : 'transparent'}
                          strokeWidth={isSelected ? 1.5 : 0}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (analyticsTab === 'tasks') {
                              setSelectedChartTaskId(entry.id);
                            }
                          }}
                        />
                      );
                    })}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="ilerleme" name="İlerleme (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 1.5 }} activeDot={{ r: 5.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-slate-500 font-mono text-center mt-1">
              * {analyticsTab === 'tasks' ? 'Detayları görmek için grafik üzerindeki sütunlara tıklayabilirsiniz.' : 'Süreçlerin toplam bütçe ve ağırlıklı ilerleme performansları.'}
            </p>
          </div>

          {/* 2. Simulator & Detail Panel */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
            {/* Live Highlight Card */}
            {analyticsTab === 'tasks' ? (() => {
              const selectedTask = ganttTasks.find(t => t.id === selectedChartTaskId) || ganttTasks[0];
              if (!selectedTask) return null;

              return (
                <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">
                      SEÇİLİ GÖREV DETAYLARI
                    </span>
                    <strong className="text-[11px] text-[var(--text-primary)] block leading-tight mb-2 truncate" title={selectedTask.name}>
                      {selectedTask.name}
                    </strong>

                    {/* Metadata specs */}
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Yüklenici:</span>
                        <span className="font-extrabold text-[var(--text-primary)]">{selectedTask.contractor || 'Kalyon Yapı'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sorumlu:</span>
                        <span className="font-extrabold text-[var(--text-primary)]">{selectedTask.responsible}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Bütçe:</span>
                        <span className="font-mono font-extrabold text-blue-400">₺{selectedTask.cost}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Statü:</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-black bg-blue-500/10 text-blue-400 rounded-none border border-blue-500/20">
                          {selectedTask.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Simulator Widget */}
                  <div className="border-t border-[var(--border)] pt-2.5 mt-2.5 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-black text-amber-500 uppercase tracking-wider flex items-center gap-1">
                        <Sliders className="w-3 h-3 text-amber-500" />
                        Canlı Simülatör
                      </span>
                      <span className="font-mono font-black text-[var(--text-primary)]">İlerleme: %{selectedTask.progress}</span>
                    </div>

                    <Slider size="small" color="secondary" min={0} max={100} value={selectedTask.progress} aria-label="Canlı simülatör ilerleme" onChange={(_, v) => {
                        const newProgress = (v as number) || 0;
                        const updated = ganttTasks.map(t => 
                          t.id === selectedTask.id ? { ...t, progress: newProgress } : t
                        );
                        setGanttTasks(updated);
                        onUpdateTasks(updated as any);
                      }} />
                    <p className="text-[10px] text-slate-500 leading-tight">
                      * Kaydırıcıyı hareket ettirerek fiziki ilerleme oranını eş zamanlı simüle edip zaman çizelgesiyle senkronize edebilirsiniz.
                    </p>
                  </div>
                </div>
              );
            })() : (
              <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">
                    GENEL AŞAMA ANALİZLERİ
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                    Proje kapsamındaki 3 ana fazın (Planlama, İnşaat ve İşletme) konsolide bütçe dağılımları ve ağırlıklı fiziki tamamlanma yüzdeleri.
                  </p>

                  <div className="space-y-2 text-[10px]">
                    <div className="p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-bold text-blue-400">📐 Planlama Fazı</span>
                        <span className="font-bold">₺{ganttTasks.filter(t => t.phase === 'planlama').reduce((sum, t) => sum + t.cost, 0).toFixed(1)}M</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div className="p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-bold text-amber-400">🏗️ İnşaat Fazı</span>
                        <span className="font-bold">₺{ganttTasks.filter(t => t.phase === 'insaat').reduce((sum, t) => sum + t.cost, 0).toFixed(1)}M</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div className="p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded">
                      <div className="flex justify-between mb-0.5">
                        <span className="font-bold text-emerald-400">⚙️ İşletme Fazı</span>
                        <span className="font-bold">₺{ganttTasks.filter(t => t.phase === 'isletme').reduce((sum, t) => sum + t.cost, 0).toFixed(1)}M</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 text-center border-t border-[var(--border)] pt-2 mt-2">
                  <span>Süreç kümülatif bütçeleri otomatik hesaplanmaktadır.</span>
                </div>
              </div>
            )}

            {/* Overall Project Health Meter */}
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-[var(--text-primary)] rounded-xl space-y-1">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-indigo-400">
                <span>PORTFÖY SAĞLIK SKORU</span>
                <span className="font-mono text-emerald-400">9.4 / 10</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Konsolide bütçe uyumluluğu ve fiziki ilerleme hızına dayalı algoritmik indeks derecelendirmesi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ENTERPRISE A4 PDF PRINT AREA */}
      <div id="gantt-print-area" className="hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: #0f172a !important;
            }
            body > div:not(#gantt-print-area), 
            #root,
            .no-print {
              display: none !important;
            }
            #gantt-print-area {
              display: block !important;
              width: 100%;
              background: white !important;
              color: #0f172a !important;
              padding: 24px !important;
            }
            .print-border-b {
              border-bottom: 2px solid #0f172a !important;
            }
            .print-border-t {
              border-top: 1px solid #94a3b8 !important;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse !important;
              margin-top: 16px;
            }
            .print-table th, .print-table td {
              border: 1px solid #cbd5e1 !important;
              padding: 8px !important;
              text-align: left !important;
              font-size: 10px !important;
            }
            .print-table th {
              background-color: #f1f5f9 !important;
              font-weight: bold !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-progress-bg {
              background-color: #e2e8f0 !important;
              height: 8px !important;
              border-radius: 4px !important;
              width: 100% !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-progress-fill {
              background-color: #1e40af !important;
              height: 100% !important;
              border-radius: 4px !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print-area {
              display: none !important;
            }
          }
        `}} />
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block tracking-widest">T.C. SPATIAL ERP & ALTYAPI COĞRAFİ SİSTEMLERİ</span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">ALTYAPI PROJE VE YATIRIM KONTROL DAİRESİ</h1>
            <p className="text-xs text-slate-600 font-bold mt-0.5">{project.name.toUpperCase()} • RESMİ İŞ-ZAMAN PLANI RAPORU</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono block text-slate-800 font-bold">Rapor Tarihi: 28 Ağustos 2026</span>
            <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-black border border-slate-200 uppercase tracking-wider">A4 LANDSCAPE FORMAT</span>
          </div>
        </div>

        {/* Aggregate Stats Row */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg mb-6">
          <div>
            <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">Toplam Görev</span>
            <span className="text-sm font-black text-slate-900">{ganttTasks.length} Adet</span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">Planlama Fazı</span>
            <span className="text-sm font-black text-blue-700">{ganttTasks.filter(t => t.phase === 'planlama').length} Görev</span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">İnşaat Fazı</span>
            <span className="text-sm font-black text-amber-700">{ganttTasks.filter(t => t.phase === 'insaat').length} Görev</span>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">İşletme Fazı</span>
            <span className="text-sm font-black text-emerald-700">{ganttTasks.filter(t => t.phase === 'isletme').length} Görev</span>
          </div>
        </div>

        {/* Tasks Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>GÖREV KODU</th>
              <th style={{ width: '80px' }}>AŞAMA</th>
              <th>GÖREV / FAALİYET ADI</th>
              <th style={{ width: '120px' }}>SORUMLU</th>
              <th style={{ width: '140px' }}>YÜKLENİCİ</th>
              <th style={{ width: '130px' }}>BAŞLANGIÇ / BİTİŞ</th>
              <th style={{ width: '60px' }}>BÜTÇE</th>
              <th style={{ width: '100px' }}>İLERLEME</th>
              <th style={{ width: '70px' }}>STATÜ</th>
            </tr>
          </thead>
          <tbody>
            {ganttTasks.map(task => (
              <tr key={task.id}>
                <td className="font-mono font-bold text-slate-800">{task.id}</td>
                <td className="capitalize font-semibold text-slate-700">{task.phase === 'planlama' ? '📐 Planlama' : task.phase === 'insaat' ? '🏗️ İnşaat' : '⚙️ İşletme'}</td>
                <td className="font-bold text-slate-900">{task.name}</td>
                <td>{task.responsible}</td>
                <td>{task.contractor}</td>
                <td className="font-mono text-slate-800">{task.startDate} / {task.endDate}</td>
                <td className="font-semibold text-slate-950">{task.cost} mTL</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="print-progress-bg flex-1">
                      <div className="print-progress-fill" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="font-mono font-black text-[10px] text-slate-900">{task.progress}%</span>
                  </div>
                </td>
                <td>
                  <span className="font-black text-[10px] text-slate-900 uppercase">{task.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures Footer */}
        <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-slate-300 text-center">
          <div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-8">Hazırlayan</p>
            <p className="text-[11px] font-bold text-slate-900">Alper Yılmaz</p>
            <p className="text-[10px] text-slate-500">Şantiye Şefi</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-8">Kontrol Eden</p>
            <p className="text-[11px] font-bold text-slate-900">Mustafa Kaya</p>
            <p className="text-[10px] text-slate-500">HSE Baş Mühendisi</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-8">Onaylayan</p>
            <p className="text-[11px] font-bold text-slate-900">Deniz Aydın</p>
            <p className="text-[10px] text-slate-500">Proje Kontrol Direktörü</p>
          </div>
        </div>

        <div className="text-center mt-12 pt-4 border-t border-slate-100 text-[10px] font-mono text-slate-400">
          Bu belge, Spatial ERP Altyapı Coğrafi Bilgi Sistemi tarafından dijital olarak imzalanmıştır.
        </div>
      </div>

    </div>
  );
}
