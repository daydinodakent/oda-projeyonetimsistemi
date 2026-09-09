import { create } from 'zustand';

let uidCounter = 0;
export function uid(): string {
  uidCounter += 1;
  return Date.now().toString(36) + '-' + uidCounter.toString(36);
}

export function getLayer(layers: any[], id: string): any {
  return layers.find((l) => l.id === id);
}

export function defaultColorFor(geomType: string | null): string {
  return geomType === 'LineString' ? '#12d16f' : geomType === 'Polygon' ? '#e02424' : '#3fc2ac';
}

const DEFAULT_MAP_ID = 'map-genel';

const initialFolders = [
  { id: 'folder-genel', name: 'Genel', mapId: DEFAULT_MAP_ID, parentFolderId: null as string | null, expanded: true, deletable: false },
  { id: 'folder-yapilar', name: 'Yapılar', mapId: DEFAULT_MAP_ID, parentFolderId: 'folder-genel' as string | null, expanded: true, deletable: true },
  { id: 'folder-altyapi', name: 'Altyapı', mapId: DEFAULT_MAP_ID, parentFolderId: 'folder-genel' as string | null, expanded: true, deletable: true }
];

const initialLayers = [
  { id: 'layer-point', name: 'Nokta Katmanı', visible: true, color: null as string | null, fillColor: null as string | null, lineWidth: null as number | null, dash: 'solid', symbol: 'circle', scale: 1, geomType: 'Point' as string | null, mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' as string | null },
  { id: 'layer-line', name: 'Çizgi Katmanı', visible: true, color: null as string | null, fillColor: null as string | null, lineWidth: null as number | null, dash: 'solid', geomType: 'LineString' as string | null, mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' as string | null },
  { id: 'layer-polygon', name: 'Poligon Katmanı', visible: true, color: null as string | null, fillColor: null as string | null, lineWidth: null as number | null, dash: 'solid', geomType: 'Polygon' as string | null, mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' as string | null },
  { id: 'layer-mixed', name: 'Karma Katman', visible: true, color: null as string | null, fillColor: null as string | null, lineWidth: null as number | null, dash: 'solid', symbol: 'circle', scale: 1, geomType: null as string | null, mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' as string | null }
];

interface KrokiState {
  maps: any[];
  activeMapId: string;
  folders: any[];
  layers: any[];
  activeLayerId: string;
  features: any[];
  selectedId: string | null;
  mode: string;
  pendingFeatureAttributes: any | null;
  pendingFeatureModeExpected: string | null;
  snapEnabled: boolean;
  snapTolerancePx: number;
  labelsVisible: boolean;
  persistedMeasurements: any[];
  sidebarOpen: boolean;
  activeModule: string;
  toast: string;
  undoStack: any[][];
  redoStack: any[][];

  setActiveLayerId: (id: string) => void;
  addFolder: (name: string, parentFolderId?: string | null) => void;
  renameFolder: (id: string, name: string) => void;
  toggleFolderExpanded: (id: string) => void;
  deleteFolder: (id: string) => void;
  getDefaultFolderId: (mapId: string) => string | null;
  addLayer: (name: string, geomType: string | null, folderId?: string | null) => void;
  renameLayer: (id: string, name: string) => void;
  setLayerVisible: (id: string, visible: boolean) => void;
  setFolderVisibleCascade: (folderId: string, visible: boolean, descendantIds: string[]) => void;
  updateLayerStyle: (id: string, patch: any) => void;
  deleteLayer: (id: string) => void;
  moveLayerToPosition: (draggedId: string, targetFolderId: string | null, beforeLayerId: string | null) => void;
  addFeature: (feature: any) => void;
  updateFeature: (id: string, patch: any) => void;
  updateFeatureGeometry: (id: string, geometry: any) => void;
  deleteFeature: (id: string) => void;
  setMode: (mode: string) => void;
  setPendingFeature: (attrs: any | null, expectedMode: string | null) => void;
  setSnapEnabled: (v: boolean) => void;
  setSnapTolerancePx: (v: number) => void;
  setLabelsVisible: (v: boolean) => void;
  addPersistedMeasurement: (m: any) => void;
  clearPersistedMeasurements: () => void;
  setSidebarOpen: (v: boolean) => void;
  setActiveModule: (m: string) => void;
  showToast: (msg: string) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useStore = create<KrokiState>((set, get) => ({
  maps: [{ id: DEFAULT_MAP_ID, name: 'Genel' }],
  activeMapId: DEFAULT_MAP_ID,
  folders: initialFolders,
  layers: initialLayers,
  activeLayerId: 'layer-point',
  features: [
    {
      type: 'Feature',
      id: 'feat-ornek-nokta',
      geometry: {
        type: 'Point',
        coordinates: [32.8541, 39.9208]
      },
      properties: {
        layerId: 'layer-point',
        name: 'Örnek Nokta (Ankara)',
        aciklama: 'Başlangıç örnek noktası'
      }
    },
    {
      type: 'Feature',
      id: 'feat-ornek-cizgi',
      geometry: {
        type: 'LineString',
        coordinates: [
          [32.8541, 39.9208],
          [28.9784, 41.0082]
        ]
      },
      properties: {
        layerId: 'layer-line',
        name: 'Örnek Çizgi Hat',
        aciklama: 'Ankara - İstanbul örnek hattı'
      }
    },
    {
      type: 'Feature',
      id: 'feat-ornek-poligon',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [32.5, 38.8],
            [33.8, 38.8],
            [33.8, 38.2],
            [32.5, 38.2],
            [32.5, 38.8]
          ]
        ]
      },
      properties: {
        layerId: 'layer-polygon',
        name: 'Örnek Poligon Alan (Tuz Gölü)',
        aciklama: 'Örnek göl alanı çizimi'
      }
    }
  ],
  selectedId: null,
  mode: 'select',
  pendingFeatureAttributes: null,
  pendingFeatureModeExpected: null,
  snapEnabled: true,
  snapTolerancePx: 14,
  labelsVisible: true,
  persistedMeasurements: [],
  sidebarOpen: false,
  activeModule: 'harita',
  toast: '',
  undoStack: [],
  redoStack: [],

  setActiveLayerId: (id) => set({ activeLayerId: id }),

  addFolder: (name, parentFolderId) =>
    set((s) => ({
      folders: [...s.folders, { id: 'folder-' + uid(), name, mapId: s.activeMapId, parentFolderId: parentFolderId || null, expanded: true, deletable: true }]
    })),

  renameFolder: (id, name) =>
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) })),

  toggleFolderExpanded: (id) =>
    set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, expanded: f.expanded === false } : f)) })),

  deleteFolder: (id) =>
    set((s) => {
      const collectAllFolderIds = (fid: string): string[] => {
        let ids = [fid];
        s.folders.filter((f) => (f.parentFolderId || null) === fid).forEach((sf) => { ids = ids.concat(collectAllFolderIds(sf.id)); });
        return ids;
      };
      const collectDescendantLayerIds = (fid: string): string[] => {
        let ids = s.layers.filter((l) => l.mapId === s.activeMapId && (l.folderId || null) === fid).map((l) => l.id);
        s.folders.filter((f) => f.mapId === s.activeMapId && (f.parentFolderId || null) === fid).forEach((sf) => { ids = ids.concat(collectDescendantLayerIds(sf.id)); });
        return ids;
      };
      const allFolderIds = collectAllFolderIds(id);
      const descLayerIds = collectDescendantLayerIds(id);
      const newLayers = s.layers.filter((l) => !descLayerIds.includes(l.id));
      const newActiveLayerId = newLayers.find((l) => l.id === s.activeLayerId) ? s.activeLayerId : newLayers[0]?.id || null;
      return {
        folders: s.folders.filter((f) => !allFolderIds.includes(f.id)),
        layers: newLayers,
        features: s.features.filter((f) => !descLayerIds.includes(f.properties?.layerId)),
        activeLayerId: newActiveLayerId || ''
      };
    }),

  getDefaultFolderId: (mapId) => {
    const f = get().folders.find((x) => x.mapId === mapId && x.deletable === false);
    return f ? f.id : null;
  },

  addLayer: (name, geomType, folderId) =>
    set((s) => {
      const id = 'layer-' + uid();
      return {
        layers: [...s.layers, { id, name, visible: true, color: null, fillColor: null, lineWidth: null, dash: 'solid', symbol: 'circle', scale: 1, geomType, mapId: s.activeMapId, folderId: folderId || null }],
        activeLayerId: id
      };
    }),

  renameLayer: (id, name) => set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)) })),

  setLayerVisible: (id, visible) => set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, visible } : l)) })),

  setFolderVisibleCascade: (folderId, visible, descendantIds) =>
    set((s) => ({ layers: s.layers.map((l) => (descendantIds.includes(l.id) ? { ...l, visible } : l)) })),

  updateLayerStyle: (id, patch) => set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

  deleteLayer: (id) =>
    set((s) => {
      const newLayers = s.layers.filter((l) => l.id !== id);
      const fallback = newLayers.find((l) => l.mapId === s.activeMapId);
      return {
        layers: newLayers,
        features: s.features.filter((f) => f.properties?.layerId !== id),
        activeLayerId: s.activeLayerId === id ? (fallback ? fallback.id : newLayers[0]?.id || '') : s.activeLayerId
      };
    }),

  moveLayerToPosition: (draggedId, targetFolderId, beforeLayerId) =>
    set((s) => {
      const layers = [...s.layers];
      const idx = layers.findIndex((l) => l.id === draggedId);
      if (idx < 0) return {};
      const [lyr] = layers.splice(idx, 1);
      lyr.folderId = targetFolderId || null;
      if (beforeLayerId) {
        const targetIdx = layers.findIndex((l) => l.id === beforeLayerId);
        if (targetIdx === -1) layers.push(lyr);
        else layers.splice(targetIdx, 0, lyr);
      } else {
        layers.push(lyr);
      }
      return { layers };
    }),

  addFeature: (feature) =>
    set((s) => {
      const props = { ...(feature.properties || {}) };
      if (!props.layerId) props.layerId = s.activeLayerId;
      if (s.pendingFeatureAttributes) Object.assign(props, s.pendingFeatureAttributes);
      return {
        features: [...s.features, { ...feature, id: feature.id || uid(), properties: props }],
        pendingFeatureAttributes: null,
        pendingFeatureModeExpected: null
      };
    }),

  updateFeature: (id, patch) =>
    set((s) => ({ features: s.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

  updateFeatureGeometry: (id, geometry) =>
    set((s) => ({ features: s.features.map((f) => (f.id === id ? { ...f, geometry } : f)) })),

  deleteFeature: (id) => set((s) => ({ features: s.features.filter((f) => f.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),

  setMode: (mode) => set((s) => (s.pendingFeatureAttributes && mode !== s.pendingFeatureModeExpected
    ? { mode, pendingFeatureAttributes: null, pendingFeatureModeExpected: null, selectedId: mode !== 'select' ? null : s.selectedId }
    : { mode, selectedId: mode !== 'select' ? null : s.selectedId })),

  setPendingFeature: (attrs, expectedMode) => set({ pendingFeatureAttributes: attrs, pendingFeatureModeExpected: expectedMode, mode: expectedMode || 'select' }),

  setSnapEnabled: (v) => set({ snapEnabled: v }),
  setSnapTolerancePx: (v) => set({ snapTolerancePx: v }),

  setLabelsVisible: (v) => set({ labelsVisible: v }),
  addPersistedMeasurement: (m) => set((s) => ({ persistedMeasurements: [...s.persistedMeasurements, m] })),
  clearPersistedMeasurements: () => set({ persistedMeasurements: [] }),

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setActiveModule: (m) => set({ activeModule: m }),

  showToast: (msg) => {
    set({ toast: msg });
    const win = window as any;
    clearTimeout(win.__toastTimer);
    win.__toastTimer = setTimeout(() => set({ toast: '' }), 2600);
  },

  pushHistory: () => set((s) => ({ undoStack: [...s.undoStack, s.features].slice(-60), redoStack: [] })),
  undo: () =>
    set((s) => {
      if (!s.undoStack.length) return {};
      const prev = s.undoStack[s.undoStack.length - 1];
      return { features: prev, undoStack: s.undoStack.slice(0, -1), redoStack: [...s.redoStack, s.features] };
    }),
  redo: () =>
    set((s) => {
      if (!s.redoStack.length) return {};
      const next = s.redoStack[s.redoStack.length - 1];
      return { features: next, redoStack: s.redoStack.slice(0, -1), undoStack: [...s.undoStack, s.features] };
    })
}));

export function selectVisibleFeatures(state: any): any[] {
  const { features, layers, activeMapId } = state;
  return features
    .filter((f: any) => {
      const lyr = getLayer(layers, f.properties?.layerId);
      if (!lyr) return true;
      if (lyr.mapId && lyr.mapId !== activeMapId) return false;
      return lyr.visible !== false;
    })
    .map((f: any) => {
      const lyr = getLayer(layers, f.properties?.layerId);
      const extra: any = { id: f.id };
      if (lyr) {
        if (lyr.color) extra.__layerColor = lyr.color;
        if (lyr.fillColor) extra.__layerFillColor = lyr.fillColor;
        if (lyr.lineWidth) extra.__layerWidth = lyr.lineWidth;
        if (lyr.dash) extra.__layerDash = lyr.dash;
        if (lyr.symbol) extra.__layerSymbol = lyr.symbol;
        if (lyr.scale) extra.__layerScale = lyr.scale;
      }
      return { ...f, id: f.id, properties: { ...f.properties, ...extra } };
    });
}
