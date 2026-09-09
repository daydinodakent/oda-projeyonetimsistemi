import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useStore, selectVisibleFeatures } from '../../store/useStore.js';
import { useMapLayers } from './useMapLayers.js';
import { useSelectionSync } from './useSelectionSync.js';
import { useMapInteractions } from './useMapInteractions.js';
import { ensureSymbolIcons, ensureSnapIcons } from '../../lib/symbols.js';
import { fc } from '../../lib/geometry.js';
import { Compass, Layers, Navigation } from 'lucide-react';

import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewProps {
  mapRef: React.MutableRefObject<any>;
  onOpenFeatureForm: (featureId: string, isNew: boolean) => void;
}

const BASEMAPS = [
  { id: 'google-road', name: 'Google Yol', style: {
    version: 8,
    sources: {
      'google-road-tiles': {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
        tileSize: 256,
        attribution: 'Map data &copy; Google'
      }
    },
    layers: [
      { id: 'google-road-layer', type: 'raster', source: 'google-road-tiles', minzoom: 0, maxzoom: 22 }
    ]
  } as any },
  { id: 'google-satellite', name: 'Google Uydu', style: {
    version: 8,
    sources: {
      'google-satellite-tiles': {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
        tileSize: 256,
        attribution: 'Imagery &copy; Google'
      }
    },
    layers: [
      { id: 'google-satellite-layer', type: 'raster', source: 'google-satellite-tiles', minzoom: 0, maxzoom: 22 }
    ]
  } as any },
  { id: 'google-hybrid', name: 'Google Hibrit', style: {
    version: 8,
    sources: {
      'google-hybrid-tiles': {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
        tileSize: 256,
        attribution: 'Map data &copy; Google'
      }
    },
    layers: [
      { id: 'google-hybrid-layer', type: 'raster', source: 'google-hybrid-tiles', minzoom: 0, maxzoom: 22 }
    ]
  } as any },
  { id: 'liberty', name: 'Liberty (OSM)', style: 'https://openmaptiles.github.io/osm-liberty/style.json' }
];

export default function MapView({ mapRef, onOpenFeatureForm }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any | null>(null);
  const [styleLoaded, setStyleLoaded] = useState<boolean>(false);
  const [activeBasemap, setActiveBasemap] = useState<string>('google-road');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const features = useStore((s) => s.features);
  const selectedId = useStore((s) => s.selectedId);

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current) return;

    const initialMap = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAPS[0].style,
      center: [35.2433, 38.9637], // Turkey center
      zoom: 6,
      pitchWithRotate: false,
      dragRotate: false,
      doubleClickZoom: false // Double-click used for finishing drawing
    });

    initialMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    initialMap.on('load', () => {
      ensureSymbolIcons(initialMap);
      ensureSnapIcons(initialMap);
      setupUserLayers(initialMap);
      setStyleLoaded(true);
      setMap(initialMap);
      mapRef.current = initialMap;
    });

    return () => {
      initialMap.remove();
    };
  }, []);

  // Set up all necessary map sources, vector styling layers, and vertex markers
  function setupUserLayers(m: any) {
    if (!m) return;

    // Önce eski katmanları güvenle temizleyelim (çakışmaları önlemek için)
    const layersToRemove = [
      'kroki-polygons-layer', 'kroki-polygons-outline', 'kroki-polygons-selected',
      'kroki-lines-layer', 'kroki-lines-selected',
      'kroki-points-layer', 'kroki-points-selected',
      'kroki-temp-draw-polygon', 'kroki-temp-draw-line',
      'kroki-labels-layer', 'kroki-snap-indicator-layer', 'kroki-selected-vertices-point'
    ];
    layersToRemove.forEach((lid) => {
      try { if (m.getLayer(lid)) m.removeLayer(lid); } catch (e) { console.warn(e); }
    });

    const sourcesToRemove = [
      'kroki-polygons', 'kroki-lines', 'kroki-points',
      'kroki-temp-draw', 'kroki-labels', 'kroki-snap-indicator', 'kroki-selected-vertices'
    ];
    sourcesToRemove.forEach((sid) => {
      try { if (m.getSource(sid)) m.removeSource(sid); } catch (e) { console.warn(e); }
    });

    // 1. Polygon source & layers
    m.addSource('kroki-polygons', { type: 'geojson', data: fc([]) });
    m.addLayer({
      id: 'kroki-polygons-layer',
      type: 'fill',
      source: 'kroki-polygons',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'fill-color': ['coalesce', ['get', '__layerFillColor'], ['get', '__layerColor'], '#e02424'],
        'fill-opacity': 0.24
      }
    });
    m.addLayer({
      id: 'kroki-polygons-outline',
      type: 'line',
      source: 'kroki-polygons',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'line-color': ['coalesce', ['get', '__layerColor'], '#e02424'],
        'line-width': ['coalesce', ['get', '__layerWidth'], 2]
      }
    });

    // 2. LineString source & layers
    m.addSource('kroki-lines', { type: 'geojson', data: fc([]) });
    m.addLayer({
      id: 'kroki-lines-layer',
      type: 'line',
      source: 'kroki-lines',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'line-color': ['coalesce', ['get', '__layerColor'], '#12d16f'],
        'line-width': ['coalesce', ['get', '__layerWidth'], 2.4]
      }
    });

    // 3. Point source & layers (Bulletproof Circle Layer)
    m.addSource('kroki-points', { type: 'geojson', data: fc([]) });
    m.addLayer({
      id: 'kroki-points-layer',
      type: 'circle',
      source: 'kroki-points',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'circle-radius': ['coalesce', ['*', ['get', '__layerScale'], 6.5], 6.5],
        'circle-color': ['coalesce', ['get', '__layerColor'], '#3fc2ac'],
        'circle-stroke-width': 1.8,
        'circle-stroke-color': '#ffffff'
      }
    });

    // 4. Selections & Outlines for Highlight
    m.addLayer({
      id: 'kroki-polygons-selected',
      type: 'line',
      source: 'kroki-polygons',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 4,
        'line-dasharray': [2, 1.5]
      },
      filter: ['==', 'id', '__none__']
    });
    m.addLayer({
      id: 'kroki-lines-selected',
      type: 'line',
      source: 'kroki-lines',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 4.5,
        'line-dasharray': [2, 1.5]
      },
      filter: ['==', 'id', '__none__']
    });
    m.addLayer({
      id: 'kroki-points-selected',
      type: 'circle',
      source: 'kroki-points',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'circle-radius': ['coalesce', ['*', ['get', '__layerScale'], 9.5], 9.5],
        'circle-color': '#0ea5e9',
        'circle-opacity': 0.4,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#0ea5e9'
      },
      filter: ['==', 'id', '__none__']
    });

    // 5. Temporary Drawing Layer
    m.addSource('kroki-temp-draw', { type: 'geojson', data: fc([]) });
    m.addLayer({
      id: 'kroki-temp-draw-polygon',
      type: 'fill',
      source: 'kroki-temp-draw',
      layout: {
        'visibility': 'visible'
      },
      paint: { 'fill-color': '#115e59', 'fill-opacity': 0.15 },
      filter: ['==', '$type', 'Polygon']
    });
    m.addLayer({
      id: 'kroki-temp-draw-line',
      type: 'line',
      source: 'kroki-temp-draw',
      layout: {
        'visibility': 'visible'
      },
      paint: { 'line-color': '#0f766e', 'line-width': 2.4, 'line-dasharray': [2, 2] }
    });

    // 6. Dynamic Measurement Labels Layer
    m.addSource('kroki-labels', { type: 'geojson', data: fc([]) });
    m.addLayer({
      id: 'kroki-labels-layer',
      type: 'symbol',
      source: 'kroki-labels',
      layout: {
        'visibility': 'visible',
        'text-field': '{label}',
        'text-font': ['Noto Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': ['match', ['get', 'isArea'], 'yes', 11.5, 9.5],
        'text-offset': [0, 0],
        'text-keep-upright': true,
        'text-rotation-alignment': 'map',
        'text-rotate': ['get', 'rotation'],
        'text-allow-overlap': true
      },
      paint: {
        'text-color': ['match', ['get', 'isArea'], 'yes', '#111827', '#4b5563'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
      }
    });

    // 7. Snap Indicator Layer
    m.addSource('kroki-snap-indicator', { type: 'geojson', data: fc([]) });
    m.addLayer({
      id: 'kroki-snap-indicator-layer',
      type: 'symbol',
      source: 'kroki-snap-indicator',
      layout: {
        'visibility': 'visible',
        'icon-image': ['concat', 'snap-', ['coalesce', ['get', 'type'], 'vertex']],
        'icon-size': 1.1,
        'icon-allow-overlap': true
      }
    });

    // 8. Selected Vertices Layer for Vertex-Dragging
    m.addSource('kroki-selected-vertices', { type: 'geojson', data: fc([]) });
    m.addLayer({
      id: 'kroki-selected-vertices-point',
      type: 'circle',
      source: 'kroki-selected-vertices',
      layout: {
        'visibility': 'visible'
      },
      paint: {
        'circle-radius': 5,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#0ea5e9',
        'circle-stroke-width': 2.2
      }
    });

    // Force our layers to front right after setup
    bringUserLayersToFront(m);
  }

  // Bring our layers to absolute front of the layer stack (top-most Z-index)
  function bringUserLayersToFront(m: any) {
    if (!m || !m.isStyleLoaded()) return;
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
        if (m.getLayer(layerId)) {
          m.moveLayer(layerId);
        }
      } catch (e) {
        // Safe catch-all
      }
    });
  }

  // Hook-up custom sync & editing mechanics
  useMapLayers({ map, styleLoaded });
  useSelectionSync({ map, styleLoaded });
  useMapInteractions({ map, styleLoaded, onOpenFeatureForm });

  // Update selected vertices layer when selected feature or features list changes
  useEffect(() => {
    if (!map || !styleLoaded) return;

    function updateSelectedVertices() {
      if (!map.isStyleLoaded()) return;

      const src = map.getSource('kroki-selected-vertices');
      if (!src) return;

      if (!selectedId) {
        src.setData(fc([]));
        return;
      }

      const feat = features.find((f) => f.id === selectedId);
      if (!feat) {
        src.setData(fc([]));
        return;
      }

      const g = feat.geometry;
      let vertexFeats: any[] = [];

      if (g.type === 'LineString') {
        g.coordinates.forEach((c: number[], i: number) => {
          vertexFeats.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: c },
            properties: { parentFeatureId: selectedId, vertexIndex: i }
          });
        });
      } else if (g.type === 'Polygon') {
        const ring = g.coordinates[0] || [];
        // Poligon'un son koordinatı birincisiyle aynıdır, onu sürüklemek yerine ilkini sürükleyeceğiz
        for (let i = 0; i < ring.length - 1; i++) {
          vertexFeats.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: ring[i] },
            properties: { parentFeatureId: selectedId, vertexIndex: i }
          });
        }
      }

      src.setData(fc(vertexFeats));
    }

    updateSelectedVertices();
  }, [map, styleLoaded, selectedId, features]);

  // Handle basemap changes while avoiding losing user geometries
  function reapplyUserLayers(nextStyle: string | any) {
    if (!map) return;
    setStyleLoaded(false);
    map.setStyle(nextStyle);

    map.once('style.load', () => {
      ensureSymbolIcons(map);
      ensureSnapIcons(map);
      setupUserLayers(map);
      setStyleLoaded(true);
    });
  }

  function handleBasemapSelect(id: string, style: any) {
    setActiveBasemap(id);
    setDropdownOpen(false);
    reapplyUserLayers(style);
  }

  return (
    <div className="map-view-container relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Basemap Selection Panel (Bottom-Left) */}
      <div className="absolute bottom-5 left-5 z-20">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-zinc-800 border border-zinc-200 shadow-md rounded-md hover:bg-zinc-50 font-medium text-xs transition-colors"
          >
            <Layers size={14} className="text-zinc-600" />
            <span>Altlık Harita</span>
          </button>

          {dropdownOpen && (
            <div className="absolute bottom-10 left-0 bg-white border border-zinc-200 shadow-xl rounded-md w-44 py-1.5 flex flex-col gap-0.5 z-30 animate-fade-in">
              {BASEMAPS.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => handleBasemapSelect(bm.id, bm.style)}
                  className={'text-left px-3 py-1.5 text-xs font-medium transition-colors ' + (activeBasemap === bm.id ? 'bg-teal-50 text-teal-900 border-l-2 border-teal-600 pl-2' : 'text-zinc-700 hover:bg-zinc-50')}
                >
                  {bm.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
