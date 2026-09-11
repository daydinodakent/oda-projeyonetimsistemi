// Yerel dosya veritabanı katmanı (mock in-memory api.ts'in yerini alır).
//
// Node'un yerleşik `node:sqlite` modülü kullanılır (Node 22+, ek bir native
// bağımlılık/derleme gerektirmez). Dosya GERÇEK bir OGC GeoPackage'dır
// (server/data/oda_pys.gpkg) — QGIS gibi herhangi bir GIS aracında
// doğrudan açılabilir:
//   - Geometri içeren 3 CBS/PostGIS tablosu (tb_proje_sinirlari, tb_binalar_3d,
//     tb_altyapi_hatlari) GERÇEK GeoPackage öznitelik tablolarıdır — her
//     satırın `geom` sütunu standart WKB/GPB (bkz. gpkg.js) olarak saklanır
//     ve gpkg_contents/gpkg_geometry_columns'a kayıtlıdır. Haritada bir obje
//     taşındığında/düzenlendiğinde YAZILAN VE OKUNAN geometri budur — yani
//     "taşıdığım objeler kalıcı olarak gpkg veritabanında değişir" tam
//     anlamıyla doğrudur, ayrı bir dışa aktarım adımına gerek yoktur.
//   - Geometrisi olmayan diğer tüm tablolar (personel, dokümanlar, WBS vb.)
//     TEK bir generic "records" tablosunda ({table_name, id, data JSON})
//     saklanır — AYNI .gpkg dosyasının içinde, GeoPackage'ın "öznitelik
//     tablosu" (attribute-only user table) desteği sayesinde.
//
// PostGIS'e geçiş yolu: Üretimde bu dosyanın yerine `pg` (node-postgres) ile
// gerçek bir PostgreSQL/PostGIS bağlantısı kuran eşdeğer bir modül yazılıp
// index.js'teki generic fonksiyon imzaları (list/get/create/update/softDelete)
// AYNEN korunarak değiştirilebilir — üstteki route/iş mantığı katmanı hiç
// değişmeden kalır. Geometri sütunları PostGIS'te gerçek `geometry` tipine,
// generic "records" tablosu normal ilişkisel tablolara taşınabilir.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geomToGpkgBlob, geomFromGpkgBlob, flattenCoords, SRID_WGS84 } from './gpkg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'oda_pys.gpkg');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

// --- Generic (geometrisiz) tablolar için tek bir "records" tablosu ---
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    table_name TEXT NOT NULL,
    id TEXT NOT NULL,
    row_status INTEGER NOT NULL DEFAULT 1,
    write_date TEXT,
    data TEXT NOT NULL,
    PRIMARY KEY (table_name, id)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_records_table ON records (table_name);`);

// --- GeoPackage gerekli meta tabloları (idempotent) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS gpkg_spatial_ref_sys (
    srs_name TEXT NOT NULL, srs_id INTEGER NOT NULL PRIMARY KEY,
    organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL,
    definition TEXT NOT NULL, description TEXT
  );
  CREATE TABLE IF NOT EXISTS gpkg_contents (
    table_name TEXT NOT NULL PRIMARY KEY, data_type TEXT NOT NULL,
    identifier TEXT UNIQUE, description TEXT DEFAULT '',
    last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS gpkg_geometry_columns (
    table_name TEXT NOT NULL, column_name TEXT NOT NULL,
    geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL,
    z TINYINT NOT NULL, m TINYINT NOT NULL,
    PRIMARY KEY (table_name, column_name)
  );
`);
if (!db.prepare('SELECT 1 FROM gpkg_spatial_ref_sys WHERE srs_id = ?').get(SRID_WGS84)) {
  const insertSrs = db.prepare('INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)');
  insertSrs.run('Undefined cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system');
  insertSrs.run('Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system');
  insertSrs.run('WGS 84', SRID_WGS84, 'EPSG', SRID_WGS84, 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]', 'longitude/latitude WGS 84');
}

// --- Geometri içeren 3 CBS tablosu: GERÇEK GeoPackage öznitelik tabloları ---
const SPATIAL_TABLES = {
  tb_proje_sinirlari: { geomType: 'POLYGON', description: 'Proje Sınırları' },
  tb_binalar_3d: { geomType: 'POLYGON', description: 'Binalar 3D' },
  tb_altyapi_hatlari: { geomType: 'LINESTRING', description: 'Altyapı Hatları' },
  // Harita > Saha sekmesinden eklenen konumlu galeri fotoğrafları — gerçek
  // bir GeoPackage nokta katmanı (bkz. src/types/index.ts SahaFotografRecord).
  tb_saha_fotograflari: { geomType: 'POINT', description: 'Saha Fotoğrafları' },
};

const insertContentsStmt = db.prepare(
  'INSERT OR IGNORE INTO gpkg_contents (table_name, data_type, identifier, description, srs_id) VALUES (?, ?, ?, ?, ?)'
);
const insertGeomColStmt = db.prepare(
  'INSERT OR IGNORE INTO gpkg_geometry_columns VALUES (?, ?, ?, ?, 0, 0)'
);
const updateContentsExtentStmt = db.prepare(
  'UPDATE gpkg_contents SET min_x=?, min_y=?, max_x=?, max_y=?, last_change=strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE table_name=?'
);

for (const [tableName, meta] of Object.entries(SPATIAL_TABLES)) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      fid INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT UNIQUE NOT NULL,
      row_status INTEGER NOT NULL DEFAULT 1,
      write_date TEXT,
      data TEXT NOT NULL,
      geom BLOB
    );
  `);
  insertContentsStmt.run(tableName, 'features', tableName, meta.description, SRID_WGS84);
  insertGeomColStmt.run(tableName, 'geom', meta.geomType, SRID_WGS84);
}

function isSpatial(tableName) {
  return Object.prototype.hasOwnProperty.call(SPATIAL_TABLES, tableName);
}

function rowStatusOf(item) {
  return item && typeof item.row_status === 'number' ? item.row_status : 1;
}

function updateSpatialExtent(tableName) {
  const rows = db.prepare(`SELECT geom FROM "${tableName}" WHERE row_status = 1`).all();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const row of rows) {
    if (!row.geom) continue;
    const geom = geomFromGpkgBlob(row.geom);
    for (const [x, y] of flattenCoords(geom)) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (Number.isFinite(minX)) {
    updateContentsExtentStmt.run(minX, minY, maxX, maxY, tableName);
  }
}

// --- Generic (geometrisiz) tablolar için hazır sorgular ---
const stmtList = db.prepare('SELECT data FROM records WHERE table_name = ? AND row_status = 1');
const stmtListAll = db.prepare('SELECT data FROM records WHERE table_name = ?');
const stmtGet = db.prepare('SELECT data FROM records WHERE table_name = ? AND id = ?');
const stmtUpsert = db.prepare(
  'INSERT INTO records (table_name, id, row_status, write_date, data) VALUES (?, ?, ?, ?, ?) ' +
  'ON CONFLICT(table_name, id) DO UPDATE SET row_status = excluded.row_status, write_date = excluded.write_date, data = excluded.data'
);
const stmtCount = db.prepare('SELECT COUNT(*) AS n FROM records WHERE table_name = ?');

// --- Geometrili (spatial) tablolar için hazır sorgu şablonları (tablo adı
// her seferinde birebir SPATIAL_TABLES anahtarlarından geldiği için —
// kullanıcı girdisinden asla türetilmediği için — burada string
// interpolation SQL injection riski taşımaz). ---
function spatialRowToRecord(row) {
  const obj = JSON.parse(row.data);
  obj.the_geom = row.geom ? geomFromGpkgBlob(row.geom) : undefined;
  return obj;
}

export function tableCount(tableName) {
  if (isSpatial(tableName)) {
    return db.prepare(`SELECT COUNT(*) AS n FROM "${tableName}"`).get().n;
  }
  return stmtCount.get(tableName).n;
}

export function listRecords(tableName, { includeDeleted = false } = {}) {
  if (isSpatial(tableName)) {
    const sql = `SELECT data, geom FROM "${tableName}"` + (includeDeleted ? '' : ' WHERE row_status = 1');
    return db.prepare(sql).all().map(spatialRowToRecord);
  }
  const rows = (includeDeleted ? stmtListAll : stmtList).all(tableName);
  return rows.map((r) => JSON.parse(r.data));
}

export function getRecord(tableName, id) {
  if (isSpatial(tableName)) {
    const row = db.prepare(`SELECT data, geom FROM "${tableName}" WHERE id = ?`).get(String(id));
    return row ? spatialRowToRecord(row) : null;
  }
  const row = stmtGet.get(tableName, String(id));
  return row ? JSON.parse(row.data) : null;
}

export function putRecord(tableName, item) {
  if (item.id === undefined || item.id === null) throw new Error('putRecord: item.id gereklidir');
  if (isSpatial(tableName)) {
    const { the_geom, ...rest } = item;
    const geomBlob = the_geom ? geomToGpkgBlob(the_geom, SRID_WGS84) : null;
    db.prepare(
      `INSERT INTO "${tableName}" (id, row_status, write_date, data, geom) VALUES (?, ?, ?, ?, ?) ` +
      `ON CONFLICT(id) DO UPDATE SET row_status = excluded.row_status, write_date = excluded.write_date, data = excluded.data, geom = excluded.geom`
    ).run(String(item.id), rowStatusOf(item), item.write_date || null, JSON.stringify(rest), geomBlob);
    updateSpatialExtent(tableName);
    return item;
  }
  stmtUpsert.run(tableName, String(item.id), rowStatusOf(item), item.write_date || null, JSON.stringify(item));
  return item;
}

// Bir tabloyu tek seferde tohumlar (seed) — sadece tablo boşsa çalışır.
// api.ts, uygulama ilk açıldığında data.ts'ten türettiği varsayılan kayıt
// dizisini buraya gönderir; sunucu yeniden başlatılsa bile veri kalıcı kalır,
// ama tablo hiç dolmamışsa (ilk kurulum) mevcut mock varsayılanlarıyla doldurulur.
export function seedIfEmpty(tableName, items) {
  if (tableCount(tableName) > 0) return false;
  for (const item of items) putRecord(tableName, item);
  return true;
}

export function rawDb() {
  return db;
}
