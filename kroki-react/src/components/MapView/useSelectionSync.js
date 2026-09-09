import { useEffect } from 'react';
import { fc } from '../../lib/geometry.js';

export function useSelectionSync(map, ready, features, selectedId) {
  useEffect(() => {
    if (!map || !ready) return;
    const selSrc = map.getSource('selected');
    const vertSrc = map.getSource('vertices');
    const f = features.find((x) => x.id === selectedId);
    if (!f) {
      selSrc && selSrc.setData(fc([]));
      vertSrc && vertSrc.setData(fc([]));
      return;
    }
    selSrc && selSrc.setData(fc([{ type: 'Feature', geometry: f.geometry, properties: {} }]));

    const verts = [];
    if (f.geometry.type === 'Point') {
      verts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: f.geometry.coordinates }, properties: { featureId: f.id, ringIndex: 0, vertIndex: 0 } });
    } else if (f.geometry.type === 'LineString') {
      f.geometry.coordinates.forEach((c, i) => verts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { featureId: f.id, ringIndex: 0, vertIndex: i } }));
    } else if (f.geometry.type === 'Polygon') {
      f.geometry.coordinates.forEach((ring, ri) => ring.slice(0, -1).forEach((c, i) => verts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { featureId: f.id, ringIndex: ri, vertIndex: i } })));
    }
    vertSrc && vertSrc.setData(fc(verts));
  }, [map, ready, features, selectedId]);
}
