import { fc } from './geometry.js';
import * as turf from '@turf/turf';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function coordToKml(c: number[]): string { return c.join(',') + ',0'; }

export function featuresToKML(feats: any[]): string {
  const parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>'];
  feats.forEach((f) => {
    const g = f.geometry;
    let geomXml = '';
    if (g.type === 'Point') geomXml = `<Point><coordinates>${coordToKml(g.coordinates)}</coordinates></Point>`;
    else if (g.type === 'LineString') geomXml = `<LineString><coordinates>${g.coordinates.map(coordToKml).join(' ')}</coordinates></LineString>`;
    else if (g.type === 'Polygon') geomXml = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${g.coordinates[0].map(coordToKml).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    const name = (f.properties && f.properties.name) || '';
    parts.push(`<Placemark><name>${name}</name>${geomXml}</Placemark>`);
  });
  parts.push('</Document></kml>');
  return parts.join('');
}

export function featuresToDXF(feats: any[]): string {
  const origin = feats[0]?.geometry?.coordinates?.[0]?.[0] !== undefined
    ? feats[0].geometry.coordinates[0]
    : feats[0]?.geometry?.coordinates || [0, 0];
  const [olng, olat] = Array.isArray(origin[0]) ? origin[0] : origin;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((olat * Math.PI) / 180);
  const toXY = (c: number[]) => [(c[0] - olng) * mPerDegLng, (c[1] - olat) * mPerDegLat];

  const lines = ['0', 'SECTION', '2', 'ENTITIES'];
  feats.forEach((f) => {
    const g = f.geometry;
    if (g.type === 'Point') {
      const [x, y] = toXY(g.coordinates);
      lines.push('0', 'POINT', '8', '0', '10', String(x), '20', String(y), '30', '0');
    } else if (g.type === 'LineString' || g.type === 'Polygon') {
      const ring = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates;
      lines.push('0', 'POLYLINE', '8', '0', '66', '1');
      ring.forEach((c: number[]) => {
        const [x, y] = toXY(c);
        lines.push('0', 'VERTEX', '8', '0', '10', String(x), '20', String(y), '30', '0');
      });
      lines.push('0', 'SEQEND');
    }
  });
  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n');
}

function writeInt32LE(view: DataView, offset: number, val: number) { view.setInt32(offset, val, true); }
function writeInt32BE(view: DataView, offset: number, val: number) { view.setInt32(offset, val, false); }
function writeDoubleLE(view: DataView, offset: number, val: number) { view.setFloat64(offset, val, true); }

export function buildShapefileBuffers(feats: any[], shapeType: number): { shp: Uint8Array, shx: Uint8Array } {
  const records = feats.map((f) => {
    const g = f.geometry;
    if (shapeType === 1) return { points: [g.coordinates] };
    if (shapeType === 3) return { parts: [g.coordinates] };
    return { parts: [g.coordinates[0]] };
  });

  let contentLen = 0;
  const recBuffers = records.map((r: any, i) => {
    let bodyLen;
    if (shapeType === 1) bodyLen = 20;
    else {
      const totalPoints = r.parts.reduce((s: number, p: any[]) => s + p.length, 0);
      bodyLen = 4 + 4 + 4 + 4 * r.parts.length + 16 * totalPoints + 32;
    }
    const recLenWords = bodyLen / 2;
    const buf = new ArrayBuffer(8 + bodyLen);
    const view = new DataView(buf);
    writeInt32BE(view, 0, i + 1);
    writeInt32BE(view, 4, recLenWords);
    writeInt32LE(view, 8, shapeType);
    if (shapeType === 1) {
      writeDoubleLE(view, 12, r.points[0][0]);
      writeDoubleLE(view, 20, r.points[0][1]);
    } else {
      const allPts = r.parts.flat();
      const xs = allPts.map((p: any) => p[0]), ys = allPts.map((p: any) => p[1]);
      let o = 12;
      writeDoubleLE(view, o, Math.min(...xs)); o += 8;
      writeDoubleLE(view, o, Math.min(...ys)); o += 8;
      writeDoubleLE(view, o, Math.max(...xs)); o += 8;
      writeDoubleLE(view, o, Math.max(...ys)); o += 8;
      writeInt32LE(view, o, r.parts.length); o += 4;
      writeInt32LE(view, o, allPts.length); o += 4;
      let idx = 0;
      r.parts.forEach((p: any) => { writeInt32LE(view, o, idx); o += 4; idx += p.length; });
      allPts.forEach((p: any) => { writeDoubleLE(view, o, p[0]); o += 8; writeDoubleLE(view, o, p[1]); o += 8; });
    }
    contentLen += 8 + bodyLen;
    return buf;
  });

  const fileLenWords = (100 + contentLen) / 2;
  const shpHeader = new ArrayBuffer(100);
  const shv = new DataView(shpHeader);
  writeInt32BE(shv, 0, 9994);
  writeInt32BE(shv, 24, fileLenWords);
  writeInt32LE(shv, 28, 1000);
  writeInt32LE(shv, 32, shapeType);
  writeDoubleLE(shv, 36, -180); writeDoubleLE(shv, 44, -90);
  writeDoubleLE(shv, 52, 180); writeDoubleLE(shv, 60, 90);

  const shxHeader = shpHeader.slice(0);
  const shxView = new DataView(shxHeader);
  writeInt32BE(shxView, 24, (100 + records.length * 8) / 2);

  let offsetWords = 50;
  const shxRecords = records.map((_, i) => {
    const buf = new ArrayBuffer(8);
    const v = new DataView(buf);
    writeInt32BE(v, 0, offsetWords);
    const bodyLen = shapeType === 1 ? 20 : recBuffers[i].byteLength - 8;
    writeInt32BE(v, 4, bodyLen / 2);
    offsetWords += 4 + bodyLen / 2;
    return buf;
  });

  const shpParts = [shpHeader, ...recBuffers];
  const shxParts = [shxHeader, ...shxRecords];
  const concat = (parts: ArrayBuffer[]) => {
    const total = parts.reduce((s, p) => s + p.byteLength, 0);
    const out = new Uint8Array(total);
    let off = 0;
    parts.forEach((p) => { out.set(new Uint8Array(p), off); off += p.byteLength; });
    return out;
  };
  return { shp: concat(shpParts), shx: concat(shxParts) };
}

export function buildDBF(feats: any[]): Uint8Array {
  const fieldName = 'NAME';
  const fieldLen = 60;
  const header = new Uint8Array(32 + 32 + 1);
  header[0] = 0x03;
  const now = new Date();
  header[1] = now.getFullYear() - 1900; header[2] = now.getMonth() + 1; header[3] = now.getDate();
  const numRecords = feats.length;
  new DataView(header.buffer).setUint32(4, numRecords, true);
  new DataView(header.buffer).setUint16(8, 32 + 32 + 1, true);
  new DataView(header.buffer).setUint16(10, 1 + fieldLen, true);
  for (let i = 0; i < fieldName.length; i++) header[32 + i] = fieldName.charCodeAt(i);
  header[32 + 11] = 0x43; // 'C'
  header[32 + 16] = fieldLen;
  header[32 + 32] = 0x0d;

  const recordSize = 1 + fieldLen;
  const body = new Uint8Array(recordSize * feats.length);
  feats.forEach((f, i) => {
    const off = i * recordSize;
    body[off] = 0x20;
    const name = ((f.properties && (f.properties.name || f.properties.description)) || '').toString().slice(0, fieldLen);
    for (let j = 0; j < fieldLen; j++) body[off + 1 + j] = j < name.length ? name.charCodeAt(j) : 0x20;
  });

  const out = new Uint8Array(header.length + body.length + 1);
  out.set(header, 0); out.set(body, header.length); out[out.length - 1] = 0x1a;
  return out;
}

export async function exportLayerAs(layerId: string, format: string, layers: any[], features: any[], JSZip: any): Promise<{ ok: boolean, msg: string }> {
  const lyr = layers.find((l) => l.id === layerId);
  if (!lyr) return { ok: false, msg: 'Katman bulunamadı.' };
  const feats = features.filter((f) => f.properties?.layerId === layerId);
  if (!feats.length) return { ok: false, msg: 'Bu katmanda dışa aktarılacak şekil yok.' };
  const baseName = (lyr.name || 'katman').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'katman';

  if (format === 'geojson') {
    downloadBlob(new Blob([JSON.stringify(fc(feats), null, 2)], { type: 'application/geo+json' }), baseName + '.geojson');
    return { ok: true, msg: baseName + '.geojson indirildi.' };
  }
  if (format === 'kml') {
    downloadBlob(new Blob([featuresToKML(feats)], { type: 'application/vnd.google-earth.kml+xml' }), baseName + '.kml');
    return { ok: true, msg: baseName + '.kml indirildi.' };
  }
  if (format === 'kmz') {
    const zip = new JSZip();
    zip.file('doc.kml', featuresToKML(feats));
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, baseName + '.kmz');
    return { ok: true, msg: baseName + '.kmz indirildi.' };
  }
  if (format === 'dxf') {
    downloadBlob(new Blob([featuresToDXF(feats)], { type: 'application/dxf' }), baseName + '.dxf');
    return { ok: true, msg: baseName + '.dxf indirildi (yerel metre koordinatlarında).' };
  }
  if (format === 'shp') {
    const groups: Record<number, any[]> = { 1: [], 3: [], 5: [] };
    feats.forEach((f) => {
      if (f.geometry.type === 'Point') groups[1].push(f);
      else if (f.geometry.type === 'LineString') groups[3].push(f);
      else if (f.geometry.type === 'Polygon') groups[5].push(f);
    });
    const names: Record<number, string> = { 1: 'points', 3: 'lines', 5: 'polygons' };
    const zip = new JSZip();
    let any = false;
    for (const key of [1, 3, 5]) {
      const arr = groups[key];
      if (!arr || !arr.length) continue;
      any = true;
      const built = buildShapefileBuffers(arr, key);
      zip.file(names[key] + '.shp', built.shp);
      zip.file(names[key] + '.shx', built.shx);
      zip.file(names[key] + '.dbf', buildDBF(arr));
    }
    if (!any) return { ok: false, msg: 'Dışa aktarılacak şekil yok.' };
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, baseName + '-shapefile.zip');
    return { ok: true, msg: baseName + '-shapefile.zip indirildi.' };
  }
  if (format === 'gpkg') {
    return { ok: false, msg: "GeoPackage bu ortamda desteklenmiyor — GeoJSON indirip QGIS ile GPKG'ye dönüştürebilirsiniz." };
  }
  return { ok: false, msg: 'Bilinmeyen format.' };
}
