// Yerel dosya veritabanı katmanı (mock in-memory api.ts'in yerini alır).
//
// Node'un yerleşik `node:sqlite` modülü kullanılır (Node 22+, ek bir native
// bağımlılık/derleme gerektirmez). Tüm tablolar TEK bir generic "records"
// tablosunda saklanır: her satır { table_name, id, row_status, write_date,
// data(JSON) } şeklindedir — kaydın tüm alanları `data` sütununda JSON olarak
// tutulur. Bu, api.ts'teki 18 farklı kaydın (proje, bina, personel, doküman,
// vb.) TEK bir generic CRUD katmanıyla (bkz. index.js) desteklenmesini sağlar.
//
// PostGIS'e geçiş yolu: Üretimde bu dosyanın yerine `pg` (node-postgres) ile
// gerçek bir PostgreSQL/PostGIS bağlantısı kuran eşdeğer bir modül yazılıp
// index.js'teki generic fonksiyon imzaları (list/get/create/update/softDelete)
// AYNEN korunarak değiştirilebilir — üstteki route/iş mantığı katmanı hiç
// değişmeden kalır. Geometri içeren 3 tablo (tb_proje_sinirlari, tb_binalar_3d,
// tb_altyapi_hatlari) PostGIS'te gerçek `geometry` sütunlarına, diğerleri
// normal ilişkisel sütunlara taşınabilir. Ayrıca bkz. gpkg.js — CBS
// tablolarını gerçek, QGIS'te açılabilir bir OGC GeoPackage (.gpkg) dosyası
// olarak dışa aktarır (ara-format / interoperabilite amaçlı).

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'oda_pys.sqlite');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
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

const stmtList = db.prepare('SELECT data FROM records WHERE table_name = ? AND row_status = 1');
const stmtListAll = db.prepare('SELECT data FROM records WHERE table_name = ?');
const stmtGet = db.prepare('SELECT data FROM records WHERE table_name = ? AND id = ?');
const stmtUpsert = db.prepare(
  'INSERT INTO records (table_name, id, row_status, write_date, data) VALUES (?, ?, ?, ?, ?) ' +
  'ON CONFLICT(table_name, id) DO UPDATE SET row_status = excluded.row_status, write_date = excluded.write_date, data = excluded.data'
);
const stmtCount = db.prepare('SELECT COUNT(*) AS n FROM records WHERE table_name = ?');
const stmtDeleteTable = db.prepare('DELETE FROM records WHERE table_name = ?');

function rowStatusOf(item) {
  return item && typeof item.row_status === 'number' ? item.row_status : 1;
}

export function tableCount(tableName) {
  return stmtCount.get(tableName).n;
}

export function listRecords(tableName, { includeDeleted = false } = {}) {
  const rows = (includeDeleted ? stmtListAll : stmtList).all(tableName);
  return rows.map((r) => JSON.parse(r.data));
}

export function getRecord(tableName, id) {
  const row = stmtGet.get(tableName, String(id));
  return row ? JSON.parse(row.data) : null;
}

export function putRecord(tableName, item) {
  if (item.id === undefined || item.id === null) throw new Error('putRecord: item.id gereklidir');
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
