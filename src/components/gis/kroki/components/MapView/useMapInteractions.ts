import { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore.js';
import { uid } from '../../store/useStore.js';
import * as turf from '@turf/turf';
import { projectPointOnSegmentPx, perpendicularFootPx, segmentIntersectionLngLat } from '../../lib/geometry.js';

interface UseMapInteractionsProps {
  map: any | null;
  styleLoaded: boolean;
  onOpenFeatureForm: (featureId: string, isNew: boolean) => void;
}

export function useMapInteractions({ map, styleLoaded, onOpenFeatureForm }: UseMapInteractionsProps) {
  const mode = useStore((s) => s.mode);
  const activeLayerId = useStore((s) => s.activeLayerId);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const snapTolerancePx = useStore((s) => s.snapTolerancePx);
  const features = useStore((s) => s.features);
  const selectedId = useStore((s) => s.selectedId);

  const { addFeature, updateFeatureGeometry, pushHistory, showToast, selectId } = useStore() as any;

  // Refs to hold current drawing states to bypass closure issues
  const drawingCoordsRef = useRef<number[][]>([]);
  const drawModeRef = useRef<string>(mode);
  const snapIndicatorRef = useRef<any>(null);

  // Drag states
  const isDraggingRef = useRef<boolean>(false);
  const dragFeatureIdRef = useRef<string | null>(null);
  const dragVertexIndexRef = useRef<number | null>(null);

  useEffect(() => {
    drawModeRef.current = mode;
    // Clear drawing state on mode change
    if (mode === 'select') {
      drawingCoordsRef.current = [];
      updateTempDrawing(null);
    }
  }, [mode]);

  // Helper to draw the feedback geometry on the temporary draw source
  function updateTempDrawing(geom: any | null) {
    if (!map || !styleLoaded) return;
    const src = map.getSource('kroki-temp-draw');
    if (src) {
      src.setData(geom ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geom, properties: {} }] } : { type: 'FeatureCollection', features: [] });
    }
  }

  // Helper to show/hide the snap target indicator
  function updateSnapIndicator(lngLat: number[] | null, type?: string) {
    if (!map || !styleLoaded) return;
    const src = map.getSource('kroki-snap-indicator');
    if (src) {
      if (!lngLat) {
        src.setData({ type: 'FeatureCollection', features: [] });
      } else {
        src.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: lngLat },
            properties: { type: type || 'vertex' }
          }]
        });
      }
    }
  }

  // Snap calculation engine
  function calculateSnap(clickLngLat: { lng: number, lat: number }, clickPx: { x: number, y: number }): { coord: number[], type: string } | null {
    if (!snapEnabled || !map) return null;

    let bestSnap: { coord: number[], type: string, distPx: number } | null = null;
    const tolerance = snapTolerancePx;

    // Check existing vertices and edges of visible shapes
    features.forEach((feat) => {
      const g = feat.geometry;
      if (!g) return;

      // 1. Point geometry snapping
      if (g.type === 'Point') {
        const ptPx = map.project(g.coordinates);
        const dist = Math.hypot(clickPx.x - ptPx.x, clickPx.y - ptPx.y);
        if (dist <= tolerance) {
          if (!bestSnap || dist < bestSnap.distPx) {
            bestSnap = { coord: g.coordinates, type: 'vertex', distPx: dist };
          }
        }
      }

      // 2. LineString geometry snapping (vertices + edges + midpoint)
      if (g.type === 'LineString') {
        const coords = g.coordinates;
        // Vertex snapping
        coords.forEach((c: number[]) => {
          const vPx = map.project(c);
          const dist = Math.hypot(clickPx.x - vPx.x, clickPx.y - vPx.y);
          if (dist <= tolerance) {
            if (!bestSnap || dist < bestSnap.distPx) {
              bestSnap = { coord: c, type: 'vertex', distPx: dist };
            }
          }
        });

        // Edge snapping & Midpoint snapping
        for (let i = 0; i < coords.length - 1; i++) {
          const c1 = coords[i], c2 = coords[i + 1];
          const px1 = map.project(c1), px2 = map.project(c2);
          const projected = projectPointOnSegmentPx(clickPx, px1, px2);
          if (projected) {
            const dist = Math.hypot(clickPx.x - projected.x, clickPx.y - projected.y);
            if (dist <= tolerance) {
              // Midpoint snap check
              const midLngLat = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
              const midPx = map.project(midLngLat);
              const distMid = Math.hypot(clickPx.x - midPx.x, clickPx.y - midPx.y);

              if (distMid <= tolerance && (!bestSnap || distMid < bestSnap.distPx)) {
                bestSnap = { coord: midLngLat, type: 'midpoint', distPx: distMid };
              } else if (!bestSnap || dist < bestSnap.distPx) {
                const snappedLL = map.unproject(projected);
                bestSnap = { coord: [snappedLL.lng, snappedLL.lat], type: 'edge', distPx: dist };
              }
            }
          }
        }
      }

      // 3. Polygon geometry snapping (perimeter vertices + edges)
      if (g.type === 'Polygon') {
        const ring = g.coordinates[0];
        if (!ring) return;
        // Vertex snapping
        ring.forEach((c: number[]) => {
          const vPx = map.project(c);
          const dist = Math.hypot(clickPx.x - vPx.x, clickPx.y - vPx.y);
          if (dist <= tolerance) {
            if (!bestSnap || dist < bestSnap.distPx) {
              bestSnap = { coord: c, type: 'vertex', distPx: dist };
            }
          }
        });

        // Edge snapping & Midpoints
        for (let i = 0; i < ring.length - 1; i++) {
          const c1 = ring[i], c2 = ring[i + 1];
          const px1 = map.project(c1), px2 = map.project(c2);
          const projected = projectPointOnSegmentPx(clickPx, px1, px2);
          if (projected) {
            const dist = Math.hypot(clickPx.x - projected.x, clickPx.y - projected.y);
            if (dist <= tolerance) {
              const midLngLat = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];
              const midPx = map.project(midLngLat);
              const distMid = Math.hypot(clickPx.x - midPx.x, clickPx.y - midPx.y);

              if (distMid <= tolerance && (!bestSnap || distMid < bestSnap.distPx)) {
                bestSnap = { coord: midLngLat, type: 'midpoint', distPx: distMid };
              } else if (!bestSnap || dist < bestSnap.distPx) {
                const snappedLL = map.unproject(projected);
                bestSnap = { coord: [snappedLL.lng, snappedLL.lat], type: 'edge', distPx: dist };
              }
            }
          }
        }
      }
    });

    return bestSnap;
  }

  useEffect(() => {
    if (!map || !styleLoaded) return;

    // Handle mouse movement for snapping preview and vertex drag updates
    const onMouseMove = (e: any) => {
      const mode = drawModeRef.current;

      // 1. Snap assist in drawing mode
      if (['draw_point', 'draw_line', 'draw_polygon'].includes(mode)) {
        const snap = calculateSnap(e.lngLat, e.point);
        if (snap) {
          updateSnapIndicator(snap.coord, snap.type);
        } else {
          updateSnapIndicator(null);
        }

        // Draw temporary line or polygon path
        if (drawingCoordsRef.current.length > 0) {
          const activeCoord = snap ? snap.coord : [e.lngLat.lng, e.lngLat.lat];
          const path = [...drawingCoordsRef.current, activeCoord];
          if (mode === 'draw_line') {
            updateTempDrawing({ type: 'LineString', coordinates: path });
          } else if (mode === 'draw_polygon') {
            if (path.length >= 3) {
              updateTempDrawing({ type: 'Polygon', coordinates: [[...path, path[0]]] });
            } else {
              updateTempDrawing({ type: 'LineString', coordinates: path });
            }
          }
        }
        return;
      }

      // 2. Vertex drag/move in select mode
      if (mode === 'select' && isDraggingRef.current && dragFeatureIdRef.current) {
        map.getCanvas().style.cursor = 'grabbing';
        const targetId = dragFeatureIdRef.current;
        const vIdx = dragVertexIndexRef.current;

        const snap = calculateSnap(e.lngLat, e.point);
        const nextCoord = snap ? snap.coord : [e.lngLat.lng, e.lngLat.lat];
        updateSnapIndicator(snap ? snap.coord : null, snap ? snap.type : 'vertex');

        const feat = features.find((f) => f.id === targetId);
        if (!feat) return;

        let nextGeom = { ...feat.geometry };
        if (nextGeom.type === 'Point') {
          nextGeom.coordinates = nextCoord;
        } else if (nextGeom.type === 'LineString') {
          if (vIdx !== null) {
            const nextCoords = [...nextGeom.coordinates];
            nextCoords[vIdx] = nextCoord;
            nextGeom.coordinates = nextCoords;
          }
        } else if (nextGeom.type === 'Polygon') {
          if (vIdx !== null) {
            const nextRing = [...nextGeom.coordinates[0]];
            nextRing[vIdx] = nextCoord;
            // Ensure first and last coordinates of polygon ring match
            if (vIdx === 0) {
              nextRing[nextRing.length - 1] = nextCoord;
            } else if (vIdx === nextRing.length - 1) {
              nextRing[0] = nextCoord;
            }
            nextGeom.coordinates = [nextRing];
          }
        }

        updateFeatureGeometry(targetId, nextGeom);
      }
    };

    // Handle map clicks for placing vertices or selecting objects
    const onClick = (e: any) => {
      const mode = drawModeRef.current;
      const snap = calculateSnap(e.lngLat, e.point);
      const clickedCoord = snap ? snap.coord : [e.lngLat.lng, e.lngLat.lat];

      // --- Çizim Modları ---
      if (mode === 'draw_point') {
        pushHistory();
        const featId = 'feat-' + uid();
        addFeature({
          type: 'Feature',
          id: featId,
          geometry: { type: 'Point', coordinates: clickedCoord },
          properties: { layerId: activeLayerId, name: 'Yeni Nokta' }
        });
        showToast('Nokta oluşturuldu.');
        onOpenFeatureForm(featId, true);
        return;
      }

      if (mode === 'draw_line') {
        drawingCoordsRef.current.push(clickedCoord);
        showToast(`Vertex eklendi (${drawingCoordsRef.current.length})`);
        return;
      }

      if (mode === 'draw_polygon') {
        drawingCoordsRef.current.push(clickedCoord);
        showToast(`Köşe eklendi (${drawingCoordsRef.current.length})`);
        return;
      }

      // --- Seçim Modu ---
      if (mode === 'select') {
        // Query features under the cursor
        const bbox: [[number, number], [number, number]] = [
          [e.point.x - 6, e.point.y - 6],
          [e.point.x + 6, e.point.y + 6]
        ];
        const hitLayers = ['kroki-points-layer', 'kroki-lines-layer', 'kroki-polygons-layer'];
        const hits = map.queryRenderedFeatures(bbox, { layers: hitLayers });

        if (hits.length > 0) {
          const hit = hits[0];
          const hitId = hit.properties.id;
          useStore.setState({ selectedId: hitId });
        } else {
          useStore.setState({ selectedId: null });
        }
      }
    };

    // Handle double-clicks to complete drawing LineStrings and Polygons
    const onDblClick = (e: any) => {
      e.preventDefault();
      const mode = drawModeRef.current;
      if (!['draw_line', 'draw_polygon'].includes(mode)) return;

      const path = [...drawingCoordsRef.current];
      if (path.length < 2) {
        drawingCoordsRef.current = [];
        updateTempDrawing(null);
        return;
      }

      pushHistory();
      const featId = 'feat-' + uid();

      if (mode === 'draw_line') {
        addFeature({
          type: 'Feature',
          id: featId,
          geometry: { type: 'LineString', coordinates: path },
          properties: { layerId: activeLayerId, name: 'Yeni Çizgi' }
        });
        showToast('Çizgi tamamlandı.');
      } else if (mode === 'draw_polygon') {
        if (path.length < 3) {
          showToast('Poligon için en az 3 köşe olmalıdır.');
          drawingCoordsRef.current = [];
          updateTempDrawing(null);
          return;
        }
        // Close the ring
        const closedPath = [...path, path[0]];
        addFeature({
          type: 'Feature',
          id: featId,
          geometry: { type: 'Polygon', coordinates: [closedPath] },
          properties: { layerId: activeLayerId, name: 'Yeni Poligon' }
        });
        showToast('Poligon tamamlandı.');
      }

      drawingCoordsRef.current = [];
      updateTempDrawing(null);
      updateSnapIndicator(null);
      onOpenFeatureForm(featId, true);
    };

    // Handle mousedown to trigger vertex dragging
    const onMouseDown = (e: any) => {
      const mode = drawModeRef.current;
      if (mode !== 'select') return;

      // Query if we clicked on a vertex marker
      const hitVertices = map.queryRenderedFeatures(
        [[e.point.x - 8, e.point.y - 8], [e.point.x + 8, e.point.y + 8]],
        { layers: ['kroki-selected-vertices'] }
      );

      if (hitVertices.length > 0) {
        // We clicked on a vertex. Initiate drag!
        e.preventDefault(); // Prevents map panning
        map.dragPan.disable();
        pushHistory();

        isDraggingRef.current = true;
        dragFeatureIdRef.current = hitVertices[0].properties.parentFeatureId;
        dragVertexIndexRef.current = Number(hitVertices[0].properties.vertexIndex);
      }
    };

    // Handle mouseup to finish vertex dragging
    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        dragFeatureIdRef.current = null;
        dragVertexIndexRef.current = null;
        if (map) {
          map.dragPan.enable();
          map.getCanvas().style.cursor = '';
        }
        updateSnapIndicator(null);
        showToast('Geometri güncellendi.');
      }
    };

    // Register event listeners
    map.on('mousemove', onMouseMove);
    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.on('mousedown', onMouseDown);
    map.on('mouseup', onMouseUp);

    return () => {
      if (map) {
        map.off('mousemove', onMouseMove);
        map.off('click', onClick);
        map.off('dblclick', onDblClick);
        map.off('mousedown', onMouseDown);
        map.off('mouseup', onMouseUp);
      }
    };
  }, [map, styleLoaded, activeLayerId, snapEnabled, snapTolerancePx, features]);
}
