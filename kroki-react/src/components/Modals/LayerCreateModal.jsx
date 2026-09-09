import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { geomTypeIcon, geomTypeLabel } from '../../lib/symbols.js';

const GEOM_TYPES = ['Point', 'LineString', 'Polygon'];

export default function LayerCreateModal({ folderId, onClose }) {
  const { addLayer, layers, showToast } = useStore();
  const [name, setName] = useState('Yeni Katman ' + (layers.length + 1));
  const [geomType, setGeomType] = useState('Point');

  function create() {
    if (!name.trim()) { showToast('Katman adı girin.'); return; }
    addLayer(name.trim(), geomType, folderId);
    showToast(`"${name.trim()}" katmanı (${geomTypeLabel(geomType)}) oluşturuldu ve aktif yapıldı.`);
    onClose();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-title">Yeni Katman</div>
        <label className="field-label">Katman adı</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="field-label" style={{ marginTop: 12 }}>Geometri türü (sabit)</label>
        <div className="geom-type-row">
          {GEOM_TYPES.map((g) => (
            <button key={g} className={'geom-type-btn' + (geomType === g ? ' active' : '')} onClick={() => setGeomType(g)}>
              <span dangerouslySetInnerHTML={{ __html: geomTypeIcon(g) }} />
              {geomTypeLabel(g)}
            </button>
          ))}
        </div>
        <div className="field-label" style={{ marginTop: 8 }}>Bu katmandaki tüm şekiller seçilen türde olacaktır.</div>
        <div className="modal-actions">
          <div className="btn" onClick={onClose}>Vazgeç</div>
          <div className="btn primary" onClick={create}>Oluştur</div>
        </div>
      </div>
    </div>
  );
}
