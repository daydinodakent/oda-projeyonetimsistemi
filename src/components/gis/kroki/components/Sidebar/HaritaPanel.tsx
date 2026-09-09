import React from 'react';
import { useStore } from '../../store/useStore.js';
import LayerTree from '../LayerTree/LayerTree.jsx';
import { FolderPlus, PlusCircle } from 'lucide-react';

interface HaritaPanelProps {
  mapRef: React.RefObject<any>;
  onOpenStyle: (layerId: string) => void;
  onOpenLayerModal: (folderId: string | null) => void;
}

export default function HaritaPanel({ mapRef, onOpenStyle, onOpenLayerModal }: HaritaPanelProps) {
  const { addFolder, getDefaultFolderId, activeMapId } = useStore();

  function handleCreateFolder() {
    const name = prompt('Yeni klasör adı:', 'Yeni Klasör');
    if (name?.trim()) {
      const parentId = getDefaultFolderId(activeMapId);
      addFolder(name.trim(), parentId);
    }
  }

  return (
    <div className="panel-content">
      <div className="panel-header">
        <h2>Proje Katmanları</h2>
        <div className="panel-actions">
          <button onClick={handleCreateFolder} className="btn-icon" title="Yeni Klasör Ekle">
            <FolderPlus size={16} />
          </button>
          <button onClick={() => onOpenLayerModal(null)} className="btn-icon btn-primary" title="Yeni Katman Ekle">
            <PlusCircle size={16} />
          </button>
        </div>
      </div>
      <div className="panel-body p-0 scrollable">
        <LayerTree mapRef={mapRef} onOpenStyle={onOpenStyle} onOpenLayerModal={onOpenLayerModal} />
      </div>
    </div>
  );
}
