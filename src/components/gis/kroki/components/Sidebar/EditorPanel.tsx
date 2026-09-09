import React from 'react';
import { useStore } from '../../store/useStore.js';
import { MousePointer, MapPin, GitCommit, Pentagon, Undo2, Redo2, Trash2, Type, Magnet } from 'lucide-react';

interface EditorPanelProps {
  mapRef: React.RefObject<any>;
}

export default function EditorPanel({ mapRef }: EditorPanelProps) {
  const mode = useStore((s) => s.mode);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const snapTolerancePx = useStore((s) => s.snapTolerancePx);
  const labelsVisible = useStore((s) => s.labelsVisible);
  const undoStack = useStore((s) => s.undoStack);
  const redoStack = useStore((s) => s.redoStack);
  const selectedId = useStore((s) => s.selectedId);
  const features = useStore((s) => s.features);

  const { setMode, setSnapEnabled, setSnapTolerancePx, setLabelsVisible, undo, redo, deleteFeature, showToast, pushHistory } = useStore();

  const activeFeat = selectedId ? features.find((f) => f.id === selectedId) : null;

  function handleDeleteSelected() {
    if (selectedId) {
      pushHistory();
      deleteFeature(selectedId);
      showToast('Şekil silindi.');
    }
  }

  return (
    <div className="panel-content">
      <div className="panel-header">
        <h2>Çizim &amp; Düzenleme</h2>
      </div>

      <div className="panel-body scrollable">
        {/* Undo/Redo */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { if (undoStack.length) undo(); }}
            className="flex-1 btn btn-secondary text-zinc-800 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold"
            disabled={!undoStack.length}
            title="Geri Al"
          >
            <Undo2 size={13} /> Geri Al
          </button>
          <button
            onClick={() => { if (redoStack.length) redo(); }}
            className="flex-1 btn btn-secondary text-zinc-800 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold"
            disabled={!redoStack.length}
            title="Yinele"
          >
            <Redo2 size={13} /> Yinele
          </button>
        </div>

        {/* Çizim Araçları */}
        <div className="mb-4">
          <h3 className="section-title">Çizim Araçları</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('select')}
              className={'btn flex items-center gap-2 py-2 px-3 text-sm justify-start font-medium ' + (mode === 'select' ? 'btn-primary' : 'btn-secondary text-zinc-800')}
            >
              <MousePointer size={15} /> Seç / Düzenle
            </button>
            <button
              onClick={() => setMode('draw_point')}
              className={'btn flex items-center gap-2 py-2 px-3 text-sm justify-start font-medium ' + (mode === 'draw_point' ? 'btn-primary' : 'btn-secondary text-zinc-800')}
            >
              <MapPin size={15} /> Nokta Çiz
            </button>
            <button
              onClick={() => setMode('draw_line')}
              className={'btn flex items-center gap-2 py-2 px-3 text-sm justify-start font-medium ' + (mode === 'draw_line' ? 'btn-primary' : 'btn-secondary text-zinc-800')}
            >
              <GitCommit size={15} /> Çizgi Çiz
            </button>
            <button
              onClick={() => setMode('draw_polygon')}
              className={'btn flex items-center gap-2 py-2 px-3 text-sm justify-start font-medium ' + (mode === 'draw_polygon' ? 'btn-primary' : 'btn-secondary text-zinc-800')}
            >
              <Pentagon size={15} /> Poligon Çiz
            </button>
          </div>
        </div>

        {/* Seçili Şekil İşlemleri */}
        {activeFeat && (
          <div className="mb-4 card p-3 border border-zinc-200 rounded-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Seçili Şekil</h3>
            <div className="flex flex-col gap-1.5 mb-3 text-sm">
              <div><strong>Adı:</strong> {activeFeat.properties?.name || 'İsimsiz'}</div>
              <div><strong>Tür:</strong> {activeFeat.geometry?.type === 'Point' ? 'Nokta' : activeFeat.geometry?.type === 'LineString' ? 'Çizgi' : 'Poligon'}</div>
              {activeFeat.properties?.aciklama && <div><strong>Açıklama:</strong> {activeFeat.properties.aciklama}</div>}
            </div>
            <button
              onClick={handleDeleteSelected}
              className="w-full btn btn-danger flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium"
            >
              <Trash2 size={13} /> Şekli Sil
            </button>
          </div>
        )}

        {/* Yakalama & Görünüm Ayarları */}
        <div className="border-t border-zinc-200 pt-4 mt-2">
          <h3 className="section-title">Yakalama &amp; Görünüm</h3>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={(e) => setSnapEnabled(e.target.checked)}
                className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="flex items-center gap-1.5">
                <Magnet size={14} className="text-zinc-500" />
                Noktalara Yakalamayı Aktif Et (Snap)
              </span>
            </label>

            {snapEnabled && (
              <div className="ml-5 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Yakalama Hassasiyeti</span>
                  <span>{snapTolerancePx} px</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="30"
                  value={snapTolerancePx}
                  onChange={(e) => setSnapTolerancePx(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer border-t border-zinc-100 pt-3 mt-1">
              <input
                type="checkbox"
                checked={labelsVisible}
                onChange={(e) => setLabelsVisible(e.target.checked)}
                className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="flex items-center gap-1.5">
                <Type size={14} className="text-zinc-500" />
                Ölçü Etiketlerini Göster
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
