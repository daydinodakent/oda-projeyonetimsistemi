import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { measureFeature } from '../../lib/geometry.js';
import { X } from 'lucide-react';

interface FeatureFormModalProps {
  featureId: string;
  isNew: boolean;
  onClose: () => void;
}

export default function FeatureFormModal({ featureId, isNew, onClose }: FeatureFormModalProps) {
  const features = useStore((s) => s.features);
  const { updateFeature, deleteFeature, pushHistory, showToast } = useStore();

  const feat = features.find((f) => f.id === featureId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (feat) {
      setName(feat.properties?.name || '');
      setDescription(feat.properties?.aciklama || '');
    }
  }, [feat]);

  if (!feat) return null;

  const measurements = measureFeature(feat);

  function handleSave() {
    pushHistory();
    const props = { ...(feat.properties || {}), name: name.trim() || 'İsimsiz Şekil', aciklama: description.trim() };
    updateFeature(featureId, { properties: props });
    showToast('Öznitelikler kaydedildi.');
    onClose();
  }

  function handleCancel() {
    if (isNew) {
      // If it was newly drawn and cancelled, we can delete it
      deleteFeature(featureId);
      showToast('Çizim iptal edildi.');
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9000] p-4">
      <div className="bg-white border border-zinc-200 rounded-lg max-w-sm w-full shadow-2xl overflow-hidden animate-zoom-in">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-800">
            {isNew ? 'Yeni Şekil Bilgileri' : 'Şekil Özniteliklerini Düzenle'}
          </h3>
          <button onClick={handleCancel} className="text-zinc-400 hover:text-zinc-600">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {measurements.text && (
            <div className="text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-2 rounded border border-teal-100">
              <strong>Ölçümler:</strong> {measurements.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Şekil Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. A Noktası, Sınır Hattı..."
              className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Açıklama (Properties)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Öznitelik / Detaylar..."
              rows={3}
              className="w-full px-3 py-1.5 text-xs text-zinc-900 bg-white border border-zinc-200 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-zinc-50 border-t border-zinc-100 text-xs">
          <button onClick={handleCancel} className="btn btn-secondary px-3 py-1.5 font-medium">
            İptal
          </button>
          <button onClick={handleSave} className="btn btn-primary px-3 py-1.5 font-semibold">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
