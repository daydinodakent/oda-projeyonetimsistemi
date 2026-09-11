import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Map as MapIcon, 
  Layers, 
  Edit3, 
  Settings, 
  FolderPlus, 
  Folder, 
  FolderOpen, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Navigation, 
  Sparkles, 
  Palette, 
  Sliders, 
  Undo2, 
  Redo2, 
  Download, 
  Copy, 
  Plus, 
  Info,
  Calendar,
  Clock,
  Split,
  FileCheck
} from 'lucide-react';
import { GisMap, GisFolder, GisLayer, GisFeature, RasterOverlay } from '../types/gis';
import { featuresToKML, featuresToDXF } from '../utils/gisUtils';
import * as turf from '@turf/turf';

interface GisSidebarProps {
  activeModule: string;
  setActiveModule: (m: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  maps: GisMap[];
  activeMapId: string;
  setActiveMapId: (id: string) => void;
  folders: GisFolder[];
  layers: GisLayer[];
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  rasterOverlays: RasterOverlay[];
  features: GisFeature[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  mode: string;
  setMode: (mode: string) => void;
  layerOpacity: number;
  setLayerOpacity: (val: number) => void;
  undoStack: string[];
  redoStack: string[];
  onUndo: () => void;
  onRedo: () => void;
  onClearAll: () => void;
  onFlyTo: (f: GisFeature) => void;
  onDeleteFeature: (id: string) => void;
  onBuffer: (meters: number) => void;
  onSimplify: (tol: number) => void;
  onAddFolder: (parentFolderId: string | null, name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddLayer: (folderId: string | null, name: string, geomType: 'Point' | 'LineString' | 'Polygon' | null) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string, visible: boolean) => void;
  onToggleFolderVisibility: (folderId: string, visible: boolean) => void;
  onToggleRasterVisibility: (id: string, visible: boolean) => void;
  onDeleteRaster: (id: string) => void;
  onRenameRaster: (id: string, name: string) => void;
  onLayerStyle: (layerId: string, style: { color: string; scale?: number; symbol?: string; lineWidth?: number; dash?: any }) => void;
  onPlaceFeature: (attrs: any, mode: string) => void;
  onToggle3D: () => void;
  onTogglePipe: () => void;
  onUpdate3DParams: (floors: number, height: number) => void;
  onUpdatePipeParams: (diameter: number) => void;
  onRotate: (angle: number) => void;
  onScale: (pct: number) => void;
  onDuplicate: () => void;
  onImportFiles: (files: File[]) => void;
  onComputeShadows: (date: string, hour: number) => void;
  onClearShadows: () => void;
  shadowInfo: string;
  compareRasterA: string;
  setCompareRasterA: (id: string) => void;
  compareRasterB: string;
  setCompareRasterB: (id: string) => void;
  compareSlider: number;
  setCompareSlider: (val: number) => void;
  compareFlickering: boolean;
  setCompareFlickering: (val: boolean) => void;
  onExportShapefile: () => void;
}

export const GisSidebar: React.FC<GisSidebarProps> = ({
  activeModule,
  setActiveModule,
  sidebarOpen,
  setSidebarOpen,
  maps,
  activeMapId,
  setActiveMapId,
  folders,
  layers,
  activeLayerId,
  setActiveLayerId,
  rasterOverlays,
  features,
  selectedId,
  setSelectedId,
  mode,
  setMode,
  layerOpacity,
  setLayerOpacity,
  undoStack,
  redoStack,
  onUndo,
  onRedo,
  onClearAll,
  onFlyTo,
  onDeleteFeature,
  onBuffer,
  onSimplify,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onAddLayer,
  onRenameLayer,
  onDeleteLayer,
  onToggleLayerVisibility,
  onToggleFolderVisibility,
  onToggleRasterVisibility,
  onDeleteRaster,
  onRenameRaster,
  onLayerStyle,
  onPlaceFeature,
  onToggle3D,
  onTogglePipe,
  onUpdate3DParams,
  onUpdatePipeParams,
  onRotate,
  onScale,
  onDuplicate,
  onImportFiles,
  onComputeShadows,
  onClearShadows,
  shadowInfo,
  compareRasterA,
  setCompareRasterA,
  compareRasterB,
  setCompareRasterB,
  compareSlider,
  setCompareSlider,
  compareFlickering,
  setCompareFlickering,
  onExportShapefile
}) => {
  // Local UIs
  const [subtab, setSubtab] = useState<'cbs' | 'kurumsal'>('cbs');
  const [showMapSelect, setShowMapSelect] = useState(false);
  const [showActiveLayerSelect, setShowActiveLayerSelect] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-genel': true,
    'folder-yapilar': true,
    'folder-altyapi': true
  });
  
  // Layer style modal
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [styleLayerId, setStyleLayerId] = useState<string | null>(null);
  const [styleColor, setStyleLayerColor] = useState('#3fc2ac');
  const [styleWidth, setStyleLineWidth] = useState(3);
  const [styleDash, setStyleDash] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [styleSymbol, setStyleSymbol] = useState('circle');

  // New layer modal
  const [layerModalOpen, setLayerModalOpen] = useState(false);
  const [layerModalParentFolder, setLayerModalParentFolder] = useState<string | null>(null);
  const [newLayerName, setNewLayerName] = useState('Yeni Katman');
  const [newLayerGeom, setNewLayerGeom] = useState<'Point' | 'LineString' | 'Polygon'>('Point');

  const openLayerModalForFolder = (folderId: string | null) => {
    setLayerModalParentFolder(folderId);
    setLayerModalOpen(true);
  };

  // Place Feature Form
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [ffName, setFfName] = useState('');
  const [ffDescription, setFfDescription] = useState('');
  const [customFields, setCustomFields] = useState<{ k: string; v: string }[]>([]);

  // Sliders for quick modifications
  const [editRotate, setEditRotate] = useState(0);
  const [editScale, setEditScale] = useState(100);
  const [editBuffer, setEditBuffer] = useState(50);
  const [editSimplify, setEditSimplify] = useState(0.0005);

  // Analysis shadow inputs
  const [shadowDate, setShadowDate] = useState(() => {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  });
  const [shadowHour, setShadowHour] = useState(12);

  // DXF / Import Birimi
  const [dxfScale, setDxfScale] = useState(1);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId: string;
    type: 'folder' | 'layer' | 'raster';
  } | null>(null);

  const selectedFeature = selectedId ? features.find(f => f.id === selectedId) : null;

  // Toggle Folder Expands
  const toggleFolder = (fid: string) => {
    setExpandedFolders(prev => ({ ...prev, [fid]: !prev[fid] }));
  };

  // Open layer style modal
  const handleOpenStyleModal = (lid: string) => {
    const l = layers.find(x => x.id === lid);
    if (!l) return;
    setStyleLayerId(lid);
    setStyleLayerColor(l.color || '#3fc2ac');
    setStyleLineWidth(l.lineWidth || 3);
    setStyleDash(l.dash || 'solid');
    setStyleSymbol(l.symbol || 'circle');
    setStyleModalOpen(true);
  };

  const handleSaveStyle = () => {
    if (styleLayerId) {
      onLayerStyle(styleLayerId, {
        color: styleColor,
        lineWidth: styleWidth,
        dash: styleDash,
        symbol: styleSymbol
      });
    }
    setStyleModalOpen(false);
  };

  // Create new layer
  const handleCreateLayer = () => {
    if (!newLayerName.trim()) return;
    onAddLayer(layerModalParentFolder, newLayerName.trim(), newLayerGeom);
    setLayerModalOpen(false);
  };

  // Context menus helpers
  const handleOpenContextMenu = (e: React.MouseEvent, targetId: string, type: 'folder' | 'layer' | 'raster') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId,
      type
    });
  };

  useEffect(() => {
    const closeCtx = () => setContextMenu(null);
    window.addEventListener('click', closeCtx);
    return () => window.removeEventListener('click', closeCtx);
  }, []);

  // Geometry Counts
  const countsForLayer = (lid: string) => {
    return features.filter(f => f.properties?.layerId === lid).length;
  };

  const formatDistance = (m: number) => {
    return m < 1000 ? m.toFixed(1) + ' m' : (m / 1000).toFixed(2) + ' km';
  };

  const measureFeature = (f: GisFeature) => {
    try {
      if (f.geometry.type === 'LineString') {
        const km = turf.length(f, { units: 'kilometers' });
        return formatDistance(km * 1000) + ' uzunluk';
      }
      if (f.geometry.type === 'Polygon') {
        const m2 = turf.area(f);
        const per = turf.length(turf.lineString(f.geometry.coordinates[0]), { units: 'kilometers' }) * 1000;
        const areaStr = m2 < 10000 ? m2.toFixed(0) + ' m²' : (m2 / 10000).toFixed(2) + ' ha';
        const perStr = formatDistance(per);
        let base = `${areaStr}  ·  çevre ${perStr}`;
        if (f.properties?.extrude) {
          base += `  ·  yükseklik ${(f.properties.height || 30).toFixed(1)} m`;
        }
        return base;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const activeMapName = maps.find(m => m.id === activeMapId)?.name || 'Genel';
  const activeLayer = layers.find(l => l.id === activeLayerId);

  // Kopyala / Indir handlers
  const handleDownloadGeoJson = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cizim.geojson';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyGeoJson = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };
    navigator.clipboard.writeText(JSON.stringify(geojson, null, 2));
  };

  const handleDownloadKML = () => {
    const kml = featuresToKML(features);
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cizim.kml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadDXF = () => {
    const dxf = featuresToDXF(features);
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cizim.dxf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Submit Place Feature
  const handleSubmitPlace = () => {
    if (!activeLayer || !activeLayer.geomType) return;
    const attrs: Record<string, any> = {
      name: ffName.trim() || undefined,
      description: ffDescription.trim() || undefined,
      layerId: activeLayerId
    };
    customFields.forEach(f => {
      if (f.k.trim()) attrs[f.k.trim()] = f.v.trim();
    });
    
    setPlaceModalOpen(false);
    
    // Trigger placing feature placement mode
    let targetMode = 'point';
    if (activeLayer.geomType === 'LineString') targetMode = 'linestring';
    else if (activeLayer.geomType === 'Polygon') targetMode = 'polygon';
    
    onPlaceFeature(attrs, targetMode);
  };

  // Draw node structure
  const renderTreeLevel = (parentFolderId: string | null, depth: number) => {
    const subFolders = folders.filter(f => f.mapId === activeMapId && f.parentFolderId === parentFolderId);
    const subLayers = layers.filter(l => l.mapId === activeMapId && l.folderId === parentFolderId);
    const subRasters = rasterOverlays.filter(r => (r.mapId || activeMapId) === activeMapId && r.folderId === parentFolderId);

    return (
      <div key={parentFolderId || 'root'} className="flex flex-col gap-0.5">
        {subFolders.map(folder => {
          const isExpanded = expandedFolders[folder.id] !== false;
          return (
            <div key={folder.id} className="flex flex-col">
              <div 
                className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-800/50 rounded-lg cursor-pointer text-slate-300 select-none text-xs group"
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                onContextMenu={(e) => handleOpenContextMenu(e, folder.id, 'folder')}
                onClick={() => toggleFolder(folder.id)}
              >
                <button className="text-slate-500 hover:text-white p-0.5 rounded transition">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-semibold text-slate-200 truncate flex-1">{folder.name}</span>
                <span className="text-[10px] text-slate-500 font-mono group-hover:block hidden">Sağ Tık</span>
              </div>
              
              {isExpanded && renderTreeLevel(folder.id, depth + 1)}
            </div>
          );
        })}

        {subLayers.map(lyr => {
          const isSelected = lyr.id === activeLayerId;
          return (
            <div 
              key={lyr.id}
              className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition select-none group text-xs ${
                isSelected 
                  ? 'bg-blue-600/15 border-l-2 border-blue-500 text-blue-100 shadow-sm' 
                  : 'hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
              }`}
              style={{ paddingLeft: `${depth * 14 + 18}px` }}
              onContextMenu={(e) => handleOpenContextMenu(e, lyr.id, 'layer')}
              onClick={() => {
                setActiveLayerId(lyr.id);
                setMode(lyr.geomType ? (lyr.geomType === 'Point' ? 'point' : lyr.geomType === 'LineString' ? 'linestring' : 'polygon') : 'select');
              }}
            >
              <input 
                type="checkbox" 
                checked={lyr.visible !== false}
                className="accent-blue-500 w-3.5 h-3.5 cursor-pointer rounded shrink-0"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onToggleLayerVisibility(lyr.id, e.target.checked)}
              />
              <div 
                className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center border border-slate-700" 
                style={{ backgroundColor: lyr.color || '#3fc2ac' }}
              />
              <span className={`flex-1 truncate font-medium ${isSelected ? 'text-blue-300 font-bold' : ''}`}>{lyr.name}</span>
              <span className="text-[10px] font-mono text-slate-600 font-bold shrink-0">{countsForLayer(lyr.id)}</span>
            </div>
          );
        })}

        {subRasters.map(r => {
          return (
            <div 
              key={r.id}
              className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-slate-800/40 text-xs text-teal-400 select-none"
              style={{ paddingLeft: `${depth * 14 + 18}px` }}
              onContextMenu={(e) => handleOpenContextMenu(e, r.id, 'raster')}
            >
              <input 
                type="checkbox" 
                checked={r.visible !== false}
                className="accent-teal-500 w-3.5 h-3.5 cursor-pointer rounded shrink-0"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onToggleRasterVisibility(r.id, e.target.checked)}
              />
              <span className="w-3.5 h-3.5 shrink-0 text-teal-500">🗺️</span>
              <span className="flex-1 truncate font-medium text-teal-300">{r.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className={`transition-all duration-300 shrink-0 border-r border-[#1a2f3c] bg-[#0f1e29] flex flex-col z-20 h-full relative select-none ${
        sidebarOpen ? 'w-80' : 'w-0 overflow-hidden border-r-0'
      }`}
    >
      {/* Brand & Mini Navigation Panel Left Bar */}
      <div className="absolute top-0 bottom-0 left-0 w-[64px] bg-[#0a1620] border-r border-[#1a2f3c] flex flex-col items-center py-4 z-30 shrink-0">
        <div className="text-center pb-4 mb-4 border-b border-[#1a2f3c] w-full px-1">
          <span className="text-[10px] font-mono tracking-widest text-[#7f9aa8]">KROKİ</span>
          <b className="block font-black text-xs text-white tracking-tighter mt-0.5">CBS</b>
        </div>

        {/* Module Switchers */}
        <div className="flex flex-col gap-1 w-full px-1.5 flex-1">
          {[
            { id: 'editor', label: 'Editör', icon: Edit3 },
            { id: 'analiz', label: 'Analiz', icon: Sliders },
            { id: 'cikti', label: 'Çıktı', icon: Download }
          ].map(m => {
            const Icon = m.icon;
            const isAct = activeModule === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-[10px] font-bold gap-1 transition cursor-pointer ${
                  isAct 
                    ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-l-2 border-amber-400 text-white' 
                    : 'text-[#7f9aa8] hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Brand footer */}
        <div className="pt-4 border-t border-[#1a2f3c] w-full text-center">
          <span className="text-[10px] font-mono text-[#7f9aa8]">V5.12</span>
        </div>
      </div>

      {/* Main Sidebar Contents (offset by 64px for the navigation bar) */}
      <div className="pl-[64px] flex-1 flex flex-col h-full overflow-hidden text-slate-200">
        
        {/* Panel Header */}
        <div className="p-4 border-b border-[#1a2f3c] bg-[#122433] flex items-center justify-between shrink-0">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
            <span className="w-1.5 h-3 bg-amber-500 rounded-sm" />
            {activeModule === 'editor' && 'Çizim Editörü'}
            {activeModule === 'analiz' && 'Analiz Paneli'}
            {activeModule === 'cikti' && 'Veri Transferi'}
          </h2>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title="Paneli Gizle"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        </div>

        {/* Active Module Pages */}
        <div className="p-4 flex-1 overflow-y-auto space-y-5 custom-scrollbar">

          {/* ========================================= EDİTÖR ========================================= */}
          {activeModule === 'editor' && (
            <div className="space-y-4">
              {/* Active drawing layer selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Aktif Çizim Katmanı</span>
                <div className="relative">
                  <button 
                    onClick={() => setShowActiveLayerSelect(!showActiveLayerSelect)}
                    className="w-full flex items-center justify-between bg-[#152c3a] border border-[#24404f] rounded-lg px-3 py-2 text-xs font-bold text-slate-200 hover:border-amber-400 transition cursor-pointer"
                  >
                    <span className="truncate flex items-center gap-2 text-amber-400">
                      <div 
                        className="w-3 h-3 rounded-full border border-slate-700" 
                        style={{ backgroundColor: activeLayer?.color || '#3fc2ac' }}
                      />
                      {activeLayer?.name || '—'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  
                  {showActiveLayerSelect && (
                    <div className="absolute top-10 left-0 right-0 bg-[#0f1e29] border border-[#24404f] rounded-lg shadow-xl z-50 py-1 max-h-56 overflow-y-auto custom-scrollbar">
                      {layers.map(lyr => (
                        <button
                          key={lyr.id}
                          onClick={() => {
                            setActiveLayerId(lyr.id);
                            setShowActiveLayerSelect(false);
                            setMode(lyr.geomType ? (lyr.geomType === 'Point' ? 'point' : lyr.geomType === 'LineString' ? 'linestring' : 'polygon') : 'select');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#152c3a] hover:text-white transition flex items-center gap-2"
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full border border-slate-700 shrink-0" 
                            style={{ backgroundColor: lyr.color || '#3fc2ac' }}
                          />
                          <span className="truncate">{lyr.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {activeLayer && activeLayer.geomType && (
                  <span className="text-[10px] text-slate-500 block">
                    Yeni şekiller {activeLayer.name} ({activeLayer.geomType}) katmanına eklenecektir.
                  </span>
                )}
              </div>

              {/* Çizim Araçları (Drawing Tools) */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Çizim Araçları</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button 
                    onClick={() => {
                      setMode('select');
                      setSelectedId(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      mode === 'select'
                        ? 'bg-blue-600/25 border-blue-500 text-blue-300 shadow-md'
                        : 'bg-[#152c3a] border-[#24404f] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>🖱️</span>
                    Seç & Düzenle
                  </button>

                  <button 
                    onClick={() => {
                      setMode('point');
                      setSelectedId(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      mode === 'point'
                        ? 'bg-amber-600/25 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-[#152c3a] border-[#24404f] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>📍</span>
                    Nokta Çiz
                  </button>

                  <button 
                    onClick={() => {
                      setMode('linestring');
                      setSelectedId(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      mode === 'linestring'
                        ? 'bg-amber-600/25 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-[#152c3a] border-[#24404f] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>📐</span>
                    Çizgi Çiz
                  </button>

                  <button 
                    onClick={() => {
                      setMode('polygon');
                      setSelectedId(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      mode === 'polygon'
                        ? 'bg-amber-600/25 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-[#152c3a] border-[#24404f] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>⬡</span>
                    Poligon Çiz
                  </button>

                  <button 
                    onClick={() => {
                      setMode('rectangle');
                      setSelectedId(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      mode === 'rectangle'
                        ? 'bg-amber-600/25 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-[#152c3a] border-[#24404f] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>█</span>
                    Dikdörtgen
                  </button>

                  <button 
                    onClick={() => {
                      setMode('circle');
                      setSelectedId(null);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      mode === 'circle'
                        ? 'bg-amber-600/25 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-[#152c3a] border-[#24404f] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span>◯</span>
                    Daire Çiz
                  </button>
                </div>

                {/* Çizim Yardımcı Kutusu */}
                <div className="p-2.5 bg-[#0f1e29] rounded-lg border border-[#24404f]/40 text-[10px] text-slate-400 space-y-1">
                  {mode === 'select' && (
                    <p>🖱️ <b>Seçim Modu:</b> Mevcut şekilleri seçebilir, köşe noktalarını sürükleyerek taşıyabilirsiniz.</p>
                  )}
                  {mode === 'point' && (
                    <p>📍 <b>Nokta Çizimi:</b> Haritaya tıklayarak <b>{activeLayer?.name}</b> katmanına yeni nokta ekleyin.</p>
                  )}
                  {mode === 'linestring' && (
                    <p>📐 <b>Çizgi Çizimi:</b> Köşeleri tıklayarak ekleyin. Bitirmek için son noktaya çift tıklayın veya haritanın altındaki <b>✓</b> tuşuna basın.</p>
                  )}
                  {mode === 'polygon' && (
                    <p>⬡ <b>Poligon Çizimi:</b> Alan sınırlarını belirleyin. Bitirmek için çift tıklayın veya haritanın altındaki <b>✓</b> tuşuna basın.</p>
                  )}
                  {mode === 'rectangle' && (
                    <p>█ <b>Dikdörtgen:</b> Haritada çapraz iki köşeye tıklayarak hızlı alan oluşturun.</p>
                  )}
                  {mode === 'circle' && (
                    <p>◯ <b>Daire:</b> Önce merkeze, sonra yarıçap kenarına tıklayarak daire oluşturun.</p>
                  )}
                </div>
              </div>

              {/* Action grid (Undo, Redo, Place, Clear) */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Hızlı İşlemler</span>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={onUndo}
                    disabled={undoStack.length === 0}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#152c3a] border border-[#24404f] hover:border-teal-500 text-xs font-bold text-slate-300 cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    <Undo2 className="w-4 h-4 text-slate-400 mb-1" />
                    Geri Al
                  </button>
                  <button 
                    onClick={onRedo}
                    disabled={redoStack.length === 0}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#152c3a] border border-[#24404f] hover:border-teal-500 text-xs font-bold text-slate-300 cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    <Redo2 className="w-4 h-4 text-slate-400 mb-1" />
                    Yinele
                  </button>
                  <button 
                    onClick={() => setPlaceModalOpen(true)}
                    disabled={!activeLayer || !activeLayer.geomType}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-600/10 border border-amber-500/30 hover:border-amber-400 text-xs font-bold text-amber-400 cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    <Plus className="w-4 h-4 text-amber-400 mb-1" />
                    Yerleştir
                  </button>
                </div>
              </div>

              {/* Selected Feature Manipulation (Extrude, pipe, buffer, simplifies) */}
              {selectedFeature ? (
                <div className="space-y-4 bg-[#122433] p-3 rounded-xl border border-[#24404f]/40 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-[#24404f]/30 pb-2">
                    <span className="text-xs font-black text-amber-400 uppercase">Düzenleme Katmanı</span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{selectedFeature.id.substring(2, 8)}</span>
                  </div>

                  {/* 3D Extrude (For Polygons) */}
                  {selectedFeature.geometry.type === 'Polygon' && (
                    <div className="space-y-3 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">Yükseklik & Ekstrüzyon</span>
                        <button 
                          onClick={onToggle3D}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                            selectedFeature.properties?.extrude 
                              ? 'bg-amber-500 text-slate-950' 
                              : 'bg-[#152c3a] text-slate-400 hover:text-white'
                          }`}
                        >
                          {selectedFeature.properties?.extrude ? '3B Kapat' : '3B Çevir'}
                        </button>
                      </div>
                      
                      {selectedFeature.properties?.extrude && (
                        <div className="space-y-2 pt-1 border-t border-[#24404f]/30">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                              <span>Kat Adedi</span>
                              <span>{selectedFeature.properties?.floors || 1}</span>
                            </div>
                            <input 
                              type="range"
                              min="1"
                              max="40"
                              step="1"
                              value={selectedFeature.properties?.floors || 1}
                              onChange={(e) => onUpdate3DParams(parseInt(e.target.value), selectedFeature.properties?.floorHeight || 3)}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                              <span>Kat Yüksekliği (m)</span>
                              <span>{(selectedFeature.properties?.floorHeight || 3).toFixed(1)} m</span>
                            </div>
                            <input 
                              type="range"
                              min="1"
                              max="15"
                              step="0.5"
                              value={selectedFeature.properties?.floorHeight || 3}
                              onChange={(e) => onUpdate3DParams(selectedFeature.properties?.floors || 1, parseFloat(e.target.value))}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div className="text-[10px] text-teal-400 font-mono">
                            Toplam Yükseklik: {((selectedFeature.properties?.floors || 1) * (selectedFeature.properties?.floorHeight || 3)).toFixed(1)} m
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pipelines Pipeline (For LineStrings) */}
                  {selectedFeature.geometry.type === 'LineString' && (
                    <div className="space-y-3 pt-1 border-t border-[#24404f]/20">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">Boru Ekstrüzyonu</span>
                        <button 
                          onClick={onTogglePipe}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                            selectedFeature.properties?.pipe 
                              ? 'bg-amber-500 text-slate-950' 
                              : 'bg-[#152c3a] text-slate-400 hover:text-white'
                          }`}
                        >
                          {selectedFeature.properties?.pipe ? 'Boru Kapat' : 'Boru Çevir'}
                        </button>
                      </div>

                      {selectedFeature.properties?.pipe && (
                        <div className="space-y-2 pt-1 border-t border-[#24404f]/30">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>Çap (m)</span>
                            <span>{selectedFeature.properties?.diameter || 5} m</span>
                          </div>
                          <input 
                            type="range"
                            min="1"
                            max="50"
                            step="0.5"
                            value={selectedFeature.properties?.diameter || 5}
                            onChange={(e) => onUpdatePipeParams(parseFloat(e.target.value))}
                            className="w-full accent-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rotate / Scale controls (Lines and Polygons) */}
                  {selectedFeature.geometry.type !== 'Point' && (
                    <div className="space-y-3 pt-2 border-t border-[#24404f]/20">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span>Döndür (Açı)</span>
                          <span>{editRotate}°</span>
                        </div>
                        <input 
                          type="range" 
                          min="-180" 
                          max="180" 
                          value={editRotate}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setEditRotate(val);
                            onRotate(val);
                          }}
                          onMouseUp={() => setEditRotate(0)}
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span>Ölçek (%)</span>
                          <span>{editScale}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="20" 
                          max="250" 
                          value={editScale}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setEditScale(val);
                            onScale(val);
                          }}
                          onMouseUp={() => setEditScale(100)}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Buffer / Simplify / Duplicate Actions */}
                  <div className="space-y-3 pt-2 border-t border-[#24404f]/20">
                    {/* Buffer */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold">Tampon Bölge (m)</span>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={editBuffer} 
                          onChange={(e) => setEditBuffer(parseFloat(e.target.value) || 0)}
                          className="bg-[#152c3a] border border-[#24404f] rounded px-2.5 py-1 text-xs text-slate-200 w-full font-mono focus:outline-none focus:border-amber-400"
                        />
                        <button 
                          onClick={() => onBuffer(editBuffer)}
                          className="px-3 bg-amber-500 text-slate-900 text-xs font-bold rounded hover:bg-amber-400 transition cursor-pointer"
                        >
                          Uygula
                        </button>
                      </div>
                    </div>

                    {/* Simplify */}
                    {selectedFeature.geometry.type !== 'Point' && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 block font-bold">Köşe Sadeleştirme</span>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            step="0.0001"
                            value={editSimplify} 
                            onChange={(e) => setEditSimplify(parseFloat(e.target.value) || 0)}
                            className="bg-[#152c3a] border border-[#24404f] rounded px-2.5 py-1 text-xs text-slate-200 w-full font-mono focus:outline-none focus:border-amber-400"
                          />
                          <button 
                            onClick={() => onSimplify(editSimplify)}
                            className="px-3 bg-amber-500 text-slate-900 text-xs font-bold rounded hover:bg-amber-400 transition cursor-pointer"
                          >
                            Uygula
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Copy Duplicate */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={onDuplicate}
                        className="py-1.5 border border-[#24404f] hover:border-slate-500 rounded text-xs font-bold text-slate-300 transition cursor-pointer"
                      >
                        Kopyasını Çıkar
                      </button>
                      <button 
                        onClick={() => onDeleteFeature(selectedId!)}
                        className="py-1.5 bg-red-600/10 border border-red-500/30 text-red-400 hover:border-red-400 rounded text-xs font-bold transition cursor-pointer"
                      >
                        Şekli Sil
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#7f9aa8] italic p-4 text-center border border-dashed border-[#24404f] rounded-lg">
                  Düzenlemek için haritadan veya "Harita" sekmesinden bir şekil seçin.
                </div>
              )}
            </div>
          )}

          {/* ========================================= ANALİZ ========================================= */}
          {activeModule === 'analiz' && (
            <div className="space-y-4">
              {/* Shadow Analysis section */}
              <div className="space-y-3 bg-[#122433] p-3 rounded-xl border border-[#24404f]/40">
                <span className="text-xs font-extrabold uppercase text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Bina Gölge Analizi
                </span>
                
                <div className="space-y-2 pt-2 border-t border-[#24404f]/30">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold">Tarih Seçimi</span>
                    <input 
                      type="date"
                      value={shadowDate}
                      onChange={(e) => {
                        setShadowDate(e.target.value);
                        onComputeShadows(e.target.value, shadowHour);
                      }}
                      className="w-full bg-[#152c3a] border border-[#24404f] rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>Saat</span>
                      <span className="text-teal-400 font-bold">{String(Math.floor(shadowHour)).padStart(2, '0')}:{String(Math.round((shadowHour - Math.floor(shadowHour)) * 60)).padStart(2, '0')}</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="23.75"
                      step="0.25"
                      value={shadowHour}
                      onChange={(e) => {
                        const h = parseFloat(e.target.value);
                        setShadowHour(h);
                        onComputeShadows(shadowDate, h);
                      }}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button 
                      onClick={() => onComputeShadows(shadowDate, shadowHour)}
                      className="py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black uppercase rounded-lg transition cursor-pointer"
                    >
                      Hesapla
                    </button>
                    <button 
                      onClick={onClearShadows}
                      className="py-2 border border-[#24404f] hover:border-slate-500 text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Temizle
                    </button>
                  </div>

                  {shadowInfo && (
                    <div className="text-[10px] text-teal-400 font-mono bg-[#0f1e29] p-2 rounded border border-teal-500/20 leading-relaxed mt-2">
                      {shadowInfo}
                    </div>
                  )}
                </div>
              </div>

              {/* Time Compare georeferenced rasters slider */}
              <div className="space-y-3 bg-[#122433] p-3 rounded-xl border border-[#24404f]/40">
                <span className="text-xs font-extrabold uppercase text-teal-400 flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5" />
                  Zamana Bağlı Görüntü Karşılaştırma
                </span>

                <div className="space-y-3 pt-2 border-t border-[#24404f]/30">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold">Görüntü A (Eski)</span>
                    <select 
                      value={compareRasterA}
                      onChange={(e) => setCompareRasterA(e.target.value)}
                      className="w-full bg-[#152c3a] border border-[#24404f] rounded px-2.5 py-1.5 text-xs text-slate-200 font-semibold"
                    >
                      <option value="">— seçin —</option>
                      {rasterOverlays.map(r => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold">Görüntü B (Yeni)</span>
                    <select 
                      value={compareRasterB}
                      onChange={(e) => setCompareRasterB(e.target.value)}
                      className="w-full bg-[#152c3a] border border-[#24404f] rounded px-2.5 py-1.5 text-xs text-slate-200 font-semibold"
                    >
                      <option value="">— seçin —</option>
                      {rasterOverlays.map(r => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>Opaklık Karışımı</span>
                      <span>{compareSlider}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={compareSlider}
                      onChange={(e) => setCompareSlider(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#1a2f3c] rounded appearance-none cursor-pointer accent-teal-500"
                    />
                  </div>

                  <button 
                    onClick={() => setCompareFlickering(!compareFlickering)}
                    disabled={!compareRasterA || !compareRasterB}
                    className={`w-full py-2 text-xs font-bold rounded-lg transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                      compareFlickering 
                        ? 'bg-red-500 text-white' 
                        : 'bg-teal-500 text-slate-950 font-black'
                    }`}
                  >
                    {compareFlickering ? 'Durdur' : 'Yanıp Sön'}
                  </button>
                  <p className="text-[10px] text-slate-500 leading-relaxed leading-normal">
                    * Karşılaştırma özelliğini kullanmak için "Çıktı" sekmesinden veya Harita "+" butonundan dünya dosyalı (.jgw/.pgw) en az iki drone/hava fotoğrafı yükleyin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================= ÇIKTI ========================================= */}
          {activeModule === 'cikti' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-[#24404f]/40 pb-1">Veri İçe Aktarma</span>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-500 truncate flex-1">CAD/DXF Birim Çarpanı (metre)</label>
                  <input 
                    type="number"
                    value={dxfScale}
                    onChange={(e) => setDxfScale(parseFloat(e.target.value) || 1)}
                    className="bg-[#152c3a] border border-[#24404f] rounded px-2 py-1 text-xs text-slate-200 font-mono w-16 text-right focus:outline-none"
                  />
                </div>
                <button 
                  onClick={() => document.getElementById('file-input-sidebar')?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-500 text-slate-950 font-black uppercase text-xs tracking-wider rounded-lg shadow hover:bg-teal-400 transition cursor-pointer"
                >
                  Dosya Yükle
                </button>
                <input 
                  type="file" 
                  id="file-input-sidebar" 
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) onImportFiles(files);
                  }}
                  accept=".json,.geojson,.kml,.kmz,.zip,.shp,.gml,.dxf,.gltf,.glb,.bin,.ifc,.jpg,.jpeg,.png,.jgw,.pgw,.jpw,.wld"
                />
              </div>

              {/* GeoJSON text out & copies */}
              <div className="space-y-2 pt-2 border-t border-[#24404f]/40">
                <span className="text-[10px] uppercase font-bold text-slate-400">Veri Dışa Aktarma</span>
                <textarea 
                  readOnly 
                  spellCheck="false"
                  value={JSON.stringify({ type: 'FeatureCollection', features }, null, 2)}
                  className="w-full h-32 bg-[#081118] border border-[#24404f] rounded-lg p-2.5 font-mono text-[10px] text-teal-400 leading-normal resize-none focus:outline-none"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleCopyGeoJson}
                    className="flex items-center justify-center gap-1.5 py-2 border border-[#24404f] hover:border-slate-500 rounded text-xs font-bold text-slate-300 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Kopyala
                  </button>
                  <button 
                    onClick={handleDownloadGeoJson}
                    className="flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    GeoJSON
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button 
                    onClick={handleDownloadKML}
                    className="py-1.5 border border-[#24404f] hover:border-slate-600 rounded text-[10px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    KML
                  </button>
                  <button 
                    onClick={handleDownloadDXF}
                    className="py-1.5 border border-[#24404f] hover:border-slate-600 rounded text-[10px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    DXF (CAD)
                  </button>
                  <button 
                    onClick={onExportShapefile}
                    className="py-1.5 border border-[#24404f] hover:border-slate-600 rounded text-[10px] font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    SHP (ZIP)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================================= */}
      {/* CONTEXT MENU FLOATING PANEL */}
      {/* =================================================================---------------- */}
      {contextMenu && (
        <div 
          className="fixed bg-[#0f1e29] border border-[#24404f] rounded-lg shadow-2xl py-1 z-50 text-xs text-slate-200 select-none min-w-[150px] animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'folder' && (
            <>
              <button 
                onClick={() => {
                  onAddFolder(contextMenu.targetId, 'Yeni Alt Klasör');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#152c3a] transition"
              >
                Alt Klasör Ekle
              </button>
              <button 
                onClick={() => {
                  openLayerModalForFolder(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#152c3a] transition"
              >
                Katman Ekle
              </button>
              <div className="h-px bg-[#1a2f3c] my-1" />
              <button 
                onClick={() => {
                  const n = prompt('Klasör adı:', folders.find(f => f.id === contextMenu.targetId)?.name);
                  if (n && n.trim()) onRenameFolder(contextMenu.targetId, n.trim());
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#152c3a] transition"
              >
                Yeniden Adlandır
              </button>
              <button 
                onClick={() => {
                  onDeleteFolder(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 transition"
              >
                Sil (Klasörü Kaldır)
              </button>
            </>
          )}

          {contextMenu.type === 'layer' && (
            <>
              <button 
                onClick={() => {
                  const n = prompt('Katman adı:', layers.find(l => l.id === contextMenu.targetId)?.name);
                  if (n && n.trim()) onRenameLayer(contextMenu.targetId, n.trim());
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#152c3a] transition"
              >
                Yeniden Adlandır
              </button>
              <button 
                onClick={() => {
                  handleOpenStyleModal(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#152c3a] transition"
              >
                Stil Düzenle (Renk/Simge)
              </button>
              <div className="h-px bg-[#1a2f3c] my-1" />
              <button 
                onClick={() => {
                  onDeleteLayer(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 transition"
              >
                Katmanı Sil
              </button>
            </>
          )}

          {contextMenu.type === 'raster' && (
            <>
              <button 
                onClick={() => {
                  const n = prompt('Ad:', rasterOverlays.find(r => r.id === contextMenu.targetId)?.name);
                  if (n && n.trim()) onRenameRaster(contextMenu.targetId, n.trim());
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#152c3a] transition"
              >
                Yeniden Adlandır
              </button>
              <button 
                onClick={() => {
                  onDeleteRaster(contextMenu.targetId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 transition"
              >
                Sil
              </button>
            </>
          )}
        </div>
      )}

      {/* ================================================================================= */}
      {/* DIALOG MODALS SECTION */}
      {/* =================================================================---------------- */}
      
      {/* NEW LAYER MODAL */}
      {layerModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1e29] border border-[#24404f] rounded-xl p-5 w-80 max-w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" />
              Yeni Katman Oluştur
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block uppercase">Katman Adı</label>
                <input 
                  type="text"
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  className="w-full bg-[#152c3a] border border-[#24404f] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block uppercase">Geometri Türü</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['Point', 'LineString', 'Polygon'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setNewLayerGeom(g)}
                      className={`py-2 text-[10px] font-bold rounded transition cursor-pointer ${
                        newLayerGeom === g 
                          ? 'bg-amber-500 text-slate-900' 
                          : 'bg-[#152c3a] border border-[#24404f] text-slate-400 hover:text-white'
                      }`}
                    >
                      {g === 'Point' ? 'Nokta' : g === 'LineString' ? 'Çizgi' : 'Poligon'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setLayerModalOpen(false)}
                className="flex-1 py-2 border border-[#24404f] hover:border-slate-500 text-xs font-bold text-slate-300 rounded-lg transition"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleCreateLayer}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black rounded-lg transition"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLE MODAL */}
      {styleModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1e29] border border-[#24404f] rounded-xl p-5 w-80 max-w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-amber-500" />
              Katman Stili Düzenle
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block uppercase">Renk</label>
                <input 
                  type="color"
                  value={styleColor}
                  onChange={(e) => setStyleLayerColor(e.target.value)}
                  className="w-full h-9 bg-transparent border border-[#24404f] rounded cursor-pointer"
                />
              </div>

              {layers.find(x => x.id === styleLayerId)?.geomType === 'Point' && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block uppercase">Nokta Sembolü</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['circle', 'pin', 'star', 'triangle', 'square', 'home', 'flag', 'cross'].map(sym => (
                      <button
                        key={sym}
                        onClick={() => setStyleSymbol(sym)}
                        className={`aspect-square flex items-center justify-center border rounded cursor-pointer transition ${
                          styleSymbol === sym 
                            ? 'bg-amber-500 border-amber-400 text-slate-900' 
                            : 'bg-[#152c3a] border-[#24404f] text-slate-400 hover:text-white'
                        }`}
                        title={sym}
                      >
                        <span className="text-xs uppercase font-mono">{sym.substring(0, 2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {layers.find(x => x.id === styleLayerId)?.geomType !== 'Point' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase">Çizgi Kalınlığı (px)</label>
                    <input 
                      type="number"
                      min="0.5"
                      max="30"
                      step="0.5"
                      value={styleWidth}
                      onChange={(e) => setStyleLineWidth(parseFloat(e.target.value) || 3)}
                      className="w-full bg-[#152c3a] border border-[#24404f] rounded px-3 py-1.5 text-xs font-mono text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase">Çizgi Tipi</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['solid', 'dashed', 'dotted'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setStyleDash(d)}
                          className={`py-1.5 text-[10px] font-bold rounded transition cursor-pointer ${
                            styleDash === d 
                              ? 'bg-teal-500 text-slate-950 font-black' 
                              : 'bg-[#152c3a] border border-[#24404f] text-slate-400'
                          }`}
                        >
                          {d === 'solid' ? 'Düz' : d === 'dashed' ? 'Kesikli' : 'Noktalı'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setStyleModalOpen(false)}
                className="flex-1 py-2 border border-[#24404f] hover:border-slate-500 text-xs font-bold text-slate-300 rounded-lg transition"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleSaveStyle}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black rounded-lg transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLACE / FORM DATA ENTRY MODAL */}
      {placeModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1e29] border border-[#24404f] rounded-xl p-5 w-[360px] max-w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-[#24404f]/40 pb-2">
              <FileCheck className="w-4 h-4 text-amber-500" />
              Sözel Veri Girişi Formu
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block uppercase">Ad / Etiket</label>
                <input 
                  type="text"
                  placeholder="Bina, Boru Hattı, vb."
                  value={ffName}
                  onChange={(e) => setFfName(e.target.value)}
                  className="w-full bg-[#152c3a] border border-[#24404f] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block uppercase">Açıklama</label>
                <textarea 
                  rows={2}
                  placeholder="Kategori, yapım yılı vb. açıklayıcı notlar"
                  value={ffDescription}
                  onChange={(e) => setFfDescription(e.target.value)}
                  className="w-full bg-[#152c3a] border border-[#24404f] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Custom fields list */}
              {customFields.length > 0 && (
                <div className="space-y-2 border-t border-[#24404f]/20 pt-2">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Özel Öznitelikler</span>
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Alan"
                        value={field.k}
                        onChange={(e) => {
                          const n = [...customFields];
                          n[idx].k = e.target.value;
                          setCustomFields(n);
                        }}
                        className="w-1/2 bg-[#152c3a] border border-[#24404f] rounded px-2 py-1 text-xs text-slate-100"
                      />
                      <input 
                        type="text"
                        placeholder="Değer"
                        value={field.v}
                        onChange={(e) => {
                          const n = [...customFields];
                          n[idx].v = e.target.value;
                          setCustomFields(n);
                        }}
                        className="w-1/2 bg-[#152c3a] border border-[#24404f] rounded px-2 py-1 text-xs text-slate-100"
                      />
                      <button 
                        onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={() => setCustomFields([...customFields, { k: '', v: '' }])}
                className="w-full py-1.5 border border-[#24404f] border-dashed hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition"
              >
                + Yeni Alan Ekle
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#24404f]/20">
              <button 
                onClick={() => setPlaceModalOpen(false)}
                className="flex-1 py-2 border border-[#24404f] hover:border-slate-500 text-xs font-bold text-slate-300 rounded-lg transition"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleSubmitPlace}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black rounded-lg transition"
              >
                Çizime Başla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
