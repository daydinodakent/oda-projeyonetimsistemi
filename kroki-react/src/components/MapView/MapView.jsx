import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useStore, selectVisibleFeatures } from '../../store/useStore.js';
import { setupMapLayers, useSyncFeatures } from './useMapLayers.js';
import { useMapInteractions } from './useMapInteractions.js';
import { useSelectionSync } from './useSelectionSync.js';

export const BASEMAP_STYLES = [
  { id: 'bright', label: 'Bright', url: 'https://tiles.openfreemap.org/styles/bright' },
  { id: 'liberty', label: 'Liberty', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'positron', label: 'Positron', url: 'https://tiles.openfreemap.org/styles/positron' }
];

export default function MapView({ mapRef, onReady }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const features = useStore((s) => s.features);
  const layers = useStore((s) => s.layers);
  const activeMapId = useStore((s) => s.activeMapId);
  const selectedId = useStore((s) => s.selectedId);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLES[0].url,
      center: [35.2433, 38.9637],
      zoom: 5.4,
      attributionControl: { compact: false }
    });
    mapRef.current = map;

    map.on('load', () => {
      setupMapLayers(map);
      setReady(true);
      onReady && onReady(map);
    });
    map.on('style.load', () => {
      if (map.getSource('features')) return; // ilk yükleme, tekrar kurmaya gerek yok
      setupMapLayers(map);
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleFeatures = selectVisibleFeatures({ features, layers, activeMapId });
  useSyncFeatures(mapRef.current, visibleFeatures);
  useSelectionSync(mapRef.current, ready, features, selectedId);
  useMapInteractions(mapRef.current, ready);

  return <div ref={containerRef} className="map-container" />;
}
