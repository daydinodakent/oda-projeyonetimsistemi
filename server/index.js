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
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import duckdb from 'duckdb';

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
// İstemci dosyayı base64 olarak JSON gövdesinde gönderir (mevcut doküman
// yükleme akışıyla aynı desen — bkz. src/services/api.ts), sunucu geçici
// bir dosyaya yazıp ilgili Python script'ini child_process ile çalıştırır,
// stdout'taki GeoJSON'u olduğu gibi istemciye döner. Python veya ilgili
// kütüphane (ifcopenshell/laspy) bu ortamda yoksa 500 ile AÇIK bir hata
// mesajı döner — sessizce başarısız olmaz.
function runEtlScript(scriptName, tmpPath, extraArgs = []) {
  const scriptPath = path.join(__dirname, 'etl', scriptName);
  return execFileAsync('python', [scriptPath, tmpPath, ...extraArgs], { maxBuffer: 200 * 1024 * 1024 });
}

async function handleEtlUpload(req, res, scriptName, extraArgs) {
  const { fileName, dataBase64 } = req.body || {};
  if (!fileName || !dataBase64) {
    return res.status(400).json({ error: 'fileName ve dataBase64 (base64 dosya içeriği) gerekli.' });
  }
  const tmpPath = path.join(os.tmpdir(), `oda_etl_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  try {
    fs.writeFileSync(tmpPath, Buffer.from(dataBase64, 'base64'));
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

// IFC/nokta bulutu dosyaları genelde doküman önizlemelerinden (25mb) daha
// büyük olabildiğinden bu iki rotaya özel, daha yüksek bir JSON gövde
// limiti tanımlanır (yalnızca bu rotalarda — global limit değişmez).
const etlBodyParser = express.json({ limit: '150mb' });
app.post('/api/etl/ifc', etlBodyParser, (req, res) => handleEtlUpload(req, res, 'ifc_to_geojson.py', []));
app.post('/api/etl/pointcloud', etlBodyParser, (req, res) => {
  const maxPoints = req.body && req.body.maxPoints ? String(req.body.maxPoints) : '20000';
  return handleEtlUpload(req, res, 'pointcloud_to_geojson.py', [maxPoints]);
});

// --- FAZ 4 (ETL yol haritası): DuckDB Spatial ile toplu coğrafi analiz ---
// DuckDB'nin WASM (tarayıcı) derlemesi spatial extension'ı DESTEKLEMEZ —
// yalnızca native/sunucu tarafında çalışır (araştırmayla doğrulandı), bu
// yüzden bu, sunucu tarafında (Node.js duckdb paketi + otomatik kurulan
// 'spatial' eklentisi) çalışan AYRI bir uç noktadır.
//
// ÖNEMLİ (bu ortamda canlı test sırasında bulundu): DuckDB spatial'ın
// GDAL tabanlı ST_Read() okuyucusu, GERÇEK server/data/oda_pys.gpkg
// dosyasını (muhtemelen aynı anda bu API sunucusunun kendi node:sqlite
// bağlantısıyla açık tutulduğu için) okumaya çalışırken sunucu sürecini
// SESSİZCE ÇÖKERTİYOR (JS hatası bile fırlatmadan exit 127). Bu yüzden bu
// uç nokta LİVE .gpkg dosyasına HİÇ dokunmaz — istemci, o an haritada
// GÖRÜNEN objeleri (features dizisi) GeoJSON olarak gönderir, sunucu
// bunu GEÇİCİ bir dosyaya yazıp DuckDB ile sorgular. Ayrıca GROUP BY +
// GDAL geometri sütunu birlikteyken de (SUM(ST_Area(geom)) hiç
// kullanılmadığında) aynı çökme tekrarlanıyor — bu yüzden sorgu HER ZAMAN
// en az bir ST_Area(geom) ifadesi içerecek şekilde kurgulanır (bkz.
// aşağıdaki SQL, bu spesifik kombinasyon canlı olarak test edilip
// güvenli olduğu doğrulandıktan sonra sabitlendi).
let duckdbSpatialLoaded = null;
function getDuckDb() {
  if (!duckdbSpatialLoaded) {
    const db = new duckdb.Database(':memory:');
    duckdbSpatialLoaded = new Promise((resolve, reject) => {
      db.all('INSTALL spatial; LOAD spatial;', (err) => {
        if (err) return reject(err);
        resolve(db);
      });
    });
  }
  return duckdbSpatialLoaded;
}
function duckdbAll(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

app.post('/api/etl/spatial-stats', express.json({ limit: '80mb' }), async (req, res) => {
  const { features, groupBy, sumProperty } = req.body || {};
  if (!features || !Array.isArray(features) || !features.length) {
    return res.status(400).json({ error: 'features (GeoJSON Feature dizisi) gerekli ve boş olamaz.' });
  }
  if (groupBy && !IDENTIFIER_RE.test(groupBy)) {
    return res.status(400).json({ error: 'groupBy geçersiz bir sütun/öznitelik adı.' });
  }
  if (sumProperty && !IDENTIFIER_RE.test(sumProperty)) {
    return res.status(400).json({ error: 'sumProperty geçersiz bir sütun/öznitelik adı.' });
  }
  const tmpPath = path.join(os.tmpdir(), `oda_stats_${Date.now()}.geojson`);
  try {
    fs.writeFileSync(tmpPath, JSON.stringify({ type: 'FeatureCollection', features }));
    const db = await getDuckDb();
    const escapedPath = tmpPath.replace(/\\/g, '\\\\').replace(/'/g, "''");
    // NOT: GEOM sütununu ST_Transform(...,'EPSG:3857') ÜZERİNDEN ST_Area'ya
    // veren bir ifade SQL'de HER ZAMAN bulunur — hem (a) coğrafi (derece)
    // koordinatlarda ham ST_Area anlamsız/yanıltıcı olacağından yaklaşık da
    // olsa METRE CİNSİNDEN bir alan vermek için, hem de (b) bu ifade
    // OLMADIĞINDA GROUP BY + GDAL tabanlı ST_Read birlikteyken sunucunun
    // SESSİZCE ÇÖKTÜĞÜ canlı testte doğrulanan bir DuckDB spatial hatasını
    // önlemek için (bkz. yukarıdaki FAZ 4 notu). Web Mercator alanı yüksek
    // enlemlerde ŞİŞİRDİĞİNDEN (gerçek geodezik alan değildir) "≈" ile
    // etiketlenir — objede zaten bilinen doğru bir sayısal öznitelik
    // (ör. footprint_area_sqm) varsa onu sumProperty ile toplamak DAHA
    // GÜVENİLİRDİR; bu yüzden istemci arayüzü sumProperty'yi ÖNCELİKLİ
    // sonuç olarak gösterir.
    const areaExpr = `SUM(ST_Area(ST_Transform(geom, 'EPSG:4326', 'EPSG:3857'))) AS approx_area_m2`;
    const sumExpr = sumProperty ? `, SUM("${sumProperty}") AS sum_value, AVG("${sumProperty}") AS avg_value` : '';
    const sql = groupBy
      ? `SELECT "${groupBy}" AS grp, COUNT(*) AS n, ${areaExpr}${sumExpr} FROM ST_Read('${escapedPath}') GROUP BY grp ORDER BY n DESC;`
      : `SELECT COUNT(*) AS n, ${areaExpr}${sumExpr} FROM ST_Read('${escapedPath}');`;
    const rows = await duckdbAll(db, sql);
    // DuckDB COUNT(*)/SUM gibi toplamları BigInt olarak döner — JSON.stringify
    // (dolayısıyla res.json) BigInt'i serileştiremediğinden Number'a çevrilir.
    const safeRows = rows.map((row) => {
      const out = {};
      for (const [k, v] of Object.entries(row)) out[k] = typeof v === 'bigint' ? Number(v) : v;
      return out;
    });
    res.json({ rows: safeRows, groupBy: groupBy || null, sumProperty: sumProperty || null });
  } catch (err) {
    console.error('DuckDB spatial-stats başarısız:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { /* zaten silinmiş olabilir */ }
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
