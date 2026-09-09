import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { geomTypeLabel } from '../../lib/symbols.js';
import { X } from 'lucide-react';

interface LayerCreateModalProps {
  folderId: string | null;
  onClose: () => void;
}

export default function LayerCreateModal({ folderId, onClose }: LayerCreateModalProps) {
  const { addLayer, showToast } = useStore();
  const [name, setName] = useState('');
  const [geomType, setGeomType] = useState<string | null>('Point');

  function handleCreate() {
    if (!name.trim()) { showToast('Lütfen katman adını girin.'); return; }
    addLayer(name.trim(), geomType, folderId);
    showToast(`"${name.trim()}" katmanı oluşturuldu.`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9000] p-4">
      <div className="bg-white border border-zinc-200 rounded-lg max-w-sm w-full shadow-2xl overflow-hidden animate-zoom-in">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-800">Yeni Katman Ekle</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Katman Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Parseller, Sınırlar, Direkler..."
              className="w-full px-3 py-1.5 text-xs border border-zinc-200 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-2">Geometri Tipi (Veri Türü)</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'Point', label: geomTypeLabel('Point') },
                { id: 'LineString', label: geomTypeLabel('LineString') },
                { id: 'Polygon', label: geomTypeLabel('Polygon') },
                { id: null, label: geomTypeLabel(null) }
              ].map((gt) => (
                <button
                  key={gt.id || 'mixed'}
                  onClick={() => setGeomType(gt.id)}
                  className={'py-2 px-3 rounded border font-medium text-center transition-colors ' + (geomType === gt.id ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50')}
                >
                  {gt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-50 border-t border-zinc-100 text-xs">
          <button onClick={onClose} className="btn btn-secondary px-3 py-1.5 font-medium">
            İptal
          </button>
          <button onClick={handleCreate} className="btn btn-primary px-3 py-1.5 font-semibold">
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
