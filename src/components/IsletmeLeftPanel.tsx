import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Box, Radio, Sparkles, Building2, Pencil, X } from 'lucide-react';
import { Project, Asset } from '../types';

interface IsletmeLeftPanelProps {
  project: Project;
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
}

interface TreeItem {
  id: string;
  name: string;
  type: 'building' | 'floor' | 'space';
  children?: TreeItem[];
  blockId?: string;
}

export default function IsletmeLeftPanel({ project, assets, selectedAssetId, onSelectAsset }: IsletmeLeftPanelProps) {
  // Collapsed sections tree state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'block-a': true,
    'block-a-floor-basement': true,
    'block-b': true,
  });

  // Active Category filter for Assets
  const [activeCategory, setActiveCategory] = useState<'all' | 'HVAC' | 'Elektronik' | 'Mekanik'>('all');

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Building Space/Floor hierarchy structure mapped from the project
  const [hierarchy, setHierarchy] = useState<TreeItem[]>([
    {
      id: 'block-a',
      name: 'Kule-A (Konut & Ofis)',
      type: 'building',
      blockId: 'block-a',
      children: [
        {
          id: 'block-a-floor-basement',
          name: 'Bodrum Kat (Mekanik Daire)',
          type: 'floor',
          children: [
            { id: 'space-chiller-room', name: 'Chiller & Hidrofor Odası', type: 'space' },
            { id: 'space-electric-room', name: 'Ana Elektrik Kumanda Panosu', type: 'space' }
          ]
        },
        {
          id: 'block-a-floor-ground',
          name: 'Zemin Kat (Lobi)',
          type: 'floor',
          children: [
            { id: 'space-lobby', name: 'Ana Giriş Resepsiyon', type: 'space' }
          ]
        }
      ]
    },
    {
      id: 'block-b',
      name: 'Blok-B (AVM & Sosyal Hub)',
      type: 'building',
      blockId: 'block-b',
      children: [
        {
          id: 'block-b-floor-roof',
          name: 'Çatı Katı (HVAC İstasyonu)',
          type: 'floor',
          children: [
            { id: 'space-cooling-tower', name: 'Soğutma Kuleleri Bölgesi', type: 'space' }
          ]
        }
      ]
    }
  ]);

  const [isEditingHierarchy, setIsEditingHierarchy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper to check what assets reside in a selected space or block
  const getSpaceAssets = (spaceId: string) => {
    return assets.filter(asset => {
      // Filter by custom category
      if (activeCategory !== 'all') {
        if (activeCategory === 'HVAC' && !asset.name.includes('VRV') && !asset.name.includes('Klima') && !asset.name.includes('Soğutma') && !asset.name.includes('Kule')) return false;
        if (activeCategory === 'Elektronik' && !asset.name.includes('Asansör') && !asset.name.includes('Sensör') && !asset.name.includes('Elektrik')) return false;
        if (activeCategory === 'Mekanik' && !asset.name.includes('Pompa') && !asset.name.includes('Kompresör') && !asset.name.includes('Hidrofor')) return false;
      }
      
      // Map space assets
      if (spaceId === 'space-chiller-room') {
        return asset.name.includes('Kompresör') || asset.name.includes('Hidrofor') || asset.name.includes('Pompa');
      }
      if (spaceId === 'space-electric-room') {
        return asset.name.includes('Enerji') || asset.name.includes('Elektrik') || asset.name.includes('Asansör');
      }
      if (spaceId === 'space-lobby') {
        return asset.name.includes('Sensör') || asset.name.includes('Giriş');
      }
      if (spaceId === 'space-cooling-tower') {
        return asset.name.includes('VRV') || asset.name.includes('Fan') || asset.name.includes('Kule');
      }
      return false;
    });
  };

  const renderTree = (nodes: TreeItem[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = !!expandedNodes[node.id];
      const hasChildren = node.children && node.children.length > 0;
      const spaceAssets = node.type === 'space' ? getSpaceAssets(node.id) : [];

      return (
        <div key={node.id} className="space-y-1 select-none text-left">
          {/* Node Row */}
          <div 
            onClick={() => hasChildren ? toggleNode(node.id) : null}
            className={`flex items-center gap-1 py-1 rounded-lg transition cursor-pointer text-xs ${
              node.type === 'building' 
                ? 'font-black text-[var(--text-primary)] hover:bg-[var(--bg-primary)]' 
                : node.type === 'floor' 
                  ? 'font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] pl-2' 
                  : 'text-slate-400 font-medium pl-4 hover:text-white'
            }`}
          >
            {hasChildren && (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
            {!hasChildren && <span className="w-3.5 h-3.5 inline-block"></span>}
            
            {node.type === 'building' && <Building2 className="w-3.5 h-3.5 text-blue-500" />}
            
            <span>{node.name}</span>
          </div>

          {/* Children block */}
          {hasChildren && isExpanded && (
            <div className="pl-3 border-l border-[var(--border)] ml-3.5 space-y-1">
              {renderTree(node.children!, depth + 1)}
            </div>
          )}

          {/* If space has assets, list assets dynamically */}
          {node.type === 'space' && spaceAssets.length > 0 && (
            <div className="pl-6 ml-3 space-y-1 border-l border-dashed border-[var(--border)] pt-1">
              {spaceAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                const isFaulty = asset.status === 'Arızalı';

                return (
                  <button
                    key={asset.id}
                    onClick={() => onSelectAsset(asset.id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between transition border ${
                      isSelected 
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                        : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Box className={`w-3 h-3 ${isFaulty ? 'text-danger animate-pulse' : 'text-blue-500'}`} />
                      <span className="truncate">{asset.name}</span>
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isFaulty ? 'bg-danger' : asset.status === 'Bakım Bekliyor' ? 'bg-warning' : 'bg-success'
                    }`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-3 relative">
      {/* SYSTEM CATEGORY FILTERS */}
      <div className="card p-0 pt-1 rounded-none bg-transparent border-0 shadow-none px-0 flex items-center justify-between gap-1 flex-wrap text-left">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider w-full mb-1">
          Sistem Filtreleme
        </span>
        {[
          { id: 'all', name: 'Tümü' },
          { id: 'HVAC', name: 'HVAC' },
          { id: 'Elektronik', name: 'Elek' },
          { id: 'Mekanik', name: 'Mek' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            className={`px-2.5 py-1 rounded-none text-[10px] font-black transition border ${
              activeCategory === cat.id 
                ? 'bg-blue-600 text-white border-transparent font-black' 
                : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-black'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* SPACE HIERARCHY TREE */}
      <div className="card p-0 rounded-none bg-transparent border-0 shadow-none px-0 space-y-2">
        <div className="flex items-center justify-between mb-1 pb-1 border-b border-[var(--border)] pr-2">
          <div className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="section-eyebrow">
              Kat / Mekan Hiyerarşisi
            </span>
          </div>
          <button
            onClick={() => setIsEditingHierarchy(true)}
            className="p-1 hover:bg-slate-800 rounded transition cursor-pointer text-slate-400 hover:text-white flex items-center justify-center shrink-0"
            title="Hiyerarşiyi Düzenle (SpU)"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
          {renderTree(hierarchy)}
        </div>
      </div>

      {/* Local FeedBack Toast Banner */}
      {toastMessage && (
        <div className="p-1.5 bg-slate-950 text-white text-[10px] rounded border border-slate-800 animate-fade-in flex justify-between items-center z-[99]">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-500 hover:text-white font-bold ml-1">✕</button>
        </div>
      )}

      {/* Hierarchy Edit Modal (Süper Kullanıcı) */}
      {isEditingHierarchy && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm text-left">
          <div className="bg-[#141416] border border-[#2c2c2e] p-5 rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[#2c2c2e] pb-2 text-white">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider">Hiyerarşi Düzenleme (SpU)</h3>
              </div>
              <button onClick={() => setIsEditingHierarchy(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Süper kullanıcı yetkisiyle kat ve bina hiyerarşi etiketlerini düzenleyebilirsiniz.
            </p>

            <div className="space-y-3 pt-1 text-left">
              {hierarchy.map((building, bIdx) => (
                <div key={building.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-slate-400 font-bold uppercase">BİNA / BLOK ADI</label>
                    <input
                      type="text"
                      value={building.name}
                      onChange={(e) => {
                        const updated = [...hierarchy];
                        updated[bIdx] = { ...updated[bIdx], name: e.target.value };
                        setHierarchy(updated);
                      }}
                      className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {building.children && building.children.map((floor, fIdx) => (
                    <div key={floor.id} className="pl-3 border-l border-blue-500/30 space-y-1.5 mt-2">
                      <label className="block text-[10px] text-slate-500 font-bold uppercase">KAT ADI</label>
                      <input
                        type="text"
                        value={floor.name}
                        onChange={(e) => {
                          const updated = [...hierarchy];
                          const bChildren = [...(updated[bIdx].children || [])];
                          bChildren[fIdx] = { ...bChildren[fIdx], name: e.target.value };
                          updated[bIdx] = { ...updated[bIdx], children: bChildren };
                          setHierarchy(updated);
                        }}
                        className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setIsEditingHierarchy(false);
                showFeedbackToast('💾 Bina ve kat hiyerarşi etiketleri güncellendi.');
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-black text-white rounded-xl transition cursor-pointer"
            >
              KAYDET VE KAPAT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
