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
//
// PRODUCTION DAĞITIMI (build alıp başka bir sunucuya/domain'e koyma):
// Geliştirmede `/api` istekleri Vite'ın kendi dev sunucusu tarafından bu
// sürece proxy'lenir (bkz. vite.config.ts) — ama `vite build` ile üretilen
// STATİK dosyalar (dist/) başka bir web sunucusuna (nginx, Apache, sadece
// statik dosya barındıran herhangi bir hosting) konduğunda o proxy artık
// yoktur ve tarayıcının `/api/...` istekleri karşılıksız kalır (harita hiç
// veri yüklemez). Bunu KÖKTEN çözmek için bu SUNUCU, kendi API rotalarının
// yanı sıra `dist/` içindeki derlenmiş frontend'i de AYNI süreçte/portta
// sunar (bkz. aşağıdaki express.static + SPA fallback) — böylece deploy tek
// bir adımdır: `npm run build && npm start` (veya pm2 ile `node server/index.js`),
// ayrıca bir reverse-proxy/ayrı port yapılandırmasına GEREK KALMAZ; ister o
// portu doğrudan (ör. pys.odakent.com.tr:4001) yayınlayın, ister isterseniz
// yine de kendi domain'inizin 80/443'üne nginx ile bağlayın — her iki
// durumda da `/api` ve statik dosyalar zaten aynı origin'den gelir.
import express from 'express';
import { listRecords, getRecord, putRecord, seedIfEmpty } from './db.js';
import { buildGeoPackageBuffer } from './gpkg.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');

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
  {
    tableName: 'tb_saha_fotograflari', description: 'Saha Fotoğrafları', geomType: 'POINT',
    columns: ['name', 'project_id', 'notes', 'upload_date'],
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

// --- Derlenmiş frontend'i (dist/) aynı süreçten sun ---
// NOT: tüm /api rotalarından SONRA tanımlanmalıdır — aksi halde bu, "/api/..."
// isteklerini de statik dosya olarak eşleştirmeye çalışıp 404 döndürürdü.
// `dist/` henüz build alınmamışsa (ör. `npm run dev:full` ile sadece API
// geliştirme modunda çalıştırılıyorsa) bu middleware'ler sessizce hiçbir şey
// yapmaz — sadece `npm run build` sonrası (production) devreye girer.
const distExists = fs.existsSync(path.join(DIST_DIR, 'index.html'));
if (distExists) {
  app.use(express.static(DIST_DIR));
  // SPA fallback: bilinmeyen (client-side) bir yola doğrudan gidilirse veya
  // sayfa yenilenirse de her zaman index.html döner — "/api" ile başlayan
  // yollar zaten yukarıdaki rotalarca ele alınmış olduğundan buraya hiç
  // düşmez.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const PORT = process.env.ODA_API_PORT || 4001;
app.listen(PORT, () => {
  console.log(`[oda-pys-api] http://localhost:${PORT} (GeoPackage: server/data/oda_pys.gpkg)`);
  console.log(distExists
    ? `[oda-pys-api] dist/ bulundu — frontend de aynı porttan sunuluyor (production).`
    : `[oda-pys-api] dist/ bulunamadı — sadece API modunda çalışıyor (geliştirme, bkz. npm run dev:full).`);
});
