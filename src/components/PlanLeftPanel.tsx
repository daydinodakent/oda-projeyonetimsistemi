import React, { useState } from 'react';
import { 
  Layers, MapPin, TrendingDown, TrendingUp, Eye, Briefcase, Wrench, Settings, Trash2,
  GitMerge, Activity, Play, CheckCircle2, AlertTriangle, Sliders, Calendar,
  RefreshCw, Plus, ChevronDown, ChevronRight, X, AlertOctagon, Info, Sparkles, ShieldAlert,
  Pencil
} from 'lucide-react';
import { Project } from '../types';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import AppDialog from './chrome/AppDialog';
import ActionButton from './ui/ActionButton';
import FeedbackToast from './ui/FeedbackToast';
import StepAccordion from './ui/StepAccordion';
import SwitchRow from './ui/SwitchRow';
import Tag from './ui/Tag';
import type { Tone } from './ui/tone';

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
  const theme = useTheme();
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

  const GEOM_TAG: Record<NonNullable<WBSNode['geometryType']>, { tone: Tone; label: string }> = {
    polygon: { tone: 'success', label: 'Poligon' },
    line: { tone: 'info', label: 'Hat' },
    point: { tone: 'warning', label: 'Nokta' },
    '3dbim': { tone: 'purple', label: 'BIM' },
  };

  // Render Recursive WBS Tree Nodes
  const renderWBSNode = (node: WBSNode, depth = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const cpmHot = isCpmHighlightActive && node.cpm;
    const statusColor = theme.palette[node.status === 'danger' ? 'error' : node.status === 'active' ? 'info' : node.status].main;

    return (
      <Box key={node.id} sx={{ width: '100%' }}>
        {/* Row element */}
        <Box
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            } else if (node.geometryName) {
              handleZoomToGeometry(node.id, node.geometryName);
            }
          }}
          sx={{
            pl: `${depth * 10 + 8}px`,
            pr: 2,
            py: 2,
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'all .2s',
            border: 1,
            borderColor: cpmHot ? alpha(theme.palette.error.main, 0.8) : 'divider',
            bgcolor: cpmHot ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.background.default, 0.4),
            boxShadow: cpmHot ? `0 0 12px ${alpha(theme.palette.error.main, 0.45)}` : 'none',
            '&:hover': { borderColor: cpmHot ? undefined : alpha(theme.palette.secondary.main, 0.45) },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {hasChildren ? (
              <Box component="span" sx={{ color: 'text.secondary', display: 'flex' }}>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </Box>
            ) : (
              <Box component="span" sx={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Typography component="span" sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 1 }}>
                {node.code}
                {node.cpm && <Tag tone="error" variant="plain">CPM</Tag>}
              </Typography>
              <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: 'text.primary' }}>{node.name}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Tag>%{node.progress}</Tag>
            {node.geometryType && (
              <Tag
                tone={GEOM_TAG[node.geometryType].tone}
                uppercase
                title="Haritada Konuma Yakınlaş"
                onClick={(e) => {
                  e.stopPropagation();
                  if (node.geometryName) {
                    handleZoomToGeometry(node.id, node.geometryName);
                  }
                }}
              >
                {GEOM_TAG[node.geometryType].label}
              </Tag>
            )}
          </Box>
        </Box>

        {/* Collapsible Children */}
        {isExpanded && hasChildren && node.children && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {node.children.map((child) => renderWBSNode(child, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const getFlatNodes = (nodes: WBSNode[]): WBSNode[] => {
    let res: WBSNode[] = [];
    nodes.forEach((n) => {
      res.push(n);
      if (n.children) res = res.concat(getFlatNodes(n.children));
    });
    return res;
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, color: 'text.primary', userSelect: 'none' }}>
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3, width: '100%', height: '100%' }}>
        {/* Ambient glow */}
        <Box sx={{ position: 'absolute', top: 0, right: 0, width: 128, height: 128, bgcolor: alpha(theme.palette.secondary.main, 0.1), filter: 'blur(60px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: 96, height: 96, bgcolor: alpha(theme.palette.info.main, 0.1), filter: 'blur(50px)', pointerEvents: 'none' }} />

        {/* Stepper (accordion) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StepAccordion
            step="01"
            title="Mekansal İş Kırılımları"
            tone="secondary"
            active={activeStep === 1}
            onToggle={() => setActiveStep((prev) => (prev === 1 ? 0 : 1))}
            trailing={
              <>
                <Tag tone="success" variant="plain">%60 Tamamlandı</Tag>
                <IconButton size="small" title="İş Kırılımlarını Düzenle (SuperUser)" onClick={() => setIsEditingWBS(true)} sx={{ p: 1, color: 'text.secondary' }}>
                  <Pencil className="w-3.5 h-3.5" />
                </IconButton>
              </>
            }
          >
            <Typography sx={{ fontSize: 10, lineHeight: 1.6, color: 'text.secondary' }}>
              Projeye ait mekânsal kırılım ve iş paketleri hiyerarşik ağacı. Nesnelere tıklayarak CBS haritasında odağı değiştirebilirsiniz.
            </Typography>
            <Box sx={{ maxHeight: 220, overflowY: 'auto', pr: 1 }}>{wbsTree.map((node) => renderWBSNode(node))}</Box>
          </StepAccordion>

          <StepAccordion
            step="02"
            title="BAĞIMLILIK & CPM ANALİZİ"
            tone="error"
            active={activeStep === 2}
            onToggle={() => setActiveStep((prev) => (prev === 2 ? 0 : 2))}
            trailing={<Tag tone="error" variant="plain">1 Risk Algılandı</Tag>}
          >
            <SwitchRow
              tone="error"
              title="KRİTİK YOL (CPM) GÖSTERİMİ"
              description="Kritik yoldaki işleri listede neon kırmızı ile parlat."
              checked={isCpmHighlightActive}
              onChange={(checked) => {
                setIsCpmHighlightActive(checked);
                showFeedbackToast(checked ? '🛑 Kritik Yol (CPM) vurgulama aktif edildi.' : 'Vurgulama kapatıldı.');
              }}
            />

            {/* Spatial Clash Alerts Panel */}
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: alpha(theme.palette.error.main, 0.05), border: 1, borderColor: alpha(theme.palette.error.main, 0.3), borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'error.main', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>MEKÂNSAL ÇAKIŞMA UYARISI (SPATIAL CLASH)</span>
              </Box>
              <Typography sx={{ fontSize: 10, lineHeight: 1.6, color: 'text.primary' }}>
                <strong>WBS-1.3.1 Yangın Suyu Ana Hattı</strong> ile <strong>WBS-1.1.1 Temel Kazı imalatı</strong> coğrafi olarak kesişmektedir:{' '}
                <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>"Kazı bitmeden boru serilemez."</Box>
              </Typography>
              <ActionButton kind="soft" tone="error" icon={<Sliders className="w-3 h-3" />} onClick={handleZoomToClash}>
                Zoom-to-Clash (Çakışmaya Odaklan)
              </ActionButton>
            </Box>
          </StepAccordion>
        </Box>

        {/* Selected Project Parcel Quick Box */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, fontSize: 12, border: 1, borderColor: 'divider', boxShadow: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.1em' }}>PARSEL & ADA ÖZETİ</Typography>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontSize: 10 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Ada/Parsel</Typography>
              <Typography noWrap sx={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}>{project.adaParcel}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Lokasyon</Typography>
              <Typography noWrap sx={{ fontSize: 10, fontWeight: 800 }}>{project.location}</Typography>
            </Box>
          </Box>
        </Box>

        <FeedbackToast message={toastMessage} onClose={() => setToastMessage(null)} />

        {/* WBS Edit Modal (Süper Kullanıcı) */}
        <AppDialog
          open={isEditingWBS}
          onClose={() => setIsEditingWBS(false)}
          badge="İş Kırılımları Düzenleme (SpU)"
          tone="secondary"
          submitLabel="TAMAMLAYIN VE KAYDEDİN"
          onSubmit={() => {
            setIsEditingWBS(false);
            showFeedbackToast('💾 İş Kırılımları ve ilerleme bilgileri başarıyla güncellendi.');
          }}
        >
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
            Süper kullanıcı yetkisiyle tüm iş paketlerinin adını, tamamlanma yüzdesini ve durum rengini gerçek zamanlı güncelleyebilirsiniz.
          </Typography>
          {getFlatNodes(wbsTree).map((node) => (
            <Box key={node.id} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'secondary.light' }}>{node.code}</Typography>
                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>{node.level}</Typography>
              </Box>
              <TextField
                label="İŞ ADI"
                color="secondary"
                value={node.name}
                onChange={(e) => setWbsTree(updateWBSNodeInTree(wbsTree, node.id, e.target.value, node.progress, node.status))}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="İLERLEME (%)"
                  type="number"
                  color="secondary"
                  value={node.progress}
                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setWbsTree(updateWBSNodeInTree(wbsTree, node.id, node.name, val, node.status));
                  }}
                />
                <TextField
                  select
                  label="DURUM"
                  color="secondary"
                  value={node.status}
                  onChange={(e) => setWbsTree(updateWBSNodeInTree(wbsTree, node.id, node.name, node.progress, e.target.value as WBSNode['status']))}
                >
                  <MenuItem value="success">Success (Yeşil)</MenuItem>
                  <MenuItem value="warning">Warning (Sarı)</MenuItem>
                  <MenuItem value="danger">Danger (Kırmızı)</MenuItem>
                  <MenuItem value="active">Active (Mavi)</MenuItem>
                </TextField>
              </Box>
            </Box>
          ))}
        </AppDialog>

        {/* Footer Actions */}
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ActionButton kind="solid" tone="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => showFeedbackToast('➕ Yeni İmalat / WBS Kalemi Ekleme sihirbazı başlatıldı.')}>
            YENİ İMALAT / WBS KALEMİ EKLE
          </ActionButton>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <ActionButton icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />} onClick={handleSetBaseline}>BASELİNE KİLİTLE</ActionButton>
            <ActionButton icon={<RefreshCw className="w-3 h-3 text-cyan-500 animate-spin-slow" />} onClick={handleRunValidation}>COĞRAFİ DOĞRULAMA</ActionButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
