import React, { useEffect, useRef } from 'react';

interface CursorDynamicInputProps {
  show: boolean;
  inputMode: 'polar' | 'xy';
  onToggleMode: () => void;
  hasReference: boolean;
  coordX: string;
  coordY: string;
  onCoordXChange: (val: string) => void;
  onCoordYChange: (val: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  point: { x: number; y: number } | null;
}

export const CursorDynamicInput: React.FC<CursorDynamicInputProps> = ({
  show,
  inputMode,
  onToggleMode,
  hasReference,
  coordX,
  coordY,
  onCoordXChange,
  onCoordYChange,
  onCommit,
  onCancel,
  point
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputXRef = useRef<HTMLInputElement>(null);
  const inputYRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show && containerRef.current && point) {
      const el = containerRef.current;
      const w = el.offsetWidth || 150;
      const h = el.offsetHeight || 34;
      let x = point.x + 18;
      let y = point.y + 18;

      if (x + w > window.innerWidth) x = point.x - w - 14;
      if (y + h > window.innerHeight) y = point.y - h - 14;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }, [show, point, coordX, coordY]);

  // Global listener for automatic numeric typing to focus X input
  useEffect(() => {
    if (!show) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      if (/^[0-9.\-]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onCoordXChange(e.key);
        setTimeout(() => {
          if (inputXRef.current) {
            inputXRef.current.focus();
            inputXRef.current.setSelectionRange(e.key.length, e.key.length);
          }
        }, 10);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [show, onCoordXChange]);

  if (!show || !point) return null;

  const effectiveMode = hasReference ? inputMode : 'xy';
  const unit1 = effectiveMode === 'xy' ? '' : 'm';
  const sep = effectiveMode === 'xy' ? ',' : '∠';
  const unit2 = effectiveMode === 'xy' ? '' : '°';

  const handleKeyDownX = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      inputYRef.current?.focus();
      inputYRef.current?.select();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleKeyDownY = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      inputXRef.current?.focus();
      inputXRef.current?.select();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-40 flex items-center gap-1.5 bg-[#0a1620]/95 border border-[#e3a541] rounded px-2.5 py-1.5 font-mono text-[11px] text-[#e7eef2] shadow-xl transition-all duration-75 pointer-events-auto"
      style={{ position: 'absolute' }}
    >
      {hasReference && (
        <button
          type="button"
          onClick={onToggleMode}
          title="Giriş modunu değiştir (mesafe/açı ⇄ X,Y)"
          className="w-7 h-6 rounded border border-[#24404f] bg-[#152c3a] text-[#7f9aa8] hover:border-[#e3a541] hover:text-[#e3a541] cursor-pointer text-[10px] flex items-center justify-center font-bold"
        >
          {inputMode === 'polar' ? '∠' : 'X,Y'}
        </button>
      )}

      <input
        ref={inputXRef}
        type="text"
        value={coordX}
        onChange={(e) => onCoordXChange(e.target.value)}
        onKeyDown={handleKeyDownX}
        placeholder={effectiveMode === 'xy' ? 'X (Lon)' : 'Mesafe'}
        className="w-16 bg-[#152c3a] border border-[#24404f] text-[#e7eef2] focus:border-[#e3a541] focus:outline-none rounded px-1.5 py-1 text-right font-mono text-[11px]"
      />
      {unit1 && <span className="text-[#7f9aa8] min-w-[10px] text-center">{unit1}</span>}

      <span className="text-[#7f9aa8] min-w-[10px] text-center font-bold">{sep}</span>

      <input
        ref={inputYRef}
        type="text"
        value={coordY}
        onChange={(e) => onCoordYChange(e.target.value)}
        onKeyDown={handleKeyDownY}
        placeholder={effectiveMode === 'xy' ? 'Y (Lat)' : 'Açı'}
        className="w-16 bg-[#152c3a] border border-[#24404f] text-[#e7eef2] focus:border-[#e3a541] focus:outline-none rounded px-1.5 py-1 text-right font-mono text-[11px]"
      />
      {unit2 && <span className="text-[#7f9aa8] min-w-[10px] text-center">{unit2}</span>}
    </div>
  );
};
