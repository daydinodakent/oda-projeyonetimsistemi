import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
type Map = maplibregl.Map;
type MapMouseEvent = maplibregl.MapMouseEvent;
import * as turf from '@turf/turf';
import JSZip from 'jszip';
import {
  Compass,
  Maximize,
  Minimize,
  Navigation,
  Layers,
  Map as MapIcon,
  Search,
  PenTool,
  TrendingUp,
  FileText,
  UploadCloud,
  Download,
  RefreshCw,
  Info,
  Calendar,
  Layers2,
  Trash2,
  CheckCircle,
  Eye,
  Menu,
  ChevronLeft,
  X,
  Plus
} from 'lucide-react';

import { useGisLayers } from './hooks/useGisLayers';
import { useGisDraw } from './hooks/useGisDraw';
import { ensureSnapIcons, ensureSymbolIcons, SnapType } from './utils/maplibreSdfIcons';
import { CursorDynamicInput } from './components/CursorDynamicInput';
import { LayerTreePanel } from './components/LayerTreePanel';
import { EditorPanel } from './components/EditorPanel';
import { GisFeature, GisLayer } from '../../types/gis';

// Re-export or import helper utilities
import {
  convexHull2D,
  getSunPosition,
  computeShadowForFeature,
  parseKML,
  parseKMZ,
  parseGML,
  parseSHP,
  parseDBF,
  parseShapefileZip,
  parseDXF,
  placeDXFOnMap,
  parseGLTFOrGLB,
  placeLocalRingOnMap,
  parseIFCFile,
  featuresToKML,
  featuresToDXF,
  buildShapefileBuffers,
  buildDBF,
  labelRotationForBearing
} from './utils/gisUtils';

const STYLES = [
  { id: 'bright', label: 'Bright', url: 'https://tiles.openfreemap.org/styles/bright' },
  { id: 'liberty', label: 'Liberty', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'positron', label: 'Positron', url: 'https://tiles.openfreemap.org/styles/positron' }
];

export const GisMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const mapRef = useRef<Map | null>(null);

  // Layout & Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState<'harita' | 'editor' | 'analiz' | 'cikti'>('harita');
  const [layerOpacity, setLayerOpacity] = useState(100);

  // Modals & Popovers
  const [basemapPopoverOpen, setBasemapPopoverOpen] = useState(false);
  const [measurePopoverOpen, setMeasurePopoverOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [snapPopoverOpen, setSnapPopoverOpen] = useState(false);
  const [featureFormOpen, setFeatureFormOpen] = useState(false);
  
  // Feature placement form states
  const [featureFormName, setFeatureFormName] = useState('');
  const [featureFormDesc, setFeatureFormDescription] = useState('');
  const [featureFormCustomFields, setFeatureFormCustomFields] = useState<{ k: string; v: string }[]>([]);

  // Sun / Shadow analysis state
  const [shadowDate, setShadowDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [shadowHour, setShadowHour] = useState(12);
  const [shadowInfoText, setShadowInfoText] = useState('');

  // Dual drone comparison
  const [rasterA, setRasterA] = useState('');
  const [rasterB, setRasterB] = useState('');
  const [rasterCompareVal, setRasterCompareVal] = useState(50);
  const [isFlickering, setIsFlickering] = useState(false);
  const flickerTimerRef = useRef<any>(null);

  // Status indicators
  const [zoomLevel, setZoomLevel] = useState('5.40');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Yükleniyor…');

  // Custom SDK layer management hook
  const {
    maps,
    activeMapId,
    folders,
    layers,
    activeLayerId,
    setActiveLayerId,
    rasterOverlays,
    addFolder,
    deleteFolder,
    addLayer,
    deleteLayer,
    updateLayerStyle,
    toggleLayerVisibility,
    toggleFolderVisibility,
    toggleFolderExpanded,
    moveLayer,
    addRaster,
    removeRaster,
    toggleRasterVisibility
  } = useGisLayers();

  const toastTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2800);
  };

  // Custom drawing and editing controller hook
  const {
    features,
    setFeatures,
    selectedId,
    setSelectedId,
    mode,
    setMode,
    draftCoords,
    setDraftCoords,
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
  } = useGisDraw({ map, activeLayerId, layers, showToast });

  // Base map style load and reapply layer mechanisms
  const setupLayers = (activeMap: Map) => {
    if (!activeMap) return;

    const fc = (arr: any[]) => ({ type: 'FeatureCollection', features: arr });

    // Sources safe initialization
    const ensureSource = (id: string, def: any) => {
      if (!activeMap.getSource(id)) activeMap.addSource(id, def);
    };

    ensureSource('features', { type: 'geojson', data: fc(features), promoteId: 'id' });
    ensureSource('vertices', { type: 'geojson', data: fc([]) });
    ensureSource('draft', { type: 'geojson', data: fc([]) });
    ensureSource('draft-vertices', { type: 'geojson', data: fc([]) });
    ensureSource('pipes', { type: 'geojson', data: fc([]) });
    ensureSource('floors', { type: 'geojson', data: fc([]) });
    ensureSource('draft-label', { type: 'geojson', data: fc([]) });
    ensureSource('snap-marker', { type: 'geojson', data: fc([]) });
    ensureSource('shadow-source', { type: 'geojson', data: fc([]) });
    ensureSource('persist-measure', { type: 'geojson', data: fc([]) });
    ensureSource('persist-measure-fill', { type: 'geojson', data: fc([]) });
    ensureSource('persist-measure-label', { type: 'geojson', data: fc([]) });

    const ensureLayer = (id: string, def: any) => {
      if (!activeMap.getLayer(id)) activeMap.addLayer(def);
    };

    // Shadow projection layer
    ensureLayer('shadow-layer', {
      id: 'shadow-layer',
      type: 'fill',
      source: 'shadow-source',
      paint: { 'fill-color': '#050505', 'fill-opacity': 0.35 }
    });

    // 2D polygon rendering
    ensureLayer('poly-fill', {
      id: 'poly-fill',
      type: 'fill',
      source: 'features',
      filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['!=', ['coalesce', ['get', 'extrude'], false], true]],
      paint: {
        'fill-color': ['coalesce', ['get', '__layerFillColor'], ['coalesce', ['get', '__layerColor'], '#eef29c']],
        'fill-opacity': 0.55 * (layerOpacity / 100)
      }
    });

    const POLY_FILTER = ['all', ['==', ['geometry-type'], 'Polygon'], ['!=', ['coalesce', ['get', 'extrude'], false], true]];
    const LINE_FILTER = ['all', ['==', ['geometry-type'], 'LineString'], ['!=', ['coalesce', ['get', 'pipe'], false], true]];
    const DASH_DEFS: Record<string, number[]> = { solid: [1, 0], dashed: [2.6, 1.8], dotted: [0.6, 1.6] };

    ['solid', 'dashed', 'dotted'].forEach(dashKey => {
      const dashProp = ['==', ['coalesce', ['get', '__layerDash'], 'solid'], dashKey];
      ensureLayer('poly-outline-' + dashKey, {
        id: 'poly-outline-' + dashKey,
        type: 'line',
        source: 'features',
        filter: ['all', POLY_FILTER, dashProp],
        layout: dashKey === 'dotted' ? { 'line-cap': 'round', 'line-join': 'round' } : {},
        paint: {
          'line-color': ['coalesce', ['get', '__layerColor'], '#e02424'],
          'line-width': ['coalesce', ['get', '__layerWidth'], 2.6],
          'line-dasharray': DASH_DEFS[dashKey]
        }
      });

      ensureLayer('line-layer-' + dashKey, {
        id: 'line-layer-' + dashKey,
        type: 'line',
        source: 'features',
        filter: ['all', LINE_FILTER, dashProp],
        layout: dashKey === 'dotted' ? { 'line-cap': 'round', 'line-join': 'round' } : {},
        paint: {
          'line-color': ['coalesce', ['get', '__layerColor'], '#12d16f'],
          'line-width': ['coalesce', ['get', '__layerWidth'], 3],
          'line-dasharray': DASH_DEFS[dashKey]
        }
      });
    });

    // Register vector symbols
    ensureSymbolIcons(activeMap);

    ensureLayer('point-layer', {
      id: 'point-layer',
      type: 'symbol',
      source: 'features',
      filter: ['==', ['geometry-type'], 'Point'],
      layout: {
        'icon-image': ['concat', 'sym-', ['coalesce', ['get', '__layerSymbol'], 'circle']],
        'icon-size': ['*', 0.42, ['coalesce', ['get', '__layerScale'], 1]],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      },
      paint: {
        'icon-color': ['coalesce', ['get', '__layerColor'], '#3fc2ac'],
        'icon-halo-color': '#08161f',
        'icon-halo-width': 1.2
      }
    });

    // Expand click thresholds for touch-friendly GIS selection
    ensureLayer('line-hitarea', {
      id: 'line-hitarea',
      type: 'line',
      source: 'features',
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#000000', 'line-width': 18, 'line-opacity': 0.001 }
    });

    ensureLayer('point-hitarea', {
      id: 'point-hitarea',
      type: 'circle',
      source: 'features',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 16, 'circle-opacity': 0.001 }
    });

    ensureLayer('selected-outline', {
      id: 'selected-outline',
      type: 'line',
      source: 'features',
      filter: ['==', ['id'], selectedId || '__none__'],
      paint: { 'line-color': '#e3a541', 'line-width': 3 }
    });

    ensureLayer('selected-halo', {
      id: 'selected-halo',
      type: 'circle',
      source: 'features',
      filter: ['all', ['==', ['id'], selectedId || '__none__'], ['==', ['geometry-type'], 'Point']],
      paint: { 'circle-radius': 10, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#e3a541', 'circle-stroke-width': 2.5 }
    });

    ensureLayer('vertex-layer', {
      id: 'vertex-layer',
      type: 'circle',
      source: 'vertices',
      paint: { 'circle-radius': 6, 'circle-color': '#0f1e29', 'circle-stroke-color': '#e3a541', 'circle-stroke-width': 2.5 },
      layout: { visibility: mode === 'select' ? 'visible' : 'none' }
    });

    ensureLayer('draft-label-layer', {
      id: 'draft-label-layer',
      type: 'symbol',
      source: 'draft-label',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': ['case', ['get', 'isArea'], 16, 13],
        'text-rotate': ['get', 'rotation'],
        'text-rotation-alignment': 'map',
        'text-pitch-alignment': 'viewport',
        'text-keep-upright': false,
        'text-anchor': 'center',
        'symbol-placement': 'point',
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'visibility': labelsVisible ? 'visible' : 'none'
      },
      paint: {
        'text-color': '#13202b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.8
      }
    });

    ensureSnapIcons(activeMap);

    ensureLayer('snap-marker-layer', {
      id: 'snap-marker-layer',
      type: 'symbol',
      source: 'snap-marker',
      layout: {
        'icon-image': ['match', ['get', 'snapType'],
          'vertex', 'snap-vertex',
          'midpoint', 'snap-midpoint',
          'edge', 'snap-edge',
          'center', 'snap-center',
          'intersection', 'snap-intersection',
          'perpendicular', 'snap-perpendicular',
          'snap-edge'
        ],
        'icon-size': 1,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    // 3D extrusions for floors and structures
    ensureLayer('poly3d-outline', {
      id: 'poly3d-outline',
      type: 'line',
      source: 'features',
      filter: ['==', ['coalesce', ['get', 'extrude'], false], true],
      paint: { 'line-color': '#0f1e29', 'line-width': 1.5 }
    });

    ensureLayer('poly-extrusion', {
      id: 'poly-extrusion',
      type: 'fill-extrusion',
      source: 'features',
      filter: ['all', ['==', ['coalesce', ['get', 'extrude'], false], true], ['<=', ['coalesce', ['get', 'floors'], 1], 1]],
      paint: {
        'fill-extrusion-color': '#3fc2ac',
        'fill-extrusion-height': ['coalesce', ['get', 'height'], 30],
        'fill-extrusion-base': ['coalesce', ['get', 'base'], 0],
        'fill-extrusion-opacity': 0.82
      }
    });

    ensureLayer('floor-extrusion', {
      id: 'floor-extrusion',
      type: 'fill-extrusion',
      source: 'floors',
      paint: {
        'fill-extrusion-color': ['case', ['==', ['get', 'bandParity'], 0], '#3fc2ac', '#245952'],
        'fill-extrusion-height': ['get', 'top'],
        'fill-extrusion-base': ['get', 'base'],
        'fill-extrusion-opacity': 0.88
      }
    });

    // Extruded Pipes
    ensureLayer('pipe-outline', {
      id: 'pipe-outline',
      type: 'line',
      source: 'pipes',
      paint: { 'line-color': '#0f1e29', 'line-width': 1 }
    });

    ensureLayer('pipe-extrusion', {
      id: 'pipe-extrusion',
      type: 'fill-extrusion',
      source: 'pipes',
      paint: {
        'fill-extrusion-color': '#8fa7b3',
        'fill-extrusion-height': ['coalesce', ['get', 'diameter'], 5],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.9
      }
    });

    // Drawing Draft layer
    ensureLayer('draft-fill', {
      id: 'draft-fill',
      type: 'fill',
      source: 'draft',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#e3a541', 'fill-opacity': 0.12 }
    });

    ensureLayer('draft-line', {
      id: 'draft-line',
      type: 'line',
      source: 'draft',
      paint: { 'line-color': '#e3a541', 'line-width': 2, 'line-dasharray': [2, 1.6] }
    });

    ensureLayer('draft-vertices', {
      id: 'draft-vertices',
      type: 'circle',
      source: 'draft-vertices',
      paint: { 'circle-radius': 4, 'circle-color': '#e3a541', 'circle-stroke-color': '#08161f', 'circle-stroke-width': 1 }
    });
  };

  // Safe offline window.caches override matching sandbox setup
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        Object.defineProperty(window, 'caches', {
          get: () => undefined,
          configurable: true
        });
      }
    } catch (e) {
      try {
        if (window.caches && window.caches.open) {
          window.caches.open = () => Promise.reject(new Error('cache disabled'));
        }
      } catch (e2) {
        // ignore
      }
    }
  }, []);

  // Initialize MapLibre Engine
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initializedMap = new maplibregl.Map({
      container: mapContainerRef.current,
      style: STYLES[0].url,
      center: [35.0, 39.0],
      zoom: 5.4,
      attributionControl: { compact: false }
    });

    initializedMap.doubleClickZoom.disable();

    initializedMap.on('load', () => {
      setMap(initializedMap);
      mapRef.current = initializedMap;
      setupLayers(initializedMap);
    });

    initializedMap.on('zoom', () => {
      setZoomLevel(initializedMap.getZoom().toFixed(2));
    });

    initializedMap.on('error', (e) => {
      console.error('MapLibre gl error caught safely:', e);
    });

    return () => {
      initializedMap.remove();
    };
  }, []);

  // Reapply styles and sources if drawing features array changes
  useEffect(() => {
    if (!map) return;
    const src = map.getSource('features') as any;
    if (src) {
      const activeMapLayers = layers.filter(l => l.mapId === activeMapId);
      const visibleLayerIds = activeMapLayers.filter(l => l.visible !== false).map(l => l.id);
      
      const filtered = features.filter(f => visibleLayerIds.includes(f.properties?.layerId)).map(f => {
        const lyr = layers.find(l => l.id === f.properties?.layerId);
        if (lyr) {
          return {
            ...f,
            properties: {
              ...f.properties,
              __layerColor: lyr.color,
              __layerFillColor: lyr.fillColor,
              __layerWidth: lyr.lineWidth,
              __layerDash: lyr.dash,
              __layerSymbol: lyr.symbol,
              __layerScale: lyr.scale
            }
          };
        }
        return f;
      });

      src.setData({ type: 'FeatureCollection', features: filtered });
      
      // Update Selection Filters
      const activeOutline = map.getLayer('selected-outline');
      if (activeOutline) {
        map.setFilter('selected-outline', ['==', ['id'], selectedId || '__none__']);
      }
      const activeHalo = map.getLayer('selected-halo');
      if (activeHalo) {
        map.setFilter('selected-halo', ['all', ['==', ['id'], selectedId || '__none__'], ['==', ['geometry-type'], 'Point']]);
      }

      // Update interactive features (Pipes, Floors)
      updateInteractiveLayers(filtered);
    }
  }, [features, selectedId, layers, activeMapId, map]);

  const updateInteractiveLayers = (filteredFeatures: any[]) => {
    if (!map) return;
    
    // Update Pipe Extrusions source
    const pipeSrc = map.getSource('pipes') as any;
    if (pipeSrc) {
      const pipeFeats: any[] = [];
      filteredFeatures.forEach(f => {
        if (f.geometry.type !== 'LineString' || !f.properties?.pipe) return;
        const diameter = f.properties.diameter || 5.0;
        try {
          const buffered = turf.buffer(f as any, diameter / 2, { units: 'meters' }) as any;
          if (!buffered || !buffered.geometry) return;
          let geom = buffered.geometry;
          if (geom.type === 'MultiPolygon') {
            geom = { type: 'Polygon', coordinates: geom.coordinates[0] };
          }
          pipeFeats.push({
            type: 'Feature',
            id: f.id + '_pipe',
            geometry: geom,
            properties: { parentId: f.id, diameter }
          });
        } catch (e) {
          // invalid geom
        }
      });
      pipeSrc.setData({ type: 'FeatureCollection', features: pipeFeats });
    }

    // Update Floor Extrusions source
    const floorSrc = map.getSource('floors') as any;
    if (floorSrc) {
      const floorFeats: any[] = [];
      filteredFeatures.forEach(f => {
        if (f.geometry.type !== 'Polygon' || !f.properties?.extrude) return;
        const floors = Math.max(1, parseInt(f.properties.floors, 10) || 1);
        if (floors <= 1) return;
        const floorH = f.properties.floorHeight || 3.0;
        for (let i = 0; i < floors; i++) {
          floorFeats.push({
            type: 'Feature',
            id: f.id + '_floor' + i,
            geometry: f.geometry,
            properties: {
              parentId: f.id,
              floorIndex: i,
              base: i * floorH,
              top: (i + 1) * floorH,
              bandParity: i % 2
            }
          });
        }
      });
      floorSrc.setData({ type: 'FeatureCollection', features: floorFeats });
    }
  };

  // Track draft preview geometries reactively
  useEffect(() => {
    if (!map) return;
    const draftSrc = map.getSource('draft') as any;
    const vertSrc = map.getSource('draft-vertices') as any;
    const labelSrc = map.getSource('draft-label') as any;

    const fc = (arr: any[]) => ({ type: 'FeatureCollection', features: arr });

    if (draftCoords && draftCoords.length) {
      let draftGeom: any = null;
      if (mode === 'rectangle') {
        const a = draftCoords[0];
        const b = draftCoords[draftCoords.length - 1];
        const ring = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]];
        draftGeom = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} };
      } else if (mode === 'circle') {
        const c = draftCoords[0];
        const edge = draftCoords[draftCoords.length - 1];
        const r = turf.distance(turf.point(c), turf.point(edge), { units: 'kilometers' });
        if (r > 0) {
          draftGeom = turf.circle(c, r, { steps: 64, units: 'kilometers' });
        }
      } else {
        if (draftCoords.length >= 2) {
          if ((mode === 'polygon' || mode === 'polygon3d' || mode === 'measure-area') && draftCoords.length >= 3) {
            draftGeom = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [draftCoords.concat([draftCoords[0]])] }, properties: {} };
          } else {
            draftGeom = { type: 'Feature', geometry: { type: 'LineString', coordinates: draftCoords }, properties: {} };
          }
        }
      }

      if (draftSrc) draftSrc.setData(fc(draftGeom ? [draftGeom] : []));
      if (vertSrc) {
        const vf = draftCoords.map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} }));
        vertSrc.setData(fc(vf));
      }

      // Live measurements display
      if (labelSrc && (mode === 'measure-distance' || mode === 'measure-area')) {
        const labelFeats: any[] = [];
        if (draftGeom) {
          // Generate labels per segment
          const addLabels = (list: [number, number][]) => {
            for (let i = 0; i < list.length - 1; i++) {
              const a = list[i], b = list[i+1];
              try {
                const dist = turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' }) * 1000;
                if (dist > 0.05) {
                  const bearing = turf.bearing(turf.point(a), turf.point(b));
                  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                  labelFeats.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: mid },
                    properties: {
                      label: dist < 1000 ? `${dist.toFixed(1)}m` : `${(dist/1000).toFixed(2)}km`,
                      isArea: false,
                      rotation: labelRotationForBearing(bearing)
                    }
                  });
                }
              } catch (e) {
                // ignore
              }
            }
          };
          if (mode === 'measure-distance') {
            addLabels(draftCoords);
          } else if (mode === 'measure-area' && draftCoords.length >= 3) {
            addLabels(draftCoords.concat([draftCoords[0]]));
            try {
              const area = turf.area(draftGeom);
              const label = area < 10000 ? `${area.toFixed(1)} m²` : `${(area / 10000).toFixed(2)} ha`;
              const centroid = turf.centroid(draftGeom);
              labelFeats.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: centroid.geometry.coordinates },
                properties: { label, isArea: true, rotation: 0 }
              });
            } catch (e) {
              // skip area calculation
            }
          }
        }
        labelSrc.setData(fc(labelFeats));
      }
    } else {
      if (draftSrc) draftSrc.setData(fc([]));
      if (vertSrc) vertSrc.setData(fc([]));
      if (labelSrc) labelSrc.setData(fc([]));
    }
  }, [draftCoords, mode, map]);

  // Align vertex coordinates to source dynamically in select mode
  useEffect(() => {
    if (!map) return;
    const vertexSrc = map.getSource('vertices') as any;
    if (vertexSrc) {
      const activeFeat = selectedId ? features.find(f => f.id === selectedId) : null;
      if (activeFeat && mode === 'select') {
        const out: any[] = [];
        if (activeFeat.geometry.type === 'Point') {
          out.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: activeFeat.geometry.coordinates },
            properties: { featureId: activeFeat.id, ringIndex: -1, vertIndex: 0 }
          });
        } else if (activeFeat.geometry.type === 'LineString') {
          activeFeat.geometry.coordinates.forEach((c: any, i: number) => {
            out.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: c },
              properties: { featureId: activeFeat.id, ringIndex: -1, vertIndex: i }
            });
          });
        } else if (activeFeat.geometry.type === 'Polygon') {
          const ring = activeFeat.geometry.coordinates[0];
          for (let i = 0; i < ring.length - 1; i++) {
            out.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: ring[i] },
              properties: { featureId: activeFeat.id, ringIndex: 0, vertIndex: i }
            });
          }
        }
        vertexSrc.setData({ type: 'FeatureCollection', features: out });
      } else {
        vertexSrc.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [selectedId, features, mode, map]);


  // Shadow analysis execution
  const runShadowAnalysis = () => {
    if (!map) return;
    const parts = shadowDate.split('-');
    if (parts.length < 3) return;
    const hh = Math.floor(shadowHour);
    const mm = Math.round((shadowHour - hh) * 60);
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), hh, mm);
    const center = map.getCenter();
    const sun = getSunPosition(d, center.lat, center.lng);
    const src = map.getSource('shadow-source') as any;

    if (sun.altitudeDeg <= 0.5) {
      setShadowInfoText('Güneş ufkun altında/çok alçak — gölge hesaplanamaz.');
      if (src) src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const shadows: any[] = [];
    features.forEach(f => {
      if (f.geometry.type === 'Polygon' && f.properties?.extrude) {
        const sh = computeShadowForFeature(f, sun);
        if (sh) shadows.push(sh);
      }
    });

    if (src) src.setData({ type: 'FeatureCollection', features: shadows });
    setShadowInfoText(`Güneş Yüksekliği: ${sun.altitudeDeg.toFixed(1)}° · Yön: ${sun.shadowBearingDeg.toFixed(0)}°`);
  };

  const clearShadowAnalysis = () => {
    if (!map) return;
    const src = map.getSource('shadow-source') as any;
    if (src) src.setData({ type: 'FeatureCollection', features: [] });
    setShadowInfoText('');
  };

  // Zamana Bağlı Comparison flicker integration
  const toggleFlickering = () => {
    if (isFlickering) {
      clearInterval(flickerTimerRef.current);
      flickerTimerRef.current = null;
      setIsFlickering(false);
      setRasterCompareVal(50);
      syncRasterCompareOpacities(50);
    } else {
      if (!rasterA || !rasterB) {
        showToast('Karşılaştırma için lütfen Görüntü A ve Görüntü B seçin.');
        return;
      }
      setIsFlickering(true);
      let state = 0;
      flickerTimerRef.current = setInterval(() => {
        state = state === 0 ? 100 : 0;
        syncRasterCompareOpacities(state);
      }, 700);
    }
  };

  const syncRasterCompareOpacities = (val: number) => {
    if (!map) return;
    const factor = val / 100;
    if (rasterA && map.getLayer(rasterA)) map.setPaintProperty(rasterA, 'raster-opacity', 1 - factor);
    if (rasterB && map.getLayer(rasterB)) map.setPaintProperty(rasterB, 'raster-opacity', factor);
  };

  useEffect(() => {
    syncRasterCompareOpacities(rasterCompareVal);
  }, [rasterCompareVal, rasterA, rasterB]);

  // Clean comparative timers on dismount
  useEffect(() => {
    return () => {
      if (flickerTimerRef.current) clearInterval(flickerTimerRef.current);
    };
  }, []);

  // Form placement submit
  const handleFeatureFormSubmit = () => {
    const props: Record<string, any> = {};
    if (featureFormName.trim()) props.name = featureFormName.trim();
    if (featureFormDesc.trim()) props.description = featureFormDesc.trim();
    featureFormCustomFields.forEach(cf => {
      if (cf.k.trim()) props[cf.k.trim()] = cf.v.trim();
    });

    setPendingAttributes(props);
    setFeatureFormOpen(false);
    
    const lyr = layers.find(l => l.id === activeLayerId);
    if (lyr && lyr.geomType) {
      const targetMode = lyr.geomType === 'Point' ? 'point' : lyr.geomType === 'LineString' ? 'linestring' : 'polygon';
      setMode(targetMode);
      showToast(`Yeni "${lyr.name}" şekli için harita üzerinde çizime başlayın.`);
    }
  };

  // File Upload and GIS Parser integration
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsLoading(true);
    setLoadingText('Dosyalar ayrıştırılıyor…');

    const imageFile = files.find(f => /\.(jpe?g|png)$/i.test(f.name));
    const worldFile = files.find(f => /\.(jgw|pgw|jpw|wld)$/i.test(f.name));

    if (imageFile && worldFile) {
      // Raster Drone overlay upload
      worldFile.text().then(wtext => {
        const nums = wtext.trim().split(/\r?\n/).map(parseFloat);
        if (nums.length < 6 || nums.some(isNaN)) throw new Error('dünya dosyası okunamadı');
        const A = nums[0], E = nums[3], C = nums[4], F = nums[5];
        const imgURL = URL.createObjectURL(imageFile);

        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const left = C - A / 2;
          const top = F - E / 2;
          const right = left + w * A;
          const bottom = top + h * E;
          const coords: any = [[left, top], [right, top], [right, bottom], [left, bottom]];
          
          if (map) {
            const id = `raster_${Date.now()}`;
            map.addSource(id, { type: 'image', url: imgURL, coordinates: coords });
            map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': 0.9 } });
            addRaster(imageFile.name, imgURL, coords);
            showToast('Drone görüntüsü WGS84 koordinatlarında haritaya yerleştirildi.');
            map.fitBounds([[Math.min(left, right), Math.min(top, bottom)], [Math.max(left, right), Math.max(top, bottom)]], { padding: 60 });
          }
          setIsLoading(false);
        };
        img.onerror = () => {
          setIsLoading(false);
          showToast('Drone görüntüsü yüklenemedi.');
        };
        img.src = imgURL;
      }).catch(err => {
        setIsLoading(false);
        showToast('Drone georeferans hatası: ' + err.message);
      });
      return;
    }

    // 3D model parsing (IFC, GLTF, GLB)
    const gltfFile = files.find(f => /\.(gltf|glb)$/i.test(f.name));
    if (gltfFile) {
      parseGLTFOrGLB(gltfFile, files).then(res => {
        if (map) {
          const center = map.getCenter();
          const ring = placeLocalRingOnMap(res.footprint, 1.0, center);
          ring.push(ring[0]);
          const f = addFeature('Polygon', [ring], {
            extrude: true,
            floors: 1,
            floorHeight: res.height,
            height: res.height,
            base: 0
          });
          showToast('3B BIM (gLTF) modeli taban izdüşümü ve dikey yüksekliğiyle yüklendi.');
          if (f && f.geometry) {
            const bbox = turf.bbox(f as any);
            map.fitBounds(bbox as any, { padding: 80 });
            map.easeTo({ pitch: 55, bearing: -20 });
          }
        }
        setIsLoading(false);
      }).catch(err => {
        setIsLoading(false);
        showToast('BIM yükleme hatası: ' + err.message);
      });
      return;
    }

    const ifcFile = files.find(f => /\.ifc$/i.test(f.name));
    if (ifcFile) {
      parseIFCFile(ifcFile).then(res => {
        if (map) {
          const center = map.getCenter();
          const ring = placeLocalRingOnMap(res.footprint, 1.0, center);
          ring.push(ring[0]);
          const f = addFeature('Polygon', [ring], {
            extrude: true,
            floors: 1,
            floorHeight: res.height,
            height: res.height,
            base: 0
          });
          showToast('3B BIM (IFC) modeli taban izdüşümü ve dikey yüksekliğiyle yüklendi.');
          if (f && f.geometry) {
            const bbox = turf.bbox(f as any);
            map.fitBounds(bbox as any, { padding: 80 });
            map.easeTo({ pitch: 55, bearing: -20 });
          }
        }
        setIsLoading(false);
      }).catch(err => {
        setIsLoading(false);
        showToast('IFC yükleme hatası: ' + err.message);
      });
      return;
    }

    // Vector CAD/GIS parse (GeoJSON, KML, Shapefile, DXF, GML)
    Promise.all(files.map(async file => {
      const name = file.name.toLowerCase();
      let imported: any[] = [];

      if (/\.(json|geojson)$/.test(name)) {
        const parsed = JSON.parse(await file.text());
        imported = parsed.type === 'FeatureCollection' ? (parsed.features || []) : [parsed];
      } else if (/\.kml$/.test(name)) {
        imported = parseKML(await file.text());
      } else if (/\.kmz$/.test(name)) {
        imported = await parseKMZ(await file.arrayBuffer());
      } else if (/\.zip$/.test(name)) {
        imported = await parseShapefileZip(await file.arrayBuffer());
      } else if (/\.shp$/.test(name)) {
        imported = parseSHP(await file.arrayBuffer());
      } else if (/\.gml$/.test(name)) {
        imported = parseGML(await file.text());
      } else if (/\.dxf$/.test(name)) {
        if (map) {
          const center = map.getCenter();
          imported = placeDXFOnMap(parseDXF(await file.text()), 1.0, center);
        }
      }

      if (imported.length) {
        // Create custom layer for files imported
        const newLayer = addLayer(file.name.replace(/\.[a-zA-Z]+$/, ''), imported[0]?.geometry?.type || 'Polygon', null);
        const processed = imported.map(f => ({
          id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'Feature',
          geometry: f.geometry,
          properties: { ...f.properties, layerId: newLayer.id }
        }));

        setFeatures(prev => [...prev, ...processed]);
        showToast(`"${file.name}" dosyasından ${processed.length} şekil içe aktarıldı.`);
        
        if (map) {
          const bbox = turf.bbox({ type: 'FeatureCollection', features: processed } as any);
          map.fitBounds(bbox as any, { padding: 80 });
        }
      }
    })).finally(() => setIsLoading(false));
  };

  const handleZoomToLayer = (layerId: string) => {
    if (!map) return;
    const feats = features.filter(f => f.properties?.layerId === layerId);
    if (!feats.length) {
      showToast('Bu katmanda odaklanılacak çizim bulunmamaktadır.');
      return;
    }
    try {
      const bbox = turf.bbox({ type: 'FeatureCollection', features: feats } as any);
      map.fitBounds(bbox as any, { padding: 80, duration: 600, maxZoom: 18 });
    } catch (e) {
      showToast('Katmana odaklanılamadı.');
    }
  };

  const handleExportLayer = (layerId: string, format: string) => {
    const lyr = layers.find(l => l.id === layerId);
    if (!lyr) return;
    const feats = features.filter(f => f.properties?.layerId === layerId);
    if (!feats.length) {
      showToast('Bu katmanda dışa aktarılacak çizim bulunmamaktadır.');
      return;
    }
    const baseName = lyr.name.replace(/[\\\/:*?"<>|]+/g, '_').trim() || 'katman';

    const downloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    if (format === 'geojson') {
      const str = JSON.stringify({ type: 'FeatureCollection', features: feats }, null, 2);
      downloadBlob(new Blob([str], { type: 'application/geo+json' }), `${baseName}.geojson`);
      showToast(`${baseName}.geojson dosyası indirildi.`);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0a1620] font-sans text-[#e7eef2] overflow-hidden flex flex-col z-[10]">
      {/* Dynamic Floating Dynamic inputs near mouse cursor */}
      <CursorDynamicInput
        show={cursorShow}
        inputMode={cursorInputMode}
        onToggleMode={() => setCursorInputMode(prev => prev === 'polar' ? 'xy' : 'polar')}
        hasReference={!!(draftCoords && draftCoords.length)}
        coordX={cursorX}
        coordY={cursorY}
        onCoordXChange={setCursorX}
        onCoordYChange={setCursorY}
        onCommit={handleCursorInputCommit}
        onCancel={() => { setDraftCoords(null); setCursorShow(false); }}
        point={cursorMousePoint}
      />

      {/* Primary Map Stage */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Navbar modules */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 rounded-xl bg-[#0f1e29]/95 border border-[#24404f] hover:border-amber-500 hover:text-amber-500 transition shadow-2xl flex items-center justify-center cursor-pointer text-[#7f9aa8]"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {sidebarOpen && (
          <div className="flex bg-[#0f1e29]/95 border border-[#24404f] rounded-xl p-1 shadow-2xl gap-0.5 items-center">
            <button 
              onClick={() => setActiveModule('harita')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModule === 'harita' ? 'bg-[#152c3a] text-amber-500 border border-[#24404f]' : 'text-[#7f9aa8] hover:text-white'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Harita
            </button>
            <button 
              onClick={() => setActiveModule('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModule === 'editor' ? 'bg-[#152c3a] text-amber-500 border border-[#24404f]' : 'text-[#7f9aa8] hover:text-white'
              }`}
            >
              <PenTool className="w-4 h-4" />
              Editör
            </button>
            <button 
              onClick={() => setActiveModule('analiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModule === 'analiz' ? 'bg-[#152c3a] text-amber-500 border border-[#24404f]' : 'text-[#7f9aa8] hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Analiz
            </button>
            <button 
              onClick={() => setActiveModule('cikti')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeModule === 'cikti' ? 'bg-[#152c3a] text-amber-500 border border-[#24404f]' : 'text-[#7f9aa8] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Çıktı
            </button>
          </div>
        )}
      </div>

      {/* Main Sol Panel Sidebar drawer */}
      {sidebarOpen && (
        <div className="absolute top-16 left-4 bottom-10 w-[330px] z-10 bg-[#0f1e29]/95 border border-[#24404f] rounded-2xl shadow-2xl p-4 flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          
          {activeModule === 'harita' && (
            <LayerTreePanel
              folders={folders}
              layers={layers}
              rasterOverlays={rasterOverlays}
              activeLayerId={activeLayerId}
              onSelectLayer={setActiveLayerId}
              onToggleLayerVisibility={toggleLayerVisibility}
              onToggleFolderVisibility={toggleFolderVisibility}
              onToggleFolderExpanded={toggleFolderExpanded}
              onAddFolder={addFolder}
              onDeleteFolder={deleteFolder}
              onDeleteLayer={deleteLayer}
              onAddLayer={addLayer}
              onUpdateLayerStyle={updateLayerStyle}
              onZoomToLayer={handleZoomToLayer}
              onExportLayer={handleExportLayer}
              onAddRasterClick={() => {}}
              layerOpacity={layerOpacity}
              onLayerOpacityChange={(val) => {
                setLayerOpacity(val);
                if (map) {
                  const factor = val / 100;
                  if (map.getLayer('poly-fill')) map.setPaintProperty('poly-fill', 'fill-opacity', 0.55 * factor);
                  if (map.getLayer('poly-extrusion')) map.setPaintProperty('poly-extrusion', 'fill-extrusion-opacity', 0.82 * factor);
                  if (map.getLayer('floor-extrusion')) map.setPaintProperty('floor-extrusion', 'fill-extrusion-opacity', 0.88 * factor);
                  if (map.getLayer('pipe-extrusion')) map.setPaintProperty('pipe-extrusion', 'fill-extrusion-opacity', 0.9 * factor);
                }
              }}
            />
          )}

          {activeModule === 'editor' && (
            <EditorPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSelectActiveLayer={setActiveLayerId}
              mode={mode}
              onSetMode={setMode}
              selectedId={selectedId}
              features={features}
              onPlaceFeatureClick={() => {
                const lyr = layers.find(l => l.id === activeLayerId);
                if (!lyr?.geomType) {
                  showToast('Lütfen önce geometri türü tanımlı bir katman seçin.');
                  return;
                }
                setFeatureFormName('Yeni Çizim');
                setFeatureFormDescription('');
                setFeatureFormCustomFields([]);
                setFeatureFormOpen(true);
              }}
              onClearAllFeatures={clearAllFeatures}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onScaleFeature={scaleSelectedFeature}
              onRotateFeature={rotateSelectedFeature}
              onBufferFeature={bufferSelectedFeature}
              onSimplifyFeature={simplifySelectedFeature}
              onDuplicateFeature={duplicateSelectedFeature}
              onDeleteFeature={deleteFeature}
              onToggle3D={toggleSelectedFeature3D}
              onUpdate3DProps={updateSelectedFeature3DProps}
              onTogglePipe={toggleSelectedFeaturePipe}
              onUpdatePipeProps={updateSelectedFeaturePipeProps}
              floorCount={floorCount}
              onFloorCountChange={setFloorCount}
              floorHeight={floorHeight}
              onFloorHeightChange={setFloorHeight}
            />
          )}

          {activeModule === 'analiz' && (
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-1.5 border-b border-[#24404f] pb-2">
                <Compass className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Bina Gölge Analizi
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#7f9aa8] uppercase">Tarih</label>
                  <input 
                    type="date"
                    value={shadowDate}
                    onChange={(e) => setShadowDate(e.target.value)}
                    className="w-full bg-[#152c3a] border border-[#24404f] text-sm text-[#e7eef2] px-3 py-1.5 focus:border-amber-500 focus:outline-none rounded"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-[#7f9aa8]">
                    <span>SAAT</span>
                    <span className="font-mono text-white">
                      {String(Math.floor(shadowHour)).padStart(2, '0')}:{String(Math.round((shadowHour - Math.floor(shadowHour)) * 60)).padStart(2, '0')}
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="23.75"
                    step="0.25"
                    value={shadowHour}
                    onChange={(e) => {
                      setShadowHour(parseFloat(e.target.value));
                      runShadowAnalysis();
                    }}
                    className="w-full accent-amber-500 h-1.5 bg-[#152c3a] rounded"
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={runShadowAnalysis}
                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded transition cursor-pointer text-center"
                  >
                    Gölgeleri Hesapla
                  </button>
                  <button 
                    onClick={clearShadowAnalysis}
                    className="flex-1 py-1.5 border border-[#24404f] text-[#7f9aa8] font-bold text-xs hover:border-white rounded transition cursor-pointer text-center"
                  >
                    Temizle
                  </button>
                </div>
                {shadowInfoText && (
                  <div className="text-[10px] font-mono text-[#3fc2ac] bg-[#152c3a]/50 p-2 border border-[#24404f] rounded leading-relaxed text-center">
                    {shadowInfoText}
                  </div>
                )}
              </div>

              {/* Görüntü Karşılaştırma slider */}
              <div className="pt-4 border-t border-[#24404f]/40 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-[#24404f] pb-2">
                  <Layers2 className="w-4 h-4 text-[#3fc2ac]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Görüntü Karşılaştırma (Drone)
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#7f9aa8] uppercase">Görüntü A (Eski)</label>
                    <select
                      value={rasterA}
                      onChange={e => setRasterA(e.target.value)}
                      className="w-full bg-[#152c3a] border border-[#24404f] text-xs text-[#e7eef2] px-2 py-1.5 focus:border-[#3fc2ac] focus:outline-none rounded"
                    >
                      <option value="">— seçin —</option>
                      {rasterOverlays.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#7f9aa8] uppercase">Görüntü B (Yeni)</label>
                    <select
                      value={rasterB}
                      onChange={e => setRasterB(e.target.value)}
                      className="w-full bg-[#152c3a] border border-[#24404f] text-xs text-[#e7eef2] px-2 py-1.5 focus:border-[#3fc2ac] focus:outline-none rounded"
                    >
                      <option value="">— seçin —</option>
                      {rasterOverlays.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 pt-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-[#7f9aa8]">
                      <span>Karşılaştırma Sürgüsü</span>
                      <span className="font-mono text-white">%{rasterCompareVal}</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={rasterCompareVal}
                      onChange={e => setRasterCompareVal(parseInt(e.target.value))}
                      className="w-full h-1.5 accent-amber-500 rounded bg-[#152c3a]"
                    />
                  </div>

                  <button
                    onClick={toggleFlickering}
                    className={`w-full py-1.5 text-xs font-bold border rounded transition cursor-pointer text-center ${
                      isFlickering 
                        ? 'border-red-500 bg-red-500/10 text-red-500' 
                        : 'border-[#24404f] bg-[#152c3a] text-white hover:border-[#3fc2ac]'
                    }`}
                  >
                    {isFlickering ? 'Durdur' : 'Yanıp Sön (Flicker)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'cikti' && (
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-1.5 border-b border-[#24404f] pb-2">
                <UploadCloud className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Dosya İçe Aktar (Import)
                </span>
              </div>

              <div className="space-y-2">
                <input 
                  type="file"
                  id="gis-import-file-input"
                  multiple
                  accept=".json,.geojson,.kml,.kmz,.zip,.shp,.gml,.dxf,.gltf,.glb,.bin,.ifc,.jpg,.jpeg,.png,.jgw,.pgw,.jpw,.wld"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => document.getElementById('gis-import-file-input')?.click()}
                  className="w-full py-2.5 bg-[#152c3a] border border-dashed border-[#24404f] hover:border-amber-500 text-xs font-bold text-[#7f9aa8] hover:text-white rounded-xl transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-5 h-5 text-amber-500" />
                  <span>Seç veya Sürükle</span>
                  <span className="text-[9px] text-[#7f9aa8]/60 text-center font-normal px-2">
                    DXF, SHP (.zip), KML/KMZ, GeoJSON, IFC, gLTF, Drone Görüntüleri
                  </span>
                </button>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#24404f]/40">
                <div className="flex items-center gap-1.5 border-b border-[#24404f] pb-2">
                  <Download className="w-4 h-4 text-[#3fc2ac]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Tümünü Dışa Aktar (Export)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (!features.length) { showToast('Dışa aktarılacak çizim bulunmamaktadır.'); return; }
                      const str = JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
                      const blob = new Blob([str], { type: 'application/geo+json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'cizimler.geojson';
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    }}
                    className="py-1.5 bg-[#152c3a] border border-[#24404f] hover:border-[#3fc2ac] text-xs font-bold text-white transition rounded cursor-pointer text-center"
                  >
                    GeoJSON
                  </button>
                  <button
                    onClick={() => {
                      if (!features.length) { showToast('Dışa aktarılacak çizim bulunmamaktadır.'); return; }
                      const kmlStr = featuresToKML(features);
                      const blob = new Blob([kmlStr], { type: 'application/vnd.google-earth.kml+xml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'cizimler.kml';
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    }}
                    className="py-1.5 bg-[#152c3a] border border-[#24404f] hover:border-[#3fc2ac] text-xs font-bold text-white transition rounded cursor-pointer text-center"
                  >
                    KML
                  </button>
                  <button
                    onClick={() => {
                      if (!features.length) { showToast('Dışa aktarılacak çizim bulunmamaktadır.'); return; }
                      const dxfStr = featuresToDXF(features);
                      const blob = new Blob([dxfStr], { type: 'application/dxf' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'cizimler.dxf';
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    }}
                    className="py-1.5 bg-[#152c3a] border border-[#24404f] hover:border-[#3fc2ac] text-xs font-bold text-white transition rounded cursor-pointer text-center col-span-2"
                  >
                    DXF (CAD) Aktar
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Floating control buttons on right */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <button 
          onClick={() => {
            if (!map) return;
            const full = document.fullscreenElement;
            if (!full) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
          }}
          className="w-9 h-9 rounded-xl bg-[#0f1e29]/95 border border-[#24404f] hover:border-amber-500 hover:text-amber-500 transition shadow-2xl flex items-center justify-center cursor-pointer text-[#7f9aa8]"
          title="Tam Ekran"
        >
          <Maximize className="w-4 h-4" />
        </button>

        <button 
          onClick={() => {
            if (!navigator.geolocation) { showToast('Konum servisi desteklenmiyor.'); return; }
            showToast('Konumunuz tespit ediliyor…');
            navigator.geolocation.getCurrentPosition((pos) => {
              map?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16, duration: 1000 });
            }, () => showToast('Konum izni reddedildi.'), { enableHighAccuracy: true });
          }}
          className="w-9 h-9 rounded-xl bg-[#0f1e29]/95 border border-[#24404f] hover:border-amber-500 hover:text-amber-500 transition shadow-2xl flex items-center justify-center cursor-pointer text-[#7f9aa8]"
          title="Konumumu Bul"
        >
          <Navigation className="w-4 h-4" />
        </button>

        <button 
          onClick={() => {
            if (!map) return;
            const currentPitch = map.getPitch();
            if (currentPitch > 10) {
              map.easeTo({ pitch: 0, bearing: 0, duration: 500 });
            } else {
              map.easeTo({ pitch: 55, bearing: -20, duration: 500 });
            }
          }}
          className="w-9 h-9 rounded-xl bg-[#0f1e29]/95 border border-[#24404f] hover:border-amber-500 hover:text-amber-500 transition shadow-2xl flex items-center justify-center cursor-pointer text-[#7f9aa8]"
          title="3B Eğik Görünüm"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button 
          onClick={() => setBasemapPopoverOpen(!basemapPopoverOpen)}
          className="w-9 h-9 rounded-xl bg-[#0f1e29]/95 border border-[#24404f] hover:border-amber-500 hover:text-amber-500 transition shadow-2xl flex items-center justify-center cursor-pointer text-[#7f9aa8]"
          title="Altlık Harita Değiştir"
        >
          <MapIcon className="w-4 h-4" />
        </button>

        {basemapPopoverOpen && (
          <div className="absolute right-12 top-28 bg-[#0f1e29] border border-[#24404f] rounded-xl p-2 w-32 shadow-2xl flex flex-col gap-1 z-50">
            <span className="text-[9px] font-extrabold uppercase text-[#7f9aa8] px-1 pb-1 border-b border-[#24404f]/40 mb-1 block">Altlık Stili</span>
            {STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => {
                  if (map) {
                    map.setStyle(style.url);
                    map.once('style.load', () => setupLayers(map));
                    setBasemapPopoverOpen(false);
                    showToast(`Harita altlığı "${style.label}" olarak güncellendi.`);
                  }
                }}
                className="w-full text-left text-xs font-bold p-1.5 rounded hover:bg-[#152c3a] text-[#7f9aa8] hover:text-white transition cursor-pointer"
              >
                {style.label}
              </button>
            ))}
          </div>
        )}

        <button 
          onClick={() => setMeasurePopoverOpen(!measurePopoverOpen)}
          className="w-9 h-9 rounded-xl bg-[#0f1e29]/95 border border-[#24404f] hover:border-amber-500 hover:text-amber-500 transition shadow-2xl flex items-center justify-center cursor-pointer text-[#7f9aa8]"
          title="Ölçüm Araçları"
        >
          <PenTool className="w-4 h-4" />
        </button>

        {measurePopoverOpen && (
          <div className="absolute right-12 top-36 bg-[#0f1e29] border border-[#24404f] rounded-xl p-2.5 w-44 shadow-2xl flex flex-col gap-2 z-50 text-left">
            <span className="text-[9px] font-extrabold uppercase text-[#7f9aa8] pb-1 border-b border-[#24404f]/40 block">Ölçüm Araçları</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => { setMode('measure-distance'); setMeasurePopoverOpen(false); }}
                className="py-1.5 bg-[#152c3a] hover:bg-[#1a3444] text-[10px] font-bold text-white border border-[#24404f] rounded transition cursor-pointer text-center"
              >
                Mesafe
              </button>
              <button
                onClick={() => { setMode('measure-area'); setMeasurePopoverOpen(false); }}
                className="py-1.5 bg-[#152c3a] hover:bg-[#1a3444] text-[10px] font-bold text-white border border-[#24404f] rounded transition cursor-pointer text-center"
              >
                Alan
              </button>
            </div>
            <button
              onClick={() => { setPersistedMeasurements([]); setMeasurePopoverOpen(false); if (map) { (map.getSource('persist-measure') as any)?.setData({ type: 'FeatureCollection', features: [] }); (map.getSource('persist-measure-fill') as any)?.setData({ type: 'FeatureCollection', features: [] }); (map.getSource('persist-measure-label') as any)?.setData({ type: 'FeatureCollection', features: [] }); } }}
              className="py-1 bg-red-500 hover:bg-red-600 text-black font-bold text-[10px] rounded transition cursor-pointer text-center"
            >
              Ölçümleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Floating details / guide box */}
      <div className="absolute right-4 bottom-12 z-10 flex gap-2 items-center">
        <button 
          onClick={() => setInfoOpen(!infoOpen)}
          className="w-8 h-8 rounded-full bg-[#0f1e29]/95 border border-[#24404f] hover:border-amber-500 hover:text-amber-500 transition shadow-2xl flex items-center justify-center cursor-pointer text-[#7f9aa8]"
        >
          <Info className="w-4 h-4" />
        </button>

        {infoOpen && (
          <div className="bg-[#0f1e29] border border-[#24404f] rounded-xl p-3 w-56 text-xs text-left shadow-2xl space-y-1">
            <h4 className="font-bold text-white uppercase text-[10px]">Kroki — Harita & Çizim Editörü</h4>
            <p className="text-[#7f9aa8] leading-relaxed text-[10px]">
              Tüm harita çizimleri, 3B bina ekstrüzyonları, drone drone dronedrone dronedrone görüntü entegrasyonları tarayıcınızda güvenle işlenir ve saklanır.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-7 z-10 bg-[#0a1620]/95 border-t border-[#24404f] px-3 flex items-center justify-between text-[10px] font-mono text-[#7f9aa8]">
        <div className="flex gap-4 items-center">
          <span>Koordinat: <b className="text-[#3fc2ac] font-bold">{mouseCoords}</b></span>
          <span className="w-px h-3 bg-[#24404f]" />
          <span>Zoom: <b className="text-white font-bold">{zoomLevel}</b></span>
          <span className="w-px h-3 bg-[#24404f]" />
          <span>Şekil Sayısı: <b className="text-white font-bold">{features.length}</b></span>
        </div>

        <div className="flex gap-4 items-center">
          <span>Mod: <b className="text-amber-500 font-bold uppercase">{mode}</b></span>
          <span className="w-px h-3 bg-[#24404f]" />
          <button 
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
              snapEnabled ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-[#24404f] text-[#7f9aa8]'
            }`}
          >
            Snap: {snapEnabled ? 'Açık' : 'Kapalı'}
          </button>
        </div>
      </div>

      {/* Draft helper controls near bottom */}
      {draftCoords && draftCoords.length > 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-[#0f1e29] border border-[#24404f] rounded-xl p-1.5 shadow-2xl items-center animate-bounce">
          <button 
            onClick={() => finishDraftShape(draftCoords)}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded cursor-pointer transition uppercase"
          >
            Çizimi Bitir
          </button>
          <button 
            onClick={() => setDraftCoords(null)}
            className="px-4 py-1.5 bg-[#152c3a] border border-[#24404f] hover:border-red-500 text-red-500 text-xs font-bold rounded cursor-pointer transition uppercase"
          >
            İptal Et
          </button>
        </div>
      )}

      {/* Form Dialog for feature placement attributes */}
      {featureFormOpen && (
        <div className="fixed inset-0 z-[999] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f1e29] border border-[#24404f] p-5 rounded-2xl shadow-2xl w-full max-w-sm space-y-4 text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-500">Şekil Bilgileri Girişi</h3>
            
            <div className="space-y-1">
              <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">Başlık / İsim</label>
              <input 
                type="text"
                value={featureFormName}
                onChange={e => setFeatureFormName(e.target.value)}
                placeholder="Örn. VIP Terminal Binası"
                className="w-full bg-[#152c3a] border border-[#24404f] text-sm text-[#e7eef2] rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-[#7f9aa8] font-bold uppercase">Açıklama</label>
              <textarea 
                rows={2}
                value={featureFormDesc}
                onChange={e => setFeatureFormDescription(e.target.value)}
                placeholder="Örn. 1. etapta inşa edilen ana gövde..."
                className="w-full bg-[#152c3a] border border-[#24404f] text-sm text-[#e7eef2] rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#7f9aa8] font-bold uppercase">Özel Öznitelikler (Key-Value)</span>
                <button
                  type="button"
                  onClick={() => setFeatureFormCustomFields(prev => [...prev, { k: '', v: '' }])}
                  className="px-1.5 py-0.5 bg-[#152c3a] border border-[#24404f] text-[9px] text-[#3fc2ac] hover:border-[#3fc2ac] rounded transition cursor-pointer font-bold"
                >
                  +EKLE
                </button>
              </div>

              {featureFormCustomFields.map((cf, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input 
                    type="text"
                    value={cf.k}
                    onChange={e => {
                      const next = [...featureFormCustomFields];
                      next[idx].k = e.target.value;
                      setFeatureFormCustomFields(next);
                    }}
                    placeholder="Alan"
                    className="flex-1 bg-[#152c3a] border border-[#24404f] text-xs px-2 py-1 rounded focus:border-[#3fc2ac] focus:outline-none text-white font-mono"
                  />
                  <input 
                    type="text"
                    value={cf.v}
                    onChange={e => {
                      const next = [...featureFormCustomFields];
                      next[idx].v = e.target.value;
                      setFeatureFormCustomFields(next);
                    }}
                    placeholder="Değer"
                    className="flex-1 bg-[#152c3a] border border-[#24404f] text-xs px-2 py-1 rounded focus:border-[#3fc2ac] focus:outline-none text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setFeatureFormCustomFields(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-500 hover:bg-[#152c3a] rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setFeatureFormOpen(false)}
                className="flex-1 py-2 border border-[#24404f] text-xs font-bold text-[#7f9aa8] hover:border-white transition rounded cursor-pointer"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleFeatureFormSubmit}
                className="flex-1 py-2 bg-[#3fc2ac] hover:bg-[#3fc2ac]/85 text-xs font-bold text-black transition rounded cursor-pointer"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[999] bg-[#152c3a] border border-amber-500/50 text-[#e7eef2] px-4 py-2 rounded-xl shadow-2xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loader indicator overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#0f1e29] border border-[#24404f] p-5 rounded-2xl flex items-center gap-3 shadow-2xl">
            <div className="w-5 h-5 rounded-full border-2 border-[#24404f] border-t-amber-500 animate-spin" />
            <span className="text-xs font-bold text-white">{loadingText}</span>
          </div>
        </div>
      )}
    </div>
  );
};
