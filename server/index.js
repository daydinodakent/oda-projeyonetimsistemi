// ODA+ PYS — yerel dosya veritabanı API sunucusu.
//
// api.ts'teki mock (tarayıcı-içi bellek) veri katmanının yerini alır: tüm
// tablolar generic bir REST arayüzü (GET/POST/PUT/DELETE /api/:table[/:id])
// üzerinden gerçek bir yerel GeoPackage dosyasına (server/data/oda_pys.gpkg,
// bkz. db.js) kalıcı olarak okunur/yazılır — sayfa yenilense, sunucu yeniden
// başlasa bile veri kaybolmaz. CBS/PostGIS katmanlarındaki (proje sınırları,
// binalar, altyapı hatları) geometriler bu dosyada GERÇEK GeoPackage WKB
// olarak saklanır — haritada bir obje taşındığında yazılan/okunan veri
// budur, ayrı bir "dışa aktarım" adımına gerek yoktur.
//
// PostGIS'e geçiş: Üretimde db.js'in üstündeki generic list/get/putRecord/
// seedIfEmpty fonksiyonlarını gerçek bir PostgreSQL/PostGIS istemcisiyle
// (pg) değiştiren eşdeğer bir modül yazıp burada import edilmesi yeterlidir
// — aşağıdaki route katmanı değişmeden kalır.
import express from 'express';
import { listRecords, getRecord, putRecord, seedIfEmpty } from './db.js';
import { buildGeoPackageBuffer } from './gpkg.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '25mb' })); // doküman önizlemeleri (base64) için yüksek limit

// Basit, geliştirme-amaçlı CORS (yerel Vite dev sunucusundan çağrılır).
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- CBS/PostGIS katmanlarını gerçek bir .gpkg dosyası olarak dışa aktarır ---
// NOT: bu sabit rota, aşağıdaki generic "/api/:table" deseninden ÖNCE
// tanımlanmalıdır — aksi halde Express onu table="export" id="gpkg" olarak
// eşleştirir.
const GPKG_LAYERS = [
  {
    tableName: 'tb_proje_sinirlari', description: 'Proje Sınırları', geomType: 'POLYGON',
    columns: ['name', 'project_id', 'project_name', 'ada_parsel', 'area_sqm', 'veri_durumu'],
  },
  {
    tableName: 'tb_binalar_3d', description: 'Binalar 3D', geomType: 'POLYGON',
    columns: ['name', 'project_id', 'block_name', 'building_type', 'height_meters', 'floors_count', 'construction_progress', 'structural_status', 'footprint_area_sqm', 'veri_durumu'],
  },
  {
    tableName: 'tb_altyapi_hatlari', description: 'Altyapı Hatları', geomType: 'LINESTRING',
    columns: ['name', 'project_id', 'line_type', 'network_name', 'pipe_or_cable_spec', 'depth_meters', 'voltage_or_pressure', 'total_length_meters', 'status', 'veri_durumu'],
  },
];

app.get('/api/export/gpkg', (req, res) => {
  try {
    const layers = GPKG_LAYERS.map((l) => ({ ...l, records: listRecords(l.tableName) }));
    const tmpPath = path.join(__dirname, 'data', `_export_${Date.now()}.gpkg`);
    const buf = buildGeoPackageBuffer(layers, tmpPath);
    res.setHeader('Content-Type', 'application/geopackage+sqlite3');
    res.setHeader('Content-Disposition', 'attachment; filename="oda_pys_cbs.gpkg"');
    res.send(buf);
  } catch (err) {
    console.error('GeoPackage dışa aktarımı başarısız:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
});

// --- Generic CRUD: her tablo için aynı davranış ---
app.get('/api/:table', (req, res) => {
  res.json(listRecords(req.params.table));
});

app.get('/api/:table/:id', (req, res) => {
  const item = getRecord(req.params.table, req.params.id);
  if (!item) return res.status(404).json({ error: 'Kayıt bulunamadı' });
  res.json(item);
});

// Yeni kayıt oluşturur veya (aynı id ile) tamamen üzerine yazar. Alan
// varsayılanları (id üretimi dahil) İSTEMCİ TARAFINDA (api.ts) kalır —
// sunucu sadece kalıcı olarak saklar.
app.post('/api/:table', (req, res) => {
  const item = req.body;
  if (item.id === undefined || item.id === null) return res.status(400).json({ error: 'id gereklidir' });
  putRecord(req.params.table, item);
  res.status(201).json(item);
});

// Mevcut kaydı kısmi (patch) günceller.
app.put('/api/:table/:id', (req, res) => {
  const existing = getRecord(req.params.table, req.params.id) || { id: req.params.id, row_status: 1 };
  const updated = { ...existing, ...req.body, id: existing.id };
  putRecord(req.params.table, updated);
  res.json(updated);
});

// Soft delete: row_status = 0.
app.delete('/api/:table/:id', (req, res) => {
  const existing = getRecord(req.params.table, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Kayıt bulunamadı' });
  putRecord(req.params.table, { ...existing, row_status: 0 });
  res.json({ ok: true });
});

// Uygulama ilk açıldığında (veya tablo boşsa) data.ts kaynaklı varsayılan
// kayıtlarla tohumlar — birden fazla sekme/istemci aynı anda çağırsa da
// (tabloya ilk giren kazanır) veri iki kez eklenmez.
app.post('/api/:table/seed', (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const seeded = seedIfEmpty(req.params.table, items);
  res.json({ seeded, count: listRecords(req.params.table).length });
});

const PORT = process.env.ODA_API_PORT || 4001;
app.listen(PORT, () => {
  console.log(`[oda-pys-api] http://localhost:${PORT} (GeoPackage: server/data/oda_pys.gpkg)`);
});
