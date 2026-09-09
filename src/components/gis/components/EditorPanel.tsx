import React, { useState } from 'react';
import {
  MousePointer,
  RotateCcw,
  RotateCw,
  Trash2,
  Copy,
  PlusCircle,
  Hash,
  Activity,
  ChevronDown,
  Layers,
  CircleDot,
  Box,
  Square,
  Compass,
  Undo2,
  Redo2,
  GitCommit,
  Scissors
} from 'lucide-react';
import { GisFeature, GisLayer } from '../../../types/gis';

interface EditorPanelProps {
  layers: GisLayer[];
  activeLayerId: string;
  onSelectActiveLayer: (id: string) => void;
  mode: string;
  onSetMode: (m: string) => void;
  selectedId: string | null;
  features: GisFeature[];
  onPlaceFeatureClick: () => void;
  onClearAllFeatures: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Feature edit options
  onScaleFeature: (pct: number, baseGeom: GisFeature['geometry'] | null) => void;
  onRotateFeature: (angle: number, baseGeom: GisFeature['geometry'] | null) => void;
  onBufferFeature: (meters: number) => void;
  onSimplifyFeature: (tolerance: number) => void;
  onDuplicateFeature: () => void;
  onDeleteFeature: (id: string) => void;
  onToggle3D: () => void;
  onUpdate3DProps: (floors: number, floorH: number) => void;
  onTogglePipe: () => void;
  onUpdatePipeProps: (diameter: number) => void;
  // Floor configuration presets
  floorCount: number;
  onFloorCountChange: (v: number) => void;
  floorHeight: number;
  onFloorHeightChange: (v: number) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  layers,
  activeLayerId,
  onSelectActiveLayer,
  mode,
  onSetMode,
  selectedId,
  features,
  onPlaceFeatureClick,
  onClearAllFeatures,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onScaleFeature,
  onRotateFeature,
  onBufferFeature,
  onSimplifyFeature,
  onDuplicateFeature,
  onDeleteFeature,
  onToggle3D,
  onUpdate3DProps,
  onTogglePipe,
  onUpdatePipeProps,
  floorCount,
  onFloorCountChange,
  floorHeight,
  onFloorHeightChange
}) => {
  const [activeLayerDropdownOpen, setActiveLayerDropdownOpen] = useState(false);
  
  const [rotateVal, setRotateVal] = useState(0);
  const [scaleVal, setScaleVal] = useState(100);
  const [bufferMeters, setBufferMeters] = useState(50);
  const [simplifyTolerance, setSimplifyTolerance] = useState(0.0005);

  const selectedFeature = selectedId ? features.find(f => f.id === selectedId) : null;
  const activeLayer = layers.find(l => l.id === activeLayerId);

  // Geometric base reference preserved for live slider drags
  const [baseGeom, setBaseGeom] = useState<GisFeature['geometry'] | null>(null);

  const handleSliderStart = () => {
    if (selectedFeature) {
      setBaseGeom(JSON.parse(JSON.stringify(selectedFeature.geometry)));
    }
  };

  const handleRotateChange = (angle: number) => {
    setRotateVal(angle);
    onRotateFeature(angle, baseGeom);
  };

  const handleRotateEnd = () => {
    setRotateVal(0);
    if (selectedFeature) setBaseGeom(JSON.parse(JSON.stringify(selectedFeature.geometry)));
  };

  const handleScaleChange = (pct: number) => {
    setScaleVal(pct);
    onScaleFeature(pct, baseGeom);
  };

  const handleScaleEnd = () => {
    setScaleVal(100);
    if (selectedFeature) setBaseGeom(JSON.parse(JSON.stringify(selectedFeature.geometry)));
  };

  return (
    <div className="flex flex-col gap-4 text-[#e7eef2] p-1 h-full select-none text-left">
      {/* Active Layer Combo */}
      <div className="space-y-1.5 relative">
        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#7f9aa8]">
          Aktif Katman
        </label>
        <button 
          onClick={() => setActiveLayerDropdownOpen(!activeLayerDropdownOpen)}
          className="w-full flex items-center justify-between gap-2 p-2 bg-[#152c3a] border border-[#24404f] hover:border-amber-500 transition rounded cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 truncate">
            <Layers className="w-3.5 h-3.5 text-[#3fc2ac] shrink-0" />
            <span className="text-xs truncate font-bold text-white">
              {activeLayer ? activeLayer.name : 'Katman Seçilmedi'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#7f9aa8] shrink-0" />
        </button>

        {activeLayerDropdownOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-[#0f1e29] border border-[#24404f] rounded shadow-2xl flex flex-col gap-0.5 p-1">
            {layers.map(lyr => (
              <button
                key={lyr.id}
                onClick={() => {
                  onSelectActiveLayer(lyr.id);
                  setActiveLayerDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 p-2 text-left text-xs rounded hover:bg-[#1a3444] transition cursor-pointer ${
                  lyr.id === activeLayerId ? 'text-amber-500 font-bold bg-[#152c3a]' : 'text-[#7f9aa8]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{lyr.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Place Feature Action Button */}
      <div className="space-y-2">
        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#7f9aa8]">
          Geometri ve Öznitelik Ekle
        </label>
        <button 
          onClick={onPlaceFeatureClick}
          disabled={!activeLayer?.geomType}
          className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black text-xs font-black uppercase tracking-wider transition rounded cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          Yeni Şekil Yerleştir
        </button>
        {activeLayer && (
          <div className="text-[10px] text-[#7f9aa8] italic">
            Aktif katman geometrisi: <b className="text-[#3fc2ac] font-bold">{activeLayer.geomType || 'Karma'}</b>
          </div>
        )}
      </div>

      {/* Quick Shapes (For Polygons only) */}
      {activeLayer?.geomType === 'Polygon' && (
        <div className="space-y-2 border-t border-[#24404f]/40 pt-3">
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#7f9aa8]">
            Hızlı Poligon Ekle (Çift Köşe Tıklamalı)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onSetMode('polygon3d')}
              className={`flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-bold border rounded transition cursor-pointer ${
                mode === 'polygon3d' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-[#24404f] bg-[#152c3a] text-[#7f9aa8] hover:border-[#3fc2ac]'
              }`}
            >
              <Box className="w-4 h-4 shrink-0" />
              3B Poligon
            </button>
            <button
              onClick={() => onSetMode('rectangle')}
              className={`flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-bold border rounded transition cursor-pointer ${
                mode === 'rectangle' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-[#24404f] bg-[#152c3a] text-[#7f9aa8] hover:border-[#3fc2ac]'
              }`}
            >
              <Square className="w-4 h-4 shrink-0" />
              Dikdörtgen
            </button>
            <button
              onClick={() => onSetMode('circle')}
              className={`flex flex-col items-center justify-center py-2 gap-1 text-[10px] font-bold border rounded transition cursor-pointer ${
                mode === 'circle' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-[#24404f] bg-[#152c3a] text-[#7f9aa8] hover:border-[#3fc2ac]'
              }`}
            >
              <CircleDot className="w-4 h-4 shrink-0" />
              Çember
            </button>
          </div>

          {mode === 'polygon3d' && (
            <div className="p-2.5 bg-[#152c3a]/50 border border-[#24404f] rounded space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7f9aa8]">Kat Adedi</span>
                <input 
                  type="number"
                  min="1"
                  max="100"
                  value={floorCount}
                  onChange={(e) => onFloorCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 bg-[#0f1e29] border border-[#24404f] text-[#e7eef2] px-1.5 py-0.5 rounded text-right font-mono"
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7f9aa8]">Kat Yüksekliği (m)</span>
                <input 
                  type="number"
                  min="0.5"
                  max="20"
                  step="0.1"
                  value={floorHeight}
                  onChange={(e) => onFloorHeightChange(Math.max(0.5, parseFloat(e.target.value) || 3.0))}
                  className="w-14 bg-[#0f1e29] border border-[#24404f] text-[#e7eef2] px-1.5 py-0.5 rounded text-right font-mono"
                />
              </div>
              <div className="text-[10px] text-[#3fc2ac] font-mono text-right font-bold">
                Toplam Yükseklik: {(floorCount * floorHeight).toFixed(1)} m
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Update Actions (Select / Undo / Redo / Clear) */}
      <div className="space-y-2 border-t border-[#24404f]/40 pt-3">
        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#7f9aa8]">
          Harita Düzenleme & Geçmiş
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onSetMode('select')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold border rounded transition cursor-pointer ${
              mode === 'select' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-[#24404f] bg-[#152c3a] text-[#7f9aa8] hover:border-[#3fc2ac]'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5 shrink-0" />
            Seç / Düzenle
          </button>
          
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 bg-[#152c3a] border border-[#24404f] hover:border-[#3fc2ac] disabled:opacity-30 disabled:hover:border-[#24404f] text-[#7f9aa8] hover:text-white rounded transition cursor-pointer flex items-center justify-center"
            title="Geri Al (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4 shrink-0" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 bg-[#152c3a] border border-[#24404f] hover:border-[#3fc2ac] disabled:opacity-30 disabled:hover:border-[#24404f] text-[#7f9aa8] hover:text-white rounded transition cursor-pointer flex items-center justify-center"
            title="Yinele"
          >
            <Redo2 className="w-4 h-4 shrink-0" />
          </button>

          <button
            onClick={onClearAllFeatures}
            className="p-2 bg-[#152c3a] border border-[#24404f] hover:border-red-500 text-red-500 hover:text-white rounded transition cursor-pointer flex items-center justify-center"
            title="Tüm Çizimleri Temizle"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Selection Details Panel */}
      <div className="flex-1 overflow-y-auto max-h-[420px]" style={{ scrollbarWidth: 'none' }}>
        {!selectedFeature ? (
          <div className="border border-dashed border-[#24404f]/60 rounded p-4 text-[#7f9aa8] text-xs leading-relaxed italic text-center mt-2">
            Düzenlemek için bir şekil seçin — Seç aracıyla haritada bir şekle tıklayın.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-[#24404f]/30">
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                Geometri Modifikasyonları
              </span>
              <span className="text-[10px] font-mono text-[#3fc2ac] bg-[#152c3a] px-1.5 py-0.5 rounded">
                ID: {selectedFeature.id.split('_').pop()}
              </span>
            </div>

            {/* Polygon 3D Toggle */}
            {selectedFeature.geometry.type === 'Polygon' && (
              <div className="space-y-2">
                <button
                  onClick={onToggle3D}
                  className="w-full py-1.5 bg-[#152c3a] hover:bg-[#1a3444] border border-[#24404f] rounded text-xs font-bold transition cursor-pointer text-center"
                >
                  {selectedFeature.properties.extrude ? '2B Poligona Çevir' : '3B Poligona Çevir'}
                </button>

                {selectedFeature.properties.extrude && (
                  <div className="p-2.5 bg-[#152c3a]/50 border border-[#24404f] rounded space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-[#7f9aa8] font-bold">
                        <span>KAT ADEDİ</span>
                        <span className="font-mono text-white">{selectedFeature.properties.floors || 1}</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="100"
                        value={selectedFeature.properties.floors || 1}
                        onChange={(e) => onUpdate3DProps(parseInt(e.target.value) || 1, selectedFeature.properties.floorHeight || 3.0)}
                        className="w-full accent-amber-500 h-1.5 rounded-lg bg-[#0f1e29]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-[#7f9aa8] font-bold">
                        <span>KAT YÜKSEKLİĞİ</span>
                        <span className="font-mono text-white">{(selectedFeature.properties.floorHeight || 3.0).toFixed(1)} m</span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="20"
                        step="0.1"
                        value={selectedFeature.properties.floorHeight || 3.0}
                        onChange={(e) => onUpdate3DProps(selectedFeature.properties.floors || 1, parseFloat(e.target.value) || 3.0)}
                        className="w-full accent-amber-500 h-1.5 rounded-lg bg-[#0f1e29]"
                      />
                    </div>
                    <div className="text-[10px] text-[#3fc2ac] text-right font-mono font-bold">
                      Toplam Yükseklik: {((selectedFeature.properties.floors || 1) * (selectedFeature.properties.floorHeight || 3.0)).toFixed(1)} m
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LineString Pipe Toggle */}
            {selectedFeature.geometry.type === 'LineString' && (
              <div className="space-y-2">
                <button
                  onClick={onTogglePipe}
                  className="w-full py-1.5 bg-[#152c3a] hover:bg-[#1a3444] border border-[#24404f] rounded text-xs font-bold transition cursor-pointer text-center"
                >
                  {selectedFeature.properties.pipe ? 'Boruyu Çizgiye Çevir' : 'Boruya Çevir'}
                </button>

                {selectedFeature.properties.pipe && (
                  <div className="p-2.5 bg-[#152c3a]/50 border border-[#24404f] rounded space-y-2">
                    <div className="flex justify-between text-[10px] text-[#7f9aa8] font-bold">
                      <span>ÇAP (m)</span>
                      <span className="font-mono text-white">{(selectedFeature.properties.diameter || 5.0).toFixed(1)} m</span>
                    </div>
                    <input 
                      type="range"
                      min="0.2"
                      max="100"
                      step="0.1"
                      value={selectedFeature.properties.diameter || 5.0}
                      onChange={(e) => onUpdatePipeProps(parseFloat(e.target.value) || 5.0)}
                      className="w-full accent-amber-500 h-1.5 rounded-lg bg-[#0f1e29]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Rotation and Scaling Sliders */}
            {selectedFeature.geometry.type !== 'Point' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-[#7f9aa8] font-bold uppercase tracking-wider">
                    <span>Döndür (Açı)</span>
                    <span className="font-mono text-white">{rotateVal}°</span>
                  </div>
                  <input 
                    type="range"
                    min="-180"
                    max="180"
                    value={rotateVal}
                    onMouseDown={handleSliderStart}
                    onTouchStart={handleSliderStart}
                    onChange={(e) => handleRotateChange(parseInt(e.target.value))}
                    onMouseUp={handleRotateEnd}
                    onTouchEnd={handleRotateEnd}
                    className="w-full accent-amber-500 h-1.5 rounded-lg bg-[#0f1e29]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-[#7f9aa8] font-bold uppercase tracking-wider">
                    <span>Ölçekle (Boyut)</span>
                    <span className="font-mono text-white">%{scaleVal}</span>
                  </div>
                  <input 
                    type="range"
                    min="20"
                    max="300"
                    value={scaleVal}
                    onMouseDown={handleSliderStart}
                    onTouchStart={handleSliderStart}
                    onChange={(e) => handleScaleChange(parseInt(e.target.value))}
                    onMouseUp={handleScaleEnd}
                    onTouchEnd={handleScaleEnd}
                    className="w-full accent-amber-500 h-1.5 rounded-lg bg-[#0f1e29]"
                  />
                </div>
              </div>
            )}

            {/* Buffer & Simplification inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase tracking-wider">
                  Genişlet / Daralt (Tampon)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={bufferMeters}
                    onChange={(e) => setBufferMeters(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-[#152c3a] border border-[#24404f] text-[#e7eef2] text-xs rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none font-mono"
                    placeholder="metre"
                  />
                  <button
                    onClick={() => onBufferFeature(bufferMeters)}
                    className="px-3 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded cursor-pointer transition shrink-0"
                  >
                    Uygula
                  </button>
                </div>
                <div className="text-[9px] text-[#7f9aa8]">Pozitif değer genişletir, negatif değer daraltır (metre).</div>
              </div>

              {selectedFeature.geometry.type !== 'Point' && (
                <div className="space-y-1">
                  <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase tracking-wider">
                    Sadeleştir (Köşeleri Azalt)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      step="0.0001"
                      min="0"
                      value={simplifyTolerance}
                      onChange={(e) => setSimplifyTolerance(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-[#152c3a] border border-[#24404f] text-[#e7eef2] text-xs rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => onSimplifyFeature(simplifyTolerance)}
                      className="px-3 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded cursor-pointer transition shrink-0"
                    >
                      Uygula
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions (Duplicate / Delete) */}
            <div className="flex gap-2 border-t border-[#24404f]/20 pt-3">
              <button
                onClick={onDuplicateFeature}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#152c3a] hover:bg-[#1a3444] border border-[#24404f] rounded text-xs font-bold transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Kopyala
              </button>
              <button
                onClick={() => onDeleteFeature(selectedFeature.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-500/50 hover:bg-red-500/10 text-red-500 hover:text-white rounded text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Sil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
