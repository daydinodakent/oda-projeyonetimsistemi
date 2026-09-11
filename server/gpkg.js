// Gerçek, standart bir OGC GeoPackage (.gpkg) dosyası üretir — QGIS, ArcGIS
// gibi herhangi bir GIS aracında doğrudan açılabilir. Sadece geometri içeren 3
// CBS/PostGIS tablosu (tb_proje_sinirlari, tb_binalar_3d, tb_altyapi_hatlari)
// için kullanılır; "Dışa Aktar (.gpkg)" akışında (bkz. index.js) talep üzerine
// bellekte üretilip indirilir — uygulamanın çalışma-zamanı veritabanı
// (db.js / oda_pys.gpkg) bundan bağımsızdır — o dosyadaki 3 CBS tablosu
// zaten bu modüldeki aynı WKB kodlayıcı/çözücüyü kullanarak canlı okunup
// yazılıyor; bu fonksiyon ayrıca TEMİZ, sadece bu 3 katmanı içeren
// bağımsız bir dosya indirmek isteyenler için kullanılır.
//
// Not: gpkg dosyası aslında SQLite'tır; burada `node:sqlite` ile GeoPackage
// spesifikasyonunun gerektirdiği minimum meta tabloları (gpkg_spatial_ref_sys,
// gpkg_contents, gpkg_geometry_columns) ve her katman için bir öznitelik
// tablosu + WKB (Well-Known Binary) geometri sütunu elle oluşturulur.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const WKB_POINT = 1;
const WKB_LINESTRING = 2;
const WKB_POLYGON = 3;

function writeHeaderAndBody(wkbType, bodyWriter, srid) {
  // --- GeoPackage Binary (GPB) header (bkz. GeoPackage spec §2.1.3) ---
  const header = Buffer.alloc(8);
  header.write('GP', 0, 'ascii');       // magic
  header.writeUInt8(0, 2);              // version
  header.writeUInt8(0x01, 3);           // flags: little-endian, no envelope, standard geometry
  header.writeInt32LE(srid, 4);

  // --- WKB body (little-endian) ---
  const body = bodyWriter();
  const wkbHeader = Buffer.alloc(5);
  wkbHeader.writeUInt8(1, 0); // byte order: little-endian
  wkbHeader.writeUInt32LE(wkbType, 1);

  return Buffer.concat([header, wkbHeader, body]);
}

function writePoint(coord) {
  const b = Buffer.alloc(16);
  b.writeDoubleLE(coord[0], 0);
  b.writeDoubleLE(coord[1], 8);
  return b;
}

function writeRing(ring) {
  const b = Buffer.alloc(4 + ring.length * 16);
  b.writeUInt32LE(ring.length, 0);
  ring.forEach((pt, i) => {
    b.writeDoubleLE(pt[0], 4 + i * 16);
    b.writeDoubleLE(pt[1], 4 + i * 16 + 8);
  });
  return b;
}

// Bazı kayıtlarda (ör. eski Bloklar) tek düz halka [ [lng,lat], ... ] olarak,
// standart GeoJSON Polygon'da ise dış halka içine sarılmış [[ [lng,lat], ... ]]
// olarak saklanır — ikisini de kabul eder.
function normalizePolygonRings(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  return Array.isArray(coordinates[0][0]) ? coordinates : [coordinates];
}

export function geomToGpkgBlob(geom, srid) {
  if (!geom || !geom.tip || !geom.coordinates) return null;
  if (geom.tip === 'Point') {
    return writeHeaderAndBody(WKB_POINT, () => writePoint(geom.coordinates), srid);
  }
  if (geom.tip === 'LineString') {
    return writeHeaderAndBody(WKB_LINESTRING, () => writeRing(geom.coordinates), srid);
  }
  if (geom.tip === 'Polygon' || geom.tip === 'MultiPolygon') {
    const rings = normalizePolygonRings(geom.coordinates);
    return writeHeaderAndBody(
      WKB_POLYGON,
      () => {
        const ringBufs = rings.map(writeRing);
        const numRings = Buffer.alloc(4);
        numRings.writeUInt32LE(rings.length, 0);
        return Buffer.concat([numRings, ...ringBufs]);
      },
      srid
    );
  }
  return null;
}

// Bir GeoPackage Binary (GPB) blob'unu (geomToGpkgBlob'un ürettiği format)
// geri {tip, coordinates} GeoJSON-benzeri nesnesine çözer — server/db.js'in
// yaşayan (runtime) .gpkg katman tablolarından okurken kullanılır.
export function geomFromGpkgBlob(rawBuf) {
  if (!rawBuf || rawBuf.length < 8) return null;
  // node:sqlite BLOB sütunlarını Buffer değil Uint8Array olarak döndürür —
  // Buffer'a özgü readUInt8/readDoubleLE vb. metodlar için sarmalanır.
  const buf = Buffer.isBuffer(rawBuf) ? rawBuf : Buffer.from(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
  if (buf[0] !== 0x47 || buf[1] !== 0x50) return null; // 'GP' magic
  const flags = buf.readUInt8(3);
  const envelopeIndicator = (flags >> 1) & 0x07;
  const envelopeSizes = [0, 32, 48, 48, 64];
  const envSize = envelopeSizes[envelopeIndicator] || 0;
  let offset = 8 + envSize;

  const byteOrder = buf.readUInt8(offset);
  const little = byteOrder === 1;
  const readU32 = (o) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const readF64 = (o) => (little ? buf.readDoubleLE(o) : buf.readDoubleBE(o));
  const wkbType = readU32(offset + 1);
  offset += 5;

  function readPoint(o) { return [readF64(o), readF64(o + 8)]; }
  function readRing(o) {
    const n = readU32(o); o += 4;
    const pts = [];
    for (let i = 0; i < n; i++) { pts.push(readPoint(o)); o += 16; }
    return { pts, next: o };
  }

  if (wkbType === WKB_POINT) {
    return { tip: 'Point', coordinates: readPoint(offset) };
  }
  if (wkbType === WKB_LINESTRING) {
    return { tip: 'LineString', coordinates: readRing(offset).pts };
  }
  if (wkbType === WKB_POLYGON) {
    const numRings = readU32(offset); offset += 4;
    const rings = [];
    for (let r = 0; r < numRings; r++) {
      const { pts, next } = readRing(offset);
      rings.push(pts);
      offset = next;
    }
    return { tip: 'Polygon', coordinates: rings };
  }
  return null;
}

export const SRID_WGS84 = 4326;

// layers: [{ tableName, description, records, columns }]
// - columns: özellik (attribute) sütun adları listesi (geometri hariç).
export function buildGeoPackageBuffer(layers, tmpFilePath) {
  // node:sqlite dosya tabanlı çalışır; geçici bir dosyaya yazıp sonra
  // buffer olarak okunur (bellek-içi ':memory:' üzerinden dosya çıktısı
  // alınamıyor).
  if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
  const db = new DatabaseSync(tmpFilePath);

  db.exec(`
    CREATE TABLE gpkg_spatial_ref_sys (
      srs_name TEXT NOT NULL, srs_id INTEGER NOT NULL PRIMARY KEY,
      organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL,
      definition TEXT NOT NULL, description TEXT
    );
    CREATE TABLE gpkg_contents (
      table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL,
      identifier TEXT UNIQUE, description TEXT DEFAULT '',
      last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER
    );
    CREATE TABLE gpkg_geometry_columns (
      table_name TEXT NOT NULL, column_name TEXT NOT NULL,
      geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL,
      z TINYINT NOT NULL, m TINYINT NOT NULL,
      PRIMARY KEY (table_name, column_name)
    );
  `);

  const insertSrs = db.prepare(
    'INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertSrs.run('Undefined cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system');
  insertSrs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
  insertSrs.run('WGS 84', SRID_WGS84, 'EPSG', SRID_WGS84, 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]', 'longitude/latitude WGS 84');

  const insertContents = db.prepare(
    'INSERT INTO gpkg_contents (table_name, data_type, identifier, description, min_x, min_y, max_x, max_y, srs_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertGeomCol = db.prepare(
    'INSERT INTO gpkg_geometry_columns VALUES (?, ?, ?, ?, 0, 0)'
  );

  for (const layer of layers) {
    const { tableName, description, records, columns, geomType } = layer;
    const colDefs = columns.map((c) => `"${c}" TEXT`).join(', ');
    db.exec(`CREATE TABLE "${tableName}" (fid INTEGER PRIMARY KEY AUTOINCREMENT, geom BLOB${colDefs ? ', ' + colDefs : ''})`);

    const insertRow = db.prepare(
      `INSERT INTO "${tableName}" (geom${columns.length ? ', ' + columns.map((c) => `"${c}"`).join(', ') : ''}) VALUES (?${columns.length ? ', ' + columns.map(() => '?').join(', ') : ''})`
    );

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const rec of records) {
      const blob = geomToGpkgBlob(rec.the_geom, SRID_WGS84);
      const values = columns.map((c) => {
        const v = rec[c];
        return v === undefined || v === null ? null : typeof v === 'object' ? JSON.stringify(v) : String(v);
      });
      insertRow.run(blob, ...values);

      const flat = flattenCoords(rec.the_geom);
      for (const [x, y] of flat) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    insertContents.run(
      tableName, 'features', tableName, description || '',
      Number.isFinite(minX) ? minX : null, Number.isFinite(minY) ? minY : null,
      Number.isFinite(maxX) ? maxX : null, Number.isFinite(maxY) ? maxY : null,
      SRID_WGS84
    );
    insertGeomCol.run(tableName, 'geom', geomType, SRID_WGS84);
  }

  db.close();
  const buf = fs.readFileSync(tmpFilePath);
  fs.unlinkSync(tmpFilePath);
  return buf;
}

export function flattenCoords(geom) {
  if (!geom || !geom.coordinates) return [];
  if (geom.tip === 'Point') return [geom.coordinates];
  if (geom.tip === 'LineString') return geom.coordinates;
  if (geom.tip === 'Polygon' || geom.tip === 'MultiPolygon') {
    return normalizePolygonRings(geom.coordinates).flat();
  }
  return [];
}
