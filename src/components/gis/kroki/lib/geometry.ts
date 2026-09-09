import * as turf from '@turf/turf';

export function fc(features: any[]): any {
  return { type: 'FeatureCollection', features };
}

export function ringsOf(feature: any): any[] {
  const g = feature.geometry;
  if (g.type === 'Point') return [[g.coordinates]];
  if (g.type === 'LineString') return [g.coordinates];
  if (g.type === 'Polygon') return g.coordinates;
  return [];
}

export function formatDistance(m: number): string {
  return m < 1000 ? m.toFixed(2) + 'm' : (m / 1000).toFixed(3) + ' km';
}

export function labelRotationForBearing(bearingDeg: number): number {
  let angle = 90 - bearingDeg;
  angle = ((angle + 180) % 360 + 360) % 360 - 180;
  if (angle > 90 || angle < -90) {
    angle += 180;
    angle = ((angle + 180) % 360 + 360) % 360 - 180;
  }
  return angle;
}

export function projectPointOnSegmentPx(p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }): { x: number, y: number } | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return null;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function perpendicularFootPx(fromPx: { x: number, y: number }, aPx: { x: number, y: number }, bPx: { x: number, y: number }): { x: number, y: number } | null {
  const dx = bPx.x - aPx.x, dy = bPx.y - aPx.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return null;
  const t = ((fromPx.x - aPx.x) * dx + (fromPx.y - aPx.y) * dy) / lenSq;
  if (t < 0 || t > 1) return null;
  return { x: aPx.x + t * dx, y: aPx.y + t * dy };
}

export function segmentIntersectionLngLat(p1: number[], p2: number[], p3: number[], p4: number[]): number[] | null {
  const [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3, [x4, y4] = p4;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-14) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

export function convexHull2D(points: number[][]): number[][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: number[][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function segmentLabelsFor(feature: any, map: any): any[] {
  const out: any[] = [];
  let centroidPx: { x: number, y: number } | null = null;
  if (feature.geometry.type === 'Polygon') {
    try { centroidPx = map.project(turf.centroid(feature).geometry.coordinates); } catch { /* yoksay */ }
  }
  function addSegmentLabels(coordsList: number[][]) {
    for (let i = 0; i < coordsList.length - 1; i++) {
      const a = coordsList[i], b = coordsList[i + 1];
      let d: number;
      try { d = turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' }) * 1000; } catch { continue; }
      if (!(d > 0.05)) continue;
      let bearing = 0;
      try { bearing = turf.bearing(turf.point(a), turf.point(b)); } catch { /* yoksay */ }
      let labelCoord: number[];
      try {
        const pa = map.project(a), pb = map.project(b);
        const dx = pb.x - pa.x, dy = pb.y - pa.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const midPx = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        const OFFSET_PX = 11;
        const c1 = { x: midPx.x + nx * OFFSET_PX, y: midPx.y + ny * OFFSET_PX };
        const c2 = { x: midPx.x - nx * OFFSET_PX, y: midPx.y - ny * OFFSET_PX };
        let chosen: { x: number, y: number };
        if (centroidPx) {
          const d1 = Math.hypot(c1.x - centroidPx.x, c1.y - centroidPx.y);
          const d2 = Math.hypot(c2.x - centroidPx.x, c2.y - centroidPx.y);
          chosen = d1 >= d2 ? c1 : c2;
        } else {
          chosen = c1.y <= c2.y ? c1 : c2;
        }
        const ll = map.unproject(chosen);
        labelCoord = [ll.lng, ll.lat];
      } catch {
        labelCoord = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      }
      out.push({ coord: labelCoord, label: formatDistance(d), isArea: false, rotation: labelRotationForBearing(bearing) });
    }
  }
  try {
    if (feature.geometry.type === 'LineString') {
      addSegmentLabels(feature.geometry.coordinates);
    } else if (feature.geometry.type === 'Polygon') {
      addSegmentLabels(feature.geometry.coordinates[0]);
      const area = turf.area(feature);
      const areaStr = area < 10000 ? area.toFixed(2) + ' m²' : (area / 10000).toFixed(2) + ' ha';
      out.push({ coord: turf.centroid(feature).geometry.coordinates, label: areaStr, isArea: true, rotation: 0 });
    }
  } catch { /* geçersiz geometri */ }
  return out;
}

export function measureFeature(feature: any): { kind: string, text: string } {
  if (feature.geometry.type === 'LineString') {
    const len = turf.length(feature, { units: 'kilometers' }) * 1000;
    return { kind: 'distance', text: formatDistance(len) };
  }
  if (feature.geometry.type === 'Polygon') {
    const area = turf.area(feature);
    const lineFeature = turf.polygonToLine(feature);
    const line = Array.isArray(lineFeature) ? lineFeature[0] : lineFeature;
    const perim = turf.length(line, { units: 'kilometers' }) * 1000;
    return { kind: 'area', text: (area < 10000 ? area.toFixed(2) + ' m²' : (area / 10000).toFixed(2) + ' ha') + ' · çevre ' + formatDistance(perim) };
  }
  return { kind: 'point', text: '' };
}

export function getSunPosition(date: Date, lat: number, lon: number): { altitudeDeg: number, shadowBearingDeg: number } {
  const rad = Math.PI / 180;
  const dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;
  const d = date.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const e = rad * 23.4397;
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const lw = rad * -lon, phi = rad * lat;
  const theta = rad * (280.16 + 360.9856235 * d) - lw;
  const H = theta - ra;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const shadowBearingDeg = ((azSouth * 180 / Math.PI) % 360 + 360) % 360;
  return { altitudeDeg: (altitude * 180) / Math.PI, shadowBearingDeg };
}
