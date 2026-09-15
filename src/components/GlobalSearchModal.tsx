import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, X, Briefcase, HardHat, Wrench, Building2, FileText, 
  Layers, UserCheck, LayoutGrid, DollarSign, Calendar, MapPin, 
  Clock, ShieldAlert, Cpu, ArrowRight, CornerDownLeft, Sparkles,
  TrendingUp, CheckCircle, AlertCircle
} from 'lucide-react';
import { Project, WBSTask, ProjectDocument, Asset, Permit } from '../types';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'project' | 'task' | 'block' | 'document' | 'permit' | 'asset' | 'navigation' | 'layer';
  badge?: string;
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
        badgeColor: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
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
        badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
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
        badgeColor: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
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
        badgeColor: 'bg-sky-600/20 text-sky-400 border-sky-500/30',
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
        badgeColor: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
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
        badgeColor: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
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
        badgeColor: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
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
        badgeColor: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
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
        badgeColor: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
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
          badgeColor: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
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
          badgeColor: pm.status === 'Alındı' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-amber-600/20 text-amber-400',
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
            badgeColor: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
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
        badgeColor: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
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
        badgeColor: a.status === 'Sorunsuz' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400',
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

  if (!isOpen) return null;

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
            <span key={i} className="text-yellow-400 underline decoration-yellow-400/40 bg-yellow-400/10 px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 bg-black/75 backdrop-blur-md animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Search Modal Box */}
      <div 
        className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 gap-3">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Proje, WBS görevi, bina bloğu, ruhsat veya modül ara... (örn: Ataköy, Sky Tower, 01, DHMİ)"
            className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder-slate-500 focus:outline-none font-medium"
            id="global-search-input"
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-1 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
              title="Temizle"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-sm">ESC</kbd>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--border)] overflow-x-auto no-scrollbar bg-[var(--bg-secondary)] text-xs">
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'project', label: 'Projeler' },
            { id: 'task', label: 'WBS & Görevler' },
            { id: 'block', label: 'Yapılar & Bloklar' },
            { id: 'document', label: 'Belgeler & İzinler' },
            { id: 'asset', label: 'Ekipmanlar (FM)' },
            { id: 'navigation', label: 'Modüller' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id as FilterCategory);
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer border ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div 
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--border)]/40 max-h-[50vh]"
        >
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-2">
              <AlertCircle className="w-8 h-8 text-slate-500 stroke-1" />
              <p className="text-xs font-bold text-[var(--text-secondary)]">"{query}" ile eşleşen bir sonuç bulunamadı.</p>
              <p className="text-[11px] text-slate-500">Aramayı farklı bir anahtar kelime veya filtre seçerek deneyebilirsiniz.</p>
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-search-item
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-2.5 sm:p-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/15 border border-blue-500/40 shadow-sm'
                      : 'hover:bg-[var(--bg-primary)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected 
                        ? 'bg-blue-600/20 border-blue-500/40' 
                        : 'bg-[var(--bg-primary)] border-[var(--border)]'
                    }`}>
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-[10px] sm:text-[11px] truncate ${
                          isSelected ? 'text-blue-400' : 'text-[var(--text-primary)]'
                        }`}>
                          {highlightMatch(item.title, query)}
                        </h4>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider shrink-0 ${
                            item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5 font-mono">
                        {highlightMatch(item.subtitle, query)}
                      </p>
                    </div>
                  </div>

                  {/* Metadata or Enter action hint */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.metadata?.cost && (
                      <span className="hidden sm:inline-block text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {item.metadata.cost}
                      </span>
                    )}
                    {isSelected ? (
                      <div className="flex items-center gap-1 text-blue-400 text-[10px] font-bold bg-blue-600/20 px-2 py-1 rounded-md border border-blue-500/30">
                        <span className="hidden sm:inline">Aç</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Hotkey Guidelines */}
        <div className="px-4 py-2.5 bg-[var(--bg-primary)] border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">↑</kbd>
              <kbd className="px-1 py-0.5 font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">↓</kbd> Gezin
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">ENTER</kbd> Seç & Git
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {filteredResults.length} sonuç listelendi
          </span>
        </div>
      </div>
    </div>
  );
};
