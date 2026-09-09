import React, { useState } from 'react';
import { useStore, getLayer, defaultColorFor } from '../../store/useStore.js';
import { SYMBOL_LIBRARY, SYMBOL_LABELS, symbolIconSvg } from '../../lib/symbols.js';

export default function LayerStyleModal({ layerId, onClose }) {
  const { layers, updateLayerStyle, showToast } = useStore();
  const lyr = getLayer(layers, layerId);
  if (!lyr) return null;

  const isPolygon = lyr.geomType === 'Polygon';
  const isPoint = lyr.geomType === 'Point' || !lyr.geomType;
  const showDash = lyr.geomType === 'LineString' || lyr.geomType === 'Polygon';

  const [color, setColor] = useState(lyr.color || (isPolygon ? '#e02424' : defaultColorFor(lyr.geomType)));
  const [fillColor, setFillColor] = useState(lyr.fillColor || '#eef29c');
  const [symbol, setSymbol] = useState(lyr.symbol || 'circle');
  const [dash, setDash] = useState(lyr.dash || 'solid');
  const [width, setWidth] = useState(lyr.lineWidth || (isPoint ? lyr.scale || 1 : lyr.geomType === 'Polygon' ? 2.6 : 3));

  function save() {
    const patch = { color };
    if (isPolygon) patch.fillColor = fillColor;
    if (isPoint) { patch.scale = parseFloat(width) || 1; patch.symbol = symbol; }
    else { patch.lineWidth = parseFloat(width) || null; patch.dash = dash; }
    updateLayerStyle(layerId, patch);
    showToast(`"${lyr.name}" stili güncellendi.`);
    onClose();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-title">{lyr.name} — Stil</div>

        {isPolygon && (
          <div style={{ marginBottom: 12 }}>
            <label className="field-label">Dolgu Rengi</label>
            <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} style={{ width: '100%', height: 36, padding: 0, border: '1px solid var(--line)', borderRadius: 2, background: 'none', cursor: 'pointer' }} />
          </div>
        )}
        <label className="field-label">{isPolygon ? 'Çerçeve Rengi' : 'Renk'}</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '100%', height: 36, padding: 0, border: '1px solid var(--line)', borderRadius: 2, background: 'none', cursor: 'pointer' }} />

        {isPoint && (
          <div style={{ marginTop: 12 }}>
            <span className="field-label">Sembol</span>
            <div className="symbol-picker-row">
              {SYMBOL_LIBRARY.map((key) => (
                <div key={key} className={'symbol-btn' + (symbol === key ? ' active' : '')} title={SYMBOL_LABELS[key]} onClick={() => setSymbol(key)} dangerouslySetInnerHTML={{ __html: symbolIconSvg(key) }} />
              ))}
            </div>
          </div>
        )}

        <label className="field-label" style={{ marginTop: 12 }}>{isPoint ? 'Ölçek (sembol boyutu)' : 'Kalınlık (px)'}</label>
        <input
          type="number" value={width} onChange={(e) => setWidth(e.target.value)}
          min={isPoint ? 0.3 : 0.5} max={isPoint ? 4 : 30} step={isPoint ? 0.1 : 0.5}
        />

        {showDash && (
          <div style={{ marginTop: 12 }}>
            <span className="field-label">Çizgi tipi</span>
            <div className="geom-type-row">
              {[['solid', 'Düz'], ['dashed', 'Kesikli'], ['dotted', 'Noktalı']].map(([key, label]) => (
                <button key={key} className={'geom-type-btn' + (dash === key ? ' active' : '')} onClick={() => setDash(key)}>{label}</button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <div className="btn" onClick={onClose}>Vazgeç</div>
          <div className="btn primary" onClick={save}>Kaydet</div>
        </div>
      </div>
    </div>
  );
}
