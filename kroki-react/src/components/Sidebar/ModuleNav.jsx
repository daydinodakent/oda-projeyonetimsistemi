import React from 'react';
import { useStore } from '../../store/useStore.js';

const MODULES = [
  { key: 'sorgu', label: 'Sorgu', icon: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>' },
  { key: 'harita', label: 'Harita', icon: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>' },
  { key: 'editor', label: 'Editör', icon: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4z"/>' },
  { key: 'analiz', label: 'Analiz', icon: '<path d="M4 20V10M12 20V4M20 20v-7"/>' },
  { key: 'rapor', label: 'Rapor', icon: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h6M9 8h3"/>' },
  { key: 'cikti', label: 'Çıktı', icon: '<path d="M12 3v12"/><path d="M7 9l5-6 5 6"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>' }
];

export default function ModuleNav({ hidden }) {
  const activeModule = useStore((s) => s.activeModule);
  const setActiveModule = useStore((s) => s.setActiveModule);

  return (
    <div className={'module-nav' + (hidden ? ' hidden' : '')}>
      {MODULES.map((m) => (
        <button key={m.key} className={'mod-btn' + (activeModule === m.key ? ' active' : '')} onClick={() => setActiveModule(m.key)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: m.icon }} />
          <span>{m.label}</span>
        </button>
      ))}
      <div className="mod-spacer" />
    </div>
  );
}
