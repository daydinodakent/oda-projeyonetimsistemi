import React, { useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { BASEMAP_STYLES } from '../MapView/MapView.jsx';

export default function MapClusters({ mapRef, onStyleChange }) {
  const { mode, setMode, snapEnabled, setSnapEnabled, snapTolerancePx, setSnapTolerancePx, labelsVisible, setLabelsVisible, persistedMeasurements, clearPersistedMeasurements, showToast } = useStore();
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [snapPopoverOpen, setSnapPopoverOpen] = useState(false);
  const [is3D, setIs3D] = useState(false);

  function toggle3D() {
    const map = mapRef.current;
    if (!map) return;
    if (map.getPitch() > 5) { map.easeTo({ pitch: 0, bearing: 0, duration: 500 }); setIs3D(false); }
    else { map.easeTo({ pitch: 55, bearing: -20, duration: 500 }); setIs3D(true); }
  }

  return (
    <>
      <div className="map-cluster" style={{ top: 14 }}>
        <button className={is3D ? 'active' : ''} data-tip="3B görünüm / Kuzeye döndür" onClick={toggle3D}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7l2.5 5-2.5-1.2L9.5 12z" fill="currentColor" stroke="none" /></svg>
        </button>
        <button data-tip="Tam ekran" onClick={() => document.documentElement.requestFullscreen?.()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        </button>
        <button data-tip="Ana görünüme dön" onClick={() => mapRef.current?.easeTo({ center: [35.2433, 38.9637], zoom: 5.4, pitch: 0, bearing: 0, duration: 500 })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
        </button>
      </div>

      <div className="map-cluster" style={{ top: 125 }}>
        <button data-tip="Harita stili" onClick={() => setBasemapOpen((v) => !v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>
        </button>
      </div>
      {basemapOpen && (
        <div style={{ position: 'absolute', top: 166, right: 14, zIndex: 6, background: 'rgba(15,30,41,.95)', border: '1px solid var(--line)', borderRadius: 3, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120 }}>
          <span className="field-label" style={{ marginBottom: 2 }}>CBS Haritası</span>
          {BASEMAP_STYLES.map((s) => (
            <div key={s.id} className="btn" onClick={() => { onStyleChange(s); setBasemapOpen(false); }}>{s.label}</div>
          ))}
        </div>
      )}

      <div className="map-cluster" style={{ top: 174 }}>
        <button
          className={labelsVisible ? 'active' : ''}
          data-tip="Ölçüm araçları (sağ tık: etiketleri aç/kapat)"
          onClick={() => setMeasureOpen((v) => !v)}
          onContextMenu={(e) => { e.preventDefault(); setLabelsVisible(!labelsVisible); showToast(!labelsVisible ? 'Ölçüm etiketleri açıldı.' : 'Ölçüm etiketleri kapatıldı.'); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 16L16 4" /><path d="M7 13l1.5 1.5M10.5 9.5L12 11M14 5.5L15.5 7" /></svg>
        </button>
      </div>
      {measureOpen && (
        <div style={{ position: 'absolute', top: 215, right: 14, zIndex: 6, background: 'rgba(15,30,41,.95)', border: '1px solid var(--line)', borderRadius: 3, padding: 10, minWidth: 150 }}>
          <div className="tool-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            <button className={'tool' + (mode === 'measure-distance' ? ' active' : '')} onClick={() => { setMode('measure-distance'); setMeasureOpen(false); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 16L16 4" /><path d="M7 13l1.5 1.5M10.5 9.5L12 11M14 5.5L15.5 7" /></svg>
              <span>Mesafe</span>
            </button>
            <button className={'tool' + (mode === 'measure-area' ? ' active' : '')} onClick={() => { setMode('measure-area'); setMeasureOpen(false); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.6 2.2"><path d="M12 3l8 6-3 10H7L4 9z" /></svg>
              <span>Alan</span>
            </button>
          </div>
          <div className="btn" style={{ marginTop: 8 }} onClick={() => { clearPersistedMeasurements(); if (window.__renderPersistedMeasurements) window.__renderPersistedMeasurements(); setMeasureOpen(false); showToast('Tüm ölçümler temizlendi.'); }}>Ölçümleri Temizle</div>
          <div className="field-label" style={{ marginTop: 6, marginBottom: 0 }}>Sağ tık: etiketleri aç/kapat</div>
        </div>
      )}

      <div className="map-cluster" style={{ bottom: 81, right: 65 }}>
        <button data-tip="Görünümü sabitle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.4" /></svg></button>
        <button className={mode === 'select' ? 'active' : ''} data-tip="Seç / Kaydır" onClick={() => setMode('select')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 11V6a2 2 0 1 1 4 0M12 6a2 2 0 1 1 4 0v5M16 11V8a2 2 0 1 1 4 0v6c0 3.3-2.7 6-6 6h-2a6 6 0 0 1-5-2.7L4.5 13a1.8 1.8 0 0 1 2.8-2.2L8 11.5" /></svg></button>
        <button data-tip="Yenile" onClick={() => window.location.reload()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4v6h6" /><path d="M20 20v-6h-6" /><path d="M5 14a8 8 0 0 0 14 3l1-3M19 10A8 8 0 0 0 5 7L4 10" /></svg></button>
      </div>

      <div className="map-cluster row" style={{ bottom: 38, right: 14 }}>
        <button data-tip="Yakınlaştır" onClick={() => mapRef.current?.zoomIn({ duration: 200 })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14" /></svg></button>
        <button data-tip="Ana görünüm" onClick={() => mapRef.current?.easeTo({ center: [35.2433, 38.9637], zoom: 5.4, duration: 500 })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /></svg></button>
        <button data-tip="Uzaklaştır" onClick={() => mapRef.current?.zoomOut({ duration: 200 })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14" /></svg></button>
        <div className="sep" />
        <button data-tip="Bilgi" onClick={() => showToast('Kroki — CBS Editör (React portu)')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></svg></button>
      </div>

      <button
        className={'status-snap-btn' + (snapEnabled ? ' active' : '')}
        style={{ position: 'absolute', bottom: 4, right: 14, zIndex: 5 }}
        onClick={() => setSnapEnabled(!snapEnabled)}
        onContextMenu={(e) => { e.preventDefault(); setSnapPopoverOpen((v) => !v); }}
        title="Sol tık: aç/kapat, sağ tık: yakalama mesafesi"
      >
        Snap <b>{snapEnabled ? 'Açık' : 'Kapalı'}</b>
      </button>
      {snapPopoverOpen && (
        <div style={{ position: 'absolute', bottom: 34, right: 14, zIndex: 8, background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 3, padding: 12, minWidth: 170 }}>
          <span className="field-label">Yakalama mesafesi (px)</span>
          <input type="number" value={snapTolerancePx} min={4} max={40} onChange={(e) => setSnapTolerancePx(parseFloat(e.target.value) || 14)} />
        </div>
      )}
    </>
  );
}
