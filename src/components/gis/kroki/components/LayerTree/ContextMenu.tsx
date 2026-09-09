import React, { useEffect, useRef } from 'react';

interface ContextMenuItem {
  label?: string;
  action?: () => void;
  sep?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [onClose]);

  const vw = window.innerWidth, vh = window.innerHeight;
  const style = {
    left: Math.min(x, vw - 190),
    top: Math.min(y, vh - (items.length * 34 + 20))
  };

  return (
    <div id="treeContextMenu" ref={ref} style={style}>
      {items.map((it, i) =>
        it.sep ? (
          <div className="ctx-menu-sep" key={i} />
        ) : (
          <div
            key={i}
            className={'ctx-menu-item' + (it.danger ? ' danger' : '')}
            onClick={() => { onClose(); it.action?.(); }}
          >
            {it.label}
          </div>
        )
      )}
    </div>
  );
}
