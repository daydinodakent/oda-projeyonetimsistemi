import { useEffect } from 'react';
import { fc } from '../../lib/geometry.js';
import { ensureSymbolIcons, ensureSnapIcons } from '../../lib/symbols.js';

function ensureLayer(map, id, def) {
  if (map.getLayer(id)) return;
  try { map.addLayer(def); } catch (e) { console.error('Katman eklenemedi: ' + id, e); }
}

const POLY_FILTER = ['all', ['==', ['geometry-type'], 'Polygon'], ['!=', ['coalesce', ['get', 'extrude'], false], true]];
const LINE_FILTER = ['all', ['==', ['geometry-type'], 'LineString'], ['!=', ['coalesce', ['get', 'pipe'], false], true]];
const DASH_DEFS = { solid: [1, 0], dashed: [2.6, 1.8], dotted: [0.6, 1.6] };

// Harita ilk yüklendiğinde tüm kaynak/katmanları bir kez kurar.
export function setupMapLayers(map) {
  const src = (id) => { if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: fc([]) }); };
  ['features', 'draft', 'draft-vertices', 'draft-label', 'vertices', 'selected', 'snap-marker', 'persist-measure', 'persist-measure-fill', 'persist-measure-label'].forEach(src);
  map.getSource('features').setData(fc([]));

  ensureSymbolIcons(map);
  ensureSnapIcons(map);

  ensureLayer(map, 'poly-fill', {
    id: 'poly-fill', type: 'fill', source: 'features', filter: POLY_FILTER,
    paint: { 'fill-color': ['coalesce', ['get', '__layerFillColor'], ['coalesce', ['get', '__layerColor'], '#eef29c']], 'fill-opacity': 0.55 }
  });
  ['solid', 'dashed', 'dotted'].forEach((dashKey) => {
    const dashProp = ['==', ['coalesce', ['get', '__layerDash'], 'solid'], dashKey];
    ensureLayer(map, 'poly-outline-' + dashKey, {
      id: 'poly-outline-' + dashKey, type: 'line', source: 'features', filter: ['all', POLY_FILTER, dashProp],
      layout: dashKey === 'dotted' ? { 'line-cap': 'round', 'line-join': 'round' } : {},
      paint: { 'line-color': ['coalesce', ['get', '__layerColor'], '#e02424'], 'line-width': ['coalesce', ['get', '__layerWidth'], 2.6], 'line-dasharray': DASH_DEFS[dashKey] }
    });
    ensureLayer(map, 'line-layer-' + dashKey, {
      id: 'line-layer-' + dashKey, type: 'line', source: 'features', filter: ['all', LINE_FILTER, dashProp],
      layout: dashKey === 'dotted' ? { 'line-cap': 'round', 'line-join': 'round' } : {},
      paint: { 'line-color': ['coalesce', ['get', '__layerColor'], '#12d16f'], 'line-width': ['coalesce', ['get', '__layerWidth'], 3], 'line-dasharray': DASH_DEFS[dashKey] }
    });
  });
  ensureLayer(map, 'poly-extrusion', {
    id: 'poly-extrusion', type: 'fill-extrusion', source: 'features',
    filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['coalesce', ['get', 'extrude'], false], true]],
    paint: { 'fill-extrusion-color': ['coalesce', ['get', '__layerColor'], '#8aa6c2'], 'fill-extrusion-height': ['coalesce', ['get', 'height'], 10], 'fill-extrusion-opacity': 0.85 }
  });
  ensureLayer(map, 'point-layer', {
    id: 'point-layer', type: 'symbol', source: 'features', filter: ['==', ['geometry-type'], 'Point'],
    layout: {
      'icon-image': ['concat', 'sym-', ['coalesce', ['get', '__layerSymbol'], 'circle']],
      'icon-size': ['*', 0.42, ['coalesce', ['get', '__layerScale'], 1]],
      'icon-allow-overlap': true, 'icon-ignore-placement': true
    },
    paint: { 'icon-color': ['coalesce', ['get', '__layerColor'], '#3fc2ac'], 'icon-halo-color': '#08161f', 'icon-halo-width': 1.2 }
  });
  ensureLayer(map, 'point-hitarea', { id: 'point-hitarea', type: 'circle', source: 'features', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 14, 'circle-opacity': 0 } });
  ensureLayer(map, 'line-hitarea', { id: 'line-hitarea', type: 'line', source: 'features', filter: LINE_FILTER, paint: { 'line-width': 18, 'line-opacity': 0 } });

  ensureLayer(map, 'vertex-layer', {
    id: 'vertex-layer', type: 'circle', source: 'vertices',
    paint: { 'circle-radius': 4.5, 'circle-color': '#e3a541', 'circle-stroke-color': '#08161f', 'circle-stroke-width': 1.4 },
    layout: { visibility: 'none' }
  });
  ensureLayer(map, 'selected-halo', { id: 'selected-halo', type: 'line', source: 'selected', paint: { 'line-color': '#e3a541', 'line-width': 7, 'line-opacity': 0.25 } });
  ensureLayer(map, 'selected-outline', { id: 'selected-outline', type: 'line', source: 'selected', paint: { 'line-color': '#e3a541', 'line-width': 2.4 } });

  ensureLayer(map, 'draft-fill', { id: 'draft-fill', type: 'fill', source: 'draft', paint: { 'fill-color': '#e3a541', 'fill-opacity': 0.12 } });
  ensureLayer(map, 'draft-line', { id: 'draft-line', type: 'line', source: 'draft', paint: { 'line-color': '#e3a541', 'line-width': 2, 'line-dasharray': [2, 1.6] } });
  ensureLayer(map, 'draft-vertices', { id: 'draft-vertices', type: 'circle', source: 'draft-vertices', paint: { 'circle-radius': 4, 'circle-color': '#e3a541', 'circle-stroke-color': '#08161f', 'circle-stroke-width': 1 } });

  const labelLayout = (source) => ({
    id: source + '-layer', type: 'symbol', source,
    layout: {
      'text-field': ['get', 'label'], 'text-size': ['case', ['get', 'isArea'], 16, 13],
      'text-rotate': ['get', 'rotation'], 'text-rotation-alignment': 'map',
      'text-pitch-alignment': 'viewport', 'text-keep-upright': false,
      'text-anchor': 'center', 'symbol-placement': 'point',
      'text-allow-overlap': true, 'text-ignore-placement': true
    },
    paint: { 'text-color': '#13202b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.8 }
  });
  ensureLayer(map, 'draft-label-layer', labelLayout('draft-label'));
  ensureLayer(map, 'persist-measure-fill-layer', { id: 'persist-measure-fill-layer', type: 'fill', source: 'persist-measure-fill', paint: { 'fill-color': '#3fc2ac', 'fill-opacity': 0.15 } });
  ensureLayer(map, 'persist-measure-line-layer', { id: 'persist-measure-line-layer', type: 'line', source: 'persist-measure', paint: { 'line-color': '#3fc2ac', 'line-width': 2.6 } });
  ensureLayer(map, 'persist-measure-label-layer', { ...labelLayout('persist-measure-label'), paint: { 'text-color': '#0b2e28', 'text-halo-color': '#ffffff', 'text-halo-width': 1.8 } });

  ensureLayer(map, 'snap-marker-layer', {
    id: 'snap-marker-layer', type: 'symbol', source: 'snap-marker',
    layout: {
      'icon-image': ['match', ['get', 'snapType'], 'vertex', 'snap-vertex', 'midpoint', 'snap-midpoint', 'edge', 'snap-edge', 'center', 'snap-center', 'intersection', 'snap-intersection', 'perpendicular', 'snap-perpendicular', 'snap-edge'],
      'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true
    }
  });
}

export function selectableLayers(map) {
  return [
    'poly-fill', 'poly-outline-solid', 'poly-outline-dashed', 'poly-outline-dotted',
    'line-layer-solid', 'line-layer-dashed', 'line-layer-dotted', 'line-hitarea',
    'point-layer', 'point-hitarea', 'poly-extrusion'
  ].filter((id) => !!map.getLayer(id));
}

// features/layers değiştikçe 'features' kaynağını günceller.
export function useSyncFeatures(map, visibleFeatures) {
  useEffect(() => {
    if (!map) return;
    const src = map.getSource && map.getSource('features');
    if (src) src.setData(fc(visibleFeatures));
  }, [map, visibleFeatures]);
}
