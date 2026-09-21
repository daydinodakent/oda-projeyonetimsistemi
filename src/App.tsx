import React, { useState, useEffect } from 'react';
import { useColorScheme } from '@mui/material/styles';
import PermissionDialog from './components/chrome/PermissionDialog';
import AddProjectDialog from './components/chrome/AddProjectDialog';
import EditProjectStatusDialog from './components/chrome/EditProjectStatusDialog';
import { 
  Compass, LayoutGrid, Database, Smartphone, Sun, Moon, Bell, ChevronDown, CheckCircle, 
  AlertTriangle, DollarSign, Layers, Plus, FileText, Settings, UserCheck, HelpCircle, 
  MapPin, TrendingUp, Cpu, X, Menu, Briefcase, ChevronLeft, ChevronRight, ChevronUp, Map,
  Activity, FileCheck, Check, HardHat, Wrench, Trash, ArrowUpRight, Clock, Users,
  Globe, Pencil, Download
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, Cell, LineChart, Line } from 'recharts';

import { Project, Block, WBSTask, ProjectDocument, Permit, Asset, MaintenanceLog, Notification } from './types';
import { 
  initialProjects, initialWbsTasks, initialDocuments, 
  initialAssets, initialMaintenanceLogs, initialNotifications 
} from './data';

import { GlobalSearchModal } from './components/GlobalSearchModal';
import GanttView from './components/GanttView';
import ExecutiveDashboardView from './components/ExecutiveDashboardView';
import LaborProcurementView from './components/LaborProcurementView';
import DocumentArchiveModal from './components/DocumentArchiveModal';
import PlanView from './components/PlanView';
import InsaatView from './components/InsaatView';
import IsletmeView from './components/IsletmeView';
import CEODashboard from './components/CEODashboard';
import AdminPanel from './components/AdminPanel';
import OdaMapModule from './components/gis/OdaMapModule';

// Dynamic Side Panels (One Map, One Timeline, One Truth)
import PlanLeftPanel from './components/PlanLeftPanel';
import PlanRightPanel from './components/PlanRightPanel';
import InsaatLeftPanel from './components/InsaatLeftPanel';
import InsaatRightPanel from './components/InsaatRightPanel';
import IsletmeLeftPanel from './components/IsletmeLeftPanel';
import IsletmeRightPanel from './components/IsletmeRightPanel';

interface AnimatedNumberProps {
  value: string | number;
  prefix?: string;
  suffix?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, prefix = "", suffix = "" }) => {
  const [displayValue, setDisplayValue] = useState<string | number>(0);

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    if (isNaN(target)) {
      const timer = setTimeout(() => setDisplayValue(value), 100);
      return () => clearTimeout(timer);
    }

    let start = 0;
    const duration = 1000; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = progress * (2 - progress); // Ease out
      const current = start + (target - start) * easeProgress;

      if (typeof value === 'number') {
        setDisplayValue(Math.round(current));
      } else {
        const hasDecimal = value.toString().includes('.');
        setDisplayValue(hasDecimal ? current.toFixed(1) : Math.round(current).toString());
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="transition-all duration-500 inline-block">
      {prefix}{displayValue}{suffix}
    </span>
  );
};

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const { setMode: setMuiMode } = useColorScheme();

  // Core database states (The single truth backbone)
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('IGA-ETAP-1');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [wbsTasks, setWbsTasks] = useState<Record<string, WBSTask[]>>(initialWbsTasks);
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialDocuments);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(initialMaintenanceLogs);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  // Synchronized Global States (One Map, One Timeline, One Truth)
  const [timelineDate, setTimelineDate] = useState<string>('2026-08-27');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Layout states
  const [activeTab, setActiveTab] = useState<'plan' | 'insaat' | 'isletme' | 'admin'>('plan');
  const [showModullerGrid, setShowModullerGrid] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [ceoPocketMode, setCeoPocketMode] = useState<boolean>(false);
  const [showNotificationList, setShowNotificationList] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showCompactProfileDropdown, setShowCompactProfileDropdown] = useState<boolean>(false);
  const [showProjectComboDropdown, setShowProjectComboDropdown] = useState<boolean>(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'files' | 'ncr'>('all');

  // Collapsible panels states
  const [topPanelOpen, setTopPanelOpen] = useState<boolean>(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(false);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(false);
  const [centerTab, setCenterTab] = useState<'gantt' | 'kpis' | 'dashboard' | 'resources' | 'documents' | 'admin' | 'map'>('dashboard');
  const isOverlayView = centerTab === 'gantt' || centerTab === 'dashboard' || centerTab === 'resources' || centerTab === 'documents' || centerTab === 'admin' || centerTab === 'map';
  const [headerExpanded, setHeaderExpanded] = useState<boolean>(true);
  const [kpiTrendCollapsed, setKpiTrendCollapsed] = useState<boolean>(true);

  // Add Project Modal State
  const [showAddProjectModal, setShowAddProjectModal] = useState<boolean>(false);
  
  // Access Permission Request Modal States
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [permCamera, setPermCamera] = useState<boolean>(true);
  const [permMicrophone, setPermMicrophone] = useState<boolean>(true);
  const [permDontAsk, setPermDontAsk] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectCode, setNewProjectCode] = useState<string>('');
  const [newProjectLocation, setNewProjectLocation] = useState<string>('Arnavutköy');
  const [newProjectProgress, setNewProjectProgress] = useState<number>(0);
  const [newProjectBudget, setNewProjectBudget] = useState<number>(1000);

  // Edit Project Status Modal State
  const [showEditProjectStatusModal, setShowEditProjectStatusModal] = useState<boolean>(false);
  const [editProjectName, setEditProjectName] = useState<string>('');
  const [editProjectProgress, setEditProjectProgress] = useState<number>(0);
  const [editProjectPermit, setEditProjectPermit] = useState<string>('ALINDI');
  const [editProjectBudgetStatus, setEditProjectBudgetStatus] = useState<string>('TAMAM');
  const [editProjectStatus, setEditProjectStatus] = useState<'Planlama' | 'Devam Ediyor' | 'Tamamlandı' | 'Kritik'>('Devam Ediyor');

  // Dinamik KPI Filter States & Historical Data Generator
  const [kpiStartDate, setKpiStartDate] = useState<string>('2026-03-01');
  const [kpiEndDate, setKpiEndDate] = useState<string>('2026-08-31');
  const [kpiDepartment, setKpiDepartment] = useState<string>('all');

  const getHistoricalKpiData = () => {
    const baseData = [
      { date: '2026-03-01', month: 'Mart 2026', spi: 0.88, cpi: 0.92, verimlilik: 72, isg: 88, hakedis: 120 },
      { date: '2026-04-01', month: 'Nisan 2026', spi: 0.92, cpi: 0.94, verimlilik: 78, isg: 90, hakedis: 145 },
      { date: '2026-05-01', month: 'Mayıs 2026', spi: 0.96, cpi: 0.95, verimlilik: 82, isg: 94, hakedis: 180 },
      { date: '2026-06-01', month: 'Haziran 2026', spi: 1.02, cpi: 0.98, verimlilik: 86, isg: 92, hakedis: 210 },
      { date: '2026-07-01', month: 'Temmuz 2026', spi: 1.05, cpi: 1.01, verimlilik: 89, isg: 96, hakedis: 250 },
      { date: '2026-08-01', month: 'Ağustos 2026', spi: 1.08, cpi: 1.03, verimlilik: 92, isg: 98, hakedis: 295 },
    ];

    const filtered = baseData.filter(item => {
      return item.date >= kpiStartDate && item.date <= kpiEndDate;
    });

    return filtered.map(item => {
      let spiMultiplier = 1.0;
      let cpiMultiplier = 1.0;
      let verimlilikMultiplier = 1.0;
      let isgMultiplier = 1.0;

      if (kpiDepartment === 'insaat') {
        spiMultiplier = 1.05;
        cpiMultiplier = 0.98;
        verimlilikMultiplier = 1.08;
        isgMultiplier = 0.95;
      } else if (kpiDepartment === 'elektrik') {
        spiMultiplier = 0.96;
        cpiMultiplier = 1.04;
        verimlilikMultiplier = 0.92;
        isgMultiplier = 1.02;
      } else if (kpiDepartment === 'tesisat') {
        spiMultiplier = 1.02;
        cpiMultiplier = 0.95;
        verimlilikMultiplier = 1.05;
        isgMultiplier = 0.98;
      } else if (kpiDepartment === 'isg') {
        spiMultiplier = 0.92;
        cpiMultiplier = 0.97;
        verimlilikMultiplier = 0.88;
        isgMultiplier = 1.15;
      }

      return {
        ...item,
        spi: Math.min(Number((item.spi * spiMultiplier).toFixed(2)), 1.5),
        cpi: Math.min(Number((item.cpi * cpiMultiplier).toFixed(2)), 1.5),
        verimlilik: Math.min(Math.round(item.verimlilik * verimlilikMultiplier), 100),
        isg: Math.min(Math.round(item.isg * isgMultiplier), 100),
        hakedis: Math.round(item.hakedis * ((spiMultiplier + cpiMultiplier) / 2))
      };
    });
  };

  const downloadChartAsPng = (containerId: string, title: string) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;

    try {
      const svgClone = svg.cloneNode(true) as SVGElement;
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      const isDark = theme === 'dark';
      svgClone.style.backgroundColor = isDark ? '#111827' : '#ffffff';
      
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgClone);
      
      if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = svg.clientWidth || svg.getBoundingClientRect().width || 600;
        const height = svg.clientHeight || svg.getBoundingClientRect().height || 300;
        canvas.width = width * 2;
        canvas.height = height * 2;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.fillStyle = isDark ? '#111827' : '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
          a.href = pngUrl;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(blobUrl);
      };
      
      img.onerror = (err) => {
        console.error('Image rendering error', err);
        URL.revokeObjectURL(blobUrl);
      };
      
      img.src = blobUrl;
    } catch (e) {
      console.error('Error generating chart image', e);
    }
  };


  // Keyboard shortcut listener for Global Search (Cmd+K / Ctrl+K / /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync state with DOM attribute + MUI color scheme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    setMuiMode(theme);
  }, [theme, setMuiMode]);

  // Set default selected asset when project changes
  useEffect(() => {
    const projectAssets = assets.filter(a => a.associatedProjectId === selectedProjectId);
    if (projectAssets.length > 0) {
      setSelectedAssetId(projectAssets[0].id);
    } else {
      setSelectedAssetId(null);
    }
  }, [selectedProjectId]);

  // Initial check for permission modal on startup
  useEffect(() => {
    const dontAskChoice = localStorage.getItem('dont_ask_permissions_choice');
    if (dontAskChoice !== 'true') {
      const timer = setTimeout(() => {
        setShowPermissionModal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const activeProjectWbs = wbsTasks[selectedProjectId] || [];

  // Notifications logic
  const unreadNotifications = notifications.filter(n => !n.read);

  const toggleTheme = () => {
    setTheme(p => p === 'dark' ? 'light' : 'dark');
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markSingleAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteSingleNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // State modifiers (The CRUD endpoints / operations)
  const handleAddProject = (newProj: Project) => {
    setProjects(prev => [...prev, newProj]);
    setWbsTasks(prev => ({
      ...prev,
      [newProj.id]: [
        {
          id: `task-${Date.now()}-1`,
          wbsCode: '01',
          name: 'Konsept ve Mobilizasyon Hazırlıkları',
          progress: 10,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          contractor: 'Şantiye Özöz Yapı',
          plannedQuantity: 1,
          actualQuantity: 0,
          unit: 'Adet',
          responsible: 'Ahmet Yılmaz',
          durationDays: 15,
          status: 'Devam',
          cost: 2
        }
      ]
    }));
  };

  const handleEditProject = (updatedProj: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (selectedProjectId === projectId) {
      setSelectedProjectId(projects[0]?.id || '');
    }
  };

  const handleAddTask = (task: WBSTask) => {
    setWbsTasks(prev => ({
      ...prev,
      [selectedProjectId]: [...(prev[selectedProjectId] || []), task]
    }));
    
    // Add an audit log to notifications
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      projectId: selectedProjectId,
      type: 'info',
      message: `Yeni WBS Kalemi Eklendi: WBS ${task.wbsCode} - ${task.name} (Bütçe: ₺${task.cost}M)`,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAddDocument = (doc: ProjectDocument) => {
    setDocuments(prev => [doc, ...prev]);
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      projectId: selectedProjectId,
      type: 'info',
      message: `CDE Arşivine Yeni Teknik Dosya Eklendi: ${doc.name}`,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAddPermit = (permit: Permit) => {
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          permits: [...p.permits, permit]
        };
      }
      return p;
    }));

    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      projectId: selectedProjectId,
      type: 'warning',
      message: `Yasal Ruhsat Başvurusu Eklendi: ${permit.name} (${permit.authority})`,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAddMaintenanceLog = (log: MaintenanceLog) => {
    setMaintenanceLogs(prev => [log, ...prev]);
  };

  const handleUpdateAssetStatus = (assetId: string, status: 'Sorunsuz' | 'Bakım Bekliyor' | 'Arızalı') => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status } : a));
    
    if (status === 'Arızalı') {
      const asset = assets.find(a => a.id === assetId);
      const newNotif: Notification = {
        id: `notif-${Date.now()}`,
        projectId: selectedProjectId,
        type: 'danger',
        message: `ARIZA ALARMI: ${asset?.name || 'Varlık'} arıza durumuna geçti! Bakım emri oluşturuldu.`,
        date: new Date().toISOString().split('T')[0],
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleApproveDocument = (docId: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          approvalWorkflow: doc.approvalWorkflow.map(step => {
            if (step.status === 'Pending') {
              return { ...step, status: 'Approved' };
            }
            return step;
          })
        };
      }
      return doc;
    }));

    const targetDoc = documents.find(d => d.id === docId);
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      projectId: selectedProjectId,
      type: 'info',
      message: `Onaylandı (CDE): ${targetDoc?.name || 'Teknik Dosya'} CBS Onay Mühendisliğince onaylandı.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleUpdateTask = (updatedTask: WBSTask) => {
    setWbsTasks(prev => {
      const projectTasks = prev[selectedProjectId] || [];
      const updatedTasks = projectTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      return {
        ...prev,
        [selectedProjectId]: updatedTasks
      };
    });
  };

  const handleUpdateTasks = (updatedTasks: WBSTask[]) => {
    setWbsTasks(prev => ({
      ...prev,
      [selectedProjectId]: updatedTasks
    }));
  };

  const handleUpdateAsset = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
  };

  const handleUpdateMaintenanceLog = (updatedLog: MaintenanceLog) => {
    setMaintenanceLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  const handleOpenEditStatus = () => {
    if (!activeProject) return;
    setEditProjectName(activeProject.name);
    setEditProjectProgress(activeProject.overallProgress);
    setEditProjectStatus(activeProject.status);
    setEditProjectPermit(activeProject.permitStatus || 'ALINDI');
    setEditProjectBudgetStatus(activeProject.budgetStatus || 'TAMAM');
    setShowEditProjectStatusModal(true);
  };

  const handleOpenEditStatusForProject = (proj: Project) => {
    setSelectedProjectId(proj.id);
    setSelectedBlockId(null);
    setEditProjectName(proj.name);
    setEditProjectProgress(proj.overallProgress);
    setEditProjectStatus(proj.status);
    setEditProjectPermit(proj.permitStatus || 'ALINDI');
    setEditProjectBudgetStatus(proj.budgetStatus || 'TAMAM');
    setShowEditProjectStatusModal(true);
  };

  const handleSaveProjectStatus = () => {
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          name: editProjectName,
          overallProgress: editProjectProgress,
          status: editProjectStatus,
          permitStatus: editProjectPermit,
          budgetStatus: editProjectBudgetStatus
        };
      }
      return p;
    }));
    setShowEditProjectStatusModal(false);
  };

  const handleAddNewProjectSubmit = () => {
    if (!newProjectName.trim()) return;
    const newId = `PROJECT-${Date.now()}`;
    const newProj: Project = {
      id: newId,
      code: newProjectCode || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newProjectName,
      location: newProjectLocation,
      coordinates: [28.7680, 41.2680],
      adaParcel: '4102 / 2',
      area: '100.000 m²',
      riskLevel: 'Düşük',
      overallProgress: newProjectProgress,
      budget: newProjectBudget,
      spent: 0,
      plannedSpent: newProjectBudget * 0.1,
      earnedValue: 0,
      status: 'Devam Ediyor',
      blocks: [],
      permits: [
        {
          id: `permit-${Date.now()}-1`,
          name: 'İmar & Yapılaşma İzni',
          authority: 'Belediye / Bakanlık',
          issueDate: '2026-01-01',
          expiryDate: '2031-01-01',
          status: 'Alındı',
          geographicScope: 'Proje Sahası',
          documentUrl: '#'
        }
      ],
      employees: []
    };
    setProjects(prev => [...prev, newProj]);
    setWbsTasks(prev => ({
      ...prev,
      [newId]: [
        {
          id: `task-${Date.now()}-1`,
          wbsCode: '01',
          name: 'Mobilizasyon & Saha Hazırlığı',
          progress: 100,
          startDate: '2026-08-01',
          endDate: '2026-08-15',
          phase: 'planlama',
          assignee: 'Saha Şefi'
        },
        {
          id: `task-${Date.now()}-2`,
          wbsCode: '02',
          name: 'Temel Kazı & Zemin İyileştirme',
          progress: 50,
          startDate: '2026-08-16',
          endDate: '2026-09-15',
          phase: 'insaat',
          assignee: 'İnşaat Grubu'
        }
      ]
    }));
    setSelectedProjectId(newId);
    setSelectedBlockId(null);
    setShowAddProjectModal(false);
  };

  const renderProjectDropdown = (isCompact: boolean = false) => {
    const activeProject = projects.find(p => p.id === selectedProjectId);
    const activeName = activeProject ? activeProject.name.replace(/-/g, ' ').toUpperCase() : 'PROJE SEÇİN';

    return (
      <div className="relative">
        {/* Toggle Button */}
        <button
          onClick={() => setShowProjectComboDropdown(!showProjectComboDropdown)}
          className={`flex items-center justify-between gap-2 bg-[#111112] hover:bg-[#202022] border border-[#2d2d30] rounded-xl text-[#dfdfe2] focus:outline-none cursor-pointer transition select-none ${
            isCompact
              ? 'pl-7 pr-8 py-1.5 text-[10px] font-extrabold max-w-[286px] rounded-lg'
              : 'pl-8 pr-10 py-1.5 text-[11px] font-black tracking-wide uppercase min-w-[210px] max-w-[442px]'
          }`}
          title="CBS Sahaları ve Projeler"
        >
          {/* Globe/Planet Icon on the left */}
          <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-sky-400">
            <Globe className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          </div>

          {/* Project Name (truncated if too long to maintain alignment) */}
          <span className="truncate pr-1 text-[#f1c40f] font-black">{activeName}</span>

          {/* ChevronDown on the right */}
          <div className={`absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-slate-500`}>
            <ChevronDown className={`${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          </div>
        </button>

        {/* Dropdown Panel */}
        {showProjectComboDropdown && (
          <>
            {/* Transparent click-catcher background to close the dropdown on click outside */}
            <div 
              className="fixed inset-0 bg-transparent z-45 cursor-default" 
              onClick={() => setShowProjectComboDropdown(false)}
            />
            <div className={`absolute left-0 mt-2 w-[420px] max-w-[95vw] bg-[#0c101c]/95 border border-[#1e293b] rounded-2xl shadow-2xl p-4.5 space-y-3 z-50 animate-fade-in text-slate-200 backdrop-blur-md`}>
              
              {/* Header: Title & "+ Ekle" Action */}
              <div className="flex justify-between items-center pb-2.5 border-b border-[#1e293b]/70">
                <span className="text-[10px] tracking-widest text-slate-400 font-extrabold uppercase">
                  CBS SAHALARI VE PROJELER
                </span>
                
                {/* Superuser "+ Ekle" inside the dropdown */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowProjectComboDropdown(false);
                    setNewProjectName('');
                    setNewProjectCode('');
                    setShowAddProjectModal(true);
                  }}
                  className="px-2.5 py-1 text-[10px] font-black text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  title="Yeni Proje Ekle (Süper Yetkili)"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Ekle</span>
                </button>
              </div>

              {/* Scrollable list of projects */}
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                {projects.map((proj) => {
                  const isActive = proj.id === selectedProjectId;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setSelectedBlockId(null);
                        setShowProjectComboDropdown(false);
                      }}
                      className={`group relative p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all border ${
                        isActive
                          ? 'bg-[#13192a]/95 border-[#3b82f6]/40 shadow-md shadow-blue-500/5'
                          : 'bg-[#111422]/50 hover:bg-[#181d32]/80 border-transparent'
                      }`}
                    >
                      {/* Left side text and details */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                          )}
                          <span className={`text-[11px] font-bold tracking-wide truncate ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-100'}`}>
                            {proj.name.replace(/-/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold block leading-none pl-3.5">
                          {proj.location || 'Genel'} • Tamamlanma: %{proj.overallProgress || 0}
                        </span>
                      </div>

                      {/* Right side edit button for each project */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowProjectComboDropdown(false);
                          handleOpenEditStatusForProject(proj);
                        }}
                        className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/30 transition shrink-0 cursor-pointer flex items-center justify-center bg-[#0e121e]/80"
                        title={`${proj.name} Bilgilerini Düzenle`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>
          </>
        )}
      </div>
    );
  };

  const renderNotificationListDropdown = () => {
    if (!showNotificationList) return null;
    return (
      <>
        {/* Transparent Click-Catcher backdrop to close on outside click */}
        <div 
          className="fixed inset-0 bg-transparent z-45 cursor-default" 
          onClick={() => setShowNotificationList(false)}
        />
        <div className="absolute right-0 top-full mt-2 w-[490px] max-w-[95vw] bg-[#0c101c]/95 border border-[#1e293b] rounded-2xl shadow-2xl z-50 p-4.5 space-y-4 animate-fade-in text-slate-200 backdrop-blur-md">
          {/* Header: Title & Actions */}
          <div className="flex justify-between items-center pb-3 border-b border-[#1e293b]/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#0091ff]/15 border border-[#0091ff]/20 flex items-center justify-center text-[#0091ff]">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white">Bildirim Merkezi</span>
                  {unreadNotifications.length > 0 && (
                    <span className="bg-[#7f1d1d]/85 text-[#f87171] text-[10px] px-1.5 py-0.5 rounded-full font-black border border-[#ef4444]/25">
                      {unreadNotifications.length} Yeni
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Dosya Yöneticisi & Saha Uygunsuzlukları (NCR)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={markAllNotificationsRead}
                className="p-1.5 hover:bg-[#1a2333] rounded transition cursor-pointer text-slate-400 hover:text-emerald-400 flex items-center justify-center"
                title="Hepsini Okundu Yap"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                onClick={clearAllNotifications}
                className="p-1.5 hover:bg-[#1a2333] rounded transition cursor-pointer text-slate-400 hover:text-red-400 flex items-center justify-center"
                title="Tümünü Sil"
              >
                <Trash className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowNotificationList(false)}
                className="p-1.5 hover:bg-[#1a2333] rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setNotifFilter('all')}
              className={`text-[10px] font-black px-3.5 py-1.5 rounded-full transition whitespace-nowrap cursor-pointer ${
                notifFilter === 'all'
                  ? 'bg-[#0091ff] text-white shadow'
                  : 'bg-[#131926] hover:bg-[#1c2438] border border-[#20293a] text-slate-300'
              }`}
            >
              Tümü ({notifications.length})
            </button>

            <button
              onClick={() => setNotifFilter('unread')}
              className={`text-[10px] font-black px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                notifFilter === 'unread'
                  ? 'bg-[#0091ff] text-white shadow'
                  : 'bg-[#131926] hover:bg-[#1c2438] border border-[#20293a] text-slate-300'
              }`}
            >
              <span>Okunmamış</span>
              {unreadNotifications.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setNotifFilter('files')}
              className={`text-[10px] font-black px-3.5 py-1.5 rounded-full transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                notifFilter === 'files'
                  ? 'bg-[#0091ff] text-white shadow'
                  : 'bg-[#131926] hover:bg-[#1c2438] border border-[#20293a] text-slate-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Dosyalar ({notifications.filter(n => n.category === 'Dosyalar').length})</span>
            </button>

            <button
              onClick={() => setNotifFilter('ncr')}
              className={`text-[10px] font-black px-3.5 py-1.5 rounded-full transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                notifFilter === 'ncr'
                  ? 'bg-[#0091ff] text-white shadow'
                  : 'bg-[#131926] hover:bg-[#1c2438] border border-[#20293a] text-slate-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Saha NCR ({notifications.filter(n => n.category === 'Saha NCR').length})</span>
            </button>
          </div>

          {/* Scrollable Notification Cards List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
            {notifications.filter(n => {
              if (notifFilter === 'all') return true;
              if (notifFilter === 'unread') return !n.read;
              if (notifFilter === 'files') return n.category === 'Dosyalar';
              if (notifFilter === 'ncr') return n.category === 'Saha NCR';
              return true;
            }).length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-bold">
                Filtreye uygun bildirim bulunmamaktadır.
              </div>
            ) : (
              notifications.filter(n => {
                if (notifFilter === 'all') return true;
                if (notifFilter === 'unread') return !n.read;
                if (notifFilter === 'files') return n.category === 'Dosyalar';
                if (notifFilter === 'ncr') return n.category === 'Saha NCR';
                return true;
              }).map((notif) => (
                <div 
                  key={notif.id} 
                  className={`relative bg-[#131722]/90 border border-[#222c3f]/80 p-3.5 rounded-xl flex gap-3 animate-fade-in group hover:border-[#3b82f6]/40 transition text-left ${
                    !notif.read ? 'ring-1 ring-[#0091ff]/20' : ''
                  }`}
                >
                  {/* Blue Accent left bar */}
                  <div className="absolute top-4 bottom-4 left-0 w-1 bg-[#3b82f6] rounded-r-full font-sans"></div>

                  {/* Left icon box */}
                  <div className="shrink-0">
                    {notif.category === 'Saha NCR' ? (
                      <div className="w-8.5 h-8.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8.5 h-8.5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <Layers className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Right text box */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Breadcrumb Path & Level badge */}
                    <div className="flex justify-between items-center text-[10px] uppercase font-extrabold tracking-wider">
                      <span className="text-slate-400">{notif.path || 'SİSTEM / UYARI'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                        notif.badgeType === 'danger'
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : notif.badgeType === 'warning'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      }`}>
                        {notif.badge || 'UYARI'}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-[11px] font-bold text-white leading-tight">
                      {notif.title || notif.message}
                    </h4>

                    {/* Description message */}
                    <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">
                      {notif.message}
                    </p>

                    {/* Tags pills */}
                    {notif.tags && notif.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {notif.tags.map((tag, tIdx) => (
                          <span key={tIdx} className="bg-[#1a2333] border border-[#2b3a54] text-slate-400 text-[10px] px-2 py-0.5 rounded font-black tracking-tight">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Divider inside card */}
                    <div className="border-t border-[#222c3f]/40 my-1"></div>

                    {/* Footer: Date and inline actions */}
                    <div className="flex justify-between items-center mt-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{notif.date}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {notif.actionText && (
                          <a 
                            href={notif.actionLink || '#'} 
                            className="flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 px-2 py-0.5 rounded transition cursor-pointer"
                          >
                            <span>{notif.actionText}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                        
                        {!notif.read && (
                          <button 
                            onClick={() => markSingleAsRead(notif.id)}
                            className="p-1 hover:bg-[#1c2438] rounded text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                            title="Okundu İşaretle"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        <button 
                          onClick={() => deleteSingleNotification(notif.id)}
                          className="p-1 hover:bg-[#1c2438] rounded text-slate-400 hover:text-red-400 transition cursor-pointer"
                          title="Sil"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 flex flex-col font-sans">
      
      {/* 1. MASTER HEADER NAVIGATION */}
      {headerExpanded ? (
        <header className="sticky top-0 z-40 bg-[#222224] border-b border-[#313135] text-white flex flex-col transition-all duration-300">
          
          {/* Bar 1 (Master Row) */}
          <div className="grid grid-cols-3 items-center px-5 py-3 border-b border-[#313135] gap-3 select-none overflow-x-auto lg:overflow-visible">
            
            {/* App Branding & Platform Tag */}
            <div className="flex items-center gap-2 order-1 shrink-0 justify-start">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/10 flex items-center justify-center">
                <div className="w-full h-full rounded-[6px] bg-[#1a1b1e] flex flex-col items-center justify-center p-1">
                  <Layers className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="app-header-brand tracking-wider leading-none">ODA+PROJE YS</span>
                  <span className="px-1.5 py-0.5 bg-[#008f9c]/20 border border-[#00f5d4]/30 text-[#00f5d4] text-[10px] font-black rounded tracking-widest uppercase">PLATFORM</span>
                </div>
                <span className="app-header-subtitle block leading-none mt-1">Bütünleşik Kurumsal Yönetim Sistemi</span>
              </div>
            </div>

            {/* Middle Area (Navigation Tabs - Shortened compact labels to keep 1st row always as a single row) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 order-2 justify-center">
              {/* Plan Tab */}
              <button 
                onClick={() => { setActiveTab('plan'); setCeoPocketMode(false); setCenterTab(prev => prev === 'map' ? 'map' : 'kpis'); }}
                className={`h-9 sm:h-10 px-2.5 sm:px-4 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 sm:gap-2 border cursor-pointer shrink-0 ${
                  activeTab === 'plan' && !ceoPocketMode
                    ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 border-2 border-amber-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                    : 'bg-[#161820]/90 border-slate-800 text-[#a0a2ad] hover:text-white hover:border-slate-700'
                }`}
                title="Plan"
              >
                <div className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'plan' && !ceoPocketMode ? 'border-amber-400/80 bg-slate-900/60 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}>
                  <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <span className="font-black text-white">PLAN</span>
                {activeTab === 'plan' && !ceoPocketMode && (
                  <ChevronRight className="w-3 h-3 text-blue-200 shrink-0" />
                )}
              </button>

              {/* Insaat Tab */}
              <button 
                onClick={() => { setActiveTab('insaat'); setCeoPocketMode(false); setCenterTab(prev => prev === 'map' ? 'map' : 'kpis'); }}
                className={`h-9 sm:h-10 px-2.5 sm:px-4 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 sm:gap-2 border cursor-pointer shrink-0 ${
                  activeTab === 'insaat' && !ceoPocketMode
                    ? 'bg-gradient-to-r from-amber-600 via-amber-600 to-orange-600 border-2 border-orange-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : 'bg-[#161820]/90 border-slate-800 text-[#a0a2ad] hover:text-white hover:border-slate-700'
                }`}
                title="İnşaat"
              >
                <div className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'insaat' && !ceoPocketMode ? 'border-orange-400/80 bg-slate-900/60 text-orange-400' : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}>
                  <HardHat className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <span className="font-black text-white">İNŞAAT</span>
                {activeTab === 'insaat' && !ceoPocketMode && (
                  <ChevronRight className="w-3 h-3 text-orange-200 shrink-0" />
                )}
              </button>

              {/* Isletme Tab */}
              <button 
                onClick={() => { setActiveTab('isletme'); setCeoPocketMode(false); setCenterTab(prev => prev === 'map' ? 'map' : 'kpis'); }}
                className={`h-9 sm:h-10 px-2.5 sm:px-4 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 sm:gap-2 border cursor-pointer shrink-0 ${
                  activeTab === 'isletme' && !ceoPocketMode
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-600 border-2 border-green-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-[#161820]/90 border-slate-800 text-[#a0a2ad] hover:text-white hover:border-slate-700'
                }`}
                title="İşletme"
              >
                <div className={`w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'isletme' && !ceoPocketMode ? 'border-green-400/80 bg-slate-900/60 text-green-400' : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}>
                  <Wrench className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <span className="font-black text-white">İŞLETME</span>
                {activeTab === 'isletme' && !ceoPocketMode && (
                  <ChevronRight className="w-3 h-3 text-green-200 shrink-0" />
                )}
              </button>
            </div>

            {/* Right Area (Toolbar & Actions) */}
            <div className="flex items-center gap-1.5 sm:gap-2 order-3 shrink-0 justify-end">
              
              {/* Grid Switcher (Brown background, gold icon) */}
              <button 
                onClick={() => setShowModullerGrid(prev => !prev)}
                className="p-2.5 bg-[#332c1e] border border-[#f1c40f]/20 rounded-xl hover:bg-[#3d3422] text-[#f1c40f] transition shadow-sm relative flex items-center justify-center cursor-pointer"
                title="Analiz ve Modül Araçları"
                id="hdr-btn-modules"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>

              {/* Search button */}
              <button 
                onClick={() => setShowSearchModal(true)}
                className="p-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-xl transition cursor-pointer flex items-center justify-center"
                title="Genel Arama & Komut Paleti (Ctrl + K veya /)"
                id="hdr-btn-search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>

              {/* Profile Pill AY & SpU with dropdown menu (combining the 4 buttons: Admin, Help, Theme, Notifications) */}
              <div className="relative flex items-center">
                <button 
                  onClick={() => setShowProfileDropdown(prev => !prev)}
                  className="flex items-center gap-1.5 bg-[#1a1a1c] hover:bg-[#252528] transition p-1 rounded-full border border-slate-700/40 text-xs font-extrabold pr-2.5 cursor-pointer relative"
                  title="Kullanıcı Menüsü"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] text-white">
                    AY
                  </div>
                  <span className="text-amber-500 text-[10px]">SpU</span>
                </button>

                {/* Warning badge on top of user button — global button CSS
                    (index.css: button:not(.native-btn)) sets overflow:hidden
                    on every <button>, which clipped this badge's negative
                    offset; rendered as a sibling of the button (inside the
                    same relative wrapper) instead so it isn't clipped. */}
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-[#1c1c1e] animate-pulse pointer-events-none">
                    {unreadNotifications.length}
                  </span>
                )}

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <div 
                      className="fixed inset-0 z-40 bg-transparent cursor-default" 
                      onClick={() => setShowProfileDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#141416] border border-[#2c2c2e] p-3 rounded-2xl shadow-2xl z-50 space-y-3 animate-fade-in text-slate-200">
                      
                      {/* User Info Header */}
                      <div className="px-1 py-1.5 border-b border-[#2c2c2e]/60">
                        <div className="text-xs font-black text-white text-left">Ayhan Yılmaz</div>
                        <div className="text-[10px] font-bold text-amber-500/80 mt-0.5 text-left">Süper Kullanıcı (Super User)</div>
                      </div>

                      {/* Menu List representing the 4 buttons */}
                      <div className="flex flex-col gap-1">
                        {/* 1. Admin Paneli */}
                        <button
                          onClick={() => {
                            setCenterTab(prev => prev === 'admin' ? 'dashboard' : 'admin');
                            setCeoPocketMode(false);
                            setShowProfileDropdown(false);
                          }}
                          className={`w-full px-2.5 py-2 text-left rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition flex items-center gap-2.5 cursor-pointer ${
                            centerTab === 'admin' && !ceoPocketMode
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <div className="flex-1">
                            <div>Admin Paneli</div>
                            <div className="text-[10px] text-slate-500 font-medium lowercase tracking-normal">PostgreSQL & PostGIS</div>
                          </div>
                        </button>

                        {/* 2. Destek ve Yardım */}
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-[10px] font-extrabold uppercase tracking-wide text-slate-300 hover:bg-slate-800/60 transition flex items-center gap-2.5 cursor-pointer border border-transparent"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <div className="flex-1">
                            <div>Destek ve Yardım</div>
                            <div className="text-[10px] text-slate-500 font-medium lowercase tracking-normal">Kılavuz ve SSS</div>
                          </div>
                        </button>

                        {/* 3. Tema Değiştir */}
                        <button
                          onClick={() => {
                            toggleTheme();
                          }}
                          className="w-full px-2.5 py-2 text-left rounded-lg text-[10px] font-extrabold uppercase tracking-wide text-slate-300 hover:bg-slate-800/60 transition flex items-center gap-2.5 cursor-pointer border border-transparent"
                        >
                          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                          <div className="flex-1">
                            <div>Tema Değiştir</div>
                            <div className="text-[10px] text-slate-500 font-medium lowercase tracking-normal">
                              {theme === 'dark' ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
                            </div>
                          </div>
                        </button>

                        {/* 4. Sistem Bildirimleri */}
                        <button
                          onClick={() => {
                            setShowNotificationList(prev => !prev);
                            setShowProfileDropdown(false);
                          }}
                          className={`w-full px-2.5 py-2 text-left rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition flex items-center gap-2.5 cursor-pointer relative ${
                            showNotificationList
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span>Bildirimler</span>
                              {unreadNotifications.length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 rounded-full">
                                  {unreadNotifications.length}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium lowercase tracking-normal">Dosyalar ve NCR</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {renderNotificationListDropdown()}
              </div>

              {/* Collapse Button (Folder style on brownish-gold background) */}
              <button 
                onClick={() => setHeaderExpanded(false)}
                className="p-2.5 rounded-xl bg-[#383321] border border-[#f39c12]/30 hover:bg-[#433b25] text-[#f39c12] transition shadow cursor-pointer flex items-center justify-center"
                title="Menüyü Daralt"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

            </div>

          </div>

          {/* Bar 2 (Sub-header Project Status Row) */}
          <div className="grid grid-cols-3 items-center px-5 py-2.5 bg-[#1c1c1e] text-xs font-bold transition-all shadow-inner gap-4">
            
            {/* Left side Dropdown with superuser '+' button */}
            <div className="flex items-center gap-2 justify-start">
              {renderProjectDropdown(false)}
            </div>

            {/* Middle: Harita & Dinamik KPI (Centered) */}
            <div className="flex items-center justify-center">
              <div className="flex items-center bg-[#141416] border border-[#2c2c2e] p-1 rounded-xl shadow-inner select-none transition-all duration-300">
                <div className="flex items-center gap-1.5">
                  {/* Dinamik KPI Butonu */}
                  <button
                    onClick={() => setCenterTab('kpis')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition duration-200 cursor-pointer flex items-center gap-1.5 ${
                      centerTab === 'kpis'
                        ? 'bg-amber-600/15 border border-amber-500/30 text-amber-400 shadow-sm font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-extrabold'
                    }`}
                    id="center-tab-btn-kpis"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dinamik KPI</span>
                  </button>

                  {/* Harita Butonu */}
                  <button
                    onClick={() => setCenterTab(prev => prev === 'map' ? 'kpis' : 'map')}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition duration-200 cursor-pointer flex items-center gap-1.5 ${
                      centerTab === 'map'
                        ? 'bg-sky-500/15 border border-sky-500/30 text-sky-400 shadow-sm font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-extrabold'
                    }`}
                    id="center-tab-btn-map"
                  >
                    <Map className="w-3.5 h-3.5 text-sky-400" />
                    <span>Harita</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: The 4 toolbar buttons */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Sol: Dashboard Butonu */}
              <button
                onClick={() => setCenterTab(prev => prev === 'dashboard' ? 'kpis' : 'dashboard')}
                className={`group p-2 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 ${
                  centerTab === 'dashboard'
                    ? 'bg-gradient-to-r from-indigo-600/30 to-blue-600/30 border-indigo-500 text-indigo-400 ring-2 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                    : 'bg-[#151926] hover:bg-indigo-600/20 border-indigo-500/50 hover:border-indigo-400 text-indigo-400 shadow-inner hover:shadow-[0_0_12px_rgba(99,102,241,0.45)]'
                }`}
                title="Dashboard"
                id="hdr-btn-dashboard-trigger"
              >
                <LayoutGrid className={`w-3.5 h-3.5 transition-transform duration-300 text-indigo-400 group-hover:text-indigo-300 ${centerTab === 'dashboard' ? 'scale-110' : ''}`} />
              </button>

              {/* Orta: İş-Zaman Butonu (Timeline) */}
              <button
                onClick={() => setCenterTab(prev => prev === 'gantt' ? 'kpis' : 'gantt')}
                className={`group p-2 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 ${
                  centerTab === 'gantt'
                    ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'bg-[#0f2118] hover:bg-emerald-600/20 border-emerald-500/50 hover:border-emerald-400 text-emerald-400 shadow-inner hover:shadow-[0_0_12px_rgba(16,185,129,0.45)]'
                }`}
                title="İş-Zaman Çizelgesi (Timeline)"
                id="hdr-btn-gantt-trigger"
              >
                <Clock className={`w-3.5 h-3.5 transition-transform duration-500 text-emerald-400 group-hover:text-emerald-300 ${centerTab === 'gantt' ? 'rotate-180' : 'group-hover:rotate-45'}`} />
              </button>

              {/* Sağ: İş Gücü & Tedarik Butonu */}
              <button
                onClick={() => setCenterTab(prev => prev === 'resources' ? 'kpis' : 'resources')}
                className={`group p-2 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 ${
                  centerTab === 'resources'
                    ? 'bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 border-purple-500 text-purple-400 ring-2 ring-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                    : 'bg-[#1b1526] hover:bg-purple-600/20 border-purple-500/50 hover:border-purple-400 text-purple-400 shadow-inner hover:shadow-[0_0_12px_rgba(168,85,247,0.45)]'
                }`}
                title="İş Gücü & Tedarik"
                id="hdr-btn-resources-trigger"
              >
                <Users className={`w-3.5 h-3.5 transition-transform duration-300 text-purple-400 group-hover:text-purple-300 ${centerTab === 'resources' ? 'scale-110' : ''}`} />
              </button>

              {/* 4. Buton: Doküman Arşivi (Technical Specifications & Docs) */}
              <button
                onClick={() => setCenterTab(prev => prev === 'documents' ? 'kpis' : 'documents')}
                className={`group p-2 rounded-xl border transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 ${
                  centerTab === 'documents'
                    ? 'bg-gradient-to-r from-indigo-600/30 to-blue-600/30 border-indigo-500 text-indigo-400 ring-2 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                    : 'bg-[#121a2e] hover:bg-indigo-600/20 border-indigo-500/50 hover:border-indigo-400 text-indigo-400 shadow-inner hover:shadow-[0_0_12px_rgba(99,102,241,0.45)]'
                }`}
                title="Doküman Yönetimi"
                id="hdr-btn-document-archive-trigger"
              >
                <FileText className={`w-3.5 h-3.5 transition-transform duration-300 text-indigo-400 group-hover:text-indigo-300 ${centerTab === 'documents' ? 'scale-110' : ''}`} />
              </button>
            </div>

          </div>



        </header>
      ) : (
        /* Collapsed compact view (Image 2) */
        <header className="sticky top-0 z-40 bg-[#222224] border-b border-[#313135] text-white py-2 px-4 shadow-sm transition-all duration-300">
          <div className="grid grid-cols-3 items-center gap-4">
            
            {/* Left side compact logo & Dropdown */}
            <div className="flex items-center gap-3 justify-start">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 p-0.5 flex items-center justify-center">
                  <div className="w-full h-full rounded-[4px] bg-[#1a1b1e] flex items-center justify-center p-1">
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <span className="app-header-brand text-xs tracking-wider leading-none">ODA+PROJE YS</span>
              </div>

              {/* Compact project select dropdown */}
              {renderProjectDropdown(true)}
            </div>

            {/* Middle Area (Compact Navigation Tabs Matching Image 2) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 justify-center">
              {/* Compact Plan */}
              <button 
                onClick={() => { setActiveTab('plan'); setCeoPocketMode(false); setCenterTab(prev => prev === 'map' ? 'map' : 'kpis'); }}
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'plan' && !ceoPocketMode
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    : 'text-slate-300 hover:text-white bg-transparent'
                }`}
                title="Plan"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>PLAN</span>
              </button>

              {/* Compact Insaat */}
              <button 
                onClick={() => { setActiveTab('insaat'); setCeoPocketMode(false); setCenterTab(prev => prev === 'map' ? 'map' : 'kpis'); }}
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'insaat' && !ceoPocketMode
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'text-slate-300 hover:text-white bg-transparent'
                }`}
                title="İnşaat"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>İNŞAAT</span>
              </button>

              {/* Compact Isletme */}
              <button 
                onClick={() => { setActiveTab('isletme'); setCeoPocketMode(false); setCenterTab(prev => prev === 'map' ? 'map' : 'kpis'); }}
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'isletme' && !ceoPocketMode
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'text-slate-300 hover:text-white bg-transparent'
                }`}
                title="İşletme"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>İŞLETME</span>
              </button>
            </div>

            {/* Right side compact controls */}
            <div className="flex items-center gap-1.5 justify-end">
              
              {/* Yönetici Özeti & Dinamik KPI Button Group, elegantly placed in the right section of the header */}
              <div className="flex items-center bg-[#141416]/95 border border-[#2c2c2e]/60 p-0.5 rounded-lg shadow-inner select-none transition-all duration-300 mr-2 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setCenterTab('kpis'); setCeoPocketMode(false); }}
                    className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded transition duration-200 cursor-pointer flex items-center gap-1 ${
                      centerTab === 'kpis' && !ceoPocketMode
                        ? 'bg-amber-600/15 border border-amber-500/30 text-amber-400 shadow-sm font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-bold'
                    }`}
                  >
                    <Activity className="w-2.5 h-2.5 text-amber-400" />
                    <span>KPI</span>
                  </button>
                  <button
                    onClick={() => { setCenterTab('map'); setCeoPocketMode(false); }}
                    className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded transition duration-200 cursor-pointer flex items-center gap-1 ${
                      centerTab === 'map' && !ceoPocketMode
                        ? 'bg-sky-500/15 border border-sky-500/30 text-sky-400 shadow-sm font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent font-bold'
                    }`}
                  >
                    <Map className="w-2.5 h-2.5 text-sky-400" />
                    <span>Harita</span>
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSearchModal(true)}
                className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition cursor-pointer flex items-center justify-center"
                title="Genel Arama & Komut Paleti (Ctrl + K veya /)"
                id="hdr-btn-search-compact"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </button>

              <button 
                onClick={() => setShowModullerGrid(prev => !prev)}
                className="p-1.5 bg-[#332c1e] text-[#f1c40f] rounded-lg border border-[#f1c40f]/15 hover:bg-[#3d3422] transition flex items-center justify-center cursor-pointer"
                title="Modüller"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>

              {/* Profile Pill AY & SpU with dropdown menu (combining the 4 buttons: Admin, Help, Theme, Notifications) */}
              <div className="relative flex items-center">
                <button 
                  onClick={() => setShowCompactProfileDropdown(prev => !prev)}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] text-white font-black shrink-0 relative cursor-pointer"
                  title="Kullanıcı Menüsü"
                >
                  AY
                </button>

                {/* Warning badge on top of user button — rendered as a
                    sibling of the button (see non-compact profile pill
                    above for why: global button CSS clips it otherwise). */}
                {unreadNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-3 h-3 rounded-full flex items-center justify-center border border-[#141416] animate-pulse pointer-events-none">
                    {unreadNotifications.length}
                  </span>
                )}

                {/* Dropdown Menu */}
                {showCompactProfileDropdown && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <div 
                      className="fixed inset-0 z-40 bg-transparent cursor-default" 
                      onClick={() => setShowCompactProfileDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#141416] border border-[#2c2c2e] p-2.5 rounded-xl shadow-2xl z-50 space-y-2 animate-fade-in text-slate-200">
                      
                      {/* User Info Header */}
                      <div className="px-1 py-1 border-b border-[#2c2c2e]/60">
                        <div className="text-[11px] font-black text-white text-left">Ayhan Yılmaz</div>
                        <div className="text-[10px] font-bold text-amber-500/80 mt-0.5 text-left">Süper Kullanıcı</div>
                      </div>

                      {/* Menu List representing the 4 buttons */}
                      <div className="flex flex-col gap-0.5">
                        {/* 1. Admin Paneli */}
                        <button
                          onClick={() => {
                            setCenterTab(prev => prev === 'admin' ? 'dashboard' : 'admin');
                            setCeoPocketMode(false);
                            setShowCompactProfileDropdown(false);
                          }}
                          className={`w-full px-2 py-1.5 text-left rounded-md text-[10px] font-extrabold uppercase tracking-wide transition flex items-center gap-2 cursor-pointer ${
                            centerTab === 'admin' && !ceoPocketMode
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10'
                              : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Admin Paneli</span>
                        </button>

                        {/* 2. Destek ve Yardım */}
                        <button
                          onClick={() => {
                            setShowCompactProfileDropdown(false);
                          }}
                          className="w-full px-2 py-1.5 text-left rounded-md text-[10px] font-extrabold uppercase tracking-wide text-slate-300 hover:bg-slate-800/60 transition flex items-center gap-2 cursor-pointer border border-transparent"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Destek ve Yardım</span>
                        </button>

                        {/* 3. Tema Değiştir */}
                        <button
                          onClick={() => {
                            toggleTheme();
                          }}
                          className="w-full px-2 py-1.5 text-left rounded-md text-[10px] font-extrabold uppercase tracking-wide text-slate-300 hover:bg-slate-800/60 transition flex items-center gap-2 cursor-pointer border border-transparent"
                        >
                          {theme === 'dark' ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
                          <span>Tema Değiştir</span>
                        </button>

                        {/* 4. Sistem Bildirimleri */}
                        <button
                          onClick={() => {
                            setShowNotificationList(prev => !prev);
                            setShowCompactProfileDropdown(false);
                          }}
                          className={`w-full px-2 py-1.5 text-left rounded-md text-[10px] font-extrabold uppercase tracking-wide transition flex items-center gap-2 cursor-pointer relative ${
                            showNotificationList
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10'
                              : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          <Bell className="w-3 h-3" />
                          <div className="flex-1 flex items-center justify-between">
                            <span>Bildirimler</span>
                            {unreadNotifications.length > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-black px-1 rounded-full">
                                {unreadNotifications.length}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {renderNotificationListDropdown()}
              </div>

              {/* Expand Folder Button (re-expands master header) */}
              <button 
                onClick={() => setHeaderExpanded(true)}
                className="p-1.5 rounded-lg bg-[#383321] border border-[#f39c12]/30 text-[#f39c12] hover:bg-[#433b25] transition cursor-pointer flex items-center justify-center"
                title="Menüyü Genişlet"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

            </div>

          </div>
        </header>
      )}

      {/* 2. MAIN SPLIT CONTENT AREA */}
      {ceoPocketMode ? (
        
        /* ------------------------------------------------------------- */
        /* PHONE CONTAINER WRAPPER FOR CEO CEP TELEFONU INTERFACE        */
        /* ------------------------------------------------------------- */
        <div className="flex-1 p-6 flex items-center justify-center bg-[var(--bg-primary)] transition-colors duration-300">
          <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl w-full justify-center">
            
            {/* The iPhone Container */}
            <CEODashboard 
              projects={projects}
              notifications={notifications}
              onSelectProject={setSelectedProjectId}
              onSetView={(view) => {
                setActiveTab(view);
                setCeoPocketMode(false);
              }}
              theme={theme}
            />

            {/* Simulated Desktop Guidelines panel on the right of the phone */}
            <div className="max-w-md space-y-4">
              <div className="p-5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl">
                <span className="px-2 py-0.5 bg-blue-600/15 text-blue-400 text-[10px] font-bold rounded block w-max mb-2">CEO MOBİL DENEYİMİ</span>
                <h3 className="text-base font-extrabold text-[var(--text-primary)] mb-1">Cepteki Şirket Nabzı</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Şantiye ziyaretlerinizde veya seyahatlerinizde telefonunuzdan sadece 3 dakikada tüm şirketin durumunu denetleyebilirsiniz. Sol taraftaki simülatörde:
                </p>
                <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc pl-4 mt-3">
                  <li>İnteraktif CBS Map noktalarına dokunarak projenin özetini ve son olaylarını görün.</li>
                  <li><strong>Yapay Zeka Ses Konsoluna</strong> <em>"Ankara"</em> veya <em>"Ataköy"</em> yazarak sorgulama yapın.</li>
                  <li><strong>Çevrimdışı Modu</strong> test ederek şantiye bodrum katlarında internet kesildiğinde verilerin nasıl göründüğünü izleyin.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      ) : (

        /* ------------------------------------------------------------- */
        /* STANDARD ENTERPRISE GIS/ERP DESKTOP DASHBOARD WITH COLLAPSE    */
        /* ------------------------------------------------------------- */
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">

          {/* 3-COLUMN LAYOUT SYSTEM OR FULL-WIDTH EXPANSIVE ADMIN PANEL */}
          <div className="flex-1 flex gap-0 p-0 min-h-0 items-stretch overflow-hidden relative w-full h-full">
            
            {/* 2. LEFT SIDEBAR: MASTER DATA CONTROLLER */}
            {!isOverlayView && (leftPanelOpen ? (
              <aside className="w-80 xl:w-[350px] shrink-0 flex flex-col gap-3 animate-panel-scale panel-transition origin-left transform relative group/left bg-[var(--bg-secondary)] border-r border-[var(--border)] rounded-none h-full overflow-y-auto p-5 pt-4 select-none z-20 text-[var(--text-primary)]">
                
                {/* Unified Header with aligned Arrow on Right Edge */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] w-full mb-1">
                  <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest pl-1">
                    {activeTab === 'plan' ? 'PLANLAMA YÖNETİMİ' : activeTab === 'insaat' ? 'ŞANTİYE YÖNETİMİ' : activeTab === 'isletme' ? 'İŞLETME YÖNETİMİ' : 'SİSTEM YÖNETİMİ'}
                  </span>
                  <button
                    onClick={() => setLeftPanelOpen(false)}
                    className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-amber-500/50 hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shadow-sm mr-1 shrink-0"
                    title="Paneli Gizle"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {/* Dynamic Left Panel Sidebars based on activeTab */}
                {activeTab === 'plan' && (
                  <>
                    <div className="flex flex-col gap-2 mb-3 border-b border-[var(--border)] pb-3">
                      <div className="flex items-center justify-between gap-1.5">
                        {/* Permit status */}
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#141f2d] border border-[#1e3a5f] text-[#4d97ff] text-[10px] font-extrabold uppercase tracking-wider flex-1 justify-center">
                          <svg className="w-3 h-3 text-[#4d97ff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                          <span>Ruhsat: {activeProject.permitStatus || 'ALINDI'}</span>
                        </div>

                        {/* Progress status */}
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#2f2214] border border-[#4a371c] text-[#f59e0b] text-[10px] font-extrabold uppercase tracking-wider flex-1 justify-center">
                          <svg className="w-3 h-3 text-[#f59e0b]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          <span>İlerleme: %{activeProject.overallProgress}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5">
                        {/* Budget status */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0f2619] border border-[#14532d] text-[#4ade80] text-[10px] font-extrabold uppercase tracking-wider flex-1 justify-center">
                          <CheckCircle className="w-3 h-3 text-[#4ade80]" />
                          <span>Bütçe: {activeProject.budgetStatus || 'TAMAM'}</span>
                        </div>

                        {/* Gold status edit pencil */}
                        <button 
                          onClick={handleOpenEditStatus}
                          className="px-2.5 py-1.5 bg-[#3e3422] hover:bg-[#4a3e28] border border-[#f59e0b]/30 text-[#f59e0b] transition rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold cursor-pointer shadow-sm hover:border-[#f59e0b]/50 shrink-0" 
                          title="Durumu Düzenle"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          <span>DÜZENLE</span>
                        </button>
                      </div>
                    </div>
                    <PlanLeftPanel project={activeProject} />
                  </>
                )}

                {activeTab === 'insaat' && (
                  <InsaatLeftPanel project={activeProject} timelineDate={timelineDate} />
                )}

                {activeTab === 'isletme' && (
                  <IsletmeLeftPanel 
                    project={activeProject} 
                    assets={assets.filter(a => a.associatedProjectId === selectedProjectId)} 
                    selectedAssetId={selectedAssetId} 
                    onSelectAsset={(id) => {
                      setSelectedAssetId(id);
                      // Auto select associated block of the asset if found
                      const assetObj = assets.find(a => a.id === id);
                      if (assetObj?.associatedBlockId) {
                        setSelectedBlockId(assetObj.associatedBlockId);
                      }
                    }} 
                  />
                )}

                {activeTab === 'admin' && (
                  <>
                    {/* Active Selected Project ID Card */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-md shadow-sm transition-all duration-300">
                      <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest block mb-1">Aktif Saha Tanımı</span>
                      <h3 className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight line-clamp-2">{activeProject.name}</h3>
                      
                      <div className="space-y-2 mt-3 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Ada/Parsel: <strong className="text-[var(--text-primary)] font-mono">{activeProject.adaParcel}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Toplam Alan: <strong className="text-[var(--text-primary)]">{activeProject.area}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Risk Seviyesi: <strong className="text-amber-500">{activeProject.riskLevel}</strong></span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3.5 pt-3 border-t border-[var(--border)]">
                        <div className="flex justify-between text-[11px] mb-1 font-bold text-[var(--text-primary)]">
                          <span>Saha Fiziki Tamamlanma</span>
                          <span className="text-emerald-500">%{activeProject.overallProgress}</span>
                        </div>
                        <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${activeProject.overallProgress}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* Projedeki 3D Yapılar checklist */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-md shadow-sm transition-all duration-300">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] block mb-2.5">
                        Projedeki 3D Bloklar ({activeProject.blocks.length})
                      </span>

                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                        {activeProject.blocks.map(block => (
                          <button
                            key={block.id}
                            onClick={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
                            className={`w-full text-left p-2 rounded-md border transition flex justify-between items-center cursor-pointer ${
                              selectedBlockId === block.id 
                                ? 'bg-blue-600/10 text-blue-500 border-blue-500/40 shadow-sm' 
                                : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                            id={`sidebar-block-${block.id}`}
                          >
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold block truncate">{block.name.split('] ')[1] || block.name}</span>
                              <span className="text-[10px] text-slate-400 block">
                                {block.floors} Kat | Yükseklik: {block.height}m
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-1 py-0.5 rounded shrink-0">
                              %{block.progress}
                            </span>
                          </button>
                        ))}
                        
                        {activeProject.blocks.length === 0 && (
                          <div className="text-[10px] text-slate-500 italic text-center py-4">
                            Bu saha için henüz 3D yapı modeli atanmamıştır.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* High-level budget scorecard */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-md shadow-sm transition-all duration-300">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] block mb-3">
                        Bütçe ve Hakediş Dengesi
                      </span>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Toplam Bütçe</span>
                          <span className="text-xs font-black text-[var(--text-primary)]">₺{activeProject.budget}M</span>
                        </div>
                        <div className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Ödenen Hakediş</span>
                          <span className="text-xs font-black text-emerald-500">₺{activeProject.spent}M</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </aside>
            ) : (
              /* Thin Left collapse tab strip (Vertical Button Style - Pinned to left, height fit to text) */
              <div 
                onClick={() => setLeftPanelOpen(true)}
                className="hidden xl:flex flex-col items-center justify-start bg-[#0b0f19] border-r border-slate-800 hover:bg-[#13192a] hover:border-indigo-500/40 rounded-none cursor-pointer py-4 px-2.5 transition group shadow-lg h-full w-10 shrink-0 select-none z-20"
                title={activeTab === 'plan' ? "Planlama Yönetimi Panelini Aç" : "Projeler & Katmanlar Panelini Aç"}
              >
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="writing-mode-vertical text-[10px] font-black tracking-widest text-[var(--text-secondary)] group-hover:text-indigo-400 uppercase py-1 select-none">
                    {activeTab === 'plan' ? 'PLANLAMA YÖNETİMİ' : 'PROJELER & KATMANLAR'}
                  </span>
                </div>
              </div>
            ))}

            {/* 3. CENTER AREA CONTENT */}
            {/* Harita penceresi için padding kullanıcı isteğiyle %70 azaltıldı
                (p-4=16px → ~4.8px); diğer sekmeler (gantt/kpis/dashboard)
                orijinal p-4 dolgusunu korur. */}
            <main className={`flex-1 min-w-0 flex flex-col gap-3 panel-transition overflow-y-auto h-full ${centerTab === 'map' ? 'pt-[4.8px] px-[4.8px] pb-0' : 'p-4'}`}>
              


              {/* HARİTA / 3D, İŞ-ZAMAN VEYA DİNAMİK KPI PROCESS VIEWS CONTAINER
                  flex-1 min-h-0 — üst panel küçültülüp büyütüldüğünde (gerçek
                  yüksekliği değişince) harita kartının sabit bir viewport
                  yüzdesi yerine `main`in (zaten flex flex-col h-full olan)
                  KALAN yüksekliğini dinamik doldurması için; aksi halde alt
                  tarafta boş bir şerit kalıyordu (bkz. aşağıdaki h-full). */}
              <div className="relative w-full flex-1 min-h-0 flex flex-col">
                 {centerTab === 'gantt' && (
                  <div className="w-full animate-fade-in relative bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl text-[var(--text-primary)]">
                    <GanttView 
                      project={activeProject}
                      tasks={activeProjectWbs}
                      onUpdateTasks={handleUpdateTasks}
                      theme={theme}
                      onClose={() => setCenterTab('dashboard')}
                    />
                  </div>
                )}

                {centerTab === 'map' && (
                  // Köşe yuvarlaklığı kullanıcı isteğiyle %90 azaltıldı (rounded-2xl=16px → ~1.6px).
                  // h-full: artık flex-1 olan üst kapsayıcının (bkz. yukarıdaki
                  // not) KALAN yüksekliğini doldurur — sabit bir "100vh-170px"
                  // varsayımı DEĞİL, böylece üst panel küçültülünce/büyütülünce
                  // altta boşluk kalmaz.
                  <div className="w-full h-full min-h-[500px] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[1.6px] overflow-hidden shadow-2xl relative animate-fade-in">
                    <OdaMapModule activeProjectId={selectedProjectId} />
                  </div>
                )}

                {centerTab === 'dashboard' && (
                  <div className="w-full animate-fade-in relative">
                    <ExecutiveDashboardView 
                      projects={projects}
                      notifications={notifications}
                      theme={theme}
                      onClose={() => setCenterTab('kpis')}
                    />
                  </div>
                )}

                {centerTab === 'resources' && (
                  <div className="w-full animate-fade-in relative">
                    <LaborProcurementView 
                      project={activeProject}
                      theme={theme}
                      onClose={() => setCenterTab('dashboard')}
                    />
                  </div>
                )}

                {centerTab === 'admin' && (
                  <div className="w-full h-full animate-fade-in relative min-h-[640px]">
                    <AdminPanel 
                      theme={theme}
                      onClose={() => setCenterTab('dashboard')}
                    />
                  </div>
                )}

                {centerTab === 'documents' && (
                  <div className="w-full animate-fade-in relative">
                    <DocumentArchiveModal 
                      isOpen={true}
                      isFullScreen={true}
                      onClose={() => setCenterTab('dashboard')}
                    />
                  </div>
                )}



                {centerTab === 'kpis' && (
                  <div className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] p-5 rounded-2xl shadow-md transition-colors duration-300 animate-fade-in space-y-6">
                    {/* Interactive Filter Control Panel and Dynamic Trend Header */}
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-4 shadow-inner flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-sm font-extrabold text-[var(--text-primary)] tracking-wide uppercase flex items-center gap-2">
                            📈 DİNAMİK KPI & 6 AYLIK TARİHSEL TREND ANALİZİ
                          </h3>
                          <button
                            onClick={() => setKpiTrendCollapsed(!kpiTrendCollapsed)}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                            title={kpiTrendCollapsed ? "Trend Grafiğini Göster" : "Trend Grafiğini Gizle"}
                          >
                            {kpiTrendCollapsed ? <ChevronDown className="w-3.5 h-3.5 animate-bounce" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            <span>{kpiTrendCollapsed ? "TREND GRAFİKLERİNİ GÖSTER" : "TRENDİ GİZLE"}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-1">
                          Tarih aralığı ve çalışma gruplarına göre dinamik olarak filtrelenen kümülatif performans eğrileri
                        </p>
                      </div>

                      {/* Interactive Controls Group (Only visible when not collapsed) */}
                      {!kpiTrendCollapsed && (
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 animate-fade-in">
                          {/* Department/Project Filter Dropdown */}
                          <div className="flex flex-col gap-1 min-w-[170px] flex-1 sm:flex-initial">
                            <label className="micro-label">ÇALIŞMA GRUBU</label>
                            <select
                              value={kpiDepartment}
                              onChange={(e) => setKpiDepartment(e.target.value)}
                              className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer focus:border-amber-500/50"
                            >
                              <option value="all">📁 Tüm Departmanlar (Global)</option>
                              <option value="insaat">🏗️ İnşaat Mühendisliği</option>
                              <option value="elektrik">⚡ Elektrik & Altyapı</option>
                              <option value="tesisat">🔧 Mekanik & Tesisat</option>
                              <option value="isg">🛡️ İSG, Güvenlik & Çevre</option>
                            </select>
                          </div>

                          {/* Date Range Picker: Start Date */}
                          <div className="flex flex-col gap-1 min-w-[125px] flex-1 sm:flex-initial">
                            <label className="micro-label">BAŞLANGIÇ TARİHİ</label>
                            <input
                              type="date"
                              value={kpiStartDate}
                              min="2026-03-01"
                              max={kpiEndDate}
                              onChange={(e) => setKpiStartDate(e.target.value)}
                              className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-2.5 py-1 text-xs font-mono font-bold outline-none focus:border-amber-500/50 cursor-pointer"
                            />
                          </div>

                          {/* Date Range Picker: End Date */}
                          <div className="flex flex-col gap-1 min-w-[125px] flex-1 sm:flex-initial">
                            <label className="micro-label">BİTİŞ TARİHİ</label>
                            <input
                              type="date"
                              value={kpiEndDate}
                              min={kpiStartDate}
                              max="2026-08-31"
                              onChange={(e) => setKpiEndDate(e.target.value)}
                              className="bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg px-2.5 py-1 text-xs font-mono font-bold outline-none focus:border-amber-500/50 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recharts Historical Trend Line Visualizations & Divider (Only visible when not collapsed) */}
                    {!kpiTrendCollapsed && (
                      <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          <div className="lg:col-span-2 bg-[var(--bg-primary)] border border-[var(--border)] p-4 rounded-xl shadow-xs relative">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black text-[var(--text-primary)] block uppercase tracking-wider">
                                📈 KÜMÜLATİF PERFORMANS ENDEKSLERİ (SPI & CPI TRENDİ)
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-500 font-bold font-mono hidden sm:inline">Hedef Eşik: 1.00</span>
                                <button
                                  onClick={() => downloadChartAsPng('spi-cpi-trend-chart', 'SPI_CPI_Trend_Raporu')}
                                  className="p-1.5 bg-[#1e293b]/50 hover:bg-slate-700/60 border border-[var(--border)] rounded-md text-cyan-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                                  title="Grafiği PNG Olarak İndir"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div id="spi-cpi-trend-chart" className="h-[230px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={getHistoricalKpiData()} margin={{ top: 5, right: 15, left: -25, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#cbd5e1'} opacity={0.3} />
                                  <XAxis dataKey="month" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                                  <YAxis domain={[0.6, 1.4]} ticks={[0.6, 0.8, 1.0, 1.2, 1.4]} stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} />
                                  <Tooltip
                                    isAnimationActive={true}
                                    animationDuration={200}
                                    content={({ active, payload, label }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className={`p-3 border rounded-xl shadow-xl animate-fade-in ${
                                            theme === 'dark' ? 'bg-[#0f172a] border-[#334155] text-slate-100' : 'bg-white border-[#e2e8f0] text-slate-900'
                                          }`}>
                                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
                                            <div className="space-y-1">
                                              {payload.map((entry, index) => {
                                                const val = Number(entry.value);
                                                // Check if metric is meeting/exceeding standard threshold
                                                const isExcellent = val >= 1.00 || val >= 90;
                                                return (
                                                  <div key={index} className="flex items-center justify-between gap-4 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                                      <span className="font-bold text-[10px] opacity-80">{entry.name}:</span>
                                                    </div>
                                                    <span className={`font-black font-mono text-[11px] flex items-center gap-0.5 ${
                                                      isExcellent ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                                                    }`}>
                                                      {val.toFixed ? val.toFixed(2) : val}
                                                      {val > 2 ? '%' : ''}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                                  {/* Reference target line at 1.00 */}
                                  <Line type="monotone" dataKey="spi" name="SPI (Program Performans İndeksi)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1000} animationEasing="ease-in-out" />
                                  <Line type="monotone" dataKey="cpi" name="CPI (Maliyet Performans İndeksi)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive={true} animationDuration={1000} animationEasing="ease-in-out" />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="lg:col-span-1 bg-[var(--bg-primary)] border border-[var(--border)] p-4 rounded-xl shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black text-[var(--text-primary)] block uppercase tracking-wider">
                                  🛡️ SAHA VERİMLİLİK VE İSG TREND (%)
                                </span>
                                <button
                                  onClick={() => downloadChartAsPng('safety-efficiency-trend-chart', 'ISG_Saha_Verimlilik_Trend_Raporu')}
                                  className="p-1.5 bg-[#1e293b]/50 hover:bg-slate-700/60 border border-[var(--border)] rounded-md text-cyan-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                                  title="Grafiği PNG Olarak İndir"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                              <div id="safety-efficiency-trend-chart" className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={getHistoricalKpiData()} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#cbd5e1'} opacity={0.3} />
                                    <XAxis dataKey="month" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={8} />
                                    <YAxis domain={[50, 100]} stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={9} />
                                    <Tooltip
                                      isAnimationActive={true}
                                      animationDuration={200}
                                      content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                          return (
                                            <div className={`p-3 border rounded-xl shadow-xl animate-fade-in ${
                                              theme === 'dark' ? 'bg-[#0f172a] border-[#334155] text-slate-100' : 'bg-white border-[#e2e8f0] text-slate-900'
                                            }`}>
                                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
                                              <div className="space-y-1">
                                                {payload.map((entry, index) => {
                                                  const val = Number(entry.value);
                                                  const isExcellent = val >= 90;
                                                  return (
                                                    <div key={index} className="flex items-center justify-between gap-4 text-xs">
                                                      <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                                        <span className="font-bold text-[10px] opacity-80">{entry.name}:</span>
                                                      </div>
                                                      <span className={`font-black font-mono text-[11px] flex items-center gap-0.5 ${
                                                        isExcellent ? 'text-emerald-500 animate-pulse' : 'text-amber-500'
                                                      }`}>
                                                        {val}%
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '6px' }} />
                                    <Line type="monotone" dataKey="verimlilik" name="Saha Verimlilik %" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={true} animationDuration={1000} animationEasing="ease-in-out" />
                                    <Line type="monotone" dataKey="isg" name="İSG Güvenlik Skoru %" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={true} animationDuration={1000} animationEasing="ease-in-out" />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Quick Insight badge based on currently selected filter */}
                            <div className="p-2 bg-slate-500/5 border border-[var(--border)] rounded-lg text-[10px] text-[var(--text-secondary)] mt-2">
                              <strong>Anlık Bulgular:</strong> {kpiDepartment === 'all' && "Küresel bazda hakediş huzu SPI 1.08 ile programın önündedir."}
                              {kpiDepartment === 'insaat' && "🏗️ Kaba inşaat imalatları beton kalıplama hızıyla verimliliği %92'ye ulaştırmıştır."}
                              {kpiDepartment === 'elektrik' && "⚡ Kablolama ve trafo montajları bütçeyi koruyarak CPI endeksini 1.04'e yükseltmiştir."}
                              {kpiDepartment === 'tesisat' && "🔧 Havalandırma kanalları ve mekanik odalarda imalat dengeli devam ediyor."}
                              {kpiDepartment === 'isg' && "🛡️ Yapay Zeka destekli drone turları İSG puanını son 6 ayın zirvesine (%98) ulaştırmıştır."}
                            </div>
                          </div>
                        </div>

                        <hr className="border-[var(--border)] opacity-30" />
                      </div>
                    )}

                    {/* Module Dashboard Views (Children) */}
                    <div>
                      {activeTab === 'plan' && (
                        <PlanView 
                          project={activeProject}
                          projects={projects}
                          tasks={activeProjectWbs}
                          documents={documents.filter(doc => doc.associatedBlockId && activeProject.blocks.some(b => b.id === doc.associatedBlockId))}
                          onAddTask={handleAddTask}
                          onAddDocument={handleAddDocument}
                          onUpdateProject={handleEditProject}
                          onUpdateTask={handleUpdateTask}
                          theme={theme}
                        />
                      )}

                      {activeTab === 'insaat' && (
                        <InsaatView 
                          project={activeProject}
                          projects={projects}
                          tasks={activeProjectWbs}
                          onAddPermit={handleAddPermit}
                          onUpdateProject={handleEditProject}
                          onUpdateTask={handleUpdateTask}
                          theme={theme}
                        />
                      )}

                      {activeTab === 'isletme' && (
                        <IsletmeView 
                          project={activeProject}
                          projects={projects}
                          assets={assets.filter(a => a.associatedProjectId === selectedProjectId)}
                          maintenanceLogs={maintenanceLogs}
                          onAddMaintenanceLog={handleAddMaintenanceLog}
                          onUpdateAssetStatus={handleUpdateAssetStatus}
                          onUpdateProject={handleEditProject}
                          onUpdateAsset={handleUpdateAsset}
                          onUpdateMaintenanceLog={handleUpdateMaintenanceLog}
                          theme={theme}
                        />
                      )}
                    </div>
                  </div>
                )}



              </div>

              {/* PORTFÖY GLOBAL METRİKLERİ (TAB-SPECIFIC) */}
              {false && (
                <div className="w-full space-y-2 mt-1">
                {/* Collapsible Trigger */}
                <div className="flex items-center justify-between select-none px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                      {activeTab === 'plan' ? 'PLANLAMA' : activeTab === 'insaat' ? 'İNŞAAT' : activeTab === 'isletme' ? 'İŞLETME' : 'GENEL'}
                    </span>
                  </div>
                  <button
                    onClick={() => setTopPanelOpen(p => !p)}
                    className="p-1 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer flex items-center justify-center shadow-xs"
                    title={topPanelOpen ? "Özet Metrikleri Gizle" : "Özet Metrikleri Göster"}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${topPanelOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {topPanelOpen && (
                  <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {activeTab === 'plan' && (
                      <>
                        {/* Plan Bütçesi */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#1e40af] to-[#3b82f6] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">Planlama Portföy Bütçesi</span>
                            <span className="p-1 bg-white/10 rounded text-white"><DollarSign className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={7.35} prefix="₺" suffix=" Milyar" />
                            </span>
                            <span className="text-[10px] text-blue-200 block mt-0.5">Sözleşmeli Fizibilite Toplamı</span>
                          </div>
                        </div>

                        {/* Plan İlerleme */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#065f46] to-[#10b981] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Ortalama Plan İlerlemesi</span>
                            <span className="p-1 bg-white/10 rounded text-white"><TrendingUp className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={52.6} prefix="%" />
                            </span>
                            <span className="text-[10px] text-emerald-200 block mt-0.5">Aşamalı Milestone Gerçekleşmesi</span>
                          </div>
                        </div>

                        {/* Plan Dokümanları */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#5b21b6] to-[#8b5cf6] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-100">CDE Planlama Belgeleri</span>
                            <span className="p-1 bg-white/10 rounded text-white"><FileText className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={36} suffix=" Doküman" />
                            </span>
                            <span className="text-[10px] text-purple-200 block mt-0.5">Onay Sürecindeki Pafta & Şartname</span>
                          </div>
                        </div>

                        {/* Plan Riskleri */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#b45309] to-[#f59e0b] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">İmar & Ruhsat Çakışması</span>
                            <span className="p-1 bg-white/10 rounded text-white"><AlertTriangle className="w-3.5 h-3.5 animate-pulse" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={2} suffix=" Risk Bloke" />
                            </span>
                            <span className="text-[10px] text-amber-200 block mt-0.5">Süre & İmar Kritik Aşama Alarmları</span>
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'insaat' && (
                      <>
                        {/* İnşaat Bütçesi */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#0369a1] to-[#0ea5e9] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-100">Aktif Şantiye Bütçesi</span>
                            <span className="p-1 bg-white/10 rounded text-white"><DollarSign className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={4.12} prefix="₺" suffix=" Milyar" />
                            </span>
                            <span className="text-[10px] text-sky-200 block mt-0.5">Saha Yapım Aşaması Yatırımı</span>
                          </div>
                        </div>

                        {/* İnşaat İlerleme */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#047857] to-[#10b981] text-white p-4 rounded-xl shadow border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Şantiyeler Fiziki İlerleme</span>
                            <span className="p-1 bg-white/10 rounded text-white"><TrendingUp className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={45.8} prefix="%" />
                            </span>
                            <span className="text-[10px] text-emerald-200 block mt-0.5">Saha İmalat Ağırlıklı Ortalama</span>
                          </div>
                        </div>

                        {/* İnşaat İzinleri */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#b45309] to-[#d97706] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-100">Yasal Ruhsat & İzinler</span>
                            <span className="p-1 bg-white/10 rounded text-white"><FileCheck className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={12} suffix=" Aktif Onay" />
                            </span>
                            <span className="text-[10px] text-amber-200 block mt-0.5">Belediye & Bakanlık Ruhsatları</span>
                          </div>
                        </div>

                        {/* İnşaat ISG */}
                        <div className="relative overflow-hidden bg-[#ef4444] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-100">Şantiye İSG & Güvenlik</span>
                            <span className="p-1 bg-white/10 rounded text-white"><AlertTriangle className="w-3.5 h-3.5 animate-pulse" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={0} suffix=" Aktif Uyarı" />
                            </span>
                            <span className="text-[10px] text-red-200 block mt-0.5">Güvenli Çalışma Günü: 480+</span>
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'isletme' && (
                      <>
                        {/* İşletme OPEX */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#0d9488] to-[#14b8a6] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-100">Yıllık Operasyonel OPEX</span>
                            <span className="p-1 bg-white/10 rounded text-white"><DollarSign className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={1.85} prefix="₺" suffix=" Milyar" />
                            </span>
                            <span className="text-[10px] text-teal-200 block mt-0.5">Yıllık Tesis & Hizmet Bütçesi</span>
                          </div>
                        </div>

                        {/* İşletme Tesis Sayısı */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#047857] to-[#10b981] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Faal Tesis Envanteri</span>
                            <span className="p-1 bg-white/10 rounded text-white"><Compass className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={28} suffix=" Tesis" />
                            </span>
                            <span className="text-[10px] text-emerald-200 block mt-0.5">Kabulü Yapılmış Aktif Yapılar</span>
                          </div>
                        </div>

                        {/* İşletme İş Emirleri */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#c2410c] to-[#f97316] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-100">Faal Bakım Talepleri</span>
                            <span className="p-1 bg-white/10 rounded text-white"><Wrench className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={4} suffix=" İş Emri" />
                            </span>
                            <span className="text-[10px] text-orange-200 block mt-0.5">SLA Süresindeki Müdahaleler</span>
                          </div>
                        </div>

                        {/* İşletme Sağlık Skoru */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white p-4 rounded-xl border border-white/10 flex flex-col justify-between min-h-[90px]">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-4 -mt-4"></div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">Kritik Varlık Sağlık Skoru</span>
                            <span className="p-1 bg-white/10 rounded text-white"><Cpu className="w-3.5 h-3.5" /></span>
                          </div>
                          <div className="mt-2">
                            <span className="text-lg font-black tracking-tight flex items-center">
                              <AnimatedNumber value={98.4} prefix="%" />
                            </span>
                            <span className="text-[10px] text-blue-200 block mt-0.5">MTBF Sağlık Katsayısı</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Bottom spacing — Harita sekmesinde İSTENMİYOR (kullanıcı
                  isteğiyle: harita kartı ile alt şerit arasında hiç boşluk
                  olmamalı); diğer sekmeler (gantt/dashboard/kpi) için korunur. */}
              {centerTab !== 'map' && <div className="h-2"></div>}

            </main>

            {/* 4. RIGHT SIDEBAR: OPERATIONS & SYSTEM ALARMS */}
            {!isOverlayView && (rightPanelOpen ? (
              <aside className="w-80 xl:w-[350px] shrink-0 flex flex-col gap-3 animate-panel-scale panel-transition origin-right transform relative group/right bg-[var(--bg-secondary)] border-l border-[var(--border)] rounded-none h-full overflow-y-auto p-5 pt-4 select-none z-20 text-[var(--text-primary)]">
                
                {/* Unified Header with aligned Arrow on Left Edge */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] w-full mb-1">
                  <button
                    onClick={() => setRightPanelOpen(false)}
                    className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-amber-500/50 hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shadow-sm ml-1 shrink-0"
                    title="Paneli Gizle"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest pr-1">
                    OPERASYON & DETAYLAR
                  </span>
                </div>
                
                {/* Dynamic Right Sidebars based on activeTab */}
                {activeTab === 'plan' && (
                  <PlanRightPanel project={activeProject} />
                )}

                {activeTab === 'insaat' && (
                  <InsaatRightPanel project={activeProject} notifications={notifications} />
                )}

                {activeTab === 'isletme' && (
                  <IsletmeRightPanel 
                    project={activeProject} 
                    assets={assets.filter(a => a.associatedProjectId === selectedProjectId)} 
                    selectedAssetId={selectedAssetId} 
                  />
                )}

                {activeTab === 'admin' && (
                  <>
                    {/* Canlı Alarm & Sistem Uyarıları */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-md shadow-sm transition-all duration-300">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                          Canlı Alarm Günlüğü
                        </span>
                        <span className="px-1.5 py-0.5 bg-red-600/15 text-red-500 text-[10px] font-extrabold rounded">REALTIME</span>
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                        {notifications.slice(0, 3).map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`p-2 rounded-md border text-[10px] flex gap-2 ${
                              notif.type === 'danger' 
                                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                                : notif.type === 'warning' 
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <div>
                              <p className="font-bold leading-normal">{notif.message}</p>
                              <span className="text-[10px] opacity-70 block mt-0.5">{notif.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CDE Doküman Onay Kuyruğu */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-md shadow-sm transition-all duration-300">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] block mb-3 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Teknik Dosya Onay Kuyruğu
                      </span>

                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                        {documents
                          .filter(d => d.approvalWorkflow.some(step => step.status === 'Pending'))
                          .map((doc) => (
                            <div key={doc.id} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-[10px]">
                              <div className="font-bold text-[var(--text-primary)] truncate" title={doc.name}>
                                {doc.name.split(' (')[0]}
                              </div>
                              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Versiyon: {doc.version} | {doc.fileSize}</p>
                              
                              {/* Approval workflow states */}
                              <div className="mt-2 space-y-1">
                                {doc.approvalWorkflow.map((wf, idx) => (
                                  <div key={idx} className="flex justify-between text-[10px]">
                                    <span className="text-slate-400">{wf.step}:</span>
                                    <span className={wf.status === 'Approved' ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                                      {wf.status === 'Approved' ? 'Onaylı' : 'Bekliyor'}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <button 
                                onClick={() => handleApproveDocument(doc.id)}
                                className="mt-2.5 w-full bg-emerald-600 text-white font-black text-[10px] py-1 rounded hover:bg-emerald-700 transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>CEO Adına Onayla & İmzala</span>
                              </button>
                            </div>
                        ))}

                        {documents.filter(d => d.approvalWorkflow.some(step => step.status === 'Pending')).length === 0 && (
                          <div className="text-[10px] text-slate-500 italic text-center py-4">
                            Onay bekleyen teknik dosya bulunmamaktadır.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Şantiye İşleyiş Kronolojisi Feed */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-md shadow-sm transition-all duration-300">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)] block mb-3">
                        Şantiye Gelişmeler Kronolojisi
                      </span>

                      <div className="space-y-3 text-[10px]">
                        <div className="flex gap-2 relative pl-3 before:absolute before:left-0 before:top-1 before:bottom-0 before:w-[1px] before:bg-[var(--border)]">
                          <span className="absolute left-[-2px] top-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          <div>
                            <strong className="text-[var(--text-primary)]">Bugün 10:15</strong>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Ataköy Metro B-Kule ince imalat hakedişi onaylandı ve banka talimatı kesildi.</p>
                          </div>
                        </div>
                        <div className="flex gap-2 relative pl-3 before:absolute before:left-0 before:top-1 before:bottom-0 before:w-[1px] before:bg-[var(--border)]">
                          <span className="absolute left-[-2px] top-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          <div>
                            <strong className="text-[var(--text-primary)]">Bugün 09:30</strong>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Ankara Çankaya Akıllı Kuleler şantiyesine yeni bağlantı ruhsat izin başvurusu tescillendi.</p>
                          </div>
                        </div>
                        <div className="flex gap-2 relative pl-3">
                          <span className="absolute left-[-2px] top-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          <div>
                            <strong className="text-[var(--text-primary)]">Dün 16:40</strong>
                            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Ataköy C-Blok hidrofor pompa istasyonunda basınç sensör arıza bildirimi yapıldı.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </aside>
            ) : (
              /* Thin Right collapse tab strip (Vertical Button Style - Pinned to right, height fit to text) */
              <div 
                onClick={() => setRightPanelOpen(true)}
                className="hidden xl:flex flex-col items-center justify-start bg-[#0b0f19] border-l border-slate-800 hover:bg-[#13192a] hover:border-emerald-500/40 rounded-none cursor-pointer py-4 px-2.5 transition group shadow-lg h-full w-10 shrink-0 select-none z-20"
                title="Operasyon & Telemetri Panelini Aç"
              >
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                    <ChevronLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <span className="writing-mode-vertical text-[10px] font-black tracking-widest text-[var(--text-secondary)] group-hover:text-emerald-400 uppercase py-1 select-none">
                    OPERASYON & TELEMETRİ
                  </span>
                </div>
              </div>
            ))}

          </div>

        </div>
      )}
      
      {/* 3. MODÜLLER WORKSPACES OVERLAY GRID (from mockup image 3) */}
      {showModullerGrid && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl p-6 shadow-2xl relative animate-fade-in rounded-3xl border transition-colors duration-300 ${
            theme === 'light' 
              ? 'bg-white border-slate-200 text-slate-800' 
              : 'bg-[#111a2e] border-slate-800 text-slate-200'
          }`}>
            <button 
              onClick={() => setShowModullerGrid(false)}
              className={`absolute top-6 right-6 p-2 rounded-xl transition cursor-pointer z-10 ${
                theme === 'light'
                  ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
              id="grid-btn-close"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`mb-6 pb-2 border-b ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}`}>
              <span className="px-2 py-0.5 bg-blue-600/20 text-blue-500 font-bold text-[10px] rounded block w-max uppercase tracking-widest mb-1.5">ODA+PYS</span>
              <h3 className={`text-lg font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Yönetim Modülleri</h3>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Tek veri omurgasına bağlı alt uygulamalara hızlıca erişin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Box 1: Yönetici Dashboard */}
              <div className={`p-4 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition border ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#090d16] border-slate-800'
              }`}>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 mb-2">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h4 className={`text-xs font-black mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Yönetici Analitiği</h4>
                  <p className={`text-[10px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Proje bütçeleri, fiziki imalat ilerlemeleri ve şantiye riskleri özet raporları.</p>
                </div>
                <button 
                  onClick={() => { setCenterTab('dashboard'); setShowModullerGrid(false); }}
                  className="mt-4 text-[10px] font-black text-blue-500 hover:underline text-left text-xs cursor-pointer"
                >
                  Dashboard Panelini Aç →
                </button>
              </div>

              {/* Box 2: Rapor Al */}
              <div className={`p-4 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition border ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#090d16] border-slate-800'
              }`}>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-500 mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className={`text-xs font-black mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Rapor Al (Dışa Aktar)</h4>
                  <p className={`text-[10px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Tüm proje, yapı ve şantiye imalat verilerini PDF veya Excel formatlarında indirin.</p>
                </div>
                <button 
                  onClick={() => { alert('Analitik rapor PDF/Excel olarak dışa aktarılıyor...'); setShowModullerGrid(false); }}
                  className="mt-4 text-[10px] font-black text-emerald-500 hover:underline text-left cursor-pointer"
                >
                  Rapor Oluşturucuyu Aç →
                </button>
              </div>

              {/* Box 3: GIS / BIM / CAD */}
              <div className={`p-4 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition border ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#090d16] border-slate-800'
              }`}>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-500 mb-2">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className={`text-xs font-black mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>GIS / BIM / CAD Ortak Alanı</h4>
                  <p className={`text-[10px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>SHP, KML, DWG ve IFC BIM modellerinin koordinat tabanlı entegrasyonu.</p>
                </div>
                <button 
                  onClick={() => { setActiveTab('insaat'); setShowModullerGrid(false); }}
                  className="mt-4 text-[10px] font-black text-indigo-500 hover:underline text-left cursor-pointer"
                >
                  Ortak Çalışma Konsolu Aç →
                </button>
              </div>

              {/* Box 4: Otomatik Hakediş Raporu */}
              <div className={`p-4 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition border ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#090d16] border-slate-800'
              }`}>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-500 mb-2">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <h4 className={`text-xs font-black mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Otomatik Hakediş Raporu</h4>
                  <p className={`text-[10px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Sahada tamamlanan imalat metrajlarına göre anlık hakediş hiyerarşisi oluşturun.</p>
                </div>
                <button 
                  onClick={() => { setActiveTab('insaat'); setShowModullerGrid(false); }}
                  className="mt-4 text-[10px] font-black text-amber-500 hover:underline text-left cursor-pointer"
                >
                  Hakediş Oluşturucu Aç →
                </button>
              </div>

              {/* Box 5: İK & Tedarik */}
              <div className={`p-4 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition border ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#090d16] border-slate-800'
              }`}>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-500 mb-2">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h4 className={`text-xs font-black mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>İnsan Kaynakları & Tedarik</h4>
                  <p className={`text-[10px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Şantiye mühendis ve taşeron atamaları, kapasite çakışma ve kaynak havuz dengeleme.</p>
                </div>
                <button 
                  onClick={() => { setCenterTab('resources'); setShowModullerGrid(false); }}
                  className="mt-4 text-[10px] font-black text-purple-500 hover:underline text-left cursor-pointer"
                >
                  Kaynak Panelini Aç →
                </button>
              </div>

              {/* Box 6: Doküman Yönetimi */}
              <div className={`p-4 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition border ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#090d16] border-slate-800'
              }`}>
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-500 mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className={`text-xs font-black mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Doküman Yönetimi</h4>
                  <p className={`text-[10px] leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Şartnameler, sözleşmeler ve as-built teknik çizimlerin versiyonlu onay akışları.</p>
                </div>
                <button 
                  onClick={() => { setCenterTab('documents'); setShowModullerGrid(false); }}
                  className="mt-4 text-[10px] font-black text-indigo-500 hover:underline text-left cursor-pointer"
                >
                  Doküman Panelini Aç →
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. STATIC FOOTER */}
      <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border)] py-2 px-5 text-center text-[10px] text-[var(--text-secondary)] font-bold transition-colors duration-300">
        ODA+PYS Platformu © 2026
      </footer>

      {/* 5. GLOBAL SEARCH & COMMAND PALETTE MODAL */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(pId) => {
          setSelectedProjectId(pId);
        }}
        wbsTasks={wbsTasks}
        documents={documents}
        assets={assets}
        setActiveTab={setActiveTab}
        setCenterTab={setCenterTab}
        setCeoPocketMode={setCeoPocketMode}
        setShowModullerGrid={setShowModullerGrid}
      />

      <PermissionDialog
        open={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        camera={permCamera}
        setCamera={setPermCamera}
        microphone={permMicrophone}
        setMicrophone={setPermMicrophone}
        dontAsk={permDontAsk}
        setDontAsk={setPermDontAsk}
        onApply={() => {
          if (permDontAsk) {
            localStorage.setItem('dont_ask_permissions_choice', 'true');
          }
          setShowPermissionModal(false);
        }}
      />

      <AddProjectDialog
        open={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onSubmit={handleAddNewProjectSubmit}
        name={newProjectName}
        setName={setNewProjectName}
        code={newProjectCode}
        setCode={setNewProjectCode}
        location={newProjectLocation}
        setLocation={setNewProjectLocation}
        progress={newProjectProgress}
        setProgress={setNewProjectProgress}
        budget={newProjectBudget}
        setBudget={setNewProjectBudget}
      />

      <EditProjectStatusDialog
        open={showEditProjectStatusModal}
        onClose={() => setShowEditProjectStatusModal(false)}
        onSubmit={handleSaveProjectStatus}
        name={editProjectName}
        setName={setEditProjectName}
        progress={editProjectProgress}
        setProgress={setEditProjectProgress}
        permit={editProjectPermit}
        setPermit={setEditProjectPermit}
        budgetStatus={editProjectBudgetStatus}
        setBudgetStatus={setEditProjectBudgetStatus}
        status={editProjectStatus}
        setStatus={(v) => setEditProjectStatus(v as any)}
      />

    </div>
  );
}
