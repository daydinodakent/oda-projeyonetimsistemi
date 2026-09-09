import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import * as turf from '@turf/turf';
import { useStore, defaultColorFor } from '../../store/useStore.js';
import { geomTypeIcon, symbolIconSvg, FOLDER_ICON } from '../../lib/symbols.js';
import { exportLayerAs } from '../../lib/exporters.js';
import ContextMenu from './ContextMenu.jsx';

const RASTER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="1.4"/><path d="M21 16l-5-5-4 4-3-3-6 5"/></svg>';

export default function LayerTree({ mapRef, onOpenStyle, onOpenLayerModal }) {
  const { folders, layers, activeMapId, activeLayerId, features } = useStore((s) => ({
    folders: s.folders, layers: s.layers, activeMapId: s.activeMapId, activeLayerId: s.activeLayerId, features: s.features
  }));
  const { addFolder, renameFolder, deleteFolder, toggleFolderExpanded, setFolderVisibleCascade, renameLayer, deleteLayer, setLayerVisible, moveLayerToPosition, setActiveLayerId, showToast, getDefaultFolderId } = useStore();
  const [ctxMenu, setCtxMenu] = useState(null);
  const [dragId, setDragId] = useState(null);

  const collectDescendantLayerIds = (folderId) => {
    let ids = layers.filter((l) => l.mapId === activeMapId && (l.folderId || null) === folderId).map((l) => l.id);
    folders.filter((f) => f.mapId === activeMapId && (f.parentFolderId || null) === folderId).forEach((sf) => { ids = ids.concat(collectDescendantLayerIds(sf.id)); });
    return ids;
  };

  function zoomToLayer(layerId) {
    const feats = features.filter((f) => f.properties?.layerId === layerId);
    if (!feats.length) { showToast('Bu katmanda şekil yok.'); return; }
    try {
      const bbox = turf.bbox({ type: 'FeatureCollection', features: feats });
      mapRef.current.fitBounds(bbox, { padding: 80, duration: 600, maxZoom: 18 });
    } catch { showToast('Bu katmana yakınlaşılamadı.'); }
  }

  function handleExport(layerId, format) {
    exportLayerAs(layerId, format, layers, features, JSZip).then((res) => showToast(res.msg));
  }

  function openExportMenu(x, y, layerId) {
    setCtxMenu({
      x, y,
      items: [
        { label: 'GeoJSON', action: () => handleExport(layerId, 'geojson') },
        { label: 'KML', action: () => handleExport(layerId, 'kml') },
        { label: 'KMZ', action: () => handleExport(layerId, 'kmz') },
        { label: 'Shapefile (.zip)', action: () => handleExport(layerId, 'shp') },
        { label: 'GeoPackage (.gpkg)', action: () => handleExport(layerId, 'gpkg') },
        { label: 'DXF', action: () => handleExport(layerId, 'dxf') }
      ]
    });
  }

  function FolderRow({ folder, depth }) {
    const descIds = collectDescendantLayerIds(folder.id);
    const descLayers = layers.filter((l) => descIds.includes(l.id));
    const allVisible = descLayers.length === 0 || descLayers.every((l) => l.visible !== false);
    const totalCount = descLayers.reduce((s, l) => s + features.filter((f) => f.properties?.layerId === l.id).length, 0);

    return (
      <div
        className="layer-row" style={{ marginLeft: depth * 14 }}
        onDragOver={(e) => { if (dragId) e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); if (dragId) moveLayerToPosition(dragId, folder.id, null); setDragId(null); }}
        onContextMenu={(e) => {
          e.preventDefault(); e.stopPropagation();
          const items = [
            { label: 'Yeni Klasör Ekle', action: () => { const n = prompt('Klasör adı:', 'Yeni Klasör'); if (n?.trim()) addFolder(n.trim(), folder.id); } },
            { label: 'Yeni Katman Ekle', action: () => onOpenLayerModal(folder.id) },
            { sep: true },
            { label: 'Yeniden Adlandır', action: () => { const n = prompt('Klasör adı:', folder.name); if (n?.trim()) renameFolder(folder.id, n.trim()); } }
          ];
          if (folder.deletable !== false) items.push({ label: 'Sil', danger: true, action: () => {
            if (descIds.length && !confirm(`Bu klasördeki ${descIds.length} katman silinecek. Emin misiniz?`)) return;
            deleteFolder(folder.id);
          } });
          setCtxMenu({ x: e.clientX, y: e.clientY, items });
        }}
      >
        <button className="tree-toggle" onClick={(e) => { e.stopPropagation(); toggleFolderExpanded(folder.id); }}>{folder.expanded !== false ? '▾' : '▸'}</button>
        <input type="checkbox" checked={allVisible} onChange={(e) => setFolderVisibleCascade(folder.id, e.target.checked, descIds)} />
        <span className="layer-geom-icon" style={{ color: 'var(--teal)' }} dangerouslySetInnerHTML={{ __html: FOLDER_ICON }} />
        <span className="layer-name" onClick={() => toggleFolderExpanded(folder.id)}>{folder.name}</span>
        <span className="layer-count">{totalCount}</span>
      </div>
    );
  }

  function LayerRow({ lyr, depth }) {
    const count = features.filter((f) => f.properties?.layerId === lyr.id).length;
    const iconColor = lyr.color || defaultColorFor(lyr.geomType);
    const iconHtml = lyr.geomType === 'Point' && lyr.symbol ? symbolIconSvg(lyr.symbol) : geomTypeIcon(lyr.geomType);

    return (
      <div
        className={'layer-row' + (lyr.id === activeLayerId ? ' active-layer' : '') + (dragId === lyr.id ? ' dragging' : '')}
        style={{ marginLeft: depth * 14 }}
        draggable
        onDragStart={() => setDragId(lyr.id)}
        onDragEnd={() => setDragId(null)}
        onDragOver={(e) => { if (dragId && dragId !== lyr.id) e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          if (!dragId || dragId === lyr.id) return;
          const siblings = layers.filter((l) => l.mapId === lyr.mapId && (l.folderId || null) === (lyr.folderId || null));
          const pos = siblings.indexOf(lyr);
          const rect = e.currentTarget.getBoundingClientRect();
          const before = e.clientY - rect.top < rect.height / 2;
          const beforeId = before ? lyr.id : siblings[pos + 1]?.id || null;
          moveLayerToPosition(dragId, lyr.folderId || null, beforeId);
          setDragId(null);
        }}
        onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenStyle(lyr.id); }}
        onContextMenu={(e) => {
          e.preventDefault(); e.stopPropagation();
          const cx = e.clientX, cy = e.clientY;
          setCtxMenu({
            x: cx, y: cy,
            items: [
              { label: 'Yakınlaş (Zoom To)', action: () => zoomToLayer(lyr.id) },
              { sep: true },
              { label: 'Yeniden Adlandır', action: () => { const n = prompt('Katman adı:', lyr.name); if (n?.trim()) renameLayer(lyr.id, n.trim()); } },
              { label: 'Stil', action: () => onOpenStyle(lyr.id) },
              { sep: true },
              { label: 'Sil', danger: true, action: () => {
                if (count && !confirm(`Bu katmandaki ${count} şekil de silinecek. Emin misiniz?`)) return;
                deleteLayer(lyr.id);
              } },
              { sep: true },
              { label: 'Farklı Kaydet...', action: () => openExportMenu(cx, cy, lyr.id) }
            ]
          });
        }}
      >
        <span className="tree-toggle-spacer" />
        <input type="checkbox" checked={lyr.visible !== false} onChange={(e) => setLayerVisible(lyr.id, e.target.checked)} />
        <span className="layer-geom-icon" style={{ color: iconColor }} dangerouslySetInnerHTML={{ __html: iconHtml }} />
        <span className="layer-name" onClick={() => setActiveLayerId(lyr.id)}>{lyr.name}</span>
        <span className="layer-count">{count}</span>
      </div>
    );
  }

  function renderLevel(parentFolderId, depth) {
    const subFolders = folders.filter((f) => f.mapId === activeMapId && (f.parentFolderId || null) === (parentFolderId || null));
    const subLayers = layers.filter((l) => l.mapId === activeMapId && (l.folderId || null) === (parentFolderId || null));
    return (
      <React.Fragment key={parentFolderId || 'root'}>
        {subFolders.map((folder) => (
          <React.Fragment key={folder.id}>
            <FolderRow folder={folder} depth={depth} />
            {folder.expanded !== false && renderLevel(folder.id, depth + 1)}
          </React.Fragment>
        ))}
        {subLayers.map((lyr) => <LayerRow key={lyr.id} lyr={lyr} depth={depth} />)}
      </React.Fragment>
    );
  }

  return (
    <div
      className="layer-tree"
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        const defaultParent = getDefaultFolderId(activeMapId);
        setCtxMenu({
          x: e.clientX, y: e.clientY,
          items: [
            { label: 'Yeni Klasör Ekle', action: () => { const n = prompt('Klasör adı:', 'Yeni Klasör'); if (n?.trim()) addFolder(n.trim(), defaultParent); } },
            { label: 'Yeni Katman Ekle', action: () => onOpenLayerModal(defaultParent) }
          ]
        });
      }}
    >
      {renderLevel(null, 0)}
      {ctxMenu && <ContextMenu {...ctxMenu} onClose={() => setCtxMenu(null)} />}
    </div>
  );
}
