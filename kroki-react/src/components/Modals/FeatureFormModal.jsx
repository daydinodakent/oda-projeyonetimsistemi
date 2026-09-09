import React, { useState } from 'react';
import { useStore, getLayer } from '../../store/useStore.js';
import { geomTypeLabel } from '../../lib/symbols.js';

const MODE_MAP = { Point: 'point', LineString: 'linestring', Polygon: 'polygon' };

export default function FeatureFormModal({ onClose }) {
  const { layers, activeLayerId, setPendingFeature, setActiveModule, showToast } = useStore();
  const lyr = getLayer(layers, activeLayerId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customFields, setCustomFields] = useState([]);

  if (!lyr || !lyr.geomType) return null;

  function submit() {
    const attrs = {};
    if (name.trim()) attrs.name = name.trim();
    if (description.trim()) attrs.description = description.trim();
    customFields.forEach(({ key, val }) => { if (key.trim()) attrs[key.trim()] = val; });
    const mode = MODE_MAP[lyr.geomType];
    setPendingFeature(attrs, mode);
    setActiveModule('editor');
    showToast(`Haritaya tıklayarak ${geomTypeLabel(lyr.geomType).toLowerCase()} çizmeye başlayın.`);
    onClose();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-title">{lyr.name} — Veri Girişi ({geomTypeLabel(lyr.geomType)})</div>
        <label className="field-label">Ad</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad / etiket" />
        <label className="field-label" style={{ marginTop: 10 }}>Açıklama</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama (opsiyonel)" />
        {customFields.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input type="text" placeholder="Alan adı" value={f.key} onChange={(e) => setCustomFields((cs) => cs.map((c, ci) => (ci === i ? { ...c, key: e.target.value } : c)))} style={{ flex: 1 }} />
            <input type="text" placeholder="Değer" value={f.val} onChange={(e) => setCustomFields((cs) => cs.map((c, ci) => (ci === i ? { ...c, val: e.target.value } : c)))} style={{ flex: 1 }} />
            <button className="btn" onClick={() => setCustomFields((cs) => cs.filter((_, ci) => ci !== i))}>×</button>
          </div>
        ))}
        <div className="btn" style={{ marginTop: 10 }} onClick={() => setCustomFields((cs) => [...cs, { key: '', val: '' }])}>+ Özel alan ekle</div>
        <div className="modal-actions">
          <div className="btn" onClick={onClose}>Vazgeç</div>
          <div className="btn primary" onClick={submit}>Ekle</div>
        </div>
      </div>
    </div>
  );
}
