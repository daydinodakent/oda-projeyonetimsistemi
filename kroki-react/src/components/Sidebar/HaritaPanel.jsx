import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import LayerTree from '../LayerTree/LayerTree.jsx';
import LayerCreateModal from '../Modals/LayerCreateModal.jsx';
import LayerStyleModal from '../Modals/LayerStyleModal.jsx';

export default function HaritaPanel({ mapRef, onImportClick }) {
  const { maps, activeMapId, layers } = useStore((s) => ({ maps: s.maps, activeMapId: s.activeMapId, layers: s.layers }));
  const [subtab, setSubtab] = useState('cbs');
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [layerModalFolder, setLayerModalFolder] = useState(null);
  const [styleLayerId, setStyleLayerId] = useState(null);
  const opacity = useStore((s) => s.layerOpacity ?? 100);

  const activeMap = maps.find((m) => m.id === activeMapId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="subtabs">
        <div className={'subtab' + (subtab === 'cbs' ? ' active' : '')} onClick={() => setSubtab('cbs')}>CBS</div>
        <div className={'subtab' + (subtab === 'kurumsal' ? ' active' : '')} onClick={() => setSubtab('kurumsal')}>Kurumsal Altlık</div>
      </div>
      <div className="panel-body">
        {subtab === 'cbs' ? (
          <>
            <div>
              <span className="field-label">CBS Haritası</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <div className="native-select" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14, color: 'var(--teal)' }}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></svg>
                  <span style={{ flex: 1 }}>{activeMap?.name || '—'}</span>
                </div>
                <button className="btn" style={{ flex: '0 0 auto', width: 34, color: 'var(--amber)', borderColor: 'var(--amber)' }} onClick={onImportClick} title="Vektör / Raster ekle">+</button>
              </div>
            </div>
            <div>
              <span className="field-label">Katman opaklığı</span>
              <input type="range" min={10} max={100} defaultValue={100} onChange={(e) => {
                const op = (parseFloat(e.target.value) || 100) / 100;
                ['poly-fill', 'poly-outline-solid', 'poly-outline-dashed', 'poly-outline-dotted', 'line-layer-solid', 'line-layer-dashed', 'line-layer-dotted', 'point-layer'].forEach((id) => {
                  const map = mapRef.current;
                  if (!map || !map.getLayer(id)) return;
                  const prop = id === 'poly-fill' ? 'fill-opacity' : id === 'point-layer' ? 'icon-opacity' : 'line-opacity';
                  try { map.setPaintProperty(id, prop, id === 'poly-fill' ? 0.55 * op : op); } catch { /* yoksay */ }
                });
              }} />
            </div>
            <div>
              <span className="field-label">Katmanlar (sağ tık: klasör/katman ekle, yeniden adlandır, sil, stil)</span>
              <div style={{ marginTop: 8 }}>
                <LayerTree mapRef={mapRef} onOpenStyle={setStyleLayerId} onOpenLayerModal={(folderId) => { setLayerModalFolder(folderId); setShowLayerModal(true); }} />
              </div>
            </div>
          </>
        ) : (
          <div className="hint" style={{ border: '1px dashed var(--line)', borderRadius: 2, padding: 14, borderTop: 'none' }}>
            Kurumsal altlık entegrasyonu bu ortamda uygulanmadı.
          </div>
        )}
      </div>

      {showLayerModal && <LayerCreateModal folderId={layerModalFolder} onClose={() => setShowLayerModal(false)} />}
      {styleLayerId && <LayerStyleModal layerId={styleLayerId} onClose={() => setStyleLayerId(null)} />}
    </div>
  );
}
