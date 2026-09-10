import * as turf from '@turf/turf';
import JSZip from 'jszip';

// ---------------------------------------------------------------------
// Label rotation: keeps a text label parallel to its measurement line
// while staying upright/readable regardless of the line's direction.
// ---------------------------------------------------------------------
export function labelRotationForBearing(bearingDeg: number): number {
  let angle = bearingDeg - 90;
  angle = ((angle + 180) % 360 + 360) % 360 - 180;
  if (angle > 90 || angle < -90) {
    angle += 180;
    angle = ((angle + 180) % 360 + 360) % 360 - 180;
  }
  return angle;
}

// ---------------------------------------------------------------------
// Convex Hull 2D (Monotone Chain Algorithm)
// ---------------------------------------------------------------------
export function convexHull2D(points: [number, number][]): [number, number][] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;

  const cross = (o: [number, number], a: [number, number], b: [number, number]) => {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  };

  const lower: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) {
      lower.pop();
    }
    lower.push(pts[i]);
  }

  const upper: [number, number][] = [];
  for (let j = pts.length - 1; j >= 0; j--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[j]) <= 0) {
      upper.pop();
    }
    upper.push(pts[j]);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// ---------------------------------------------------------------------
// Sun Position & Shadow Projection Algorithm
// ---------------------------------------------------------------------
export function getSunPosition(date: Date, lat: number, lon: number) {
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const d = date.getTime() / dayMs - 0.5 + J1970 - J2000;
  const e = rad * 23.4397;
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const lw = rad * -lon;
  const phi = rad * lat;
  const theta = rad * (280.16 + 360.9856235 * d) - lw;
  const H = theta - ra;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const shadowBearingDeg = ((azSouth * 180 / Math.PI) % 360 + 360) % 360;
  return {
    altitudeDeg: altitude * 180 / Math.PI,
    shadowBearingDeg: shadowBearingDeg
  };
}

export function computeShadowForFeature(f: any, sun: { altitudeDeg: number; shadowBearingDeg: number }) {
  if (sun.altitudeDeg <= 0.5) return null;
  const height = f.properties?.height || 30;
  const shadowLenM = Math.min(height / Math.tan(sun.altitudeDeg * Math.PI / 180), 2000);
  if (!(shadowLenM > 0)) return null;
  try {
    const ring = f.geometry.coordinates[0];
    const translated = ring.map((c: [number, number]) => {
      const dest = turf.destination(turf.point(c), shadowLenM / 1000, sun.shadowBearingDeg, { units: 'kilometers' });
      return dest.geometry.coordinates;
    });
    const hull = convexHull2D(ring.concat(translated));
    if (hull.length < 3) return null;
    hull.push(hull[0]);
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [hull] },
      properties: { parentId: f.id }
    };
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------
// KML / KMZ Parsers
// ---------------------------------------------------------------------
function kmlCoordsText(text: string): [number, number][] {
  return text.trim().split(/\s+/).filter(Boolean).map(t => {
    const p = t.split(',').map(Number);
    return [p[0], p[1]];
  });
}

function kmlGeomToGeoJSON(tag: string, el: Element): any {
  if (tag === 'Point') {
    const c = el.getElementsByTagName('coordinates')[0];
    if (!c) return null;
    const pts = kmlCoordsText(c.textContent || '');
    return pts.length ? { type: 'Point', coordinates: pts[0] } : null;
  }
  if (tag === 'LineString') {
    const c2 = el.getElementsByTagName('coordinates')[0];
    if (!c2) return null;
    return { type: 'LineString', coordinates: kmlCoordsText(c2.textContent || '') };
  }
  if (tag === 'Polygon') {
    const outer = el.getElementsByTagName('outerBoundaryIs')[0];
    if (!outer) return null;
    const c3 = outer.getElementsByTagName('coordinates')[0];
    if (!c3) return null;
    return { type: 'Polygon', coordinates: [kmlCoordsText(c3.textContent || '')] };
  }
  return null;
}

export function parseKML(text: string): any[] {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const feats: any[] = [];
  const placemarks = doc.getElementsByTagName('Placemark');
  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const name = nameEl ? nameEl.textContent?.trim() : '';
    ['Point', 'LineString', 'Polygon'].forEach(tag => {
      const els = pm.getElementsByTagName(tag);
      for (let j = 0; j < els.length; j++) {
        const g = kmlGeomToGeoJSON(tag, els[j]);
        if (g) {
          feats.push({
            type: 'Feature',
            geometry: g,
            properties: name ? { name } : {}
          });
        }
      }
    });
  }
  return feats;
}

export async function parseKMZ(buffer: ArrayBuffer): Promise<any[]> {
  const zip = await JSZip.loadAsync(buffer);
  let kmlEntry: any = null;
  zip.forEach((path, file) => {
    if (!kmlEntry && /\.kml$/i.test(path)) kmlEntry = file;
  });
  if (!kmlEntry) throw new Error('KMZ içinde .kml bulunamadı');
  const text = await kmlEntry.async('string');
  return parseKML(text);
}

// ---------------------------------------------------------------------
// GML Parser
// ---------------------------------------------------------------------
export function parseGML(text: string): any[] {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const feats: any[] = [];
  function posListToCoords(str: string): [number, number][] {
    const n = str.trim().split(/\s+/).map(Number);
    const out: [number, number][] = [];
    for (let i = 0; i + 1 < n.length; i += 2) {
      out.push([n[i], n[i+1]]);
    }
    return out;
  }
  Array.prototype.forEach.call(doc.getElementsByTagNameNS('*', 'Point'), (p: Element) => {
    const pos = p.getElementsByTagNameNS('*', 'pos')[0];
    if (pos) {
      const n = (pos.textContent || '').trim().split(/\s+/).map(Number);
      feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [n[0], n[1]] }, properties: {} });
    }
  });
  Array.prototype.forEach.call(doc.getElementsByTagNameNS('*', 'LineString'), (l: Element) => {
    const pl = l.getElementsByTagNameNS('*', 'posList')[0];
    if (pl) {
      feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: posListToCoords(pl.textContent || '') }, properties: {} });
    }
  });
  Array.prototype.forEach.call(doc.getElementsByTagNameNS('*', 'Polygon'), (pg: Element) => {
    const ext = pg.getElementsByTagNameNS('*', 'exterior')[0] || pg.getElementsByTagNameNS('*', 'outerBoundaryIs')[0];
    if (!ext) return;
    const pl = ext.getElementsByTagNameNS('*', 'posList')[0];
    if (pl) {
      feats.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [posListToCoords(pl.textContent || '')] }, properties: {} });
    }
  });
  return feats;
}

// ---------------------------------------------------------------------
// Shapefile Parser & Builder
// ---------------------------------------------------------------------
export function parseSHP(buffer: ArrayBuffer): any[] {
  const dv = new DataView(buffer);
  let pos = 100;
  const feats: any[] = [];
  while (pos + 8 <= buffer.byteLength) {
    pos += 4; // record no
    const contentWords = dv.getInt32(pos, false);
    pos += 4;
    const contentBytes = contentWords * 2;
    const recEnd = pos + contentBytes;
    const shapeType = dv.getInt32(pos, true);
    let p = pos + 4;
    try {
      if (shapeType === 1 || shapeType === 11 || shapeType === 21) {
        const x = dv.getFloat64(p, true);
        const y = dv.getFloat64(p + 8, true);
        feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [x, y] }, properties: {} });
      } else if (shapeType === 3 || shapeType === 5 || shapeType === 13 || shapeType === 15) {
        p += 32; // bbox
        const numParts = dv.getInt32(p, true);
        p += 4;
        const numPoints = dv.getInt32(p, true);
        p += 4;
        const parts: number[] = [];
        for (let i = 0; i < numParts; i++) {
          parts.push(dv.getInt32(p, true));
          p += 4;
        }
        const allPts: [number, number][] = [];
        for (let j = 0; j < numPoints; j++) {
          allPts.push([dv.getFloat64(p, true), dv.getFloat64(p + 8, true)]);
          p += 16;
        }
        for (let k = 0; k < numParts; k++) {
          const s = parts[k];
          const e = (k + 1 < numParts) ? parts[k + 1] : numPoints;
          const ring = allPts.slice(s, e);
          if (shapeType === 3 || shapeType === 13) {
            feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: ring }, properties: {} });
          } else {
            feats.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} });
          }
        }
      } else if (shapeType === 8) {
        p += 32;
        const numPts = dv.getInt32(p, true);
        p += 4;
        for (let m = 0; m < numPts; m++) {
          feats.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [dv.getFloat64(p, true), dv.getFloat64(p + 8, true)] },
            properties: {}
          });
          p += 16;
        }
      }
    } catch (e) {
      // ignore
    }
    pos = recEnd;
  }
  return feats;
}

export function parseDBF(buffer: ArrayBuffer): any[] {
  const dv = new DataView(buffer);
  const numRecords = dv.getInt32(4, true);
  const headerSize = dv.getUint16(8, true);
  const recordSize = dv.getUint16(10, true);
  const fields: { name: string; length: number }[] = [];
  let offset = 32;
  while (offset < buffer.byteLength && dv.getUint8(offset) !== 0x0D) {
    const nameBytes = new Uint8Array(buffer, offset, 11);
    let name = '';
    for (let i = 0; i < 11; i++) {
      if (nameBytes[i] === 0) break;
      name += String.fromCharCode(nameBytes[i]);
    }
    fields.push({ name, length: dv.getUint8(offset + 16) });
    offset += 32;
  }
  const records: any[] = [];
  let recStart = headerSize;
  for (let r = 0; r < numRecords; r++) {
    const base = recStart + r * recordSize;
    if (base + recordSize > buffer.byteLength) break;
    const deleted = dv.getUint8(base) === 0x2A;
    const rec: any = {};
    let fo = base + 1;
    fields.forEach(f => {
      const bytes = new Uint8Array(buffer, fo, f.length);
      let str = '';
      for (let bi = 0; bi < bytes.length; bi++) str += String.fromCharCode(bytes[bi]);
      rec[f.name] = str.trim();
      fo += f.length;
    });
    if (!deleted) records.push(rec);
  }
  return records;
}

export async function parseShapefileZip(buffer: ArrayBuffer): Promise<any[]> {
  const zip = await JSZip.loadAsync(buffer);
  let shpEntry: any = null;
  let dbfEntry: any = null;
  zip.forEach((path, file) => {
    if (!shpEntry && /\.shp$/i.test(path)) shpEntry = file;
    if (!dbfEntry && /\.dbf$/i.test(path)) dbfEntry = file;
  });
  if (!shpEntry) throw new Error('.zip içinde .shp bulunamadı');
  const feats = parseSHP(await shpEntry.async('arraybuffer'));
  if (dbfEntry) {
    try {
      const records = parseDBF(await dbfEntry.async('arraybuffer'));
      feats.forEach((f, i) => {
        if (records[i]) f.properties = records[i];
      });
    } catch (e) {
      // properties skip
    }
  }
  return feats;
}

// ---------------------------------------------------------------------
// DXF Parser
// ---------------------------------------------------------------------
export function parseDXF(text: string): any[] {
  const raw = text.split(/\r\n|\r|\n/);
  const pairs: [number, string][] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    pairs.push([parseInt(raw[i].trim(), 10) || 0, raw[i + 1].trim()]);
  }
  const feats: any[] = [];
  let idx = 0;
  while (idx < pairs.length && !(pairs[idx][0] === 2 && pairs[idx][1] === 'ENTITIES')) idx++;
  idx++;
  while (idx < pairs.length) {
    const code = pairs[idx][0];
    const val = pairs[idx][1];
    if (code === 0 && val === 'ENDSEC') break;
    if (code === 0 && (val === 'LINE' || val === 'POINT' || val === 'CIRCLE' || val === 'LWPOLYLINE')) {
      const type = val;
      idx++;
      const props: any = {};
      const verts: [number, number][] = [];
      let curX: number | null = null;
      while (idx < pairs.length && pairs[idx][0] !== 0) {
        const c = pairs[idx][0];
        const v = pairs[idx][1];
        if (type === 'LWPOLYLINE') {
          if (c === 10) curX = parseFloat(v);
          else if (c === 20) {
            if (curX !== null) verts.push([curX, parseFloat(v)]);
            curX = null;
          } else if (c === 70) props.flags = parseInt(v, 10) || 0;
        } else if (props[c] === undefined) props[c] = v;
        idx++;
      }
      if (type === 'LINE') {
        const x1 = parseFloat(props[10]);
        const y1 = parseFloat(props[20]);
        const x2 = parseFloat(props[11]);
        const y2 = parseFloat(props[21]);
        if (![x1, y1, x2, y2].some(isNaN)) {
          feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[x1, y1], [x2, y2]] }, properties: {} });
        }
      } else if (type === 'POINT') {
        const px = parseFloat(props[10]);
        const py = parseFloat(props[20]);
        if (!isNaN(px) && !isNaN(py)) {
          feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [px, py] }, properties: {} });
        }
      } else if (type === 'CIRCLE') {
        const cx = parseFloat(props[10]);
        const cy = parseFloat(props[20]);
        const rr = parseFloat(props[40]);
        if (![cx, cy, rr].some(isNaN)) {
          const ring: [number, number][] = [];
          const steps = 48;
          for (let s = 0; s <= steps; s++) {
            const a = (s / steps) * 2 * Math.PI;
            ring.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
          }
          feats.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: { shape: 'circle' } });
        }
      } else if (type === 'LWPOLYLINE' && verts.length >= 2) {
        const closed = ((props.flags || 0) & 1) === 1;
        const coords = verts.slice();
        if (closed) {
          coords.push(coords[0]);
          feats.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} });
        } else {
          feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} });
        }
      }
      continue;
    }
    idx++;
  }
  return feats;
}

export function collectCoords(coords: any, out: [number, number][]): void {
  if (typeof coords[0] === 'number') {
    out.push(coords as [number, number]);
  } else {
    coords.forEach((c: any) => collectCoords(c, out));
  }
}

export function placeDXFOnMap(rawFeats: any[], scale: number, center: { lng: number; lat: number }): any[] {
  const allCoords: [number, number][] = [];
  rawFeats.forEach(f => collectCoords(f.geometry.coordinates, allCoords));
  if (!allCoords.length) return [];
  const cx = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
  const cy = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;
  const latRad = center.lat * Math.PI / 180;
  function transform(c: [number, number]): [number, number] {
    const dx = (c[0] - cx) * scale;
    const dy = (c[1] - cy) * scale;
    return [
      center.lng + dx / (111320 * Math.cos(latRad)),
      center.lat + dy / 111320
    ];
  }
  function mapCoords(coords: any): any {
    return (typeof coords[0] === 'number') ? transform(coords as [number, number]) : coords.map(mapCoords);
  }
  return rawFeats.map(f => {
    return {
      type: 'Feature',
      geometry: { type: f.geometry.type, coordinates: mapCoords(f.geometry.coordinates) },
      properties: f.properties || {}
    };
  });
}

// ---------------------------------------------------------------------
// GLTF / GLB (BIM model base extraction)
// ---------------------------------------------------------------------
const GLTF_IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function gltfComposeTRS(t: number[] | undefined, r: number[] | undefined, s: number[] | undefined) {
  t = t || [0, 0, 0];
  r = r || [0, 0, 0, 1];
  s = s || [1, 1, 1];
  const x = r[0], y = r[1], z = r[2], w = r[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  const sx = s[0], sy = s[1], sz = s[2];
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1
  ];
}

function gltfMulMat4(a: number[], b: number[]) {
  const out = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function gltfTransformPoint(m: number[], p: number[]) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
  ];
}

function gltfTraverseNodes(gltf: any, nodeIndices: number[], parentMatrix: number[], cb: (meshIndex: number, worldMatrix: number[]) => void) {
  (nodeIndices || []).forEach(idx => {
    const node = (gltf.nodes || [])[idx];
    if (!node) return;
    const local = node.matrix || gltfComposeTRS(node.translation, node.rotation, node.scale);
    const world = gltfMulMat4(parentMatrix, local);
    if (node.mesh !== undefined) cb(node.mesh, world);
    if (node.children) gltfTraverseNodes(gltf, node.children, world, cb);
  });
}

function gltfAccessorData(gltf: any, buffers: ArrayBuffer[], accessorIndex: number) {
  const accessor = gltf.accessors[accessorIndex];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const buffer = buffers[bufferView.buffer];
  const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const typeCounts: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const numComponents = typeCounts[accessor.type] || 1;
  const componentType = accessor.componentType;
  const componentSize = (componentType === 5126 || componentType === 5125) ? 4 : (componentType === 5123 || componentType === 5122) ? 2 : 1;
  const stride = bufferView.byteStride || (numComponents * componentSize);
  const dv = new DataView(buffer, byteOffset);
  const out: number[][] = [];
  for (let i = 0; i < accessor.count; i++) {
    const base = i * stride;
    const vec: number[] = [];
    for (let c = 0; c < numComponents; c++) {
      const off = base + c * componentSize;
      let val: number;
      if (componentType === 5126) val = dv.getFloat32(off, true);
      else if (componentType === 5125) val = dv.getUint32(off, true);
      else if (componentType === 5123) val = dv.getUint16(off, true);
      else if (componentType === 5122) val = dv.getInt16(off, true);
      else if (componentType === 5121) val = dv.getUint8(off);
      else val = dv.getInt8(off);
      vec.push(val);
    }
    out.push(vec);
  }
  return out;
}

function gltfDecodeDataURI(uri: string): ArrayBuffer {
  const binary = atob(uri.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function gltfLoadBuffers(gltf: any, siblingFiles: File[]): Promise<ArrayBuffer[]> {
  const buffers: ArrayBuffer[] = [];
  for (let i = 0; i < (gltf.buffers || []).length; i++) {
    const b = gltf.buffers[i];
    if (!b.uri) {
      buffers.push(new ArrayBuffer(0));
      continue;
    }
    if (/^data:/.test(b.uri)) {
      buffers.push(gltfDecodeDataURI(b.uri));
      continue;
    }
    const fname = decodeURIComponent(b.uri.split('/').pop() || '');
    const match = (siblingFiles || []).find(f => f.name === fname);
    if (!match) throw new Error('.bin dosyası bulunamadı: ' + fname + ' (aynı anda modelle birlikte seçin)');
    buffers.push(await match.arrayBuffer());
  }
  return buffers;
}

export async function parseGLTFOrGLB(file: File, siblingFiles: File[]): Promise<{ footprint: [number, number][]; height: number }> {
  const isGLB = /\.glb$/i.test(file.name);
  let gltf: any;
  let buffers: ArrayBuffer[];
  if (isGLB) {
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('geçersiz GLB dosyası');
    const length = dv.getUint32(8, true);
    let offset = 12;
    let jsonChunk: ArrayBuffer | null = null;
    let binChunk: ArrayBuffer | null = null;
    while (offset < length) {
      const chunkLen = dv.getUint32(offset, true);
      const chunkType = dv.getUint32(offset + 4, true);
      const chunkData = buf.slice(offset + 8, offset + 8 + chunkLen);
      if (chunkType === 0x4E4F534A) jsonChunk = chunkData;
      else if (chunkType === 0x004E4942) binChunk = chunkData;
      offset += 8 + chunkLen;
    }
    if (!jsonChunk) throw new Error('GLB içinde JSON parçası bulunamadı');
    gltf = JSON.parse(new TextDecoder('utf-8').decode(jsonChunk));
    buffers = await gltfLoadBuffers(gltf, siblingFiles);
    if (binChunk && buffers.length) buffers[0] = binChunk;
  } else {
    gltf = JSON.parse(await file.text());
    buffers = await gltfLoadBuffers(gltf, siblingFiles);
  }

  const points3D: number[][] = [];
  const sceneDef = (gltf.scenes && gltf.scenes[gltf.scene || 0]) || { nodes: (gltf.nodes || []).map((_: any, i: number) => i) };
  gltfTraverseNodes(gltf, sceneDef.nodes, GLTF_IDENTITY, (meshIndex, worldMatrix) => {
    const mesh = gltf.meshes[meshIndex];
    if (!mesh) return;
    (mesh.primitives || []).forEach((prim: any) => {
      const posIdx = prim.attributes && prim.attributes.POSITION;
      if (posIdx === undefined) return;
      gltfAccessorData(gltf, buffers, posIdx).forEach(p => {
        points3D.push(gltfTransformPoint(worldMatrix, p));
      });
    });
  });
  if (!points3D.length) throw new Error('modelde geometri (POSITION) bulunamadı');

  const pts2D = points3D.map(p => [p[0], p[2]] as [number, number]); // Tabana izdüşüm: X, Z
  const ys = points3D.map(p => p[1]);
  const height = Math.max(0.5, Math.max(...ys) - Math.min(...ys));
  const hull = convexHull2D(pts2D);
  if (hull.length < 3) throw new Error('model için düzlemsel bir taban çıkarılamadı');
  return { footprint: hull, height };
}

// ---------------------------------------------------------------------
// IFC Parser
// ---------------------------------------------------------------------
export function ifcLengthUnitScale(flatText: string): number {
  const m = flatText.match(/IFCSIUNIT\([^;]*\.LENGTHUNIT\.\s*,\s*\.([A-Z]*)\.\s*,\s*\.METRE\.\s*\)/);
  if (!m) return 1;
  const prefixScale: Record<string, number> = { MILLI: 0.001, CENTI: 0.01, DECI: 0.1, DECA: 10, HECTO: 100, KILO: 1000 };
  return (m[1] && prefixScale[m[1]] !== undefined) ? prefixScale[m[1]] : 1;
}

export function ifcExtractCartesianPoints(flatText: string, scale: number): number[][] {
  const points: number[][] = [];
  const re = /IFCCARTESIANPOINT\(\(\s*([\-0-9.eE]+)\s*,\s*([\-0-9.eE]+)\s*(?:,\s*([\-0-9.eE]+)\s*)?\)\)/g;
  let m;
  while ((m = re.exec(flatText))) {
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    const z = m[3] !== undefined ? parseFloat(m[3]) : 0;
    if (!isNaN(x) && !isNaN(y)) {
      points.push([x * scale, y * scale, (isNaN(z) ? 0 : z) * scale]);
    }
  }
  return points;
}

export async function parseIFCFile(file: File): Promise<{ footprint: [number, number][]; height: number }> {
  const flat = (await file.text()).replace(/\r?\n/g, '');
  const scale = ifcLengthUnitScale(flat);
  const points = ifcExtractCartesianPoints(flat, scale);
  if (!points.length) throw new Error('dosyada IFCCARTESIANPOINT bulunamadı');
  const pts2D = points.map(p => [p[0], p[1]] as [number, number]); // IFC Z-yukarı: taban = X, Y
  const zs = points.map(p => p[2]);
  const height = Math.max(0.5, Math.max(...zs) - Math.min(...zs));
  const hull = convexHull2D(pts2D);
  if (hull.length < 3) throw new Error('düzlemsel bir taban çıkarılamadı');
  return { footprint: hull, height };
}

export function placeLocalRingOnMap(ring2D: [number, number][], scale: number, center: { lng: number; lat: number }): [number, number][] {
  const cx = ring2D.reduce((s, c) => s + c[0], 0) / ring2D.length;
  const cy = ring2D.reduce((s, c) => s + c[1], 0) / ring2D.length;
  const latRad = center.lat * Math.PI / 180;
  return ring2D.map(c => {
    const dx = (c[0] - cx) * scale;
    const dy = (c[1] - cy) * scale;
    return [
      center.lng + dx / (111320 * Math.cos(latRad)),
      center.lat + dy / 111320
    ];
  });
}

// ---------------------------------------------------------------------
// Exporters
// ---------------------------------------------------------------------
export function featuresToKML(feats: any[]): string {
  function coordStr(c: number[]): string {
    return c[0] + ',' + c[1] + ',0';
  }
  const placemarks = feats.map(f => {
    const g = f.geometry;
    let geomXML = '';
    if (g.type === 'Point') {
      geomXML = '<Point><coordinates>' + coordStr(g.coordinates) + '</coordinates></Point>';
    } else if (g.type === 'LineString') {
      geomXML = '<LineString><coordinates>' + g.coordinates.map(coordStr).join(' ') + '</coordinates></LineString>';
    } else if (g.type === 'Polygon') {
      geomXML = '<Polygon><outerBoundaryIs><LinearRing><coordinates>' + g.coordinates[0].map(coordStr).join(' ') + '</coordinates></LinearRing></outerBoundaryIs></Polygon>';
    }
    return '<Placemark>' + geomXML + '</Placemark>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>' + placemarks + '</Document></kml>';
}

export function featuresToDXF(feats: any[]): string {
  const out: string[] = [];
  const add = (code: number, val: any) => {
    out.push(String(code));
    out.push(String(val));
  };
  const allCoords: [number, number][] = [];
  feats.forEach(f => collectCoords(f.geometry.coordinates, allCoords));
  const lonC = allCoords.length ? allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length : 0;
  const latC = allCoords.length ? allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length : 0;
  const cosLat = Math.cos(latC * Math.PI / 180);
  function toLocal(c: [number, number]): [number, number] {
    return [(c[0] - lonC) * 111320 * cosLat, (c[1] - latC) * 111320];
  }
  add(0, 'SECTION');
  add(2, 'ENTITIES');
  feats.forEach(f => {
    const g = f.geometry;
    if (g.type === 'Point') {
      const p = toLocal(g.coordinates);
      add(0, 'POINT'); add(8, '0'); add(10, p[0].toFixed(3)); add(20, p[1].toFixed(3)); add(30, '0');
    } else if (g.type === 'LineString') {
      add(0, 'LWPOLYLINE'); add(8, '0'); add(90, g.coordinates.length); add(70, '0');
      g.coordinates.forEach((c: [number, number]) => {
        const p = toLocal(c);
        add(10, p[0].toFixed(3)); add(20, p[1].toFixed(3));
      });
    } else if (g.type === 'Polygon') {
      const ring = g.coordinates[0];
      add(0, 'LWPOLYLINE'); add(8, '0'); add(90, ring.length - 1); add(70, '1');
      for (let i = 0; i < ring.length - 1; i++) {
        const p2 = toLocal(ring[i]);
        add(10, p2[0].toFixed(3)); add(20, p2[1].toFixed(3));
      }
    }
  });
  add(0, 'ENDSEC');
  add(0, 'EOF');
  return out.join('\n') + '\n';
}

export function buildShapefileBuffers(feats: any[], shapeType: number): { shp: ArrayBuffer; shx: ArrayBuffer } {
  let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  const records: any[] = [];
  feats.forEach(f => {
    const g = f.geometry;
    if (shapeType === 1) {
      const c = g.coordinates;
      xmin = Math.min(xmin, c[0]); xmax = Math.max(xmax, c[0]); ymin = Math.min(ymin, c[1]); ymax = Math.max(ymax, c[1]);
      records.push({ contentBytes: 20, point: c });
    } else {
      const ring = (shapeType === 5) ? g.coordinates[0] : g.coordinates;
      ring.forEach((c: [number, number]) => {
        xmin = Math.min(xmin, c[0]); xmax = Math.max(xmax, c[0]); ymin = Math.min(ymin, c[1]); ymax = Math.max(ymax, c[1]);
      });
      records.push({ contentBytes: 4 + 32 + 4 + 4 + 4 + 16 * ring.length, ring });
    }
  });
  if (!isFinite(xmin)) {
    xmin = ymin = xmax = ymax = 0;
  }
  const shpTotal = 100 + records.reduce((s, r) => s + 8 + r.contentBytes, 0);
  const shxTotal = 100 + records.length * 8;
  const shpBuf = new ArrayBuffer(shpTotal);
  const shxBuf = new ArrayBuffer(shxTotal);
  const shpDv = new DataView(shpBuf);
  const shxDv = new DataView(shxBuf);

  function writeHeader(dv: DataView, lenWords: number) {
    dv.setInt32(0, 9994, false);
    dv.setInt32(24, lenWords, false);
    dv.setInt32(28, 1000, true);
    dv.setInt32(32, shapeType, true);
    dv.setFloat64(36, xmin, true); dv.setFloat64(44, ymin, true);
    dv.setFloat64(52, xmax, true); dv.setFloat64(60, ymax, true);
  }
  writeHeader(shpDv, shpTotal / 2);
  writeHeader(shxDv, shxTotal / 2);

  let shpOff = 100, shxOff = 100;
  records.forEach((r, idx) => {
    const recHeaderStart = shpOff;
    const contentWords = r.contentBytes / 2;
    shpDv.setInt32(shpOff, idx + 1, false); shpOff += 4;
    shpDv.setInt32(shpOff, contentWords, false); shpOff += 4;
    if (shapeType === 1) {
      shpDv.setInt32(shpOff, 1, true); shpOff += 4;
      shpDv.setFloat64(shpOff, r.point[0], true); shpOff += 8;
      shpDv.setFloat64(shpOff, r.point[1], true); shpOff += 8;
    } else {
      shpDv.setInt32(shpOff, shapeType, true); shpOff += 4;
      let rxmin = Infinity, rymin = Infinity, rxmax = -Infinity, rymax = -Infinity;
      r.ring.forEach((c: [number, number]) => {
        rxmin = Math.min(rxmin, c[0]); rxmax = Math.max(rxmax, c[0]); rymin = Math.min(rymin, c[1]); rymax = Math.max(rymax, c[1]);
      });
      shpDv.setFloat64(shpOff, rxmin, true); shpOff += 8;
      shpDv.setFloat64(shpOff, rymin, true); shpOff += 8;
      shpDv.setFloat64(shpOff, rxmax, true); shpOff += 8;
      shpDv.setFloat64(shpOff, rymax, true); shpOff += 8;
      shpDv.setInt32(shpOff, 1, true); shpOff += 4;
      shpDv.setInt32(shpOff, r.ring.length, true); shpOff += 4;
      shpDv.setInt32(shpOff, 0, true); shpOff += 4;
      r.ring.forEach((c: [number, number]) => {
        shpDv.setFloat64(shpOff, c[0], true); shpOff += 8;
        shpDv.setFloat64(shpOff, c[1], true); shpOff += 8;
      });
    }
    shxDv.setInt32(shxOff, recHeaderStart / 2, false); shxOff += 4;
    shxDv.setInt32(shxOff, contentWords, false); shxOff += 4;
  });
  return { shp: shpBuf, shx: shxBuf };
}

export function buildDBF(feats: any[]): ArrayBuffer {
  const n = feats.length;
  const fieldLen = 20;
  const headerSize = 32 + 32 + 1;
  const recordSize = 1 + fieldLen;
  const buf = new ArrayBuffer(headerSize + recordSize * n + 1);
  const dv = new DataView(buf);
  dv.setUint8(0, 0x03);
  const now = new Date();
  dv.setUint8(1, now.getFullYear() - 1900); dv.setUint8(2, now.getMonth() + 1); dv.setUint8(3, now.getDate());
  dv.setUint32(4, n, true);
  dv.setUint16(8, headerSize, true);
  dv.setUint16(10, recordSize, true);
  let offset = 32;
  const fname = 'id';
  for (let i = 0; i < 11; i++) {
    dv.setUint8(offset + i, i < fname.length ? fname.charCodeAt(i) : 0);
  }
  dv.setUint8(offset + 11, 0x43); // character field
  dv.setUint8(offset + 16, fieldLen);
  offset += 32;
  dv.setUint8(offset, 0x0D);
  offset += 1;
  feats.forEach(f => {
    dv.setUint8(offset, 0x20);
    offset += 1;
    const idStr = String(f.id || '').slice(0, fieldLen);
    for (let j = 0; j < fieldLen; j++) {
      dv.setUint8(offset + j, j < idStr.length ? idStr.charCodeAt(j) : 0x20);
    }
    offset += fieldLen;
  });
  dv.setUint8(offset, 0x1A);
  return buf;
}
