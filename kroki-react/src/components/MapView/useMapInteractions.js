import { useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import { useStore, uid, getLayer } from '../../store/useStore.js';
import { fc, ringsOf, projectPointOnSegmentPx, perpendicularFootPx, segmentIntersectionLngLat, segmentLabelsFor, measureFeature } from '../../lib/geometry.js';
import { selectableLayers } from './useMapLayers.js';

const VERTEX_DRAW_MODES = ['point', 'linestring', 'polygon', 'rectangle', 'circle'];
const MEASURE_MODES = ['measure-distance', 'measure-area'];
const isVertexDrawMode = (m) => VERTEX_DRAW_MODES.includes(m);
const isMeasureMode = (m) => MEASURE_MODES.includes(m);
const isCoordEntryMode = (m) => isVertexDrawMode(m) || isMeasureMode(m);

export function useMapInteractions(map, ready) {
  const draftCoords = useRef(null);
  const dragCtx = useRef(null);
  const measureFrozen = useRef(false);

  useEffect(() => {
    if (!map || !ready) return;

    function findSnapPoint(screenPoint, excludeId, fromLngLat) {
      const { snapEnabled, snapTolerancePx, features } = useStore.getState();
      if (!snapEnabled) return null;
      let best = null, bestDist = snapTolerancePx;
      const fromPx = fromLngLat ? map.project(fromLngLat) : null;
      const allSegments = [];

      features.forEach((f) => {
        if (excludeId && f.id === excludeId) return;
        if (f.geometry.type === 'Polygon') {
          try {
            const cen = turf.centroid(f).geometry.coordinates;
            const pc = map.project(cen);
            const dc = Math.hypot(pc.x - screenPoint.x, pc.y - screenPoint.y);
            if (dc < bestDist) { bestDist = dc; best = { coord: cen, type: 'center' }; }
          } catch { /* yoksay */ }
        }
        ringsOf(f).forEach((coordsList) => {
          coordsList.forEach((c) => {
            const p = map.project(c);
            const d = Math.hypot(p.x - screenPoint.x, p.y - screenPoint.y);
            if (d < bestDist) { bestDist = d; best = { coord: c, type: 'vertex' }; }
          });
          for (let i = 0; i < coordsList.length - 1; i++) {
            const a = coordsList[i], b = coordsList[i + 1];
            allSegments.push([a, b]);
            const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            const pm = map.project(mid);
            const dm = Math.hypot(pm.x - screenPoint.x, pm.y - screenPoint.y);
            if (dm < bestDist) { bestDist = dm; best = { coord: mid, type: 'midpoint' }; }

            const pa = map.project(a), pb = map.project(b);
            const proj = projectPointOnSegmentPx(screenPoint, pa, pb);
            if (proj) {
              const d2 = Math.hypot(proj.x - screenPoint.x, proj.y - screenPoint.y);
              if (d2 < bestDist) {
                const ll = map.unproject(proj);
                bestDist = d2; best = { coord: [ll.lng, ll.lat], type: 'edge' };
              }
            }
            if (fromPx) {
              const foot = perpendicularFootPx(fromPx, pa, pb);
              if (foot) {
                const d3 = Math.hypot(foot.x - screenPoint.x, foot.y - screenPoint.y);
                if (d3 < bestDist) {
                  const llf = map.unproject(foot);
                  bestDist = d3; best = { coord: [llf.lng, llf.lat], type: 'perpendicular' };
                }
              }
            }
          }
        });
      });
      for (let i = 0; i < allSegments.length; i++) {
        for (let j = i + 1; j < allSegments.length; j++) {
          const ip = segmentIntersectionLngLat(allSegments[i][0], allSegments[i][1], allSegments[j][0], allSegments[j][1]);
          if (ip) {
            const pi = map.project(ip);
            const di = Math.hypot(pi.x - screenPoint.x, pi.y - screenPoint.y);
            if (di < bestDist) { bestDist = di; best = { coord: ip, type: 'intersection' }; }
          }
        }
      }
      return best;
    }

    function updateSnapMarker(snap) {
      const src = map.getSource('snap-marker');
      if (!src) return;
      src.setData(snap ? fc([{ type: 'Feature', geometry: { type: 'Point', coordinates: snap.coord }, properties: { snapType: snap.type } }]) : fc([]));
    }

    function renderDraft() {
      const coords = draftCoords.current;
      const { mode } = useStore.getState();
      const draftSrc = map.getSource('draft');
      const draftVerticesSrc = map.getSource('draft-vertices');
      const draftLabelSrc = map.getSource('draft-label');
      if (!coords || !coords.length) {
        draftSrc && draftSrc.setData(fc([]));
        draftVerticesSrc && draftVerticesSrc.setData(fc([]));
        draftLabelSrc && draftLabelSrc.setData(fc([]));
        return;
      }
      const feats = [];
      if (mode === 'polygon' || mode === 'measure-area' || mode === 'rectangle' || mode === 'circle') {
        if (coords.length >= 3) feats.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] }, properties: {} });
        else feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} });
      } else {
        feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} });
      }
      draftSrc && draftSrc.setData(fc(feats));
      draftVerticesSrc && draftVerticesSrc.setData(fc(coords.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} }))));

      if (draftLabelSrc) {
        let labelFeats = [];
        if (isMeasureMode(mode)) {
          feats.forEach((ft) => {
            segmentLabelsFor(ft, map).forEach((sl) => {
              labelFeats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: sl.coord }, properties: { label: sl.label, isArea: sl.isArea, rotation: sl.rotation || 0 } });
            });
          });
        }
        draftLabelSrc.setData(fc(labelFeats));
      }
    }

    function syncDraftStyleToActiveLayer() {
      const { layers, activeLayerId } = useStore.getState();
      const lyr = getLayer(layers, activeLayerId);
      const defaultColor = (g) => (g === 'LineString' ? '#12d16f' : g === 'Polygon' ? '#e02424' : '#e3a541');
      const color = (lyr && lyr.color) || defaultColor(lyr && lyr.geomType);
      const width = (lyr && lyr.lineWidth) || 3;
      const dashKey = (lyr && lyr.dash) || 'solid';
      const dashArr = dashKey === 'dashed' ? [2.6, 1.8] : dashKey === 'dotted' ? [0.6, 1.6] : [1, 0];
      try {
        map.setPaintProperty('draft-line', 'line-color', color);
        map.setPaintProperty('draft-line', 'line-width', width);
        map.setPaintProperty('draft-line', 'line-dasharray', dashArr);
        map.setPaintProperty('draft-fill', 'fill-color', color);
        map.setPaintProperty('draft-vertices', 'circle-color', color);
      } catch { /* katmanlar henüz hazır değil */ }
    }

    function finishDraft() {
      const coords = draftCoords.current;
      if (!coords || coords.length < 2) return;
      const { mode, addFeature, addPersistedMeasurement, pushHistory } = useStore.getState();

      if (isMeasureMode(mode)) {
        measureFrozen.current = true;
        const isArea = mode === 'measure-area';
        const geometry = isArea ? { type: 'Polygon', coordinates: [[...coords, coords[0]]] } : { type: 'LineString', coordinates: [...coords] };
        addPersistedMeasurement({ id: uid(), geometry, isArea });
        renderPersistedMeasurements();
        return;
      }

      let geometry;
      if (mode === 'polygon' || mode === 'rectangle' || mode === 'circle') {
        if (coords.length < 3) return;
        geometry = { type: 'Polygon', coordinates: [[...coords, coords[0]]] };
      } else if (mode === 'linestring') {
        geometry = { type: 'LineString', coordinates: coords };
      } else {
        return;
      }
      pushHistory();
      addFeature({ type: 'Feature', geometry, properties: {} });
      draftCoords.current = null;
      renderDraft();
    }

    function cancelDraft() {
      draftCoords.current = null;
      measureFrozen.current = false;
      const { setPendingFeature } = useStore.getState();
      setPendingFeature(null, null);
      renderDraft();
      updateSnapMarker(null);
    }

    function renderPersistedMeasurements() {
      const { persistedMeasurements } = useStore.getState();
      const lineFeats = [], fillFeats = [], labelFeats = [];
      persistedMeasurements.forEach((m) => {
        const pseudo = { type: 'Feature', geometry: m.geometry, properties: {} };
        lineFeats.push(pseudo);
        if (m.isArea) fillFeats.push(pseudo);
        segmentLabelsFor(pseudo, map).forEach((sl) => {
          labelFeats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: sl.coord }, properties: { label: sl.label, isArea: sl.isArea, rotation: sl.rotation || 0 } });
        });
      });
      map.getSource('persist-measure')?.setData(fc(lineFeats));
      map.getSource('persist-measure-fill')?.setData(fc(fillFeats));
      map.getSource('persist-measure-label')?.setData(fc(labelFeats));
    }
    window.__renderPersistedMeasurements = renderPersistedMeasurements;
    window.__syncDraftStyleToActiveLayer = syncDraftStyleToActiveLayer;
    window.__cancelDraft = cancelDraft;
    window.__finishDraft = finishDraft;

    function geometricHitTest(screenPoint, lngLat) {
      const { features } = useStore.getState();
      const tolerancePx = 14;
      let best = null, bestDist = Infinity, bestPolygon = null;
      features.forEach((f) => {
        if (f.geometry.type === 'Point') {
          const p = map.project(f.geometry.coordinates);
          const d = Math.hypot(p.x - screenPoint.x, p.y - screenPoint.y);
          if (d <= tolerancePx && d < bestDist) { bestDist = d; best = f; }
        } else if (f.geometry.type === 'LineString') {
          const coords = f.geometry.coordinates;
          for (let i = 0; i < coords.length - 1; i++) {
            const pa = map.project(coords[i]), pb = map.project(coords[i + 1]);
            const proj = projectPointOnSegmentPx(screenPoint, pa, pb);
            if (proj) {
              const d2 = Math.hypot(proj.x - screenPoint.x, proj.y - screenPoint.y);
              if (d2 <= tolerancePx && d2 < bestDist) { bestDist = d2; best = f; }
            }
          }
        } else if (f.geometry.type === 'Polygon') {
          try { if (turf.booleanPointInPolygon([lngLat.lng, lngLat.lat], turf.polygon(f.geometry.coordinates))) bestPolygon = f; } catch { /* yoksay */ }
        }
      });
      return best || bestPolygon;
    }

    function onMapClick(e) {
      const { mode, setSelectedId, features } = useStore.getState();

      if (isCoordEntryMode(mode)) {
        if (isMeasureMode(mode) && measureFrozen.current) { draftCoords.current = null; measureFrozen.current = false; }
        const fromPt = draftCoords.current && draftCoords.current.length ? draftCoords.current[draftCoords.current.length - 1] : null;
        const snap = findSnapPoint(e.point, null, fromPt);
        const lngLat = snap ? snap.coord : [e.lngLat.lng, e.lngLat.lat];
        if (!draftCoords.current) draftCoords.current = [];
        draftCoords.current.push(lngLat);
        updateSnapMarker(null);

        if (mode === 'point') { finishDraft(); return; }
        if ((mode === 'rectangle' || mode === 'circle') && draftCoords.current.length === 2) {
          const [x1, y1] = draftCoords.current[0], [x2, y2] = draftCoords.current[1];
          if (mode === 'rectangle') {
            draftCoords.current = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
          } else {
            const center = draftCoords.current[0];
            const r = turf.distance(center, draftCoords.current[1], { units: 'kilometers' });
            const circle = turf.circle(center, r, { steps: 48, units: 'kilometers' });
            draftCoords.current = circle.geometry.coordinates[0].slice(0, -1);
          }
          finishDraft();
          return;
        }
        renderDraft();
        return;
      }

      if (mode === 'select') {
        const hit = map.queryRenderedFeatures(e.point, { layers: selectableLayers(map) });
        let fid = null;
        if (hit.length) {
          const hp = hit[0].properties || {};
          const candidateId = String(hp.parentId || hp.featureId || hit[0].id);
          if (features.some((f) => f.id === candidateId)) fid = candidateId;
        }
        if (!fid) {
          const fb = geometricHitTest(e.point, e.lngLat);
          if (fb) fid = fb.id;
        }
        setSelectedId(fid || null);
      }
    }

    function onMapDblClick(e) {
      const { mode } = useStore.getState();
      if (isCoordEntryMode(mode) && draftCoords.current && draftCoords.current.length >= 2) {
        e.preventDefault();
        finishDraft();
      }
    }

    function onMapMouseMove(e) {
      const { mode } = useStore.getState();
      if (isCoordEntryMode(mode)) {
        const fromPt = draftCoords.current && draftCoords.current.length ? draftCoords.current[draftCoords.current.length - 1] : null;
        const snap = findSnapPoint(e.point, dragCtx.current?.featureId, fromPt);
        updateSnapMarker(snap);
        if (draftCoords.current && draftCoords.current.length && !measureFrozen.current) {
          const preview = snap ? snap.coord : [e.lngLat.lng, e.lngLat.lat];
          const prevCoords = draftCoords.current.slice();
          draftCoords.current = [...prevCoords, preview];
          renderDraft();
          draftCoords.current = prevCoords;
        }
        return;
      }

      if (dragCtx.current) {
        const { features, updateFeatureGeometry } = useStore.getState();
        const snap = findSnapPoint(e.point, dragCtx.current.featureId);
        updateSnapMarker(snap);
        const lngLat = snap ? snap.coord : [e.lngLat.lng, e.lngLat.lat];
        const f = features.find((x) => x.id === dragCtx.current.featureId);
        if (!f) return;
        if (dragCtx.current.type === 'vertex') {
          const { ringIndex, vertIndex } = dragCtx.current;
          const geom = JSON.parse(JSON.stringify(f.geometry));
          if (geom.type === 'Point') geom.coordinates = lngLat;
          else if (geom.type === 'LineString') geom.coordinates[vertIndex] = lngLat;
          else if (geom.type === 'Polygon') {
            geom.coordinates[ringIndex][vertIndex] = lngLat;
            if (vertIndex === 0) geom.coordinates[ringIndex][geom.coordinates[ringIndex].length - 1] = lngLat;
          }
          updateFeatureGeometry(f.id, geom);
        } else if (dragCtx.current.type === 'feature') {
          const dx = lngLat[0] - dragCtx.current.lastLngLat[0];
          const dy = lngLat[1] - dragCtx.current.lastLngLat[1];
          const geom = JSON.parse(JSON.stringify(f.geometry));
          const shift = (c) => [c[0] + dx, c[1] + dy];
          if (geom.type === 'Point') geom.coordinates = shift(geom.coordinates);
          else if (geom.type === 'LineString') geom.coordinates = geom.coordinates.map(shift);
          else if (geom.type === 'Polygon') geom.coordinates = geom.coordinates.map((ring) => ring.map(shift));
          updateFeatureGeometry(f.id, geom);
          dragCtx.current.lastLngLat = lngLat;
        }
      }
    }

    function onMapMouseDown(e) {
      const { mode, selectedId, features } = useStore.getState();
      if (mode !== 'select') return;
      if (selectedId && map.getLayer('vertex-layer')) {
        const vHit = map.queryRenderedFeatures(e.point, { layers: ['vertex-layer'] });
        if (vHit.length) {
          e.preventDefault();
          const vp = vHit[0].properties;
          dragCtx.current = { type: 'vertex', featureId: vp.featureId, ringIndex: vp.ringIndex ?? 0, vertIndex: vp.vertIndex };
          return;
        }
      }
      const hit = map.queryRenderedFeatures(e.point, { layers: selectableLayers(map) });
      if (hit.length) {
        const hp = hit[0].properties || {};
        const fid = String(hp.parentId || hp.featureId || hit[0].id);
        if (features.some((f) => f.id === fid)) {
          e.preventDefault();
          useStore.getState().setSelectedId(fid);
          dragCtx.current = { type: 'feature', featureId: fid, lastLngLat: [e.lngLat.lng, e.lngLat.lat] };
        }
      }
    }

    function onMapMouseUp() {
      if (dragCtx.current) { useStore.getState().pushHistory(); }
      dragCtx.current = null;
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') cancelDraft();
      if (e.key === 'Enter') finishDraft();
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId, deleteFeature, pushHistory } = useStore.getState();
        if (selectedId && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          pushHistory();
          deleteFeature(selectedId);
        }
      }
    }

    map.on('click', onMapClick);
    map.on('dblclick', onMapDblClick);
    map.on('mousemove', onMapMouseMove);
    map.on('mousedown', onMapMouseDown);
    map.on('mouseup', onMapMouseUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      map.off('click', onMapClick);
      map.off('dblclick', onMapDblClick);
      map.off('mousemove', onMapMouseMove);
      map.off('mousedown', onMapMouseDown);
      map.off('mouseup', onMapMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [map, ready]);

  // Mod değişince taslağı temizle + stil senkronize et
  const mode = useStore((s) => s.mode);
  useEffect(() => {
    draftCoords.current = null;
    measureFrozen.current = false;
    if (map && window.__syncDraftStyleToActiveLayer && isVertexDrawMode(mode)) window.__syncDraftStyleToActiveLayer();
    if (map) {
      const src = map.getSource && map.getSource('draft');
      src && src.setData(fc([]));
      map.getSource('draft-vertices')?.setData(fc([]));
      map.getSource('draft-label')?.setData(fc([]));
      if (map.getLayer('vertex-layer')) map.setLayoutProperty('vertex-layer', 'visibility', mode === 'select' ? 'visible' : 'none');
      map.getCanvas().style.cursor = mode === 'select' ? 'pointer' : isCoordEntryMode(mode) ? 'crosshair' : '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, map]);

  const activeLayerId = useStore((s) => s.activeLayerId);
  useEffect(() => { if (map && window.__syncDraftStyleToActiveLayer) window.__syncDraftStyleToActiveLayer(); }, [activeLayerId, map]);
}

export { isVertexDrawMode, isMeasureMode, isCoordEntryMode, measureFeature };
