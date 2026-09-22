import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, X, Briefcase, HardHat, Wrench, Building2, FileText, 
  Layers, UserCheck, LayoutGrid, DollarSign, Calendar, MapPin, 
  Clock, ShieldAlert, Cpu, ArrowRight, CornerDownLeft, Sparkles,
  TrendingUp, CheckCircle, AlertCircle
} from 'lucide-react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Project, WBSTask, ProjectDocument, Asset, Permit } from '../types';

const BADGE_TONES: Record<string, { fg: string }> = {
  blue: { fg: '#60a5fa' },
  emerald: { fg: '#34d399' },
  amber: { fg: '#fbbf24' },
  sky: { fg: '#38bdf8' },
  purple: { fg: '#c084fc' },
  rose: { fg: '#fb7185' },
  indigo: { fg: '#818cf8' },
  yellow: { fg: '#facc15' },
  cyan: { fg: '#22d3ee' },
  slate: { fg: '#cbd5e1' },
};

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'project' | 'task' | 'block' | 'document' | 'permit' | 'asset' | 'navigation' | 'layer';
  badge?: string;
  /** Rozet rengi (ton adı): blue | emerald | amber | sky | purple | rose | indigo | yellow | cyan */
  badgeColor?: string;
  action: () => void;
  metadata?: {
    projectId?: string;
    cost?: string;
    progress?: number;
    status?: string;
    date?: string;
  };
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  wbsTasks: Record<string, WBSTask[]>;
  documents: ProjectDocument[];
  assets: Asset[];
  setActiveTab: (tab: 'plan' | 'insaat' | 'isletme' | 'admin') => void;
  setCenterTab: (tab: '3d' | 'kpis') => void;
  setCeoPocketMode: (val: boolean) => void;
  setShowModullerGrid: (val: boolean) => void;
}

type FilterCategory = 'all' | 'project' | 'task' | 'block' | 'document' | 'asset' | 'navigation';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  projects,
  selectedProjectId,
  onSelectProject,
  wbsTasks,
  documents,
  assets,
  setActiveTab,
  setCenterTab,
  setCeoPocketMode,
  setShowModullerGrid,
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Global hotkey listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compile full search index
  const searchIndex = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];

    // 1. Navigation & System Modules
    items.push(
      {
        id: 'nav-plan',
        title: 'Plan Yönetimi & Ruhsat / WBS / CDE',
        subtitle: 'Konsept tasarım, yasal izinler, WBS ağacı ve bütçe planlama paneli',
        category: 'navigation',
        badge: 'Modül',
        badgeColor: 'blue',
        action: () => {
          setActiveTab('plan');
          setCeoPocketMode(false);
          onClose();
        }
      },
      {
        id: 'nav-insaat',
        title: 'İnşaat Yönetimi & 4D / Sahadan Veri / Metraj',
        subtitle: 'Şantiye ilerleme takibi, iş programı, hakedişler ve drone analizi',
        category: 'navigation',
        badge: 'Modül',
        badgeColor: 'emerald',
        action: () => {
          setActiveTab('insaat');
          setCeoPocketMode(false);
          onClose();
        }
      },
      {
        id: 'nav-isletme',
        title: 'İşletme Yönetimi & Tesis / Varlık / Bakım (FM)',
        subtitle: 'Bina ekipmanları, sensörler, periyodik bakım ve enerji izleme',
        category: 'navigation',
        badge: 'Modül',
        badgeColor: 'amber',
        action: () => {
          setActiveTab('isletme');
          setCeoPocketMode(false);
          onClose();
        }
      },
      {
        id: 'nav-admin',
        title: 'Admin Paneli (PostGIS & PostgreSQL Tabloları)',
        subtitle: 'CBS katman yönetimi, kullanıcı rolleri, denetim logları ve ham veri tablosu',
        category: 'navigation',
        badge: 'Yönetim',
        badgeColor: 'sky',
        action: () => {
          setActiveTab('admin');
          setCeoPocketMode(false);
          onClose();
        }
      },
      {
        id: 'nav-3d',
        title: 'Harita 3D Görünümü (MapLibre GL JS)',
        subtitle: '3D binalar, arazi yükseklikleri, katman kontrolleri ve hava fotoğrafları',
        category: 'navigation',
        badge: 'Harita',
        badgeColor: 'purple',
        action: () => {
          setCenterTab('3d');
          setCeoPocketMode(false);
          onClose();
        }
      },
      {
        id: 'nav-kpis',
        title: 'Dinamik KPI ve Analitik Göstergeler',
        subtitle: 'Bütçe dağılımı, S-Eğrisi EVM performansı ve kritik yol analizleri',
        category: 'navigation',
        badge: 'Analiz',
        badgeColor: 'rose',
        action: () => {
          setCenterTab('kpis');
          setCeoPocketMode(false);
          onClose();
        }
      },
      {
        id: 'nav-moduller',
        title: 'Analiz & Modül Araçları Menüsü',
        subtitle: 'Maliyet optimizasyonu, 4D simülasyon, BIM/CAD entegrasyon konsolu',
        category: 'navigation',
        badge: 'Konsol',
        badgeColor: 'indigo',
        action: () => {
          setShowModullerGrid(true);
          onClose();
        }
      },
      {
        id: 'nav-ceo',
        title: 'CEO Mobil Görünümü (Mobil Şantiye Nabzı)',
        subtitle: 'Yönetici seviyesi kritik özetler, nakit akışı ve anlık şantiye riskleri',
        category: 'navigation',
        badge: 'Mobil',
        badgeColor: 'yellow',
        action: () => {
          setCeoPocketMode(true);
          onClose();
        }
      }
    );

    // 2. Projects
    projects.forEach(p => {
      items.push({
        id: `proj-${p.id}`,
        title: p.name,
        subtitle: `${p.code} • ${p.location} • Ada/Parsel: ${p.adaParcel}`,
        category: 'project',
        badge: `%${p.overallProgress} İlerleme`,
        badgeColor: 'blue',
        metadata: {
          projectId: p.id,
          cost: `₺${p.budget}M Bütçe`,
          progress: p.overallProgress,
          status: p.status
        },
        action: () => {
          onSelectProject(p.id);
          onClose();
        }
      });

      // 3. Blocks inside Project
      p.blocks?.forEach(b => {
        items.push({
          id: `block-${b.id}`,
          title: `${b.name} (${p.name.split(' - ')[0]})`,
          subtitle: `Yükseklik: ${b.height}m • Kat Sayısı: ${b.floors} Kat • Durum: ${b.status}`,
          category: 'block',
          badge: `%${b.progress} Yapı`,
          badgeColor: 'cyan',
          metadata: {
            projectId: p.id,
            progress: b.progress,
            status: b.status
          },
          action: () => {
            onSelectProject(p.id);
            setCenterTab('3d');
            setActiveTab('insaat');
            onClose();
          }
        });
      });

      // 4. Permits inside Project
      p.permits?.forEach(pm => {
        items.push({
          id: `permit-${pm.id}`,
          title: pm.name,
          subtitle: `${pm.authority} • Kapsam: ${pm.geographicScope} • Geçerlilik: ${pm.expiryDate}`,
          category: 'document',
          badge: pm.status,
          badgeColor: pm.status === 'Alındı' ? 'emerald' : 'amber',
          metadata: {
            projectId: p.id,
            status: pm.status,
            date: pm.expiryDate
          },
          action: () => {
            onSelectProject(p.id);
            setActiveTab('plan');
            onClose();
          }
        });
      });
    });

    // 5. WBS Tasks
    (Object.entries(wbsTasks) as [string, WBSTask[]][]).forEach(([pId, tasks]) => {
      const proj = projects.find(p => p.id === pId);
      if (Array.isArray(tasks)) {
        tasks.forEach(t => {
          items.push({
            id: `task-${t.id}`,
            title: `[WBS ${t.wbsCode}] ${t.name}`,
            subtitle: `Proje: ${proj?.name || pId} • Taşeron: ${t.contractor} • Sorumlu: ${t.responsible}`,
            category: 'task',
            badge: `%${t.progress} (${t.status})`,
            badgeColor: 'emerald',
            metadata: {
              projectId: pId,
              cost: `₺${t.cost}M`,
              progress: t.progress,
              status: t.status,
              date: `${t.startDate} - ${t.endDate}`
            },
            action: () => {
              onSelectProject(pId);
              setActiveTab('insaat');
              onClose();
            }
          });
        });
      }
    });

    // 6. Documents (CDE)
    documents.forEach(doc => {
      items.push({
        id: `doc-${doc.id}`,
        title: doc.name,
        subtitle: `Versiyon: ${doc.version} • Boyut: ${doc.fileSize} • Yüklenme: ${doc.uploadDate}`,
        category: 'document',
        badge: 'CDE Dosyası',
        badgeColor: 'purple',
        metadata: {
          date: doc.uploadDate
        },
        action: () => {
          setActiveTab('plan');
          onClose();
        }
      });
    });

    // 7. Assets / Facilities (FM)
    assets.forEach(a => {
      const proj = projects.find(p => p.id === a.associatedProjectId);
      items.push({
        id: `asset-${a.id}`,
        title: a.name,
        subtitle: `Tür: ${a.type} • Üretici: ${a.manufacturer} • Proje: ${proj?.name || a.associatedProjectId}`,
        category: 'asset',
        badge: a.status,
        badgeColor: a.status === 'Sorunsuz' ? 'emerald' : 'rose',
        metadata: {
          projectId: a.associatedProjectId,
          cost: `₺${a.maintenanceCost}M Bakım`,
          status: a.status,
          date: `Son Bakım: ${a.lastMaintenanceDate}`
        },
        action: () => {
          if (a.associatedProjectId) onSelectProject(a.associatedProjectId);
          setActiveTab('isletme');
          onClose();
        }
      });
    });

    return items;
  }, [projects, wbsTasks, documents, assets, onSelectProject, setActiveTab, setCenterTab, setCeoPocketMode, setShowModullerGrid, onClose]);

  // Filtered results based on search query & category
  const filteredResults = useMemo(() => {
    let list = searchIndex;

    if (activeCategory !== 'all') {
      if (activeCategory === 'document') {
        list = list.filter(item => item.category === 'document' || item.category === 'permit');
      } else {
        list = list.filter(item => item.category === activeCategory);
      }
    }

    if (!query.trim()) {
      // Return top priority suggestions (navigation, projects, key tasks)
      return list.slice(0, 15);
    }

    const lowerQuery = query.toLowerCase().trim();
    const queryTokens = lowerQuery.split(' ').filter(Boolean);

    return list
      .filter(item => {
        const text = `${item.title} ${item.subtitle} ${item.badge || ''} ${item.metadata?.cost || ''} ${item.metadata?.status || ''}`.toLowerCase();
        return queryTokens.every(token => text.includes(token));
      })
      .slice(0, 30);
  }, [searchIndex, query, activeCategory]);

  // Handle keyboard navigation in list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
      scrollToSelected(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
      scrollToSelected(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].action();
      }
    }
  };

  const scrollToSelected = (index: number) => {
    if (!resultsContainerRef.current) return;
    const items = resultsContainerRef.current.querySelectorAll('[data-search-item]');
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  };

  const getCategoryIcon = (category: SearchResultItem['category']) => {
    switch (category) {
      case 'project':
        return <Briefcase className="w-4 h-4 text-blue-400" />;
      case 'task':
        return <HardHat className="w-4 h-4 text-emerald-400" />;
      case 'block':
        return <Building2 className="w-4 h-4 text-cyan-400" />;
      case 'document':
      case 'permit':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'asset':
        return <Wrench className="w-4 h-4 text-amber-400" />;
      case 'navigation':
        return <LayoutGrid className="w-4 h-4 text-indigo-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchQuery.toLowerCase().trim() ? (
            <Box key={i} component="span" sx={{ color: '#facc15', textDecoration: 'underline', textDecorationColor: alpha('#facc15', 0.4), bgcolor: alpha('#facc15', 0.1), px: 0.5, borderRadius: 0.5 }}>
              {part}
            </Box>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const kbd = (label: string) => (
    <Box component="kbd" sx={{ px: 1, py: 0.5, fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', bgcolor: '#1e293b', border: 1, borderColor: '#334155', borderRadius: 1 }}>
      {label}
    </Box>
  );

  const filters: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'project', label: 'Projeler' },
    { id: 'task', label: 'WBS & Görevler' },
    { id: 'block', label: 'Yapılar & Bloklar' },
    { id: 'document', label: 'Belgeler & İzinler' },
    { id: 'asset', label: 'Ekipmanlar (FM)' },
    { id: 'navigation', label: 'Modüller' },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={false}
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start', pt: { xs: 16, sm: 20 } } }}
      slotProps={{
        backdrop: { sx: { bgcolor: alpha('#000', 0.75), backdropFilter: 'blur(12px)' } },
        paper: {
          sx: {
            width: 672,
            maxWidth: 'calc(100% - 24px)',
            m: 0,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            border: 1,
            borderColor: 'divider',
            borderRadius: 4,
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Search Input Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 4, py: 3.5, borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.background.default, 0.8) }}>
        <Search className="w-5 h-5 text-sky-400 shrink-0" />
        <InputBase
          inputRef={inputRef}
          id="global-search-input"
          fullWidth
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Proje, WBS görevi, bina bloğu, ruhsat veya modül ara... (örn: Ataköy, Sky Tower, 01, DHMİ)"
          sx={{ fontSize: { xs: 12, sm: 14 }, fontWeight: 500, color: 'text.primary' }}
        />
        {query && (
          <IconButton size="small" title="Temizle" onClick={() => { setQuery(''); inputRef.current?.focus(); }} sx={{ p: 1, color: 'text.secondary' }}>
            <X className="w-4 h-4" />
          </IconButton>
        )}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}>{kbd('ESC')}</Box>
      </Box>

      {/* Filter Pills */}
      <Box sx={{ display: 'flex', gap: 1.5, px: 4, py: 2, borderBottom: 1, borderColor: 'divider', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
        {filters.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <Chip
              key={cat.id}
              label={cat.label}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              sx={{
                flexShrink: 0,
                height: 26,
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 700,
                border: 1,
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? 'primary.dark' : 'background.default',
                color: active ? '#fff' : 'text.secondary',
                '&:hover': { bgcolor: active ? 'primary.dark' : 'background.default', color: active ? '#fff' : 'text.primary' },
              }}
            />
          );
        })}
      </Box>

      {/* Results List */}
      <Box ref={resultsContainerRef} sx={{ flex: 1, overflowY: 'auto', p: 2, maxHeight: '50vh', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filteredResults.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#94a3b8' }}>
            <AlertCircle className="w-8 h-8 text-slate-500 stroke-1" />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>"{query}" ile eşleşen bir sonuç bulunamadı.</Typography>
            <Typography sx={{ fontSize: 11, color: '#64748b' }}>Aramayı farklı bir anahtar kelime veya filtre seçerek deneyebilirsiniz.</Typography>
          </Box>
        ) : (
          filteredResults.map((item, index) => {
            const isSelected = index === selectedIndex;
            const badge = BADGE_TONES[item.badgeColor ?? ''] ?? BADGE_TONES.slate;
            return (
              <Box
                key={item.id}
                data-search-item
                onClick={() => item.action()}
                onMouseEnter={() => setSelectedIndex(index)}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 3,
                  cursor: 'pointer',
                  border: 1,
                  borderColor: isSelected ? alpha('#3b82f6', 0.4) : 'transparent',
                  bgcolor: isSelected ? alpha('#2563eb', 0.15) : 'transparent',
                  '&:hover': { bgcolor: isSelected ? alpha('#2563eb', 0.15) : 'background.default' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: isSelected ? alpha('#3b82f6', 0.4) : 'divider', bgcolor: isSelected ? alpha('#2563eb', 0.2) : 'background.default' }}>
                    {getCategoryIcon(item.category)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography noWrap sx={{ fontSize: { xs: 10, sm: 11 }, color: isSelected ? '#60a5fa' : 'text.primary' }}>
                        {highlightMatch(item.title, query)}
                      </Typography>
                      {item.badge && (
                        <Box component="span" sx={{ flexShrink: 0, px: 1.5, py: 0.5, borderRadius: 1, border: 1, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: badge.fg, bgcolor: alpha(badge.fg, 0.15), borderColor: alpha(badge.fg, 0.3) }}>
                          {item.badge}
                        </Box>
                      )}
                    </Box>
                    <Typography noWrap sx={{ fontSize: 10, mt: 0.5, fontFamily: 'monospace', color: 'text.secondary' }}>
                      {highlightMatch(item.subtitle, query)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  {item.metadata?.cost && (
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-block' }, px: 1.5, py: 0.5, borderRadius: 1, border: 1, fontSize: 10, fontWeight: 800, color: '#34d399', bgcolor: alpha('#10b981', 0.1), borderColor: alpha('#10b981', 0.2) }}>
                      {item.metadata.cost}
                    </Box>
                  )}
                  {isSelected ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: 1.5, border: 1, fontSize: 10, fontWeight: 700, color: '#60a5fa', bgcolor: alpha('#2563eb', 0.2), borderColor: alpha('#3b82f6', 0.3) }}>
                      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Aç</Box>
                      <CornerDownLeft className="w-3 h-3" />
                    </Box>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Modal Footer Hotkey Guidelines */}
      <Box sx={{ px: 4, py: 2.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontWeight: 500, color: 'text.secondary', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{kbd('↑')}{kbd('↓')} Gezin</Box>
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{kbd('ENTER')} Seç & Git</Box>
        </Box>
        <Box component="span" sx={{ fontFamily: 'monospace', color: '#64748b' }}>{filteredResults.length} sonuç listelendi</Box>
      </Box>
    </Dialog>
  );
};
