import { create } from 'zustand';

let uidCounter = 0;
export function uid() {
  uidCounter += 1;
  return Date.now().toString(36) + '-' + uidCounter.toString(36);
}

export function getLayer(layers, id) {
  return layers.find((l) => l.id === id);
}

export function defaultColorFor(geomType) {
  return geomType === 'LineString' ? '#12d16f' : geomType === 'Polygon' ? '#e02424' : '#3fc2ac';
}

const DEFAULT_MAP_ID = 'map-genel';

const initialFolders = [
  { id: 'folder-genel', name: 'Genel', mapId: DEFAULT_MAP_ID, parentFolderId: null, expanded: true, deletable: false },
  { id: 'folder-yapilar', name: 'Yapılar', mapId: DEFAULT_MAP_ID, parentFolderId: 'folder-genel', expanded: true, deletable: true },
  { id: 'folder-altyapi', name: 'Altyapı', mapId: DEFAULT_MAP_ID, parentFolderId: 'folder-genel', expanded: true, deletable: true }
];

const initialLayers = [
  { id: 'layer-point', name: 'Nokta Katmanı', visible: true, color: null, fillColor: null, lineWidth: null, dash: 'solid', symbol: 'circle', scale: 1, geomType: 'Point', mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' },
  { id: 'layer-line', name: 'Çizgi Katmanı', visible: true, color: null, fillColor: null, lineWidth: null, dash: 'solid', geomType: 'LineString', mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' },
  { id: 'layer-polygon', name: 'Poligon Katmanı', visible: true, color: null, fillColor: null, lineWidth: null, dash: 'solid', geomType: 'Polygon', mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' },
  { id: 'layer-mixed', name: 'Karma Katman', visible: true, color: null, fillColor: null, lineWidth: null, dash: 'solid', symbol: 'circle', scale: 1, geomType: null, mapId: DEFAULT_MAP_ID, folderId: 'folder-genel' }
];

export const useStore = create((set, get) => ({
  // ---- Haritalar / klasörler / katmanlar ----
  maps: [{ id: DEFAULT_MAP_ID, name: 'Genel' }],
  activeMapId: DEFAULT_MAP_ID,
  folders: initialFolders,
  layers: initialLayers,
  activeLayerId: 'layer-point',

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
      const collectAllFolderIds = (fid) => {
        let ids = [fid];
        s.folders.filter((f) => (f.parentFolderId || null) === fid).forEach((sf) => { ids = ids.concat(collectAllFolderIds(sf.id)); });
        return ids;
      };
      const collectDescendantLayerIds = (fid) => {
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
        activeLayerId: newActiveLayerId
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
        activeLayerId: s.activeLayerId === id ? (fallback ? fallback.id : newLayers[0]?.id || null) : s.activeLayerId
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

  // ---- Şekiller (features) ----
  features: [],
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

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

  // ---- Çizim modu / araç durumu ----
  mode: 'select',
  setMode: (mode) => set((s) => (s.pendingFeatureAttributes && mode !== s.pendingFeatureModeExpected
    ? { mode, pendingFeatureAttributes: null, pendingFeatureModeExpected: null, selectedId: mode !== 'select' ? null : s.selectedId }
    : { mode, selectedId: mode !== 'select' ? null : s.selectedId })),

  pendingFeatureAttributes: null,
  pendingFeatureModeExpected: null,
  setPendingFeature: (attrs, expectedMode) => set({ pendingFeatureAttributes: attrs, pendingFeatureModeExpected: expectedMode, mode: expectedMode }),

  // ---- Snap ----
  snapEnabled: true,
  snapTolerancePx: 14,
  setSnapEnabled: (v) => set({ snapEnabled: v }),
  setSnapTolerancePx: (v) => set({ snapTolerancePx: v }),

  // ---- Etiketler / ölçüm ----
  labelsVisible: true,
  setLabelsVisible: (v) => set({ labelsVisible: v }),
  persistedMeasurements: [],
  addPersistedMeasurement: (m) => set((s) => ({ persistedMeasurements: [...s.persistedMeasurements, m] })),
  clearPersistedMeasurements: () => set({ persistedMeasurements: [] }),

  // ---- Arayüz durumu ----
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  activeModule: 'harita',
  setActiveModule: (m) => set({ activeModule: m }),

  // ---- Bildirim (toast) ----
  toast: '',
  showToast: (msg) => {
    set({ toast: msg });
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => set({ toast: '' }), 2600);
  },

  // ---- Geri al / yinele (basit) ----
  undoStack: [],
  redoStack: [],
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

// Aktif haritaya göre görünür (render edilecek) şekilleri döner; katman
// stiline göre renk/kalınlık/çizgi tipi/sembol bilgisini şekle enjekte eder.
export function selectVisibleFeatures(state) {
  const { features, layers, activeMapId } = state;
  return features
    .filter((f) => {
      const lyr = getLayer(layers, f.properties?.layerId);
      if (!lyr) return true;
      if (lyr.mapId && lyr.mapId !== activeMapId) return false;
      return lyr.visible !== false;
    })
    .map((f) => {
      const lyr = getLayer(layers, f.properties?.layerId);
      if (!lyr) return f;
      const extra = {};
      if (lyr.color) extra.__layerColor = lyr.color;
      if (lyr.fillColor) extra.__layerFillColor = lyr.fillColor;
      if (lyr.lineWidth) extra.__layerWidth = lyr.lineWidth;
      if (lyr.dash) extra.__layerDash = lyr.dash;
      if (lyr.symbol) extra.__layerSymbol = lyr.symbol;
      if (lyr.scale) extra.__layerScale = lyr.scale;
      if (!Object.keys(extra).length) return f;
      return { ...f, properties: { ...f.properties, ...extra } };
    });
}
