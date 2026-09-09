import React, { useState } from 'react';
import * as turf from '@turf/turf';
import { useStore } from '../../store/useStore.js';
import { getSunPosition, convexHull2D, fc } from '../../lib/geometry.js';

export default function AnalizPanel({ mapRef }) {
  const { features, showToast } = useStore();
  const [shadowOpen, setShadowOpen] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hour, setHour] = useState(12);
  const [shadowInfo, setShadowInfo] = useState('');

  function computeShadowForFeature(f, sun) {
    if (sun.altitudeDeg <= 0.5) return null;
    const height = f.properties?.height || 30;
    const shadowLenM = Math.min(height / Math.tan((sun.altitudeDeg * Math.PI) / 180), 2000);
    if (!(shadowLenM > 0)) return null;
    try {
      const ring = f.geometry.coordinates[0];
      const translated = ring.map((c) => turf.destination(c, shadowLenM / 1000, sun.shadowBearingDeg, { units: 'kilometers' }).geometry.coordinates);
      const hull = convexHull2D(ring.concat(translated));
      if (hull.length < 3) return null;
      hull.push(hull[0]);
      return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [hull] }, properties: {} };
    } catch { return null; }
  }

  function computeShadows() {
    const map = mapRef.current;
    if (!map) return;
    const [hh, mm] = [Math.floor(hour), Math.round((hour - Math.floor(hour)) * 60)];
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d, hh, mm);
    const center = map.getCenter();
    const sun = getSunPosition(dt, center.lat, center.lng);
    if (sun.altitudeDeg <= 0.5) {
      setShadowInfo('Güneş ufkun altında/çok alçak — bu saatte gölge hesaplanamaz.');
      if (!map.getSource('shadow-source')) map.addSource('shadow-source', { type: 'geojson', data: fc([]) });
      map.getSource('shadow-source').setData(fc([]));
      return;
    }
    const shadows = [];
    features.forEach((f) => { if (f.geometry.type === 'Polygon' && f.properties?.extrude) { const sh = computeShadowForFeature(f, sun); if (sh) shadows.push(sh); } });
    if (!map.getSource('shadow-source')) {
      map.addSource('shadow-source', { type: 'geojson', data: fc([]) });
      map.addLayer({ id: 'shadow-layer', type: 'fill', source: 'shadow-source', paint: { 'fill-color': '#050505', 'fill-opacity': 0.35 } }, 'poly-fill');
    }
    map.getSource('shadow-source').setData(fc(shadows));
    setShadowInfo(`Güneş yüksekliği: ${sun.altitudeDeg.toFixed(1)}° · Gölge yönü: ${sun.shadowBearingDeg.toFixed(0)}°${shadows.length ? '' : ' · 3B poligon (bina) bulunamadı.'}`);
  }

  function clearShadows() {
    mapRef.current?.getSource('shadow-source')?.setData(fc([]));
    setShadowInfo('');
  }

  return (
    <div className="panel-body">
      <div className={'accordion' + (shadowOpen ? ' open' : '')}>
        <div className="accordion-header" onClick={() => setShadowOpen((v) => !v)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span className="field-label group-label" style={{ marginBottom: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" /></svg>
            Bina Gölge Analizi
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, transform: shadowOpen ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </div>
        {shadowOpen && (
          <div style={{ marginTop: 8 }}>
            <div className="field-label">Tarih</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Saat</span>
              <span className="field-label" style={{ marginBottom: 0, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{String(Math.floor(hour)).padStart(2, '0')}:{String(Math.round((hour - Math.floor(hour)) * 60)).padStart(2, '0')}</span>
            </div>
            <input type="range" min={0} max={23.75} step={0.25} value={hour} onChange={(e) => { setHour(parseFloat(e.target.value)); }} onMouseUp={computeShadows} />
            <div className="btn-row" style={{ marginTop: 8 }}>
              <div className="btn primary" onClick={computeShadows}>Gölgeleri Hesapla</div>
              <div className="btn" onClick={clearShadows}>Temizle</div>
            </div>
            <div className="field-label" style={{ marginTop: 8, marginBottom: 0 }}>{shadowInfo}</div>
          </div>
        )}
      </div>
      <div className="hint">
        3B Poligon (yükseklikli bina) katmanları için seçilen tarih/saatteki güneş konumuna göre yaklaşık gölge izdüşümü hesaplanır. Not: bu görselleştirme amaçlıdır, mühendislik hassasiyeti taşımaz.
        <br /><br />
        Zamana bağlı görüntü karşılaştırma ve DXF/SHP/IFC/GLTF içe aktarma bu React portunda henüz taşınmadı — istersen bir sonraki adımda ekleyebiliriz.
      </div>
    </div>
  );
}
