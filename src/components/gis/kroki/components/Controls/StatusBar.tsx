import React from 'react';
import { useStore } from '../../store/useStore.js';
import { Magnet, Info } from 'lucide-react';

export default function StatusBar() {
  const mode = useStore((s) => s.mode);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const snapTolerancePx = useStore((s) => s.snapTolerancePx);

  const MODE_LABELS: Record<string, string> = {
    select: 'Seç / Düzenle Modu',
    draw_point: 'Nokta Çizim Modu (Tıklayarak ekleyin)',
    draw_line: 'Çizgi Çizim Modu (Tıklayarak köşe ekleyin, Bitirmek için Çift Tıklayın)',
    draw_polygon: 'Poligon Çizim Modu (Tıklayarak köşe ekleyin, Bitirmek için Çift Tıklayın)'
  };

  return (
    <div className="status-bar flex items-center justify-between px-4 py-1.5 bg-zinc-900 text-zinc-300 text-xs border-t border-zinc-800 font-medium tracking-wide">
      <div className="flex items-center gap-2">
        <Info size={13} className="text-teal-400" />
        <span>{MODE_LABELS[mode] || 'Hazır'}</span>
      </div>

      <div className="flex items-center gap-4">
        {snapEnabled && (
          <div className="flex items-center gap-1 text-teal-400">
            <Magnet size={12} />
            <span>Snap Aktif ({snapTolerancePx}px)</span>
          </div>
        )}
        <div className="text-zinc-500">EPSG:4326 (WGS84)</div>
      </div>
    </div>
  );
}
