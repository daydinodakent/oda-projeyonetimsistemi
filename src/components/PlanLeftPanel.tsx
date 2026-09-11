import React, { useState } from 'react';
import { 
  Layers, Box, MapPin, TrendingDown, TrendingUp, Eye, Briefcase, Wrench, Settings, Trash2,
  GitMerge, Activity, Play, CheckCircle2, AlertTriangle, Sliders, Calendar,
  RefreshCw, Plus, ChevronDown, ChevronRight, X, AlertOctagon, Info, Sparkles, ShieldAlert,
  Pencil
} from 'lucide-react';
import { Project } from '../types';

interface PlanLeftPanelProps {
  project: Project;
}

// Hierarchical WBS state model structure
interface WBSNode {
  id: string;
  name: string;
  code: string;
  level: 'phase' | 'package' | 'activity';
  geometryType?: 'polygon' | 'line' | 'point' | '3dbim';
  geometryName?: string;
  status: 'success' | 'warning' | 'danger' | 'active'; // Status colors: emerald, amber, red, siber-blue
  progress: number;
  cpm?: boolean; // On Critical Path
  dependency?: 'FS' | 'SS' | 'FF';
  predecessorCode?: string;
  clash?: boolean;
  clashDetails?: string;
  children?: WBSNode[];
}

export default function PlanLeftPanel({ project }: PlanLeftPanelProps) {
  // Superuser Edit State
  const [isEditingWBS, setIsEditingWBS] = useState(false);

  // Helper to recursively update a node in the tree
  const updateWBSNodeInTree = (nodes: WBSNode[], id: string, name: string, progress: number, status: 'success' | 'warning' | 'danger' | 'active'): WBSNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, name, progress, status };
      }
      if (node.children) {
        return { ...node, children: updateWBSNodeInTree(node.children, id, name, progress, status) };
      }
      return node;
    });
  };

  // 1. Initial State Data Model representing Phase > Package > Activity
  const [wbsTree, setWbsTree] = useState<WBSNode[]>([
    {
      id: 'f1',
      code: 'WBS-1.0',
      name: 'Terminal-1 Altyapı ve Temel İşleri',
      level: 'phase',
      status: 'active',
      progress: 60,
      children: [
        {
          id: 'p1.1',
          code: 'WBS-1.1',
          name: 'Hafriyat ve Zemin Islahı',
          level: 'package',
          status: 'success',
          progress: 100,
          children: [
            {
              id: 'a1.1.1',
              code: 'WBS-1.1.1',
              name: 'Grid Sektör-A Kazı İmalatı',
              level: 'activity',
              geometryType: 'polygon',
              geometryName: 'Sektör-A Temel Kazısı',
              status: 'success',
              progress: 100,
              cpm: false,
              dependency: 'FS',
              predecessorCode: 'WBS-0.9'
            },
            {
              id: 'a1.1.2',
              code: 'WBS-1.1.2',
              name: 'Derin Jet-Grout Kolon İmalatları',
              level: 'activity',
              geometryType: 'point',
              geometryName: 'Zemin Güçlendirme JetGrout',
              status: 'success',
              progress: 100,
              cpm: false,
              dependency: 'FS',
              predecessorCode: 'WBS-1.1.1'
            }
          ]
        },
        {
          id: 'p1.2',
          code: 'WBS-1.2',
          name: 'Temel Betonarme ve Yalıtım',
          level: 'package',
          status: 'warning',
          progress: 45,
          children: [
            {
              id: 'a1.2.1',
              code: 'WBS-1.2.1',
              name: 'Radye Temel Demir & Kalıp İşleri',
              level: 'activity',
              geometryType: 'polygon',
              geometryName: 'Sektör-A Radye Poligonu',
              status: 'active',
              progress: 65,
              cpm: true, // Critical Path
              dependency: 'FS',
              predecessorCode: 'WBS-1.1.2'
            },
            {
              id: 'a1.2.2',
              code: 'WBS-1.2.2',
              name: 'Su Yalıtımı ve Koruma Betonu',
              level: 'activity',
              geometryType: 'polygon',
              geometryName: 'Yalıtım Katman Alanı',
              status: 'warning',
              progress: 20,
              cpm: true, // Critical Path
              dependency: 'SS',
              predecessorCode: 'WBS-1.2.1'
            }
          ]
        },
        {
          id: 'p1.3',
          code: 'WBS-1.3',
          name: 'Ana Altyapı Şebeke Borulaması',
          level: 'package',
          status: 'danger',
          progress: 10,
          children: [
            {
              id: 'a1.3.1',
              code: 'WBS-1.3.1',
              name: 'Yangın ve İçme Suyu Ana Hattı',
              level: 'activity',
              geometryType: 'line',
              geometryName: 'Altyapı Boru Hattı-LineA',
              status: 'danger', // Delay / Red Status
              progress: 15,
              cpm: true, // Critical Path
              clash: true, // Spatial Clash!
              clashDetails: 'Temel Kazısı imalatı henüz tamamlanmadan Yangın Suyu borusu geçirilemez.',
              dependency: 'FS',
              predecessorCode: 'WBS-1.2.1'
            },
            {
              id: 'a1.3.2',
              code: 'WBS-1.3.2',
              name: 'Menhol ve Drenaj Bağlantı Noktaları',
              level: 'activity',
              geometryType: 'point',
              geometryName: 'Drenaj Logarları-PointB',
              status: 'active',
              progress: 5,
              cpm: false,
              dependency: 'FS',
              predecessorCode: 'WBS-1.3.1'
            }
          ]
        }
      ]
    }
  ]);

  // Stepper / Accordion Step States
  const [activeStep, setActiveStep] = useState<number>(1); // 1 to 5 active phases
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'f1': true,
    'p1.1': true,
    'p1.2': true,
    'p1.3': true
  });

  // Simulation Controls States
  const [isCpmHighlightActive, setIsCpmHighlightActive] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [plannedVsActualFilter, setPlannedVsActualFilter] = useState<'both' | 'planned' | 'actual'>('both');
  const [mapColorMode, setMapColorMode] = useState<'progress' | 'cost'>('progress');
  
  // Dynamic Map Layer Control toggles
  const [mapLayers, setMapLayers] = useState({
    mimari: true,
    statik: true,
    altyapi: false,
    peyzaj: false
  });

  // UI Toast overlay helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Event structure targeting Map zoom actions
  const handleZoomToGeometry = (nodeId: string, geomName: string) => {
    showFeedbackToast(`🎯 zoomToGeometry("${nodeId}"): Haritada [${geomName}] konumuna odaklanılıyor...`);
    
    // Dispatch custom client-side window event for GIS engines to catch dynamically
    const event = new CustomEvent('gis-zoom-to-geom', {
      detail: { nodeId, geomName }
    });
    window.dispatchEvent(event);
  };

  const handleZoomToClash = () => {
    showFeedbackToast(`🚨 Zoom-to-Clash: Çakışan "WBS-1.3.1 Yangın Hattı" ve "Sektör-A Kazı Alanı" coğrafi kesişimine odaklanılıyor...`);
    const event = new CustomEvent('gis-zoom-to-clash', {
      detail: { clashId: 'clash-1.3.1' }
    });
    window.dispatchEvent(event);
  };

  const handleSetBaseline = () => {
    showFeedbackToast(`💾 Temel Çizgi (Baseline) kilitlendi. Mevcut planlama hedefleri donduruldu.`);
  };

  const handleRunValidation = () => {
    showFeedbackToast(`🔍 Toplu Coğrafi Doğrulama çalıştırılıyor... Mekânsal veri çakışmaları analiz ediliyor.`);
  };

  // Render Recursive WBS Tree Nodes
  const renderWBSNode = (node: WBSNode, depth = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    
    // Custom status color badge classes
    const statusDotClasses = {
      success: 'bg-[#10b981] shadow-[0_0_8px_#10b981]',
      warning: 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]',
      danger: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]',
      active: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
    }[node.status];

    const itemBorderClasses = isCpmHighlightActive && node.cpm
      ? 'border border-red-500/80 bg-red-500/10 dark:bg-red-950/25 shadow-[0_0_12px_rgba(239,68,68,0.45)] animate-pulse'
      : 'border border-[var(--border)] hover:border-indigo-500/45 bg-[var(--bg-primary)]/40';

    return (
      <div key={node.id} className="w-full">
        {/* Row element */}
        <div 
          style={{ paddingLeft: `${depth * 10}px` }}
          className={`flex items-center justify-between p-2 rounded-lg mb-1.5 transition duration-200 cursor-pointer ${itemBorderClasses}`}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            } else if (node.geometryName) {
              handleZoomToGeometry(node.id, node.geometryName);
            }
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <span className="text-[var(--text-secondary)]">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <div className={`w-1.5 h-1.5 rounded-full ${statusDotClasses}`} />
              </span>
            )}
            
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
                {node.code}
                {node.cpm && <span className="text-[10px] font-black bg-red-500/20 text-red-500 px-1 rounded">CPM</span>}
              </span>
              <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">{node.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Progress Badge */}
            <span className="text-[10px] font-extrabold bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] px-1.5 py-0.5 rounded-md">
              %{node.progress}
            </span>

            {/* Spatial geometry badge */}
            {node.geometryType && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  if (node.geometryName) {
                    handleZoomToGeometry(node.id, node.geometryName);
                  }
                }}
                className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition hover:scale-105 active:scale-95 ${
                  node.geometryType === 'polygon' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : node.geometryType === 'line'
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : node.geometryType === 'point'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                }`}
                title="Haritada Konuma Yakınlaş"
              >
                {node.geometryType === 'polygon' ? 'Poligon' : node.geometryType === 'line' ? 'Hat' : node.geometryType === 'point' ? 'Nokta' : 'BIM'}
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Children */}
        {isExpanded && hasChildren && node.children && (
          <div className="space-y-0.5">
            {node.children.map(child => renderWBSNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-3 text-[var(--text-primary)] select-none">
      
      {/* Immersive Glassmorphic Action Panel Wrapper */}
      <div className="relative flex flex-col gap-3 w-full h-full">
        
        {/* Absolute Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] pointer-events-none rounded-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 blur-[50px] pointer-events-none rounded-none" />

        {/* Interactive Stepper Navigation (5 Step Accordion List) */}
        <div className="space-y-2">
          
          {/* STEP 1: KAPSAM & WBS */}
          <div className={`rounded-xl border transition-all duration-300 ${activeStep === 1 ? 'border-[var(--border)] bg-[var(--bg-secondary)]/80 shadow-sm' : 'border-[var(--border)] bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-primary)]'}`}>
            <div className="w-full p-3 flex items-center justify-between">
              <button 
                onClick={() => setActiveStep(prev => prev === 1 ? 0 : 1)}
                className="flex-1 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center transition-colors ${activeStep === 1 ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                    01
                  </span>
                  <span className="section-eyebrow text-left">Mekansal İş Kırılımları</span>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  %60 Tamamlandı
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingWBS(true);
                  }}
                  className="p-1 hover:bg-slate-800 rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0"
                  title="İş Kırılımlarını Düzenle (SuperUser)"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {activeStep === 1 && (
              <div className="p-3 pt-0 border-t border-[var(--border)] mt-1 animate-fade-in text-[var(--text-primary)] space-y-3">
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Projeye ait mekânsal kırılım ve iş paketleri hiyerarşik ağacı. Nesnelere tıklayarak CBS haritasında odağı değiştirebilirsiniz.
                </p>

                {/* Tree loop */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {wbsTree.map(node => renderWBSNode(node))}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: BAĞIMLILIK & CPM */}
          <div className={`rounded-xl border transition-all duration-300 ${activeStep === 2 ? 'border-[var(--border)] bg-[var(--bg-secondary)]/80 shadow-sm' : 'border-[var(--border)] bg-[var(--bg-primary)]/40 hover:bg-[var(--bg-primary)]'}`}>
            <button 
              onClick={() => setActiveStep(prev => prev === 2 ? 0 : 2)}
              className="w-full p-3 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center transition-colors ${activeStep === 2 ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                  02
                </span>
                <span className="section-eyebrow text-left">BAĞIMLILIK & CPM ANALİZİ</span>
              </div>
              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                1 Risk Algılandı
              </span>
            </button>

            {activeStep === 2 && (
              <div className="p-3 pt-0 border-t border-[var(--border)] mt-1 animate-fade-in text-[var(--text-primary)] space-y-3.5">
                
                {/* CPM Toggle switch */}
                <div className="flex items-center justify-between p-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-[var(--text-primary)]">KRİTİK YOL (CPM) GÖSTERİMİ</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">Kritik yoldaki işleri listede neon kırmızı ile parlat.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isCpmHighlightActive}
                      onChange={(e) => {
                        setIsCpmHighlightActive(e.target.checked);
                        showFeedbackToast(e.target.checked ? '🛑 Kritik Yol (CPM) vurgulama aktif edildi.' : 'Vurgulama kapatıldı.');
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-400 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-500" />
                  </label>
                </div>

                {/* Spatial Clash Alerts Panel */}
                <div className="p-3 bg-red-500/5 dark:bg-red-950/20 border border-red-500/30 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-red-500/10 rounded-full blur-md" />
                  <div className="flex items-center gap-1.5 text-red-500 font-bold text-[10px] uppercase tracking-wider">
                    <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                    <span>MEKÂNSAL ÇAKIŞMA UYARISI (SPATIAL CLASH)</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-primary)] leading-relaxed">
                    <strong>WBS-1.3.1 Yangın Suyu Ana Hattı</strong> ile <strong>WBS-1.1.1 Temel Kazı imalatı</strong> coğrafi olarak kesişmektedir: <span className="text-red-500 font-bold">"Kazı bitmeden boru serilemez."</span>
                  </p>
                  
                  {/* Zoom to Clash Action button */}
                  <button 
                    onClick={handleZoomToClash}
                    className="w-full mt-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 text-[10px] font-black uppercase rounded-lg border border-red-500/30 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Zoom-to-Clash (Çakışmaya Odaklan)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Selected Project Parcel Quick Box */}
        <div className="p-3 bg-[var(--bg-secondary)] rounded-xl text-xs space-y-1.5 border border-[var(--border)] relative shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest">
              PARSEL & ADA ÖZETİ
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex flex-col">
              <span className="text-[var(--text-secondary)]">Ada/Parsel</span>
              <span className="font-extrabold text-[var(--text-primary)] truncate font-mono">{project.adaParcel}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[var(--text-secondary)]">Lokasyon</span>
              <span className="font-extrabold text-[var(--text-primary)] truncate">{project.location}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Toast inside sidebar to capture user actions */}
        {toastMessage && (
          <div className="absolute bottom-16 left-3 right-3 bg-[var(--bg-secondary)] border border-[var(--border)] p-2.5 rounded-lg text-[10px] text-[var(--text-primary)] shadow-xl z-50 flex gap-2 animate-fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0 mt-1" />
            <div className="flex-1 text-[var(--text-primary)] font-bold">
              {toastMessage}
            </div>
            <button onClick={() => setToastMessage(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 self-start">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* WBS Edit Modal (Süper Kullanıcı) */}
        {isEditingWBS && (
          <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-[#141416] border border-[#2c2c2e] p-5 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto space-y-4">
              <div className="flex justify-between items-center border-b border-[#2c2c2e] pb-2">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">İş Kırılımları Düzenleme (SpU)</h3>
                </div>
                <button onClick={() => setIsEditingWBS(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-[10px] text-slate-400">
                Süper kullanıcı yetkisiyle tüm iş paketlerinin adını, tamamlanma yüzdesini ve durum rengini gerçek zamanlı güncelleyebilirsiniz.
              </p>
              
              <div className="space-y-3 pt-2">
                {(() => {
                  const getFlatNodes = (nodes: WBSNode[]): WBSNode[] => {
                    let res: WBSNode[] = [];
                    nodes.forEach(n => {
                      res.push(n);
                      if (n.children) {
                        res = res.concat(getFlatNodes(n.children));
                      }
                    });
                    return res;
                  };
                  const flatNodes = getFlatNodes(wbsTree);
                  return flatNodes.map(node => (
                    <div key={node.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-indigo-400">{node.code}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{node.level}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-[10px] text-slate-400 font-bold uppercase">İŞ ADI</label>
                        <input 
                          type="text"
                          value={node.name}
                          onChange={(e) => {
                            const updated = updateWBSNodeInTree(wbsTree, node.id, e.target.value, node.progress, node.status);
                            setWbsTree(updated);
                          }}
                          className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-400 font-bold uppercase">İLERLEME (%)</label>
                          <input 
                            type="number"
                            min="0"
                            max="100"
                            value={node.progress}
                            onChange={(e) => {
                              const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              const updated = updateWBSNodeInTree(wbsTree, node.id, node.name, val, node.status);
                              setWbsTree(updated);
                            }}
                            className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-400 font-bold uppercase">DURUM</label>
                          <select 
                            value={node.status}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              const updated = updateWBSNodeInTree(wbsTree, node.id, node.name, node.progress, val);
                              setWbsTree(updated);
                            }}
                            className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="success">Success (Yeşil)</option>
                            <option value="warning">Warning (Sarı)</option>
                            <option value="danger">Danger (Kırmızı)</option>
                            <option value="active">Active (Mavi)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <button 
                onClick={() => {
                  setIsEditingWBS(false);
                  showFeedbackToast('💾 İş Kırılımları ve ilerleme bilgileri başarıyla güncellendi.');
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white rounded-xl transition cursor-pointer"
              >
                TAMAMLAYIN VE KAYDEDİN
              </button>
            </div>
          </div>
        )}

        {/* 3. ALT SABİT AKSİYON ALANI (Footer Actions) */}
        <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-1.5">
          
          <button
            onClick={() => showFeedbackToast('➕ Yeni İmalat / WBS Kalemi Ekleme sihirbazı başlatıldı.')}
            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>YENİ İMALAT / WBS KALEMİ EKLE</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleSetBaseline}
              className="py-1.5 px-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border)] text-[10px] font-black text-[var(--text-primary)] rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>BASELİNE KİLİTLE</span>
            </button>

            <button
              onClick={handleRunValidation}
              className="py-1.5 px-1 bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border)] text-[10px] font-black text-[var(--text-primary)] rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <RefreshCw className="w-3 h-3 text-cyan-500 animate-spin-slow" />
              <span>COĞRAFİ DOĞRULAMA</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
