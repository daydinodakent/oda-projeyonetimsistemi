import { useState, useEffect } from 'react';
import { GisMap, GisFolder, GisLayer, RasterOverlay } from '../../../types/gis';

const STORAGE_LAYERS_KEY = 'iga_gis_layers';
const STORAGE_FOLDERS_KEY = 'iga_gis_folders';
const STORAGE_RASTERS_KEY = 'iga_gis_rasters';

const DEFAULT_MAPS: GisMap[] = [{ id: 'map-genel', name: 'Genel' }];

const DEFAULT_FOLDERS: GisFolder[] = [
  { id: 'folder-genel', name: 'Genel', mapId: 'map-genel', parentFolderId: null, expanded: true, deletable: false },
  { id: 'folder-yapilar', name: 'Yapılar', mapId: 'map-genel', parentFolderId: 'folder-genel', expanded: true, deletable: true },
  { id: 'folder-altyapi', name: 'Altyapı', mapId: 'map-genel', parentFolderId: 'folder-genel', expanded: true, deletable: true }
];

const DEFAULT_LAYERS: GisLayer[] = [
  { id: 'layer-point', name: 'Nokta Katmanı', visible: true, color: null, lineWidth: null, dash: 'solid', symbol: 'circle', scale: 1, geomType: 'Point', mapId: 'map-genel', folderId: 'folder-genel' },
  { id: 'layer-line', name: 'Çizgi Katmanı', visible: true, color: null, lineWidth: null, dash: 'solid', geomType: 'LineString', mapId: 'map-genel', folderId: 'folder-genel' },
  { id: 'layer-polygon', name: 'Poligon Katmanı', visible: true, color: null, lineWidth: null, dash: 'solid', geomType: 'Polygon', mapId: 'map-genel', folderId: 'folder-genel' },
  { id: 'layer-mixed', name: 'Karma Katman', visible: true, color: null, lineWidth: null, dash: 'solid', symbol: 'circle', scale: 1, geomType: null, mapId: 'map-genel', folderId: 'folder-genel' }
];

export function useGisLayers() {
  const [maps] = useState<GisMap[]>(DEFAULT_MAPS);
  const [activeMapId, setActiveMapId] = useState<string>('map-genel');

  const [folders, setFolders] = useState<GisFolder[]>(() => {
    const saved = localStorage.getItem(STORAGE_FOLDERS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
  });

  const [layers, setLayers] = useState<GisLayer[]>(() => {
    const saved = localStorage.getItem(STORAGE_LAYERS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_LAYERS;
  });

  const [rasterOverlays, setRasterOverlays] = useState<RasterOverlay[]>(() => {
    const saved = localStorage.getItem(STORAGE_RASTERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeLayerId, setActiveLayerId] = useState<string>('layer-point');

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_LAYERS_KEY, JSON.stringify(layers));
  }, [layers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_RASTERS_KEY, JSON.stringify(rasterOverlays));
  }, [rasterOverlays]);

  const addFolder = (name: string, parentFolderId: string | null = null) => {
    const newFolder: GisFolder = {
      id: `folder-${Date.now()}`,
      name,
      mapId: activeMapId,
      parentFolderId,
      expanded: true,
      deletable: true
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  };

  const deleteFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || folder.deletable === false) return;

    // Recursive search for layers and child folders
    const getDescendants = (fid: string): string[] => {
      let ids = [fid];
      folders.filter(f => f.parentFolderId === fid).forEach(sub => {
        ids = ids.concat(getDescendants(sub.id));
      });
      return ids;
    };

    const allDeletedFolderIds = getDescendants(folderId);

    setFolders(prev => prev.filter(f => !allDeletedFolderIds.includes(f.id)));
    setLayers(prev => prev.filter(l => !l.folderId || !allDeletedFolderIds.includes(l.folderId)));
    setRasterOverlays(prev => prev.filter(r => !r.folderId || !allDeletedFolderIds.includes(r.folderId)));
  };

  const addLayer = (name: string, geomType: GisLayer['geomType'], folderId: string | null = null) => {
    const newLayer: GisLayer = {
      id: `layer-${Date.now()}`,
      name,
      geomType,
      mapId: activeMapId,
      folderId,
      visible: true,
      color: null,
      lineWidth: null,
      dash: 'solid',
      symbol: 'circle',
      scale: 1
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    return newLayer;
  };

  const deleteLayer = (layerId: string) => {
    setLayers(prev => prev.filter(l => l.id !== layerId));
    if (activeLayerId === layerId) {
      const fallback = layers.find(l => l.id !== layerId && l.mapId === activeMapId);
      if (fallback) setActiveLayerId(fallback.id);
    }
  };

  const updateLayerStyle = (layerId: string, updates: Partial<Omit<GisLayer, 'id'>>) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...updates } : l));
  };

  const toggleLayerVisibility = (layerId: string, visible: boolean) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible } : l));
  };

  const toggleFolderVisibility = (folderId: string, visible: boolean) => {
    const getDescendantLayerIds = (fid: string): string[] => {
      let ids = layers.filter(l => l.folderId === fid).map(l => l.id);
      folders.filter(f => f.parentFolderId === fid).forEach(sub => {
        ids = ids.concat(getDescendantLayerIds(sub.id));
      });
      return ids;
    };

    const targetLayerIds = getDescendantLayerIds(folderId);
    setLayers(prev => prev.map(l => targetLayerIds.includes(l.id) ? { ...l, visible } : l));
  };

  const toggleFolderExpanded = (folderId: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, expanded: f.expanded === false } : f));
  };

  const moveLayer = (layerId: string, targetFolderId: string | null, beforeLayerId: string | null = null) => {
    setLayers(prev => {
      const target = prev.find(l => l.id === layerId);
      if (!target) return prev;

      const updatedLayer = { ...target, folderId: targetFolderId };
      const filtered = prev.filter(l => l.id !== layerId);

      if (beforeLayerId) {
        const idx = filtered.findIndex(l => l.id === beforeLayerId);
        if (idx !== -1) {
          filtered.splice(idx, 0, updatedLayer);
          return filtered;
        }
      }
      return [...filtered, updatedLayer];
    });
  };

  const addRaster = (name: string, url: string, coords: RasterOverlay['coords'], folderId: string | null = null) => {
    const newRaster: RasterOverlay = {
      id: `raster-${Date.now()}`,
      name,
      url,
      coords,
      mapId: activeMapId,
      folderId,
      visible: true
    };
    setRasterOverlays(prev => [...prev, newRaster]);
    return newRaster;
  };

  const removeRaster = (rasterId: string) => {
    setRasterOverlays(prev => prev.filter(r => r.id !== rasterId));
  };

  const toggleRasterVisibility = (rasterId: string, visible: boolean) => {
    setRasterOverlays(prev => prev.map(r => r.id === rasterId ? { ...r, visible } : r));
  };

  return {
    maps,
    activeMapId,
    setActiveMapId,
    folders,
    setFolders,
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    rasterOverlays,
    setRasterOverlays,
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
  };
}
