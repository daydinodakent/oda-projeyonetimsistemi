import React from 'react';
import { useStore } from '../../store/useStore.js';
import HaritaPanel from './HaritaPanel.jsx';
import EditorPanel from './EditorPanel.jsx';
import AnalizPanel from './AnalizPanel.jsx';

interface PanelProps {
  mapRef: React.RefObject<any>;
  onOpenStyle: (layerId: string) => void;
  onOpenLayerModal: (folderId: string | null) => void;
}

export default function Panel({ mapRef, onOpenStyle, onOpenLayerModal }: PanelProps) {
  const activeModule = useStore((s) => s.activeModule);
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <div className="sidebar-panel">
      {activeModule === 'harita' && (
        <HaritaPanel mapRef={mapRef} onOpenStyle={onOpenStyle} onOpenLayerModal={onOpenLayerModal} />
      )}
      {activeModule === 'editor' && <EditorPanel mapRef={mapRef} />}
      {activeModule === 'analiz' && <AnalizPanel mapRef={mapRef} />}
    </div>
  );
}
