import React, { useRef, useState, useEffect } from 'react';
import ModuleNav from './components/Sidebar/ModuleNav.jsx';
import Panel from './components/Sidebar/Panel.jsx';
import MapView from './components/MapView/MapView.jsx';
import StatusBar from './components/Controls/StatusBar.jsx';
import Toast from './components/Controls/Toast.jsx';

import FeatureFormModal from './components/Modals/FeatureFormModal.jsx';
import LayerCreateModal from './components/Modals/LayerCreateModal.jsx';
import LayerStyleModal from './components/Modals/LayerStyleModal.jsx';

import './index.css';

export default function MapModule() {
  const mapRef = useRef<any>(null);

  // Modal States
  const [featureForm, setFeatureForm] = useState<{ featureId: string; isNew: boolean } | null>(null);
  const [layerCreateFolderId, setLayerCreateFolderId] = useState<string | null | undefined>(undefined);
  const [styleLayerId, setStyleLayerId] = useState<string | null>(null);

  // Resize listener to prevent MapLibre from shrinking when viewport updates
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    // Auto-resize once on mount
    const timer = setTimeout(handleResize, 350);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div id="map-module-container" className="map-root-wrapper w-full h-full flex flex-col overflow-hidden bg-zinc-50 select-none">
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sol Menü Navigasyon İkonları */}
        <ModuleNav />

        {/* Sol Menü Panel İçerikleri */}
        <Panel
          mapRef={mapRef}
          onOpenStyle={(id) => setStyleLayerId(id)}
          onOpenLayerModal={(folderId) => setLayerCreateFolderId(folderId)}
        />

        {/* Harita Ekranı */}
        <div className="flex-1 h-full relative overflow-hidden bg-zinc-100">
          <MapView
            mapRef={mapRef}
            onOpenFeatureForm={(id, isNew) => setFeatureForm({ featureId: id, isNew })}
          />
        </div>
      </div>

      {/* Alt Bilgi Çubuğu */}
      <StatusBar />

      {/* İşlem Uyarı Toastları */}
      <Toast />

      {/* 1. Öznitelik Bilgi Düzenleme Modalı */}
      {featureForm && (
        <FeatureFormModal
          featureId={featureForm.featureId}
          isNew={featureForm.isNew}
          onClose={() => setFeatureForm(null)}
        />
      )}

      {/* 2. Katman Oluşturma Modalı */}
      {layerCreateFolderId !== undefined && (
        <LayerCreateModal
          folderId={layerCreateFolderId}
          onClose={() => setLayerCreateFolderId(undefined)}
        />
      )}

      {/* 3. Katman Stil Düzenleme Modalı */}
      {styleLayerId && (
        <LayerStyleModal
          layerId={styleLayerId}
          onClose={() => setStyleLayerId(null)}
        />
      )}
    </div>
  );
}
