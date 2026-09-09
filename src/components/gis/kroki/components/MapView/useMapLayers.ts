import { useEffect, useMemo } from 'react';
import { useStore, selectVisibleFeatures } from '../../store/useStore.js';
import { ensureSymbolIcons, ensureSnapIcons } from '../../lib/symbols.js';
import { fc, segmentLabelsFor } from '../../lib/geometry.js';

interface UseMapLayersProps {
  map: any | null;
  styleLoaded: boolean;
}

export function useMapLayers({ map, styleLoaded }: UseMapLayersProps) {
  const features = useStore((s) => s.features);
  const layers = useStore((s) => s.layers);
  const activeMapId = useStore((s) => s.activeMapId);
  const labelsVisible = useStore((s) => s.labelsVisible);
  const persistedMeasurements = useStore((s) => s.persistedMeasurements);

  const visibleFeatures = useMemo(() => {
    return selectVisibleFeatures({ features, layers, activeMapId });
  }, [features, layers, activeMapId]);

  useEffect(() => {
    if (!map || !styleLoaded) return;

    // Harita katmanlarının (Point, LineString, Polygon) kaynaklarını dinamik GeoJSON verisiyle besleriz
    function updateSources() {
      if (!map.isStyleLoaded()) return;

      const pts = visibleFeatures.filter((f: any) => f.geometry.type === 'Point');
      const lns = visibleFeatures.filter((f: any) => f.geometry.type === 'LineString');
      const plys = visibleFeatures.filter((f: any) => f.geometry.type === 'Polygon');

      // 1. Noktalar (Point Source)
      const srcPt = map.getSource('kroki-points');
      if (srcPt) srcPt.setData(fc(pts));

      // 2. Çizgiler (Line Source)
      const srcLn = map.getSource('kroki-lines');
      if (srcLn) srcLn.setData(fc(lns));

      // 3. Alanlar (Polygon Source)
      const srcPly = map.getSource('kroki-polygons');
      if (srcPly) srcPly.setData(fc(plys));

      // 4. Dinamik Ölçüm Etiketleri (Labels Source)
      const labelSrc = map.getSource('kroki-labels');
      if (labelSrc) {
        if (!labelsVisible) {
          labelSrc.setData(fc([]));
        } else {
          let labelFeatures: any[] = [];
          visibleFeatures.forEach((f: any) => {
            const segs = segmentLabelsFor(f, map);
            segs.forEach((s) => {
              labelFeatures.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: s.coord },
                properties: {
                  label: s.label,
                  isArea: s.isArea ? 'yes' : 'no',
                  rotation: s.rotation || 0
                }
              });
            });
          });
          // Add persisted measurements too
          persistedMeasurements.forEach((m) => {
            labelFeatures.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: m.coord },
              properties: {
                label: m.label,
                isArea: m.isArea ? 'yes' : 'no',
                rotation: m.rotation || 0
              }
            });
          });
          labelSrc.setData(fc(labelFeatures));
        }
      }

      // Z-index: Ensure our layers always stay on top of the stack
      const userLayers = [
        'kroki-polygons-layer',
        'kroki-polygons-outline',
        'kroki-polygons-selected',
        'kroki-lines-layer',
        'kroki-lines-selected',
        'kroki-points-layer',
        'kroki-points-selected',
        'kroki-temp-draw-polygon',
        'kroki-temp-draw-line',
        'kroki-labels-layer',
        'kroki-snap-indicator-layer',
        'kroki-selected-vertices-point'
      ];
      userLayers.forEach((layerId) => {
        try {
          if (map.getLayer(layerId)) {
            map.moveLayer(layerId);
          }
        } catch (e) {
          // Safe catch-all
        }
      });
    }

    updateSources();

    const onMove = () => updateSources();
    map.on('move', onMove);
    return () => {
      if (map) map.off('move', onMove);
    };
  }, [map, styleLoaded, visibleFeatures, labelsVisible, persistedMeasurements]);
}
