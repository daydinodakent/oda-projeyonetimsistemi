import React, { useRef } from 'react';
import { useStore, uid } from './store/useStore.js';
import ModuleNav from './components/Sidebar/ModuleNav.jsx';
import Panel from './components/Sidebar/Panel.jsx';
import MapView from './components/MapView/MapView.jsx';
import MapClusters from './components/Controls/MapClusters.jsx';
import StatusBar from './components/Controls/StatusBar.jsx';
import Toast from './components/Controls/Toast.jsx';

export default function App() {
  const mapRef = useRef(null);
  const fileInputRef = useRef(null);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const { addFeature, activeLayerId, showToast, layers, addLayer, setActiveLayerId } = useStore();

  function handleStyleChange(style) {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(style.url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.(json|geojson)$/i.test(file.name)) {
      showToast('Bu React portunda şu an sadece GeoJSON (.json/.geojson) içe aktarma destekleniyor.');
      return;
    }
    try {
      const text = await file.text();
      const gj = JSON.parse(text);
      const feats = (gj.features || []).filter((f) => f.geometry && ['Point', 'LineString', 'Polygon'].includes(f.geometry.type));
      if (!feats.length) { showToast('İçe aktarılabilir geometri bulunamadı.'); return; }
      const geomTypes = new Set(feats.map((f) => f.geometry.type));
      const inferredGeom = geomTypes.size === 1 ? [...geomTypes][0] : null;
      const layerName = file.name.replace(/\.[a-zA-Z0-9]+$/, '');
      const newLayerId = 'layer-' + uid();
      useStore.setState((s) => ({
        layers: [...s.layers, { id: newLayerId, name: layerName, visible: true, color: null, fillColor: null, lineWidth: null, dash: 'solid', symbol: 'circle', scale: 1, geomType: inferredGeom, mapId: s.activeMapId, folderId: s.getDefaultFolderId(s.activeMapId) }],
        activeLayerId: newLayerId
      }));
      feats.forEach((f) => addFeature({ type: 'Feature', geometry: f.geometry, properties: { ...(f.properties || {}), layerId: newLayerId } }));
      showToast(`${feats.length} şekil "${layerName}" katmanına içe aktarıldı.`);
    } catch (err) {
      showToast('Dosya okunamadı: ' + err.message);
    }
  }

  return (
    <div className="app-shell">
      <MapView mapRef={mapRef} />
      <ModuleNav hidden={!sidebarOpen} />
      <Panel hidden={!sidebarOpen} mapRef={mapRef} onImportClick={handleImportClick} />
      {!sidebarOpen && (
        <button id="panelToggle" onClick={() => setSidebarOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      )}
      <MapClusters mapRef={mapRef} onStyleChange={handleStyleChange} />
      <StatusBar mapRef={mapRef} />
      <Toast />
      <input ref={fileInputRef} type="file" accept=".json,.geojson" hidden onChange={handleFileChange} />
    </div>
  );
}
