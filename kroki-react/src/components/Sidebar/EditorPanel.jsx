import React, { useState } from 'react';
import { useStore, getLayer } from '../../store/useStore.js';
import { geomTypeIcon, geomTypeLabel, symbolIconSvg } from '../../lib/symbols.js';
import FeatureFormModal from '../Modals/FeatureFormModal.jsx';

const TOOL_ICONS = {
  select: '<path d="M5 3l14 7-6 2-2 6-6-15z"/>',
  rectangle: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  polygon3d: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/>'
};

export default function EditorPanel() {
  const { layers, activeLayerId, setActiveLayerId, mode, setMode, undo, redo, features, deleteFeature, pushHistory, showToast } = useStore();
  const [dropOpen, setDropOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const lyr = getLayer(layers, activeLayerId);

  function clearAll() {
    if (!confirm('Tüm şekiller silinsin mi?')) return;
    pushHistory();
    features.forEach((f) => deleteFeature(f.id));
    showToast('Tüm şekiller silindi.');
  }

  return (
    <div className="panel-body">
      <div>
        <span className="field-label">Aktif katman</span>
        <div className="native-select" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setDropOpen((v) => !v)}>
          <span style={{ display: 'flex', color: lyr?.color || 'var(--teal)' }} dangerouslySetInnerHTML={{ __html: lyr ? (lyr.geomType === 'Point' && lyr.symbol ? symbolIconSvg(lyr.symbol) : geomTypeIcon(lyr.geomType)) : '' }} />
          <span style={{ flex: 1 }}>{lyr?.name || '—'}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, color: 'var(--text-dim)' }}><path d="M6 9l6 6 6-6" /></svg>
        </div>
        {dropOpen && (
          <div style={{ marginTop: 4, background: 'var(--bg-panel-raise)', border: '1px solid var(--line)', borderRadius: 2 }}>
            {layers.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', cursor: 'pointer' }}
                onClick={() => { setActiveLayerId(l.id); setDropOpen(false); }}>
                <span style={{ display: 'flex', color: l.color || 'var(--teal)' }} dangerouslySetInnerHTML={{ __html: l.geomType === 'Point' && l.symbol ? symbolIconSvg(l.symbol) : geomTypeIcon(l.geomType) }} />
                <span>{l.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="field-label group-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Ekle
        </span>
        <div className="tool-row">
          <button className="tool" style={{ flex: 1, width: 'auto' }} onClick={() => {
            if (!lyr) { showToast('Önce bir katman seçin.'); return; }
            if (!lyr.geomType) { showToast('Bu katman için geometri türü tanımlanmamış.'); return; }
            setShowForm(true);
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14" /></svg>
            <span>Yerleştir</span>
          </button>
        </div>
        <div className="field-label" style={{ marginTop: 6, marginBottom: 0 }}>
          {lyr?.geomType ? `Aktif katman: "${lyr.name}" (${geomTypeLabel(lyr.geomType)})` : `"${lyr?.name}" için geometri türü tanımlı değil.`}
        </div>

        {lyr?.geomType === 'Polygon' && (
          <div style={{ marginTop: 12 }}>
            <span className="field-label">Hızlı ekle (form olmadan)</span>
            <div className="tool-grid">
              {['polygon3d', 'rectangle', 'circle'].map((m) => (
                <button key={m} className={'tool' + (mode === m ? ' active' : '')} onClick={() => setMode(m)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: TOOL_ICONS[m] }} />
                  <span>{m === 'polygon3d' ? '3B Pol.' : m === 'rectangle' ? 'D.gen' : 'Çember'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <span className="field-label group-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
          Sil
        </span>
        <div className="tool-row">
          <button className="tool danger" style={{ flex: 1, width: 'auto' }} onClick={clearAll}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
            <span>Tümünü sil</span>
          </button>
        </div>
      </div>

      <div>
        <span className="field-label group-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /></svg>
          Güncelle
        </span>
        <div className="tool-row">
          <button className={'tool' + (mode === 'select' ? ' active' : '')} style={{ flex: 1, width: 'auto' }} onClick={() => setMode('select')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: TOOL_ICONS.select }} />
            <span>Seç</span>
          </button>
          <button className="tool" style={{ flex: 1, width: 'auto' }} onClick={undo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 0 1 0 10h-1" /></svg>
            <span>Geri al</span>
          </button>
          <button className="tool" style={{ flex: 1, width: 'auto' }} onClick={redo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 7l5 5-5 5" /><path d="M20 12H9a5 5 0 0 0 0 10h1" /></svg>
            <span>Yinele</span>
          </button>
        </div>
      </div>

      {showForm && <FeatureFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
