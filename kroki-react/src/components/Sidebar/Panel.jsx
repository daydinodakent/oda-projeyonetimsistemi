import React from 'react';
import { useStore } from '../../store/useStore.js';
import HaritaPanel from './HaritaPanel.jsx';
import EditorPanel from './EditorPanel.jsx';
import AnalizPanel from './AnalizPanel.jsx';

const TITLES = { sorgu: 'Sorgu', harita: 'Harita', editor: 'Editör', analiz: 'Analiz', rapor: 'Rapor', cikti: 'Çıktı' };

export default function Panel({ hidden, mapRef, onImportClick }) {
  const activeModule = useStore((s) => s.activeModule);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  return (
    <div className={'panel' + (hidden ? ' hidden' : '')}>
      <div className="panel-header">
        <h1>{TITLES[activeModule] || activeModule}</h1>
        <button className="panel-collapse" onClick={() => setSidebarOpen(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      </div>
      {activeModule === 'harita' && <HaritaPanel mapRef={mapRef} onImportClick={onImportClick} />}
      {activeModule === 'editor' && <EditorPanel />}
      {activeModule === 'analiz' && <AnalizPanel mapRef={mapRef} />}
      {(activeModule === 'sorgu' || activeModule === 'rapor' || activeModule === 'cikti') && (
        <div className="panel-body">
          <div className="hint" style={{ borderTop: 'none' }}>Bu modül React portunda henüz uygulanmadı.</div>
        </div>
      )}
    </div>
  );
}
