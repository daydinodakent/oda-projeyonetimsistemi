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
import { router as cekirdekRouter } from './moduller/_cekirdek/routes.js';
import { router as sozlesmeRouter } from './moduller/sozlesme/routes.js';
import { router as depoRouter } from './moduller/depo/routes.js';
import { router as satinalmaRouter } from './moduller/satinalma/routes.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import multer from 'multer';

const execFileAsync = promisify(execFile);
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

// --- Ortak Çekirdek (Firma, Kişi, Parametre, Maliyet Defteri, Ödeme,
// Puantaj, Audit) — bkz. server/moduller/_cekirdek/. Generic "/api/:table"
// deseninden ÖNCE mount edilmelidir (aksi halde Express "/api/cekirdek/..."i
// table="cekirdek" olarak eşleştirir — bkz. GPKG export rotasındaki AYNI not).
app.use('/api/cekirdek', cekirdekRouter);

// --- Sözleşme — TÜM sözleşmelerin TEK kaynağı (bkz. server/moduller/sozlesme/).
// Aynı nedenle generic "/api/:table" deseninden ÖNCE mount edilir.
app.use('/api/sozlesme', sozlesmeRouter);

// --- Depo (GEÇİCİ/minimal malzeme kartı — bkz. server/moduller/depo/db.js,
// P4'te Depo modülüne tam devredilecek) + Satın Alma — aynı nedenle generic
// "/api/:table" deseninden ÖNCE mount edilir.
app.use('/api/depo', depoRouter);
app.use('/api/satinalma', satinalmaRouter);

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
    tableName: 'tb_saha_fotograflari', description: 'Saha Dosyaları', geomType: 'POINT',
    columns: ['name', 'project_id', 'notes', 'upload_date', 'doc_type'],
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

// --- FAZ 2 (ETL yol haritası): IFC/BIM ve nokta bulutu (LAS/LAZ) içe
// aktarma — GDAL/OGR'ın kapsamadığı, Python tabanlı özel kütüphaneler
// (IfcOpenShell, laspy) gerektiren formatlar. NOT: bu iki sabit rota da
// (GPKG export gibi) aşağıdaki generic "/api/:table" deseninden ÖNCE
// tanımlanmalıdır — aksi halde Express "/api/etl/ifc"i table="etl" id="ifc"
// olarak eşleştirir.
//
// FAZ 6 (büyük dosya performansı) — dosya artık base64+JSON YERİNE gerçek
// bir multipart/form-data akışıyla (multer, disk storage) doğrudan diske
// YAZILARAK alınır: ne istemci dosyayı ~1.33x büyüklüğünde bir base64
// string'e çevirip belleğe alır, ne de sunucu tüm gövdeyi TEK bir JSON
// string olarak parse edip BİR KEZ DAHA Buffer'a çevirir (eski yöntemde
// ~150MB'lık pratik bir tavan vardı — 2GB'lık dosyalarda tarayıcı sekmesini
// çökertme riski yüksekti). Python script'i ilgili kütüphane (ifcopenshell/
// laspy) bu ortamda yoksa yine 500 ile AÇIK bir hata mesajı döner.
const ETL_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB — hedeflenen üst sınır
const etlUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, `oda_etl_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
  }),
  limits: { fileSize: ETL_MAX_UPLOAD_BYTES },
});
function etlUploadErrorHandler(err, req, res, next) {
  if (!err) return next();
  const msg = err.code === 'LIMIT_FILE_SIZE'
    ? `Dosya çok büyük (limit: ${(ETL_MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)).toFixed(1)}GB).`
    : String(err.message || err);
  res.status(400).json({ error: msg });
}

function runEtlScript(scriptName, tmpPath, extraArgs = []) {
  const scriptPath = path.join(__dirname, 'etl', scriptName);
  return execFileAsync('python', [scriptPath, tmpPath, ...extraArgs], { maxBuffer: 200 * 1024 * 1024 });
}

async function handleEtlUpload(req, res, scriptName, extraArgs) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Yüklenecek dosya bulunamadı (multipart/form-data, "file" alanı gerekli).' });
  }
  const tmpPath = file.path;
  try {
    const { stdout } = await runEtlScript(scriptName, tmpPath, extraArgs);
    let parsed;
    try { parsed = JSON.parse(stdout); }
    catch { return res.status(500).json({ error: 'ETL script geçersiz çıktı üretti: ' + stdout.slice(0, 500) }); }
    if (parsed.error) return res.status(422).json({ error: parsed.error });
    res.json(parsed);
  } catch (err) {
    console.error(`ETL (${scriptName}) başarısız:`, err);
    const msg = err && err.code === 'ENOENT'
      ? 'Sunucuda Python bulunamadı — bu ETL özelliği bu ortamda kullanılamıyor.'
      : String(err && err.message || err);
    res.status(500).json({ error: msg });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* zaten silinmiş olabilir */ }
  }
}

app.post('/api/etl/ifc', etlUpload.single('file'), etlUploadErrorHandler, (req, res) => {
  // FAZ 6 — çok büyük (2GB'a kadar) IFC dosyalarında yüz binlerce eleman
  // olabileceğinden, yanıtı pratik bir üst sınıra göre eşit aralıklı
  // örnekler (bkz. ifc_to_geojson.py — pointcloud'daki maxPoints ile AYNI
  // desen). Client hardcoded 50000 gönderir; body'de yoksa yine 50000.
  const maxElements = req.body && req.body.maxElements ? String(req.body.maxElements) : '50000';
  return handleEtlUpload(req, res, 'ifc_to_geojson.py', [maxElements]);
});
app.post('/api/etl/pointcloud', etlUpload.single('file'), etlUploadErrorHandler, (req, res) => {
  const maxPoints = req.body && req.body.maxPoints ? String(req.body.maxPoints) : '20000';
  return handleEtlUpload(req, res, 'pointcloud_to_geojson.py', [maxPoints]);
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
