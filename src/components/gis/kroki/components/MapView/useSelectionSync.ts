import { useEffect } from 'react';
import { useStore } from '../../store/useStore.js';

interface UseSelectionSyncProps {
  map: any | null;
  styleLoaded: boolean;
}

export function useSelectionSync({ map, styleLoaded }: UseSelectionSyncProps) {
  const selectedId = useStore((s) => s.selectedId);

  useEffect(() => {
    if (!map || !styleLoaded) return;

    function syncSelectionFilter() {
      if (!map.isStyleLoaded()) return;

      const activeId = selectedId || '__none__';

      // Seçim katmanlarına filtre uygulayarak seçili olan objeyi belirgin şekilde kalın ve mavi çizeriz
      ['kroki-points-selected', 'kroki-lines-selected', 'kroki-polygons-selected'].forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setFilter(layerId, ['==', ['get', 'id'], activeId]);
        }
      });
    }

    syncSelectionFilter();
  }, [map, styleLoaded, selectedId]);
}
