import { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
type Map = maplibregl.Map;
type MapMouseEvent = maplibregl.MapMouseEvent;
import * as turf from '@turf/turf';
import { GisFeature, GisLayer } from '../../../types/gis';
import { SnapType } from '../utils/maplibreSdfIcons';

const STORAGE_FEATURES_KEY = 'iga_gis_features';

interface UseGisDrawProps {
  map: Map | null;
  activeLayerId: string;
  layers: GisLayer[];
  showToast?: (msg: string) => void;
}

export function useGisDraw({ map, activeLayerId, layers, showToast }: UseGisDrawProps) {
  const [features, setFeatures] = useState<GisFeature[]>(() => {
    const saved = localStorage.getItem(STORAGE_FEATURES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setModeState] = useState<string>('select');
  const [draftCoords, setDraftCoordsState] = useState<[number, number][] | null>(null);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [snapTolerancePx, setSnapTolerancePx] = useState<number>(14);
  const [labelsVisible, setLabelsVisible] = useState<boolean>(true);

  // Dynamic cursor states
  const [mouseCoords, setMouseCoords] = useState<string>('');
  const [cursorShow, setCursorShow] = useState<boolean>(false);
  const [cursorMousePoint, setCursorMousePoint] = useState<{ x: number; y: number } | null>(null);
  const [cursorInputMode, setCursorInputMode] = useState<'polar' | 'xy'>('polar');
  const [cursorX, setCursorX] = useState<string>('');
  const [cursorY, setCursorY] = useState<string>('');

  // 3D Extrusion states managed directly here
  const [floorCount, setFloorCount] = useState<number>(1);
  const [floorHeight, setFloorHeight] = useState<number>(3.0);

  // Measurements persistence (distance and area)
  const [persistedMeasurements, setPersistedMeasurements] = useState<any[]>([]);

  // Refs to avoid stale closure issues in map event handlers
  const featuresRef = useRef<GisFeature[]>(features);
  const activeLayerIdRef = useRef<string>(activeLayerId);
  const modeRef = useRef<string>(mode);
  const draftCoordsRef = useRef<[number, number][] | null>(draftCoords);
  const snapEnabledRef = useRef<boolean>(snapEnabled);
  const snapTolerancePxRef = useRef<number>(snapTolerancePx);
  const selectedIdRef = useRef<string | null>(selectedId);
  const layersRef = useRef<GisLayer[]>(layers);
  const showToastRef = useRef<(msg: string) => void>(showToast || (() => {}));

  const cursorInputModeRef = useRef<'polar' | 'xy'>(cursorInputMode);
  const cursorXRef = useRef<string>(cursorX);
  const cursorYRef = useRef<string>(cursorY);
  const floorCountRef = useRef<number>(floorCount);
  const floorHeightRef = useRef<number>(floorHeight);

  // Undo / Redo history
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Attributes from place feature form
  const [pendingAttributes, setPendingAttributes] = useState<Record<string, any> | null>(null);
  const pendingAttributesRef = useRef<Record<string, any> | null>(null);

  // Sync refs with state
  useEffect(() => { featuresRef.current = features; localStorage.setItem(STORAGE_FEATURES_KEY, JSON.stringify(features)); }, [features]);
  useEffect(() => { activeLayerIdRef.current = activeLayerId; }, [activeLayerId]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { draftCoordsRef.current = draftCoords; }, [draftCoords]);
  useEffect(() => { snapEnabledRef.current = snapEnabled; }, [snapEnabled]);
  useEffect(() => { snapTolerancePxRef.current = snapTolerancePx; }, [snapTolerancePx]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { pendingAttributesRef.current = pendingAttributes; }, [pendingAttributes]);
  useEffect(() => { if (showToast) showToastRef.current = showToast; }, [showToast]);

  useEffect(() => { cursorInputModeRef.current = cursorInputMode; }, [cursorInputMode]);
  useEffect(() => { cursorXRef.current = cursorX; }, [cursorX]);
  useEffect(() => { cursorYRef.current = cursorY; }, [cursorY]);
  useEffect(() => { floorCountRef.current = floorCount; }, [floorCount]);
  useEffect(() => { floorHeightRef.current = floorHeight; }, [floorHeight]);

  const pushHistory = () => {
    undoStackRef.current.push(JSON.stringify(featuresRef.current));
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(false);
  };

  const undo = () => {
    if (!undoStackRef.current.length) return;
    redoStackRef.current.push(JSON.stringify(featuresRef.current));
    const prev = JSON.parse(undoStackRef.current.pop()!);
    setFeatures(prev);
    setSelectedId(null);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    if (!redoStackRef.current.length) return;
    undoStackRef.current.push(JSON.stringify(featuresRef.current));
    const next = JSON.parse(redoStackRef.current.pop()!);
    setFeatures(next);
    setSelectedId(null);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const setMode = (newMode: string) => {
    setDraftCoordsState(null);
    setModeState(newMode);
    if (newMode !== 'select') setSelectedId(null);
    if (map) {
      map.getCanvas().style.cursor = newMode === 'select' ? 'pointer' : 'crosshair';
      const vertexLayer = map.getLayer('vertex-layer');
      if (vertexLayer) {
        map.setLayoutProperty('vertex-layer', 'visibility', newMode === 'select' ? 'visible' : 'none');
      }
    }
  };

  // Helper geometry creation
  const addFeature = (geomType: GisFeature['geometry']['type'], coords: any, props: Record<string, any> = {}) => {
    pushHistory();
    const newFeature: GisFeature = {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'Feature',
      geometry: { type: geomType, coordinates: coords },
      properties: {
        layerId: activeLayerIdRef.current,
        ...pendingAttributesRef.current,
        ...props
      }
    };
    setPendingAttributes(null);
    setFeatures(prev => [...prev, newFeature]);
    return newFeature;
  };

  const deleteFeature = (id: string) => {
    pushHistory();
    setFeatures(prev => prev.filter(f => f.id !== id));
    if (selectedIdRef.current === id) setSelectedId(null);
  };

  const clearAllFeatures = () => {
    if (!features.length) return;
    pushHistory();
    setFeatures([]);
    setSelectedId(null);
  };

  // Geometrical edits
  const scaleSelectedFeature = (pct: number, baseGeom: GisFeature['geometry'] | null) => {
    if (!selectedIdRef.current || !baseGeom) return;
    try {
      const base = { type: 'Feature', geometry: baseGeom, properties: {} } as any;
      const scaled = turf.transformScale(base, pct / 100, { origin: 'centroid' });
      setFeatures(prev => prev.map(f => f.id === selectedIdRef.current ? { ...f, geometry: scaled.geometry } : f));
    } catch (e) {
      // transient invalid geom
    }
  };

  const rotateSelectedFeature = (angle: number, baseGeom: GisFeature['geometry'] | null) => {
    if (!selectedIdRef.current || !baseGeom) return;
    try {
      const base = { type: 'Feature', geometry: baseGeom, properties: {} } as any;
      const pivot = turf.centroid(base).geometry.coordinates;
      const rotated = turf.transformRotate(base, angle, { pivot });
      setFeatures(prev => prev.map(f => f.id === selectedIdRef.current ? { ...f, geometry: rotated.geometry } : f));
    } catch (e) {
      // transient invalid geom
    }
  };

  const bufferSelectedFeature = (meters: number) => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    const target = featuresRef.current.find(f => f.id === activeId);
    if (!target) return;
    pushHistory();
    try {
      const buffered = turf.buffer(target as any, meters / 1000, { units: 'kilometers' }) as any;
      if (!buffered || !buffered.geometry) return;
      let geom = buffered.geometry;
      if (geom.type === 'MultiPolygon') {
        let best: any = null;
        let bestArea = -1;
        geom.coordinates.forEach(ringSet => {
          const cand = { type: 'Polygon', coordinates: ringSet };
          const a = turf.area(cand as any);
          if (a > bestArea) {
            bestArea = a;
            best = cand;
          }
        });
        geom = best || geom;
      }
      setFeatures(prev => prev.map(f => f.id === activeId ? {
        ...f,
        geometry: geom as any,
        properties: {
          ...f.properties,
          shape: undefined,
          pipe: undefined,
          diameter: undefined
        }
      } : f));
    } catch (err) {
      // failed buffer
    }
  };

  const simplifySelectedFeature = (tolerance: number) => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    const target = featuresRef.current.find(f => f.id === activeId);
    if (!target || target.geometry.type === 'Point') return;
    pushHistory();
    try {
      const simplified = turf.simplify(target as any, { tolerance, highQuality: true, mutate: false });
      setFeatures(prev => prev.map(f => f.id === activeId ? { ...f, geometry: simplified.geometry as any } : f));
    } catch (err) {
      // failed simplify
    }
  };

  const duplicateSelectedFeature = () => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    const target = featuresRef.current.find(f => f.id === activeId);
    if (!target) return;
    pushHistory();
    const clone = JSON.parse(JSON.stringify(target));
    clone.id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const d = 0.0015;
    const shift = (c: any) => {
      if (typeof c[0] === 'number') {
        c[0] += d;
        c[1] += d;
        return;
      }
      c.forEach(shift);
    };
    shift(clone.geometry.coordinates);
    setFeatures(prev => [...prev, clone]);
    setSelectedId(clone.id);
  };

  const toggleSelectedFeature3D = () => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    const target = featuresRef.current.find(f => f.id === activeId);
    if (!target || target.geometry.type !== 'Polygon') return;
    pushHistory();
    setFeatures(prev => prev.map(f => {
      if (f.id !== activeId) return f;
      if (f.properties.extrude) {
        return {
          ...f,
          properties: {
            ...f.properties,
            extrude: undefined,
            height: undefined,
            base: undefined,
            floors: undefined,
            floorHeight: undefined
          }
        };
      } else {
        const floors = f.properties.floors || 1;
        const floorHeight = f.properties.floorHeight || 3.0;
        return {
          ...f,
          properties: {
            ...f.properties,
            extrude: true,
            floors,
            floorHeight,
            height: floors * floorHeight,
            base: 0
          }
        };
      }
    }));
  };

  const updateSelectedFeature3DProps = (floors: number, floorHeight: number) => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    setFeatures(prev => prev.map(f => {
      if (f.id !== activeId) return f;
      return {
        ...f,
        properties: {
          ...f.properties,
          floors,
          floorHeight,
          height: floors * floorHeight
        }
      };
    }));
  };

  const toggleSelectedFeaturePipe = () => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    const target = featuresRef.current.find(f => f.id === activeId);
    if (!target || target.geometry.type !== 'LineString') return;
    pushHistory();
    setFeatures(prev => prev.map(f => {
      if (f.id !== activeId) return f;
      if (f.properties.pipe) {
        return {
          ...f,
          properties: {
            ...f.properties,
            pipe: undefined,
            diameter: undefined
          }
        };
      } else {
        return {
          ...f,
          properties: {
            ...f.properties,
            pipe: true,
            diameter: f.properties.diameter || 5.0
          }
        };
      }
    }));
  };

  const updateSelectedFeaturePipeProps = (diameter: number) => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    setFeatures(prev => prev.map(f => {
      if (f.id !== activeId) return f;
      return {
        ...f,
        properties: {
          ...f.properties,
          diameter
        }
      };
    }));
  };

  const deleteSelectedVertex = (ringIndex: number, vertIndex: number) => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    const target = featuresRef.current.find(f => f.id === activeId);
    if (!target) return;
    if (target.geometry.type === 'Point') return;

    if (target.geometry.type === 'LineString') {
      if (target.geometry.coordinates.length <= 2) return;
      pushHistory();
      const nextCoords = [...target.geometry.coordinates];
      nextCoords.splice(vertIndex, 1);
      setFeatures(prev => prev.map(f => f.id === activeId ? {
        ...f,
        geometry: { ...f.geometry, coordinates: nextCoords }
      } : f));
    } else if (target.geometry.type === 'Polygon') {
      const ring = [...target.geometry.coordinates[ringIndex]];
      if (ring.length <= 4) return;
      pushHistory();
      if (vertIndex === 0) {
        ring.splice(0, 1);
        ring[ring.length - 1] = ring[0];
      } else {
        ring.splice(vertIndex, 1);
      }
      const nextCoords = [...target.geometry.coordinates];
      nextCoords[ringIndex] = ring;
      setFeatures(prev => prev.map(f => f.id === activeId ? {
        ...f,
        geometry: { ...f.geometry, coordinates: nextCoords }
      } : f));
    }
  };

  const insertVertexNearCoord = (lngLat: { lng: number; lat: number }) => {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    const target = featuresRef.current.find(f => f.id === activeId);
    if (!target) return;
    if (target.geometry.type === 'LineString') {
      pushHistory();
      const line = turf.lineString(target.geometry.coordinates);
      const snapped = turf.nearestPointOnLine(line, [lngLat.lng, lngLat.lat]);
      const idx = snapped.properties.index ?? 0;
      const nextCoords = [...target.geometry.coordinates];
      nextCoords.splice(idx + 1, 0, [lngLat.lng, lngLat.lat]);
      setFeatures(prev => prev.map(f => f.id === activeId ? {
        ...f,
        geometry: { ...f.geometry, coordinates: nextCoords }
      } : f));
    } else if (target.geometry.type === 'Polygon') {
      pushHistory();
      const ring = target.geometry.coordinates[0];
      const line = turf.lineString(ring);
      const snapped = turf.nearestPointOnLine(line, [lngLat.lng, lngLat.lat]);
      const idx = snapped.properties.index ?? 0;
      const nextRing = [...ring];
      nextRing.splice(idx + 1, 0, [lngLat.lng, lngLat.lat]);
      const nextCoords = [...target.geometry.coordinates];
      nextCoords[0] = nextRing;
      setFeatures(prev => prev.map(f => f.id === activeId ? {
        ...f,
        geometry: { ...f.geometry, coordinates: nextCoords }
      } : f));
    }
  };

  // Geometric Snap algorithm helper
  const findSnapPoint = (
    screenPoint: { x: number; y: number },
    excludeId: string | null,
    fromLngLat: [number, number] | null
  ): { coord: [number, number]; type: SnapType } | null => {
    if (!snapEnabledRef.current || !map) return null;
    let best: { coord: [number, number]; type: SnapType } | null = null;
    let bestDist = snapTolerancePxRef.current;
    const fromPx = fromLngLat ? map.project(fromLngLat) : null;

    featuresRef.current.forEach(f => {
      if (excludeId && f.id === excludeId) return;

      // Extract coords list
      let rings: [number, number][][] = [];
      if (f.geometry.type === 'Point') rings = [[f.geometry.coordinates]];
      else if (f.geometry.type === 'LineString') rings = [f.geometry.coordinates];
      else if (f.geometry.type === 'Polygon') rings = f.geometry.coordinates;

      rings.forEach(coordsList => {
        // Vertex snaps
        coordsList.forEach(c => {
          const p = map.project(c);
          const d = Math.hypot(p.x - screenPoint.x, p.y - screenPoint.y);
          if (d < bestDist) {
            bestDist = d;
            best = { coord: c, type: 'vertex' };
          }
        });

        // Midpoint and Edge snaps
        for (let i = 0; i < coordsList.length - 1; i++) {
          const a = coordsList[i];
          const b = coordsList[i+1];
          const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          const pm = map.project(mid);
          const dm = Math.hypot(pm.x - screenPoint.x, pm.y - screenPoint.y);
          if (dm < bestDist) {
            bestDist = dm;
            best = { coord: mid, type: 'midpoint' };
          }

          const pa = map.project(a);
          const pb = map.project(b);
          // Projection on segment
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const lenSq = dx*dx + dy*dy;
          if (lenSq > 0) {
            let t = ((screenPoint.x - pa.x)*dx + (screenPoint.y - pa.y)*dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const projPx = { x: pa.x + t*dx, y: pa.y + t*dy };
            const d2 = Math.hypot(projPx.x - screenPoint.x, projPx.y - screenPoint.y);
            if (d2 < bestDist) {
              const ll = map.unproject(projPx as any);
              bestDist = d2;
              best = { coord: [ll.lng, ll.lat], type: 'edge' };
            }
          }

          // Perpendicular projection snap
          if (fromPx) {
            const dxP = pb.x - pa.x;
            const dyP = pb.y - pa.y;
            const lenSqP = dxP*dxP + dyP*dyP;
            if (lenSqP > 0) {
              const tP = ((fromPx.x - pa.x)*dxP + (fromPx.y - pa.y)*dyP) / lenSqP;
              if (tP >= 0 && tP <= 1) {
                const footPx = { x: pa.x + tP*dxP, y: pa.y + tP*dyP };
                const d3 = Math.hypot(footPx.x - screenPoint.x, footPx.y - screenPoint.y);
                if (d3 < bestDist) {
                  const llP = map.unproject(footPx as any);
                  bestDist = d3;
                  best = { coord: [llP.lng, llP.lat], type: 'perpendicular' };
                }
              }
            }
          }
        }
      });
    });

    return best;
  };

  const finishDraftShape = (coords: [number, number][]) => {
    if (!coords || !coords.length) return;

    if (modeRef.current === 'measure-distance' || modeRef.current === 'measure-area') {
      const isArea = modeRef.current === 'measure-area';
      const geom: any = isArea
        ? { type: 'Polygon', coordinates: [coords.concat([coords[0]])] }
        : { type: 'LineString', coordinates: coords };
      
      setPersistedMeasurements(prev => [...prev, { id: `measure_${Date.now()}`, geometry: geom, isArea }]);
      setDraftCoordsState(null);
      showToastRef.current('Ölçüm sonucu donduruldu ve haritaya eklendi.');
      return;
    }

    if (modeRef.current === 'linestring' && coords.length >= 2) {
      addFeature('LineString', coords);
    } else if ((modeRef.current === 'polygon' || modeRef.current === 'polygon3d') && coords.length >= 3) {
      const ring = [...coords, coords[0]];
      const fProps: Record<string, any> = {};
      if (modeRef.current === 'polygon3d') {
        fProps.extrude = true;
        fProps.floors = floorCountRef.current;
        fProps.floorHeight = floorHeightRef.current;
        fProps.height = floorCountRef.current * floorHeightRef.current;
        fProps.base = 0;
      }
      addFeature('Polygon', [ring], fProps);
      if (modeRef.current === 'polygon3d' && map) {
        map.easeTo({ pitch: 55, bearing: -20, duration: 500 });
      }
    } else if (modeRef.current === 'rectangle' && coords.length >= 2) {
      const a = coords[0];
      const b = coords[1];
      const ring = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]];
      addFeature('Polygon', [ring], { shape: 'rectangle' });
    } else if (modeRef.current === 'circle' && coords.length >= 2) {
      const c = coords[0];
      const edge = coords[1];
      const r = turf.distance(turf.point(c), turf.point(edge), { units: 'kilometers' });
      if (r > 0) {
        const circleFeature = turf.circle(c, r, { steps: 64, units: 'kilometers' });
        addFeature('Polygon', circleFeature.geometry.coordinates, { shape: 'circle' });
      }
    }

    setDraftCoordsState(null);
  };

  const handleCursorInputCommit = () => {
    if (!map) return;
    const xVal = parseFloat(cursorXRef.current);
    const yVal = parseFloat(cursorYRef.current);
    if (isNaN(xVal) || isNaN(yVal)) return;

    setDraftCoordsState(prev => {
      let nextCoords: [number, number][] = prev ? [...prev] : [];
      const hasRef = nextCoords.length > 0;

      if (!hasRef || cursorInputModeRef.current === 'xy') {
        nextCoords.push([xVal, yVal]);
      } else {
        const last = nextCoords[nextCoords.length - 1];
        const bearing = yVal % 360;
        const dest = turf.destination(turf.point(last), xVal / 1000, bearing, { units: 'kilometers' });
        nextCoords.push(dest.geometry.coordinates as [number, number]);
      }

      if ((modeRef.current === 'rectangle' || modeRef.current === 'circle') && nextCoords.length >= 2) {
        finishDraftShape(nextCoords);
        return null;
      }
      return nextCoords;
    });

    setCursorX('');
    setCursorY('');
  };

  // Track map interactiveness and OSNAP projection bindings inside useGisDraw hook!
  useEffect(() => {
    if (!map) return;

    const handleMouseMove = (e: MapMouseEvent) => {
      const coordsStr = `${e.lngLat.lng.toFixed(5)}, ${e.lngLat.lat.toFixed(5)}`;
      setMouseCoords(coordsStr);

      const currentMode = modeRef.current;

      if (currentMode !== 'select' && currentMode !== 'point') {
        setCursorShow(true);
        setCursorMousePoint(e.point);

        // Advanced OSNAP positioning
        const currentDraft = draftCoordsRef.current;
        const fromPt = (currentDraft && currentDraft.length) ? currentDraft[currentDraft.length - 1] : null;
        const snap = findSnapPoint(e.point, selectedIdRef.current, fromPt);
        const snapSrc = map.getSource('snap-marker') as any;
        if (snapSrc) {
          snapSrc.setData(snap ? {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: snap.coord }, properties: { snapType: snap.type } }]
          } : { type: 'FeatureCollection', features: [] });
        }

        const effectiveLngLat = snap ? snap.coord : [e.lngLat.lng, e.lngLat.lat];
        
        // Populate inputs live
        if (currentDraft && currentDraft.length) {
          const last = currentDraft[currentDraft.length - 1];
          if (cursorInputModeRef.current === 'polar') {
            const liveD = turf.distance(turf.point(last), turf.point(effectiveLngLat), { units: 'kilometers' }) * 1000;
            let liveBrg = turf.bearing(turf.point(last), turf.point(effectiveLngLat));
            if (liveBrg < 0) liveBrg += 360;
            setCursorX(liveD.toFixed(1));
            setCursorY(liveBrg.toFixed(1));
          } else {
            setCursorX(effectiveLngLat[0].toFixed(6));
            setCursorY(effectiveLngLat[1].toFixed(6));
          }
        } else {
          setCursorX(effectiveLngLat[0].toFixed(6));
          setCursorY(effectiveLngLat[1].toFixed(6));
        }
      } else {
        setCursorShow(false);
        const snapSrc = map.getSource('snap-marker') as any;
        if (snapSrc) snapSrc.setData({ type: 'FeatureCollection', features: [] });
      }
    };

    const handleMapClick = (e: MapMouseEvent) => {
      const currentMode = modeRef.current;

      if (currentMode === 'select') {
        // Selection Logic
        const hit = map.queryRenderedFeatures(e.point, {
          layers: ['poly-fill', 'poly-outline-solid', 'poly-outline-dashed', 'poly-outline-dotted',
            'line-layer-solid', 'line-layer-dashed', 'line-layer-dotted', 'line-hitarea', 'point-layer', 'point-hitarea',
            'poly-extrusion', 'poly3d-outline', 'pipe-extrusion', 'pipe-outline', 'floor-extrusion']
        });
        
        if (hit.length) {
          const hp = hit[0].properties || {};
          const candidateId = String(hp.parentId || hp.featureId || hit[0].id);
          if (featuresRef.current.some(f => f.id === candidateId)) {
            setSelectedId(candidateId);
            return;
          }
        }

        // Geometric fallback
        const tolerancePx = 14;
        let bestId: string | null = null;
        let bestDist = Infinity;
        featuresRef.current.forEach(f => {
          if (f.geometry.type === 'Point') {
            const p = map.project(f.geometry.coordinates);
            const d = Math.hypot(p.x - e.point.x, p.y - e.point.y);
            if (d <= tolerancePx && d < bestDist) {
              bestDist = d;
              bestId = f.id;
            }
          }
        });

        if (bestId) {
          setSelectedId(bestId);
        } else {
          setSelectedId(null);
        }
        return;
      }

      if (currentMode === 'point') {
        addFeature('Point', [e.lngLat.lng, e.lngLat.lat]);
        return;
      }

      // Drawing shapes (Vertices accumulation)
      const currentDraft = draftCoordsRef.current;
      const fromPt = (currentDraft && currentDraft.length) ? currentDraft[currentDraft.length - 1] : null;
      const snap = findSnapPoint(e.point, selectedIdRef.current, fromPt);
      const coord: [number, number] = snap ? (snap.coord as [number, number]) : [e.lngLat.lng, e.lngLat.lat];

      setDraftCoordsState(prev => {
        if (!prev) return [coord];
        // Prevent duplicate consecutive coordinates
        const last = prev[prev.length - 1];
        if (Math.hypot(last[0] - coord[0], last[1] - coord[1]) < 0.00001) return prev;
        
        const next = [...prev, coord];
        if ((currentMode === 'rectangle' || currentMode === 'circle') && next.length >= 2) {
          finishDraftShape(next);
          return null;
        }
        return next;
      });
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleMapClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleMapClick);
    };
  }, [map]); // Extremely performant - listener is set once per map lifecycle

  return {
    features,
    setFeatures,
    selectedId,
    setSelectedId,
    mode,
    setMode,
    draftCoords,
    setDraftCoords: setDraftCoordsState,
    snapEnabled,
    setSnapEnabled,
    snapTolerancePx,
    setSnapTolerancePx,
    labelsVisible,
    setLabelsVisible,
    persistedMeasurements,
    setPersistedMeasurements,
    canUndo,
    canRedo,
    undo,
    redo,
    pushHistory,
    addFeature,
    deleteFeature,
    clearAllFeatures,
    scaleSelectedFeature,
    rotateSelectedFeature,
    bufferSelectedFeature,
    simplifySelectedFeature,
    duplicateSelectedFeature,
    toggleSelectedFeature3D,
    updateSelectedFeature3DProps,
    toggleSelectedFeaturePipe,
    updateSelectedFeaturePipeProps,
    deleteSelectedVertex,
    insertVertexNearCoord,
    pendingAttributes,
    setPendingAttributes,

    // Dynamic states and methods integrated and synchronized inside hook
    mouseCoords,
    setMouseCoords,
    cursorShow,
    setCursorShow,
    cursorMousePoint,
    setCursorMousePoint,
    cursorInputMode,
    setCursorInputMode,
    cursorX,
    setCursorX,
    cursorY,
    setCursorY,
    floorCount,
    setFloorCount,
    floorHeight,
    setFloorHeight,
    finishDraftShape,
    handleCursorInputCommit,
    findSnapPoint
  };
}
