import React, { useState } from 'react';
import { useStore, defaultColorFor } from '../../store/useStore.js';
import { SYMBOL_LIBRARY, SYMBOL_LABELS, symbolIconSvg } from '../../lib/symbols.js';
import { X } from 'lucide-react';

interface LayerStyleModalProps {
  layerId: string;
  onClose: () => void;
}

export default function LayerStyleModal({ layerId, onClose }: LayerStyleModalProps) {
  const layers = useStore((s) => s.layers);
  const { updateLayerStyle, showToast } = useStore();

  const lyr = layers.find((l) => l.id === layerId);
  const defColor = lyr ? defaultColorFor(lyr.geomType) : '#3fc2ac';

  const [color, setColor] = useState(lyr?.color || defColor);
  const [fillColor, setFillColor] = useState(lyr?.fillColor || color);
  const [lineWidth, setLineWidth] = useState(lyr?.lineWidth || 2);
  const [dash, setDash] = useState(lyr?.dash || 'solid');
  const [symbol, setSymbol] = useState(lyr?.symbol || 'circle');
  const [scale, setScale] = useState(lyr?.scale || 1);

  if (!lyr) return null;

  function handleApply() {
    updateLayerStyle(layerId, {
      color,
      fillColor: lyr.geomType === 'Polygon' ? fillColor : null,
      lineWidth: lyr.geomType !== 'Point' ? lineWidth : null,
      dash: lyr.geomType !== 'Point' ? dash : 'solid',
      symbol: lyr.geomType === 'Point' || lyr.geomType === null ? symbol : undefined,
      scale: lyr.geomType === 'Point' || lyr.geomType === null ? scale : undefined
    });
    showToast('Stil güncellendi.');
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9000] p-4">
      <div className="bg-white border border-zinc-200 rounded-lg max-w-sm w-full shadow-2xl overflow-hidden animate-zoom-in">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-800">"{lyr.name}" Katman Stili</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 max-h-[350px] overflow-y-auto">
          {/* Ana Çizgi / Kenarlık Rengi */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Katman Ana Rengi</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (lyr.geomType === 'Polygon' && fillColor === color) {
                    setFillColor(e.target.value);
                  }
                }}
                className="w-10 h-7 border border-zinc-200 rounded cursor-pointer p-0"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-1 text-xs border border-zinc-200 rounded outline-none uppercase font-mono"
              />
            </div>
          </div>

          {/* Poligon Dolgu Rengi */}
          {lyr.geomType === 'Polygon' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Dolgu Rengi</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-10 h-7 border border-zinc-200 rounded cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="flex-1 px-3 py-1 text-xs border border-zinc-200 rounded outline-none uppercase font-mono"
                />
              </div>
            </div>
          )}

          {/* Çizgi Kalınlığı */}
          {lyr.geomType !== 'Point' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Çizgi Kalınlığı ({lineWidth}px)</label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-full h-1 bg-zinc-200 rounded appearance-none cursor-pointer accent-teal-600"
              />
            </div>
          )}

          {/* Çizgi Tipi */}
          {lyr.geomType !== 'Point' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Çizgi Tipi</label>
              <select
                value={dash}
                onChange={(e) => setDash(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded outline-none"
              >
                <option value="solid">Düz Çizgi (Solid)</option>
                <option value="dashed">Kesikli Çizgi (Dashed)</option>
                <option value="dotted">Noktalı Çizgi (Dotted)</option>
              </select>
            </div>
          )}

          {/* Nokta Sembolü */}
          {(lyr.geomType === 'Point' || lyr.geomType === null) && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Nokta İkonu</label>
              <div className="grid grid-cols-4 gap-1 border border-zinc-200 rounded p-1.5 bg-zinc-50 max-h-24 overflow-y-auto">
                {SYMBOL_LIBRARY.map((key) => {
                  const label = SYMBOL_LABELS[key];
                  const svg = symbolIconSvg(key);
                  return (
                    <button
                      key={key}
                      onClick={() => setSymbol(key)}
                      title={label}
                      className={'p-1.5 rounded flex items-center justify-center transition-colors ' + (symbol === key ? 'bg-teal-600 text-white' : 'text-zinc-600 hover:bg-zinc-200')}
                    >
                      <div className="w-5 h-5 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nokta Boyutu (Ölçeği) */}
          {(lyr.geomType === 'Point' || lyr.geomType === null) && (
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">İkon Boyutu ({scale.toFixed(1)}x)</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full h-1 bg-zinc-200 rounded appearance-none cursor-pointer accent-teal-600"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-50 border-t border-zinc-100 text-xs">
          <button onClick={onClose} className="btn btn-secondary px-3 py-1.5 font-medium">
            İptal
          </button>
          <button onClick={handleApply} className="btn btn-primary px-3 py-1.5 font-semibold">
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
