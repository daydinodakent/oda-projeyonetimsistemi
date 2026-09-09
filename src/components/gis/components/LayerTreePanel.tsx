import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Trash2,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Sliders,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { GisFolder, GisLayer, RasterOverlay } from '../../../types/gis';
import { SYMBOL_SVG, SymbolKey, getSymbolIconSvg } from '../utils/maplibreSdfIcons';

interface LayerTreePanelProps {
  folders: GisFolder[];
  layers: GisLayer[];
  rasterOverlays: RasterOverlay[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string, v: boolean) => void;
  onToggleFolderVisibility: (fid: string, v: boolean) => void;
  onToggleFolderExpanded: (fid: string) => void;
  onAddFolder: (name: string, parentId: string | null) => void;
  onDeleteFolder: (fid: string) => void;
  onDeleteLayer: (lid: string) => void;
  onAddLayer: (name: string, type: GisLayer['geomType'], folderId: string | null) => void;
  onUpdateLayerStyle: (id: string, updates: Partial<GisLayer>) => void;
  onZoomToLayer: (lid: string) => void;
  onExportLayer: (lid: string, format: string) => void;
  onAddRasterClick: () => void;
  layerOpacity: number;
  onLayerOpacityChange: (v: number) => void;
}

export const LayerTreePanel: React.FC<LayerTreePanelProps> = ({
  folders,
  layers,
  rasterOverlays,
  activeLayerId,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleFolderVisibility,
  onToggleFolderExpanded,
  onAddFolder,
  onDeleteFolder,
  onDeleteLayer,
  onAddLayer,
  onUpdateLayerStyle,
  onZoomToLayer,
  onExportLayer,
  onAddRasterClick,
  layerOpacity,
  onLayerOpacityChange
}) => {
  // UI states for modals and custom dropdown overlays
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'layer' | 'root'; targetId: string | null } | null>(null);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isLayerModalOpen, setIsLayerModalOpen] = useState(false);
  
  const [styleLayerId, setStyleStyleLayerId] = useState<string | null>(null);
  const [styleColor, setStyleColor] = useState('#3fc2ac');
  const [styleFillColor, setStyleFillColor] = useState('#eef29c');
  const [styleWidth, setStyleWidth] = useState(2.5);
  const [styleDash, setStyleDash] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [styleSymbol, setStyleSymbol] = useState<SymbolKey>('circle');

  const [newLayerName, setNewLayerName] = useState('Yeni Katman');
  const [newLayerGeom, setNewLayerGeom] = useState<GisLayer['geomType']>('Point');
  const [newLayerParentFolderId, setNewLayerParentFolderId] = useState<string | null>(null);

  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  const getGeomTypeIcon = (geomType: GisLayer['geomType'], symbol?: string) => {
    if (geomType === 'Point') {
      const activeSym = (symbol || 'circle') as SymbolKey;
      return (
        <span
          className="w-4 h-4 flex items-center justify-center shrink-0"
          dangerouslySetInnerHTML={{ __html: getSymbolIconSvg(activeSym) }}
        />
      );
    }
    const pathD = geomType === 'LineString'
      ? 'M5 18 L19 6'
      : geomType === 'Polygon'
        ? 'M12 3l8 6-3 10H7L4 9z'
        : 'M8 8r3 M13 19l6-6 M13 13h6v6';
    
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={pathD} />
      </svg>
    );
  };

  const handleOpenStyleModal = (layer: GisLayer) => {
    setStyleStyleLayerId(layer.id);
    setStyleColor(layer.color || (layer.geomType === 'Polygon' ? '#e02424' : layer.geomType === 'LineString' ? '#12d16f' : '#3fc2ac'));
    setStyleFillColor(layer.fillColor || '#eef29c');
    setStyleWidth(layer.lineWidth || (layer.geomType === 'Polygon' ? 2.6 : 3));
    setStyleDash(layer.dash || 'solid');
    setStyleSymbol((layer.symbol || 'circle') as SymbolKey);
    setIsStyleModalOpen(true);
  };

  const handleSaveStyle = () => {
    if (styleLayerId) {
      onUpdateLayerStyle(styleLayerId, {
        color: styleColor,
        fillColor: styleFillColor,
        lineWidth: styleWidth,
        dash: styleDash,
        symbol: styleSymbol,
        scale: styleWidth // Use width input as scale for point layer
      });
    }
    setIsStyleModalOpen(false);
  };

  const handleOpenLayerModal = (folderId: string | null) => {
    setNewLayerParentFolderId(folderId);
    setNewLayerName('Yeni Katman');
    setNewLayerGeom('Point');
    setIsLayerModalOpen(true);
  };

  const handleCreateLayer = () => {
    if (!newLayerName.trim()) return;
    onAddLayer(newLayerName.trim(), newLayerGeom, newLayerParentFolderId);
    setIsLayerModalOpen(false);
  };

  const renderTreeLevel = (parentId: string | null, depth: number) => {
    const subFolders = folders.filter(f => f.parentFolderId === parentId);
    const subLayers = layers.filter(l => l.folderId === parentId);
    const subRasters = rasterOverlays.filter(r => r.folderId === parentId);

    return (
      <div className="flex flex-col gap-1 w-full select-none">
        {/* Render Folders */}
        {subFolders.map(folder => {
          const isExpanded = folder.expanded !== false;
          const descendantLayers = layers.filter(l => l.folderId === folder.id);
          const allVisible = descendantLayers.length === 0 || descendantLayers.every(l => l.visible !== false);
          
          return (
            <div key={folder.id} className="flex flex-col w-full">
              <div 
                className="flex items-center justify-between gap-1.5 p-2 bg-[#152c3a] border border-[#24404f]/40 hover:border-amber-500/30 transition rounded group"
                style={{ marginLeft: `${depth * 14}px` }}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <button 
                    onClick={() => onToggleFolderExpanded(folder.id)}
                    className="p-0.5 text-[#7f9aa8] hover:text-white shrink-0 cursor-pointer"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  <input 
                    type="checkbox"
                    checked={allVisible}
                    onChange={(e) => onToggleFolderVisibility(folder.id, e.target.checked)}
                    className="accent-amber-500 w-3.5 h-3.5 rounded border-[#24404f] cursor-pointer"
                  />
                  <span className="text-[#3fc2ac] shrink-0">
                    {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                  </span>
                  <span className="text-xs font-bold truncate text-[#e7eef2]">{folder.name}</span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button 
                    onClick={() => handleOpenLayerModal(folder.id)}
                    className="p-1 text-[#7f9aa8] hover:text-amber-500 rounded hover:bg-[#0f1e29] cursor-pointer"
                    title="Katman Ekle"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  {folder.deletable !== false && (
                    <button 
                      onClick={() => { if(confirm('Bu klasörü ve altındaki her şeyi silmek istediğinize emin misiniz?')) onDeleteFolder(folder.id); }}
                      className="p-1 text-[#7f9aa8] hover:text-red-400 rounded hover:bg-[#0f1e29] cursor-pointer"
                      title="Klasörü Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {isExpanded && renderTreeLevel(folder.id, depth + 1)}
            </div>
          );
        })}

        {/* Render Layers */}
        {subLayers.map(layer => {
          const isActive = layer.id === activeLayerId;
          const isVisible = layer.visible !== false;
          const iconColor = layer.color || (layer.geomType === 'Polygon' ? '#e02424' : layer.geomType === 'LineString' ? '#12d16f' : '#3fc2ac');

          return (
            <div 
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center justify-between gap-1.5 p-2 transition rounded group cursor-pointer border ${
                isActive 
                  ? 'bg-[#1a3444]/60 border-amber-500/50 shadow-sm' 
                  : 'bg-[#152c3a]/40 border-[#1a2f3c] hover:border-[#24404f]'
              }`}
              style={{ marginLeft: `${depth * 14 + 14}px` }}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input 
                  type="checkbox"
                  checked={isVisible}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onToggleLayerVisibility(layer.id, e.target.checked)}
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span style={{ color: iconColor }} className="shrink-0 flex items-center justify-center">
                  {getGeomTypeIcon(layer.geomType, layer.symbol)}
                </span>
                <span className={`text-xs truncate ${isActive ? 'font-black text-amber-400' : 'text-[#7f9aa8] group-hover:text-white'}`}>
                  {layer.name}
                </span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => onZoomToLayer(layer.id)}
                  className="p-1 text-[#7f9aa8] hover:text-[#3fc2ac] rounded hover:bg-[#0f1e29] cursor-pointer"
                  title="Katmana Odaklan"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleOpenStyleModal(layer)}
                  className="p-1 text-[#7f9aa8] hover:text-[#3fc2ac] rounded hover:bg-[#0f1e29] cursor-pointer"
                  title="Stil Düzenle"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => onExportLayer(layer.id, 'geojson')}
                  className="p-1 text-[#7f9aa8] hover:text-amber-500 rounded hover:bg-[#0f1e29] cursor-pointer"
                  title="Dışa Aktar (GeoJSON)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => { if(confirm('Bu katmanı ve çizimlerini silmek istediğinize emin misiniz?')) onDeleteLayer(layer.id); }}
                  className="p-1 text-[#7f9aa8] hover:text-red-400 rounded hover:bg-[#0f1e29] cursor-pointer"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Render Rasters */}
        {subRasters.map(raster => {
          const isVisible = raster.visible !== false;
          return (
            <div 
              key={raster.id}
              className="flex items-center justify-between gap-1.5 p-2 bg-[#152c3a]/25 border border-[#1a2f3c] rounded group"
              style={{ marginLeft: `${depth * 14 + 14}px` }}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input 
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => onToggleLayerVisibility(raster.id, e.target.checked)} // We can handle raster visibility through parent
                  className="accent-amber-500 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span className="text-[#3fc2ac] shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs truncate text-[#7f9aa8] italic group-hover:text-white">
                  {raster.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 text-[#e7eef2] p-1 h-full select-none text-left">
      <div className="flex items-center justify-between gap-1.5 border-b border-[#24404f] pb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            CBS Katman Ağacı
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onAddFolder('Yeni Klasör', null)}
            className="px-2 py-1 bg-[#152c3a] border border-[#24404f] text-[10px] font-bold text-amber-500 hover:border-amber-500 transition rounded cursor-pointer flex items-center gap-1"
          >
            <Folder className="w-3 h-3" />
            +KLASÖR
          </button>
          <button 
            onClick={() => handleOpenLayerModal(null)}
            className="px-2 py-1 bg-[#152c3a] border border-[#24404f] text-[10px] font-bold text-[#3fc2ac] hover:border-[#3fc2ac] transition rounded cursor-pointer flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            +KATMAN
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#7f9aa8]">
          Görüntü Opaklığı
        </label>
        <div className="flex items-center gap-3">
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={layerOpacity}
            onChange={(e) => onLayerOpacityChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#152c3a] border border-[#24404f] rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-[10px] font-mono font-bold text-amber-500 w-10 text-right">%{layerOpacity}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[480px]" style={{ scrollbarWidth: 'none' }}>
        {renderTreeLevel(null, 0)}
      </div>

      {/* Style Editor Modal */}
      {isStyleModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f1e29] border border-[#24404f] p-5 rounded-xl shadow-2xl w-full max-w-sm space-y-4 text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-500">Katman Stili</h3>
            
            {/* Fill color for polygon layers only */}
            {layers.find(l => l.id === styleLayerId)?.geomType === 'Polygon' && (
              <div className="space-y-1">
                <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">Dolgu Rengi</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={styleFillColor} 
                    onChange={e => setStyleFillColor(e.target.value)} 
                    className="w-12 h-8 border border-[#24404f] bg-transparent cursor-pointer rounded"
                  />
                  <span className="font-mono text-xs">{styleFillColor.toUpperCase()}</span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">
                {layers.find(l => l.id === styleLayerId)?.geomType === 'Polygon' ? 'Çerçeve Rengi' : 'Renk'}
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={styleColor} 
                  onChange={e => setStyleColor(e.target.value)} 
                  className="w-12 h-8 border border-[#24404f] bg-transparent cursor-pointer rounded"
                />
                <span className="font-mono text-xs">{styleColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Point Symbol Selection */}
            {layers.find(l => l.id === styleLayerId)?.geomType === 'Point' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">Sembol</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(SYMBOL_SVG) as SymbolKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setStyleSymbol(key)}
                      className={`aspect-square flex items-center justify-center border rounded p-1 cursor-pointer transition ${
                        styleSymbol === key 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                          : 'border-[#24404f] bg-[#152c3a] text-[#7f9aa8] hover:border-[#3fc2ac]'
                      }`}
                    >
                      <span className="w-5 h-5" dangerouslySetInnerHTML={{ __html: getSymbolIconSvg(key) }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">
                {layers.find(l => l.id === styleLayerId)?.geomType === 'Point' ? 'Ölçek (Sembol Boyu)' : 'Kalınlık (px)'}
              </label>
              <input 
                type="number" 
                min={layers.find(l => l.id === styleLayerId)?.geomType === 'Point' ? 0.3 : 0.5}
                max={layers.find(l => l.id === styleLayerId)?.geomType === 'Point' ? 4.0 : 30.0}
                step={layers.find(l => l.id === styleLayerId)?.geomType === 'Point' ? 0.1 : 0.5}
                value={styleWidth}
                onChange={e => setStyleWidth(parseFloat(e.target.value) || 1)}
                className="w-full bg-[#152c3a] border border-[#24404f] text-[#e7eef2] text-sm rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {layers.find(l => l.id === styleLayerId)?.geomType !== 'Point' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">Çizgi Tipi</label>
                <div className="flex gap-2">
                  {(['solid', 'dashed', 'dotted'] as const).map((dash) => (
                    <button
                      key={dash}
                      onClick={() => setStyleDash(dash)}
                      className={`flex-1 py-1.5 text-xs font-bold border rounded cursor-pointer transition ${
                        styleDash === dash 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                          : 'border-[#24404f] bg-[#152c3a] text-[#7f9aa8]'
                      }`}
                    >
                      {dash === 'solid' ? 'Düz' : dash === 'dashed' ? 'Kesikli' : 'Noktalı'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsStyleModalOpen(false)}
                className="flex-1 py-2 border border-[#24404f] text-xs font-bold text-[#7f9aa8] hover:border-white transition rounded cursor-pointer"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleSaveStyle}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-black transition rounded cursor-pointer"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Layer Modal */}
      {isLayerModalOpen && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f1e29] border border-[#24404f] p-5 rounded-xl shadow-2xl w-full max-w-sm space-y-4 text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#3fc2ac]">Yeni Katman Oluştur</h3>
            
            <div className="space-y-1">
              <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">Katman Adı</label>
              <input 
                type="text" 
                value={newLayerName}
                onChange={e => setNewLayerName(e.target.value)}
                placeholder="Örn. Boru Hatları"
                className="w-full bg-[#152c3a] border border-[#24404f] text-[#e7eef2] text-sm rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">Geometri Türü</label>
              <div className="flex gap-2">
                {(['Point', 'LineString', 'Polygon'] as const).map((geom) => (
                  <button
                    key={geom}
                    type="button"
                    onClick={() => setNewLayerGeom(geom)}
                    className={`flex-1 py-2 text-xs font-bold border rounded flex flex-col items-center gap-1.5 cursor-pointer transition ${
                      newLayerGeom === geom 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                        : 'border-[#24404f] bg-[#152c3a] text-[#7f9aa8] hover:border-[#3fc2ac]'
                    }`}
                  >
                    <span className="shrink-0 flex items-center justify-center">
                      {getGeomTypeIcon(geom)}
                    </span>
                    <span>{geom === 'Point' ? 'Nokta' : geom === 'LineString' ? 'Çizgi' : 'Poligon'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsLayerModalOpen(false)}
                className="flex-1 py-2 border border-[#24404f] text-xs font-bold text-[#7f9aa8] hover:border-white transition rounded cursor-pointer"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleCreateLayer}
                className="flex-1 py-2 bg-[#3fc2ac] hover:bg-[#3fc2ac]/85 text-xs font-bold text-black transition rounded cursor-pointer"
              >
                Katman Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
