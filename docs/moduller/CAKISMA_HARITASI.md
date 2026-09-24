# Çakışma Haritası — Mevcut Durum Denetimi (P0)

> Bu doküman **yalnızca analiz** amaçlıdır; bu adımda repoya iş kodu eklenmemiştir.
> Kaynak: `origin/main` (commit `67b580c`), `git show`/`git grep` ile dosya dosya okunarak çıkarılmıştır — varsayım yoktur, her satırın karşılığı koddadır.

---

## 1) Envanter

### 1.1 Frontend — canlı (App.tsx'ten erişilen) ekranlar

| Dosya | Ne tutuyor | Kullanılıyor mu? |
|---|---|---|
| `src/App.tsx` | Router yerine geçen tek dosya: sekme/görünüm state'i (`activeTab`, `centerTab`), aktif proje seçimi, üst çubuk, modül ızgarası, Dinamik KPI trend grafiği | Evet — kök bileşen |
| `src/components/PlanView.tsx` | CEO özeti, KPI, ekip, WBS, doküman sekmeleri (Plan aşaması) | Evet |
| `src/components/InsaatView.tsx` | Ruhsat takibi, 4D zaman çizelgesi, 5D maliyet, şantiye günlüğü | Evet |
| `src/components/IsletmeView.tsx` | Varlık envanteri, bakım günlüğü, TCO simülasyonu | Evet |
| `src/components/GanttView.tsx` | Bağımsız Gantt/4D zaman çizelgesi ekranı | Evet |
| `src/components/LaborProcurementView.tsx` | "İnsan Kaynakları & Tedarik" modülü: personel atama, taşeron havuzu, malzeme siparişi | Evet (modül ızgarasında `resources`) |
| `src/components/CEODashboard.tsx` | CEO mobil/cep görünümü simülasyonu | Evet (`ceoPocketMode`) |
| `src/components/ExecutiveDashboardView.tsx` | Yönetici özet paneli | Evet (App.tsx:1110) |
| `src/components/AdminPanel.tsx` | Jenerik tablo/şema yönetimi + kullanıcı/yetki matrisi | Evet |
| `src/components/DocumentArchiveModal.tsx` | CDE doküman arşivi + imza/onay akışı görüntüleyicisi | Evet |
| `src/components/GlobalSearchModal.tsx` | Ctrl+K komut paleti | Evet |
| `src/components/Plan/Insaat/IsletmeLeft/RightPanel.tsx` (6 dosya) | Harita ekranının sol/sağ yan panelleri | Evet |
| `src/components/gis/OdaMapModule.tsx` | Harita iframe'i + REST API köprüsü (bkz. §1.3) | Evet — App.tsx `harita` sekmesinde |
| `src/components/chrome/*` (10 dosya), `src/components/ui/*` (9 dosya) | MUI tasarım sistemi ortak bileşenleri | Evet |

### 1.2 Frontend — **kullanılmayan (ölü) kod**

Hiçbiri `App.tsx` veya başka canlı bir dosyadan import edilmiyor (`git grep` ile doğrulandı):

| Dosya/klasör | Satır | Not |
|---|---|---|
| `src/components/GisSidebar.tsx` | ~1500 | Harita için eski, App.tsx'e hiç bağlanmamış CBS paneli |
| `src/components/gis/GisMap.tsx` | 1704 | Aynı şekilde bağlanmamış |
| `src/components/gis/components/{EditorPanel,LayerTreePanel,CursorDynamicInput}.tsx` | — | Yukarıdakinin yardımcıları |
| `src/components/gis/hooks/{useGisDraw,useGisLayers}.ts` | — | Yukarıdakinin yardımcıları |
| `src/components/gis/kroki/**` (MapModule.tsx + 13 alt dosya) | ~3160 | TS'e çevrilmiş ama hiç bağlanmamış ikinci CBS denemesi; kendi zustand store'unu kullanıyor |
| `src/utils/gisUtils.ts`, `src/components/gis/utils/*`, `src/types/gis.ts` | — | Yalnızca yukarıdaki ölü dosyalarca kullanılıyor |
| `kroki-react/` (kök) | ~2300 | **Tamamen ayrı bir Vite alt projesi** — kendi `package.json`/`vite.config.js`'i var, kök `npm run build`'e hiç dahil değil; üçüncü CBS denemesi |

**Toplam ölü kod:** ~5 000+ satır TS/JS, üç ayrı CBS denemesi (`gis/`, `gis/kroki/`, `kroki-react/`), hiçbiri App.tsx'ten erişilemiyor. Harita artık tek bir gerçek uygulama üzerinden çalışıyor: **`legacy-standalone-tools/oda-harita-cizim-araci.html`** (vanilla JS + MapLibre, ~14 000 satır), `OdaMapModule.tsx` içinde `iframe` olarak gömülü.

### 1.3 Backend — `server/`

| Dosya | Ne yapıyor |
|---|---|
| `server/index.js` | Express; jenerik `GET/POST/PUT/DELETE /api/:table[/:id]` + `/api/:table/seed` + `/api/export/gpkg` + `/api/etl/{ifc,pointcloud}` (Python script'lerine köprü) |
| `server/db.js` | Node'un yerleşik `node:sqlite`'ı ile **tek bir dosya**: `server/data/oda_pys.gpkg`. Geometrisiz tablolar `records(table_name, id, data JSON)` şeklinde tek bir generic tabloda; 4 CBS tablosu (`tb_proje_sinirlari`, `tb_binalar_3d`, `tb_altyapi_hatlari`, `tb_saha_fotograflari`) gerçek GeoPackage öznitelik tabloları (WKB geometri) |
| `server/gpkg.js` | WKB/GeoPackage blob encode/decode yardımcıları |
| `server/etl/*.py` | IFC→GeoJSON, nokta bulutu→GeoJSON (Python, sunucuda `python` PATH'te olmalı) |

Şema **zorlaması yok** — `records` tablosu herhangi bir `table_name` için herhangi bir JSON kabul eder; alan doğrulaması yalnızca istemci tarafında (`src/services/api.ts`) TypeScript tipleriyle yapılır.

### 1.4 Referans şema — `sqlScripts.sql`

Kökteki `sqlScripts.sql` (348 satır), **gerçekte çalışan** `server/db.js`'ten farklı: PostgreSQL/PostGIS için yazılmış 16 tablolu bir hedef şema (`AddGeometryColumn`, `GIST` index vb.). Şu an hiçbir script bunu gerçek bir Postgres'e uygulamıyor — yalnızca dokümantasyon/hedef niteliğinde. Tablo adları (`tb_projeler`, `tb_wbs_gorevler`, ...) `src/types/index.ts` ile birebir örtüşüyor; **9 hedef modülden hiçbiri bu şemada da yok.**

### 1.5 Veri modeli — **üç paralel katman aynı anda var**

Bu, denetimin en önemli bulgusu (bkz. §4 Çakışma Tespiti):

1. **`src/types.ts`** (camelCase: `Project`, `Block`, `Permit`, `WBSTask`, `ProjectDocument`, `Asset`, `MaintenanceLog`, `Notification`) + **`src/data.ts`** (statik diziler, `initialProjects` vb.) → `App.tsx`'te `useState` ile yüklenir, tüm Plan/İnşaat/İşletme/Gantt/CEO ekranları bunu okur/yazar. **Kalıcılık yok** — sayfa yenilenince veya sunucu yeniden başlayınca kaybolur.
2. **`src/types/index.ts`** (snake_case: `ProjeRecord`, `BlokRecord`, `RuhsatRecord`, `WbsGorevRecord`, `DokumanRecord`, `VarlikRecord`, `BakimKaydiRecord`, `BildirimRecord`, `PersonelRecord`, `YetkiRecord`, ...) + **`src/services/api.ts`** → yalnızca `AdminPanel.tsx` ve `OdaMapModule.tsx` kullanır. REST API üzerinden `server/data/oda_pys.gpkg`'a **kalıcı** yazar.
3. **`src/components/DocumentArchiveModal.tsx`** kendi yerel `Document`/`SignatureLog` arayüzlerini tanımlıyor (dosyanın kendi başında) — ne (1)'i ne (2)'yi kullanıyor; kendi sabit demo verisiyle çalışıyor, hiçbir yere yazmıyor.

`(1)` ve `(2)` başlangıçta **aynı proje id'leriyle** (`'IGA-ETAP-1'` vb.) tohumlanıyor (`api.ts`'teki `projelerSeed = initialProjects.map(p => ({ id: p.id, ... }))`), yani ilk açılışta veriler örtüşüyor — ama o andan sonra **birbirinden habersiz iki ayrı kopya** olarak yaşıyor: PlanView'daki "EVM Editörü" formu yalnızca React state'ini değiştirir (DB'ye hiç dokunmaz); AdminPanel'de aynı projenin bütçesini değiştirmek yalnızca DB'yi değiştirir (App.tsx'in state'i hiç değişmez). Aynı `id` alanı, alan adı `budget`/`plannedSpent` gibi hâlâ aynı kalsa bile artık **iki farklı gerçeğe** sahip.

### 1.6 `legacy-standalone-tools/oda-harita-cizim-araci.html` — dördüncü kalıcılık katmanı

Bu araç (kendi başına ~14 000 satır, App.tsx'e `iframe`+`postMessage` ile bağlı) **kendi başına ayrı iki kalıcılık mekanizması** kullanıyor:
- `localStorage.oda_session_v1` — çizilen tüm katman/şekil (feature) verisi, tarayıcıya özel.
- `IndexedDB odaBimFiles` — yüklenen 3B model (IFC/GLTF) dosyalarının kendisi.

Bunların hiçbiri `server/data/oda_pys.gpkg`'a yazılmaz — yalnızca `OdaMapModule.tsx`'in `postMessage` köprüsüyle **ayrıca** senkronize edilen 4 CBS tablosu (proje sınırı, bina, altyapı hattı, saha fotoğrafı) sunucuya gider. Yani harita aracının çizdiği "genel" katmanlar (ör. kullanıcının serbest çizdiği bir poligon, ölçüm, 3B model yerleşimi) tarayıcı-yereldir; yalnızca DB'ye bağlı 4 tablo proje bazlı kalıcıdır.

### 1.7 Kullanılmayan bağımlılıklar

- **`zustand`** (`package.json`'da bağımlılık) — yalnızca ölü kod (`kroki-react/`, `gis/kroki/`) içinde kullanılıyor; canlı uygulama düz `useState`/prop drilling kullanıyor.
- **`@google/genai`** (Gemini SDK) — `MIGRATION_NOTES.md`'de de belirtildiği gibi kodun hiçbir yerinde çağrılmıyor.

---

## 2) Kalıcılık — mevcut durum

**Tek bir kalıcılık katmanı yok — üç farklı mekanizma paralel çalışıyor:**

| Katman | Nerede | Neyi tutuyor |
|---|---|---|
| React `useState` (App.tsx) | Tarayıcı belleği, kalıcı değil | Proje/WBS/İzin/Varlık/Bakım/Bildirim'in "iş katmanı" kopyası (Plan/İnşaat/İşletme ekranları) |
| `server/data/oda_pys.gpkg` (SQLite/GeoPackage) | Sunucu dosya sistemi | `tb_*` tabloları — yalnızca AdminPanel ve harita köprüsünün (OdaMapModule) dokunduğu veri |
| `localStorage` + `IndexedDB` (tarayıcı) | İstemci, cihaza özel | Harita aracının kendi çizim oturumu + 3B model dosyaları |

**Öneri (yalnızca öneri, uygulanmadı):** Tek gerçek kaynak (single source of truth) DB olmalı; React tarafı `services/api.ts` benzeri bir istemciyle DB'den okuyup yazmalı, `data.ts` yalnızca ilk-tohum (seed) verisi olarak kalmalı. `localStorage`/`IndexedDB` yalnızca "sahada offline kuyruk" senaryosu için (ÇALIŞMA KURALLARI'nda istenen) bilinçli bir ara katman olarak korunabilir, ama proje verisiyle (bütçe, WBS, ruhsat) karışmamalı.

---

## 3) 9 Hedef Modül — Eşleştirme

| Modül | Durum | Mevcut dosyalar | Yeniden kullanılabilir parça |
|---|---|---|---|
| **Alt Yüklenici / Taşeron** | **Yok** (ayrı ayrı da yok — tek kavram olarak da yok) | `LaborProcurementView.tsx` içindeki yerel `Subcontractor` arayüzü (id, companyName, specialty, activeHeadcount, contactPerson, safetyRating, complianceStatus) — tamamen `useState`, kalıcılık yok, sözleşme/hakediş bağlantısı yok. `WBSTask.contractor` / `tb_wbs_gorevler.contractor` yalnızca serbest metin (FK değil). | `Subcontractor` arayüzünün alan seti başlangıç noktası olabilir; UI kalıpları (`InlineForm`, satır kartları) doğrudan taşınabilir. |
| **Maliyet** | **Yok** (birleşik defter yok) | Rakamlar dağınık: `Project.budget/spent/plannedSpent/earnedValue`, `WBSTask.cost`, `VarlikRecord.maintenance_cost/energy_cost`, `BakimKaydiRecord.cost`, `LaborProcurementView`'daki `MaterialOrder` (tutar bile yok) | Yok denecek kadar az; EVM alan adları (PV/EV/AC) referans alınabilir |
| **Müşteri** | **Yok** | Hiç yok — "müşteri"/"bağımsız bölüm"/"satış" kelimeleri kod tabanında hiç geçmiyor | — |
| **Satın Alma** | **Kısmen var** (çok ilkel) | `LaborProcurementView.tsx` → `MaterialOrder` (materialName, quantity, supplierName, deliveryDate, status) — talep/teklif/onay adımı yok, tek adımlı "sipariş" | `MaterialOrder` arayüzü + UI kartı başlangıç noktası |
| **Şantiye** | **Kısmen var** (dağınık) | `InsaatView.tsx` (şantiye günlüğü, ruhsat, 4D/5D), `LaborProcurementView.tsx` (personel/ekipman ataması), harita aracındaki saha fotoğrafları (`tb_saha_fotograflari`) | Şantiye günlüğü UI'ı (fotoğraf/video, kategori, hava durumu, GPS) doğrudan taşınabilir |
| **Sözleşme** | **Yok** | Yalnızca demo bir dosya adında ("...Sozlesmesi.pdf") geçiyor; gerçek bir Sözleşme varlığı/ekranı yok. `RuhsatRecord`/`Permit` bir izin/ruhsat kaydı, sözleşme değil | — |
| **Depo** | **Yok** | "Depo" kelimesi yalnızca demo metin/zone adı olarak geçiyor (`InsaatView.tsx`'teki simülasyon); stok/mal kabul/zimmet kavramı hiç yok | — |
| **İK** | **Kısmen var** (iki ayrı, tutarsız kopya) | `tb_personel`/`PersonelRecord` (AdminPanel, DB'de kalıcı — ad, e-posta, rol, departman, user_role, allocation_percentage; TCKN/işe giriş/izin yok) **ile** `LaborProcurementView.tsx`'teki `StaffAssignment` (id, name, role, blockName, phone, status — ayrı, kalıcı değil, `tb_personel`'e hiç referans vermiyor) | `PersonelRecord` DB şeması + yetki matrisi (AdminPanel) en sağlam temel; `StaffAssignment`'ın saha atama alanları (blockName, status: Aktif/İzinli/Nöbetçi) eklenebilir |

**Özet:** 9 modülden **7'si tamamen yok** (Alt Yüklenici, Taşeron, Maliyet, Müşteri, Sözleşme, Depo — ve İK'nın kalıcı/eksiksiz hâli), **2'si yalnızca yüzeysel/kalıcılığı olmayan bir mock ekran düzeyinde** var (Satın Alma, Şantiye — kısmen). Hiçbiri sahiplik matrisindeki hedef mimariyle (defter, sözleşme bağı, onay akışı) örtüşmüyor.

---

## 4) Çakışma Tespiti

### 4.1 SAHİPLİK MATRİSİ — hedef vs mevcut kod

| Varlık | Hedef Sahibi | **Mevcut Durum (sapma)** |
|---|---|---|
| Firma (Cari) | Çekirdek | **Yok.** Taşeron/tedarikçi/müşteri firma bilgisi hiçbir yerde ortak bir "cari" kaydı olarak tutulmuyor; her ekran kendi serbest-metin alanlarını kullanıyor (`WBSTask.contractor`, `Subcontractor.companyName`, `MaterialOrder.supplierName` — üçü de birbirinden bağımsız string). |
| Kişi (TCKN tekil) | Çekirdek (İK'da detay) | **Yok.** TCKN alanı hiçbir tabloda yok. Üç ayrı "kişi" temsili var: `EmployeeAllocation` (types.ts, Project.employees içinde gömülü), `PersonelRecord`/`tb_personel` (DB, kalıcı), `StaffAssignment` (LaborProcurementView, yerel) — hiçbiri birbirine referans vermiyor. |
| Proje, WBS, Maliyet Kodu | Çekirdek | **Kısmen sapma.** Proje çift kopya (§1.5). WBS de çift kopya (`WBSTask` vs `WbsGorevRecord`, aynı `project_id`/proje id'siyle tohumlanıyor ama sonradan ayrışıyor). Maliyet kodu (WBS dışında ayrı bir "cost code" kavramı) hiç yok. |
| Belge, Onay Akışı, Bildirim, Audit, Yetki | Çekirdek | **Üç ayrı doküman modeli** (§1.5 madde 3): `ProjectDocument`, `DokumanRecord`, `DocumentArchiveModal`'ın yerel `Document`. Onay akışı yalnızca `DocumentArchiveModal` içinde (yerel, kalıcı değil). Audit log hiçbir tabloda yok (yalnızca `create_uid`/`write_date` kolonları var, gerçek bir audit-trail tablosu değil). Yetki matrisi (`YetkiRecord`/`tb_yetkiler`) var ve kalıcı — bu satır için en sağlam olan taraf. |
| Maliyet Hareketi (defter) | Maliyet (P1) | **Hiç yok** — bkz. §3. |
| Ödeme Talimatı/Ödeme | Çekirdek (ince finans) | **Hiç yok.** |
| Sözleşme (tüm tipler) | Sözleşme | **Hiç yok** — bkz. §3. |
| Hakediş | Alt Yüklenici | **Hiç yok.** Modül grid'inde "Otomatik Hakediş Raporu" adında bir buton var (`ModuleGridDialog.tsx`, id `hakedis`) ama **App.tsx'te bu id için hiçbir view bağlı değil** — tıklanabilir ama işlevsiz bir vitrin öğesi. |
| Puantaj kaydı (ortak yapı) | Çekirdek yapı | **Hiç yok.** "Puantaj"/"PDKS" kod tabanında hiç geçmiyor; `StaffAssignment.status` (Aktif/İzinli/Nöbetçi) en yakın yaklaşık ama bir "kayıt" değil, anlık bir alan. |
| Malzeme Kartı, Stok, Mal Kabul, Zimmet | Depo | **Hiç yok** — bkz. §3. |
| Talep, Teklif, Sipariş | Satın Alma | **Yalnızca "Sipariş" var, o da tek adımlı** — `MaterialOrder` (§3). Talep/teklif aşaması yok. |
| Görev, Günlük Rapor, İSG kayıtları, Ekipman | Şantiye | **Kısmen var, dağınık.** Günlük rapor (`InsaatView`'daki şantiye günlüğü fotoğrafları) kalıcı değil (React state). Ekipman ataması `LaborProcurementView`'da (kalıcı değil). Görev = `WBSTask`/`WbsGorevRecord` (çift kopya, §4 üstte). |
| Bağımsız Bölüm, Satış, Ödeme Planı | Müşteri | **Hiç yok** — bkz. §3. |

### 4.2 Doğrudan çift-tanım tespit edilen çiftler

1. **Proje**: `Project` (types.ts) ↔ `ProjeRecord` (types/index.ts) — aynı id, iki bağımsız kopya (§1.5).
2. **WBS/Görev**: `WBSTask` ↔ `WbsGorevRecord` — aynı desen.
3. **Doküman**: `ProjectDocument` ↔ `DokumanRecord` ↔ `DocumentArchiveModal`'ın yerel `Document` — **üç** ayrı model.
4. **Ruhsat/İzin**: `Permit` ↔ `RuhsatRecord` — aynı desen.
5. **Varlık**: `Asset` ↔ `VarlikRecord` — aynı desen.
6. **Bakım Kaydı**: `MaintenanceLog` ↔ `BakimKaydiRecord` — aynı desen.
7. **Bildirim**: `Notification` ↔ `BildirimRecord` — aynı desen.
8. **Blok**: `Block` ↔ `BlokRecord` — aynı desen.
9. **CBS/harita katmanları**: `GISBoundaryRecord`/`GISBuildingRecord`/`GISInfrastructureRecord` (types.ts, yalnızca `data.ts`'teki statik tohum verisi için) ↔ `ProjeSiniriRecord`/`Bina3DRecord`/`AltyapiHattiRecord` (types/index.ts, DB'de canlı) — burada çakışma daha az kritik çünkü ilki yalnızca tohumlama kaynağı, çalışma zamanında okunmuyor.
10. **Kişi/Personel**: `EmployeeAllocation` (Project.employees, gömülü) ↔ `PersonelRecord`/`tb_personel` (DB) ↔ `StaffAssignment` (LaborProcurementView, yerel) — üç ayrı model, TCKN yok.
11. **CBS mimarisi**: aynı "harita" işlevi için **üç bağımsız, birbirinden habersiz kod tabanı** (`gis/`, `gis/kroki/`, `kroki-react/`) — hiçbiri çalışmıyor ama repoda duruyor, gelecekte kafa karıştırma riski yüksek.
12. **Harita katmanları — çift kalıcılık**: 4 CBS tablosu hem `localStorage.oda_session_v1` (harita aracının kendi oturumu) hem `server/data/oda_pys.gpkg` (DB) içinde iz bırakabiliyor — `OdaMapModule.tsx`'in `oda:update-db-feature` mesajı ile senkron tutulmaya çalışılıyor ama bu tek yönlü/olay-tetiklemeli bir köprü, iki taraf arasında garanti edilmiş bir tutarlılık (transaction) yok.

---

## 5) Birleştirilmesi/Taşınması Gereken Kodlar — risk ve öncelik

| # | İş | Risk | Öncelik |
|---|---|---|---|
| 1 | Üç ölü CBS denemesini (`src/components/GisSidebar.tsx`, `src/components/gis/{GisMap.tsx,components/,hooks/,utils/,kroki/}`, kök `kroki-react/`) sil | **Düşük** — hiçbir yerden import edilmiyor, `tsc`/`build` etkilenmez (bu oturumda MUI geçişi sırasında zaten doğrulandı) | Yüksek (temizlik ucuz, kafa karışıklığını hemen azaltır) |
| 2 | `Project`/`ProjeRecord` ikilisini birleştir: tek kaynak DB, App.tsx `services/api.ts` benzeri bir istemciyle okusun/yazsın | **Yüksek** — App.tsx'in state yönetimi köklü değişir, tüm alt görünümler (Plan/İnşaat/İşletme/Gantt/CEO) etkilenir; senkron→async geçiş gerekir | Kritik ama büyük — P1'in ana işi |
| 3 | Aynı deseni `WBSTask`/`WbsGorevRecord`, `Permit`/`RuhsatRecord`, `Asset`/`VarlikRecord`, `MaintenanceLog`/`BakimKaydiRecord`, `Notification`/`BildirimRecord`, `Block`/`BlokRecord` için tekrarla | Yüksek (#2 ile aynı sebep, her biri kendi ekranlarını etkiler) | Kritik, #2 sonrası sırayla |
| 4 | `DocumentArchiveModal`'ın yerel `Document`/`SignatureLog` modelini `DokumanRecord`/DB'ye bağla | Orta — onay/imza akışı (CDE) şu an yalnızca UI'da simüle ediliyor, gerçek bir backend akışına dönüştürülmesi gerekir | Orta |
| 5 | `EmployeeAllocation`/`StaffAssignment`'ı `PersonelRecord`'a (ve yeni İK modülüne) bağla, TCKN ekle | Orta | Yüksek (İK, 9 hedef modülden biri) |
| 6 | `sqlScripts.sql`'i ya gerçek bir migration aracına (ör. `node-pg-migrate`) bağla ya da "yalnızca referans" olduğunu açıkça belirten bir not ekle | Düşük | Orta |
| 7 | Harita aracının `localStorage`/`IndexedDB` katmanı ile DB arasındaki tek-yönlü köprüyü (bkz. §4.2 madde 12) gözden geçir — özellikle çoklu kullanıcı/çoklu cihaz senaryosunda veri kaybı riski var | Orta-Yüksek (veri bütünlüğü) | Orta |

---

## 6) Veri Göç (Migration) İhtiyaçları

- **DB motoru:** `server/db.js`, PostGIS'e geçişin "route katmanı hiç değişmeden" yapılabileceğini varsayacak şekilde tasarlanmış (`list/get/putRecord/seedIfEmpty` imzaları korunarak `pg` ile değiştirilebilir, kod içi yorumla belirtilmiş). Gerçek geçişte: (a) `records` tablosundaki JSON satırları ilgili ilişkisel tablolara normalize edilmeli, (b) 4 GeoPackage/WKB geometri sütunu PostGIS `geometry` tipine çevrilmeli.
- **Şema kaynağı seçimi:** `sqlScripts.sql` (16 tablo, PostgreSQL) mi yoksa `src/types/index.ts`'teki TypeScript arayüzleri mi "gerçek" şema sayılacak — şu an ikisi de var ve büyük ölçüde örtüşüyor ama birebir aynı değil (ör. `tb_bloklar` sqlScripts'te var, `types/index.ts`'te karşılığı `BlokRecord` olarak var; `tb_data_status`/`tb_altyapi_tipi` gibi bazı liste tabloları `sqlScripts.sql`'de hiç yok ama `types/index.ts` + `api.ts`'te seed ediliyor).
- **9 yeni modül için:** hiçbiri mevcut değil, göç değil **sıfırdan tasarım + seed veri** gerekiyor (özellikle Cari/Firma ve Kişi çekirdek tabloları önce kurulmalı, diğer 9 modül bunlara referans verecek şekilde).
- **App.tsx'in state'ten DB'ye geçişi:** en büyük göç riski — şu an tamamen senkron (`initialProjects` diziden direkt state), DB'ye bağlanınca async yükleme/loading-state/hata durumları tüm görünümlere eklenmeli.
- **Kimlik (id) uyumu:** Proje id'leri iki tarafta da örtüşüyor (`'IGA-ETAP-1'` gibi) — bu şanslı bir başlangıç noktası, ama WBS/Doküman/Varlık gibi alt varlıklarda aynı garantinin olup olmadığı satır satır doğrulanmalı (bu denetimde tek tek karşılaştırılmadı, örnekleme yapıldı).

---

## 7) Açık Sorular (kararınızı bekliyor)

1. **Tek kalıcılık kararı:** Tüm "iş katmanı" (Plan/İnşaat/İşletme/Gantt/CEO) DB'ye mi taşınsın (App.tsx'i `services/api.ts` benzeri bir istemciye bağlayarak), yoksa DB tarafı mı in-memory modele mi indirilsin? *Önerim: DB'ye taşınsın — zaten çalışan, kalıcı, jenerik bir REST katmanı (`server/`) hazır; tersi (DB'yi atıp state'e indirmek) mevcut kalıcı veriyi ve harita köprüsünü kırar.*
2. **Ölü CBS kodu:** `GisSidebar.tsx`, `gis/{GisMap,kroki}`, kök `kroki-react/` şimdi mi silinsin, yoksa parça kaynağı olarak (§5 madde 1) bir süre daha mı tutulsun? *Önerim: silin — aktif geliştirmede yanlışlıkla bu dosyalara kod eklenmesi riski, tutmanın faydasından yüksek; ihtiyaç olursa git geçmişinden geri alınabilir.*
3. **Şema kaynağı:** `sqlScripts.sql` mi yoksa `src/types/index.ts` mi "tek doğru" şema sayılacak; ikisi arasındaki küçük farklar (§6) nasıl kapatılacak? *Önerim: `types/index.ts`'i tek kaynak yapın (kod zaten ona göre çalışıyor), `sqlScripts.sql`'i ondan otomatik/yarı-otomatik türetin.*
4. **Cari/Firma çekirdek tablosu:** Taşeron, tedarikçi ve müşteri aynı "Firma" tablosunda bir `type`/rol alanıyla mı ayrılsın, yoksa üç ayrı tablo mu olsun (hedef matris "Firma (Cari) → Çekirdek, hepsi okur" diyor, tek tablo öneriyor gibi)? *Önerim: tek tablo + rol alanı — aynı firma hem taşeron hem tedarikçi olabilir, ayrı tablolar veri tekrarına yol açar.*
5. **Kişi çekirdek tablosu ve TCKN:** `tb_personel`'e mi eklenecek yoksa ondan ayrı, daha geniş bir "Kişi" tablosu mu (taşeron işçisi/müşteri kişisi gibi personel olmayanları da kapsayan) kurulacak? *Önerim: hedef matrisin dediği gibi ayrı bir çekirdek "Kişi" tablosu, `tb_personel` onun İK'ya özel bir uzantısı (1-1) olsun.*
6. **Puantaj:** Çekirdek ortak yapı (İK=personel, Taşeron=ekip) ne zaman kurulacak — bu, Şantiye modülünün "sahadan çevrimdışı veri girişi" kuralıyla doğrudan bağlantılı (ÇALIŞMA KURALLARI). *Önerim: Şantiye + İK ile birlikte, offline-kuyruk mimarisi baştan puantaj için tasarlanmalı.*
7. **DocumentArchiveModal'ın imza/onay akışı:** Gerçek bir backend akışına (audit-trail, e-imza) mı bağlanacak, yoksa şimdilik UI-simülasyonu olarak mı kalacak? *Önerim: P0/P1 kapsamı dışına alın, ayrı bir faz — şu an hiçbir modülün de gerçek bir onay motoru yok, bu tek başına büyük bir iş.*
8. **Hakediş vitrin butonu:** `ModuleGridDialog`'daki işlevsiz "Otomatik Hakediş Raporu" (`id: 'hakedis'`) butonu Alt Yüklenici modülüyle birlikte mi gerçek bir ekrana bağlanacak, yoksa modül grid'inden şimdilik kaldırılsın mı? *Önerim: Alt Yüklenici modülüyle birlikte gerçek ekrana bağlayın; o zamana kadar buton olduğu gibi kalabilir (kod değişikliği gerektirmiyor, düşük risk).*

---

## Özet

- 9 hedef modülden **7'si hiç yok** (Alt Yüklenici, Taşeron, Maliyet, Müşteri, Sözleşme, Depo, tam İK); **2'si** (Satın Alma, Şantiye) yalnızca kalıcılığı olmayan, ilkel bir mock ekranda kısmen var.
- **Tek bir kalıcılık katmanı yok** — üç paralel mekanizma (React state / SQLite+GeoPackage / localStorage+IndexedDB) aynı anda çalışıyor.
- **Aynı 8 kavram** (Proje, WBS, Doküman, Ruhsat, Varlık, Bakım Kaydı, Bildirim, Blok) kodda **iki bağımsız TypeScript arayüzü ve iki bağımsız veri kopyası** olarak tanımlı; ilk açılışta aynı id'lerle tohumlanıyor ama sonrasında ayrışıyor.
- Doküman üç, Kişi/Personel üç ayrı model olarak tanımlı — en dağınık iki alan.
- **~5 000+ satır ölü CBS kodu** (üç ayrı, bağlanmamış harita denemesi) repoda duruyor; `zustand` ve `@google/genai` bağımlılıkları da fiilen kullanılmıyor.
- Gerçek, çalışan ve kalıcı olan tek CBS/harita: `legacy-standalone-tools/oda-harita-cizim-araci.html` + `OdaMapModule.tsx` köprüsü + 4 CBS tablosu.
- Ayrıntılı sahiplik/çakışma tablosu için §4, açık kararlar için §7'ye bakın (8 soru, her birine öneri eklendi).

---

## P1 Uygulama Durumu (Ortak Çekirdek)

§7'deki kararlardan sonra, bu bölümde önerilen "Ortak Çekirdek" (Shared Kernel) uygulandı. Yeni kod `server/moduller/_cekirdek/` (backend, Node/Express + `node:sqlite`) ve `src/moduller/_cekirdek/` (frontend, TS istemcisi) altında — mevcut hiçbir dosya taşınmadı/silinmedi, mevcut ekranlar değişmedi.

### Uygulandı

| Kavram | Dosya | Not |
|---|---|---|
| Firma (Cari), çoklu rol | `server/moduller/_cekirdek/cariFirma.js` + `db.js` (`cari_firma`, `cari_firma_rol`) | VKN `UNIQUE`; §7 soru 4'teki "tek tablo + rol" önerisi uygulandı. |
| Kişi, TCKN şifreli | `kisi.js`, `kripto.js` (AES-256-GCM) | §7 soru 5'teki "ayrı çekirdek Kişi tablosu" önerisi uygulandı; `tb_personel` **henüz** buna bağlanmadı (aşağıya bkz.). API yanıtında yalnız `tckn_maske`. |
| Maliyet Kodu (WBS × Kaynak Tipi) | `maliyetKodu.js` | `wbs_gorev_id`, mevcut `tb_wbs_gorevler` kaydına ID ile referans verir, KOPYALAMAZ (sahiplik kuralı — birim testiyle doğrulandı). |
| Maliyet Defteri (append-only, idempotent) | `maliyetDefteri.js` | `yaz(olay)` tek yazma yolu; `UNIQUE(kaynak_modul,kaynak_id,tur)`; iptal = ters kayıt (silme yok). |
| Ödeme (talimat→onay→ödeme) | `odeme.js` | Durum makinesi (`TASLAK→ONAY_BEKLIYOR→ONAYLANDI→ODENDI`); dış sisteme entegrasyon YOK, yalnızca `disa_aktarildi` işaretli bekleyen-liste noktası var. |
| Parametre tabloları | `parametre.js` | Yürürlük tarihli (`gecerli_baslangic/bitis`), koda gömülü değer yok. |
| Numara serileri | `numaraSerisi.js` | `SERI-YIL-NNNN`, seri/yıl bazında bağımsız sayaç. |
| Puantaj (ortak yapı) | `puantaj.js` | İK ve Taşeron aynı tabloyu kullanacak şekilde tasarlandı; `istemci_kayit_id` ile çevrimdışı-kuyruk idempotency'si. |
| Audit Log | `audit.js` | Tüm servislerin create/update/iptal işlemleri buradan tek yoldan yazıyor. |
| Çevrimdışı kuyruk altyapısı | `src/moduller/_cekirdek/offlineQueue.ts` | Genel amaçlı, localStorage tabanlı; `createOfflineQueue()`. **Bağımsız modül — bu geçişte hiçbir saha ekranına bağlanmadı.** |
| Frontend tip/istemci katmanı | `src/moduller/_cekirdek/types.ts`, `api.ts` | `server/moduller/_cekirdek/routes.js` uçlarını sarmalar. |
| Express mount | `server/index.js` | `/api/cekirdek/*`, jenerik `/api/:table`'dan ÖNCE mount edildi. |

**Doğrulama:** 39/39 birim testi yeşil (`npm run test` → `node --test server/moduller/_cekirdek/*.test.js`); `npm run build` başarılı; `/api/cekirdek/*` uçları gerçek sunucu üzerinde `curl` ile manuel HTTP smoke testinden geçti (firma oluşturma, parametre oluşturma/okuma, numara serisi). `npm run lint` (`tsc --noEmit`) yalnızca P1 ÖNCESİNDEN var olan 7 hatayı gösteriyor (App.tsx×2, InsaatView.tsx×2, IsletmeView.tsx×2, GisMap.tsx×1) — yeni `_cekirdek` dosyaları sıfır yeni tip hatası ekledi.

### Bilinçli Olarak Ertelendi (bu geçişin kapsamı dışında)

- **Hiçbir mevcut ekran yeni çekirdeğe bağlanmadı.** `api.ts`/`offlineQueue.ts` hazır ama henüz hiçbir bileşen import etmiyor — "mevcut ekranlar bozulmaz" kabul kriterini bu geçişte riske atmamak için.
- §4.2'deki 12 kopya/çakışma çifti (`Project↔ProjeRecord`, üçlü Doküman modeli, vb.) bu geçişte BİRLEŞTİRİLMEDİ — çekirdek yalnızca yeni ve henüz var olmayan kavramları (Firma, Kişi, Maliyet Kodu/Defteri, Ödeme, Puantaj) kapsıyor.
- **Belge, Onay Akışı, Bildirim, Rol-Yetki** ortak servisleri henüz yazılmadı/genişletilmedi — mevcut `BelgeRecord`/`OnayRecord`/`BildirimRecord`/`YetkiRecord` (varsa) dokunulmadan duruyor. Ödeme'nin durum geçişi basit sabit-kodlanmış bir harita; genel amaçlı tutar/tip bazlı bir onay-akışı motoru DEĞİL.
- **`tb_personel` ↔ yeni `kisi` tablosu** henüz bağlanmadı — İK modülü kurulurken 1-1 ilişki/geçiş planlanmalı (§7 soru 5).
- **Proje→Etap/Blok→WBS→İş Kalemi** hiyerarşisi yeniden yapılandırılmadı; yalnızca yeni `maliyet_kodu` tablosu mevcut `tb_wbs_gorevler`'e ID ile referans veriyor.
- `CEKIRDEK_KISI_ENCRYPTION_KEY` üretim ortamında MUTLAKA tanımlanmalı (`.env.example`'a eklendi) — tanımsızsa geliştirme anahtarına düşüyor ve konsola uyarı basıyor.

---

## P2 Uygulama Durumu (Sözleşme Yönetimi)

"TÜM sözleşmelerin TEK kaynağı" olarak Sözleşme modülü uygulandı — `server/moduller/sozlesme/` (backend) ve `src/moduller/sozlesme/` (frontend TS istemcisi + **ekranlar**). Mevcut hiçbir dosya taşınmadı/silinmedi; mevcut ekranlar değişmedi.

### Uygulandı

| Kavram | Dosya | Not |
|---|---|---|
| Sözleşme (7 tip) | `sozlesme.js` + `db.js` (`sozlesme`) | `taraf_firma_id`/`taraf_kisi_id` Çekirdek'e REFERANS; varlık RAW tabloya değil **sahibin servisine** (`cariFirma.getir`/`kisi.getir`) sorularak doğrulanır. |
| Versiyon / Zeyilname | `sozlesme_versiyon` | v1 = orijinalin değişmez anlık görüntüsü; her zeyilname YENİ bir satır — hiçbir satır UPDATE edilmez. |
| Sözleşme Kalemi | `sozlesme_kalem` | `wbs_gorev_id` mevcut `tb_wbs_gorevler`'e REFERANS. Yürürlükteki (`yururlukte/askida/tamamlandi/feshedildi`) sözleşmenin kalemi DOĞRUDAN değiştirilemez — yalnızca zeyilname ile. |
| Yükümlülük/Madde, Teminat | `sozlesme_madde`, `sozlesme_teminat` | Ceza/avans/fiyat farkı/sigorta/İSG/gizlilik maddeleri; teminat türü+bitiş tarihi+iade durumu. |
| Belge bağlantısı | `sozlesme_belge` | Mevcut `tb_dokumanlar`'a ID ile REFERANS — YENİ bir belge deposu açılmadı (Çekirdek "Belge" servisi henüz yok, bkz. P1 ertelenenler). |
| Durum makinesi + Maliyet Defteri entegrasyonu | `sozlesme.js#durumDegistir` | `taslak→onayda→imzali→yururlukte→(askida)→tamamlandi/feshedildi`. **"imzali"ya geçişte** (akışta ayrı bir "onaylandı" durumu olmadığından en yakın karşılığı seçildi) `maliyetDefteri.yaz()` ile TEK SEFERLİK TAAHHÜT (gider sözleşmeleri) veya GELİR (yalnızca `musteri_satis`) kaydı yazılır — `taahhut_yazildi` bayrağı + Çekirdek'in `UNIQUE(kaynak_modul,kaynak_id,tur)` kısıtı sayesinde mükerrer kayıt oluşmaz (birim testiyle doğrulandı: tam akış + askıya alıp tekrar yürürlüğe alma sonrası hâlâ tek kayıt). |
| Zeyilname → Maliyet Defteri | `sozlesme.js#zeyilnameOlustur` | Taahhüt zaten yazılmışsa, zeyilname farkı AYRI bir olay (`kaynak_id: "{id}:v{n}"`) olarak işlenir — orijinal taahhüt kaydı değiştirilmez. |
| `sozlesme.kalanBedel(id)` | `sozlesme.js` | Görev metnindeki sözleşme birebir uygulandı. **NOT:** Hakediş modülü henüz yok, bu yüzden "kalan bedel" bu geçişte "güncel toplam bedel"le (orijinal + tüm zeyilname farkları) eşdeğerdir; kullanım/hakediş düşümü yok (aşağıya bkz.). |
| Kritik Tarihler | `sozlesme.js#kritikTarihler` | Sözleşme bitişi + teminat bitişi + madde kontrol tarihlerinin birleşimi; eşikler (30/15/7 gün) **parametrik** (Çekirdek `parametre` tablosundan okunur, yoksa koda gömülü varsayılana düşer). Yalnızca EKRANIN veri kaynağı — gerçek bildirim GÖNDERİMİ yapılmaz (Bildirim ortak servisi henüz yok). |
| Şablon sistemi | `sablon.js` (`sozlesme_sablon`) | Tip bazlı madde şablonları + `{{taraf}}/{{bedel}}/{{tarih}}/{{proje}}/{{konu}}` değişkenli belge metni üretimi (`belgeUret`). E-imza entegrasyonu YOK (kapsam dışı, görev metninde belirtildiği gibi). |
| **Ekranlar** | `src/moduller/sozlesme/ekranlar/` | `SozlesmeListesi` (filtre: tip/durum/arama), `SozlesmeDetay` (6 sekme: Özet/Kalemler/Maddeler/Teminatlar/Versiyonlar/Belgeler + "Bağlı Kayıtlar" yer tutucu), `SablonYonetimi`, `KritikTarihlerTakvimi`, hepsini saran `SozlesmeModulu`. Projenin kendi token tabanlı (CSS variables + Tailwind) tasarım diliyle yazıldı — **MUI/Ant EKLENMEDİ**. |

**Doğrulama:** 57/57 birim testi yeşil (`npm run test` — 18 yeni sözleşme/şablon testi + önceki 39); `npm run build` başarılı; `npm run lint` yeni dosyalardan sıfır yeni hata; `/api/sozlesme/*` uçları gerçek sunucuda `curl` ile uçtan uca smoke test edildi (sözleşme oluştur → onayda → imzali [taahhüt yazıldı] → zeyilname → kalan bedel → kritik tarihler → şablon → belge üret). **Ekranlar ayrıca izole bir tarayıcı oturumunda (geçici DB + geçici port, gerçek dev veritabanına DOKUNULMADI) canlı olarak test edildi:** sözleşme oluşturma formu, durum geçiş akışı (taslak→onayda→imzali, "Taahhüt Deftere Yazıldı mı? Evet" doğru göründü), zeyilname ekleme (Özet sekmesinde 500.000+50.000=550.000 doğru yansıdı), şablon oluşturma + değişkenli belge üretimi — tümü ekran görüntüsüyle doğrulandı.

### Bilinçli Olarak Ertelendi (bu geçişin kapsamı dışında)

- **Ekranlar mevcut App.tsx navigasyonuna BAĞLANMADI** — `SozlesmeModulu` kendi kendine yeten bir bileşen olarak duruyor, `<SozlesmeModulu projeId={...} />` şeklinde ileride bir modül grid'ine (`ModuleGridDialog`) eklenebilir. "Mevcut ekranlar bozulmaz" kabul kriterini bu geçişte riske atmamak için (P1'deki AYNI karar, bkz. yukarısı).
- **Hakediş/kullanım düşümü YOK** — `kalanBedel()` şu an yalnızca zeyilname dahil güncel toplam bedeli döner; gerçek "kalan" hesaplaması (ödenen/hakedişi düşülmüş) Hakediş modülü kurulduğunda, o modül `GERCEKLESEN` kayıtlarını `kaynak_modul='sozlesme'` ile yazarsa otomatik doğru çalışacak şekilde tasarlandı.
- **Alt Yüklenici/Satın Alma/Müşteri/Taşeron modülleri** henüz `sozlesme.id`'ye referans VERMİYOR (o modüller henüz kurulmadı) — sözleşme tarafı bu geçişte yalnızca kendi API'sini sunuyor.
- **E-imza entegrasyonu YOK** (görev kapsamı dışı) — yalnızca şablon metni üretimi var.
- **GELİR/TAAHHÜT ayrımı basitleştirildi:** yalnızca `musteri_satis` GELİR sayılıyor; `arsa_sahibi` (kat karşılığı, ayni) dahil diğer tüm tipler TAAHHUT tarafında. Gerçek muhasebe ayrımı ileride parametrik hale getirilebilir.
- **"İmzalı" durumu = taahhüt tetikleyici** kabul edildi (görev metnindeki "onaylanınca" ifadesi akışta ayrı bir durum karşılığı olmadığından en yakın karşılığı seçildi) — bu varsayım işlevsel gereksinimlere göre değişebilir.

---

## P3 Uygulama Durumu (Satın Alma Yönetimi)

Talep → Onay → Teklif → Mukayese → Sipariş → Mal Kabul → Fatura → 3'lü Eşleştirme → Ödeme Talimatı akışı uygulandı — `server/moduller/satinalma/` (backend) + `src/moduller/satinalma/` (frontend TS istemcisi + **ekranlar**). Malzeme kartı için görev metninin AÇIKÇA istediği geçici sahiplik modeli kuruldu: `server/moduller/depo/` (yalnızca `malzeme_karti` tablosu + minimal CRUD) — P4'te Depo modülü bu dosyaları GENİŞLETECEK, YENİ bir malzeme tablosu AÇILMAYACAK.

### MALİYET KURALI (çift sayımı önler — görev metninin açık isteği)

| Durum | Kural | Uygulama |
|---|---|---|
| Sipariş onaylanınca | Maliyet Defteri'ne TAAHHUT | `siparis.js#durumDegistir` — tek seferlik (idempotent), `taahhut_yazildi` bayrağı + Çekirdek'in UNIQUE kısıtı |
| Stoklu malzeme (malzeme_karti.stoklu_mu=1) faturalanınca | GERÇEKLEŞEN **YAZILMAZ** | `fatura.js#kaydet` — bilinçli boşluk, P4 Depo çıkışında (tüketimde) yazacak |
| Stoklu olmayan / malzeme_id yok (hizmet, nakliye) faturalanınca | GERÇEKLEŞEN faturada yazılır | `fatura.js#kaydet` — aynı fonksiyon, `malzeme.stoklu_mu` kontrolüyle dallanır |

Bu ayrım hem birim testiyle (`faturaEslestirme.test.js`) hem gerçek sunucuda `curl` ile HTTP seviyesinde doğrulandı: stoklu bir malzeme faturalandığında `maliyet_hareketi` tablosunda **hiç** GERÇEKLEŞEN kaydı oluşmuyor; aynı faturadaki hizmet kalemi için oluşuyor.

### Uygulandı

| Kavram | Dosya | Not |
|---|---|---|
| Talep (+kalemler) | `talep.js` | Malzeme kartı OLMADAN da kalem eklenebilir (görev: "çoğu zaman eksik tanımlıdır"). `min_teklif_istisna` + `istisna_gerekcesi` + `istisna_onaylayan` alanları. |
| Teklif (istek + gelen teklif TEK kayıt) | `teklif.js` | `durum`: istendi→geldi→(elendi/kazandi). Ayrı bir "RFQ" tablosu AÇILMADI — basitleştirme. |
| Mukayese | `teklif.js#mukayeseSonucu` | DB'ye YAZILMAZ, sorgu zamanı hesaplanır; her kalem için KDV dahil en düşük toplamlı teklif "önerilir" — SEÇİM insanın işidir (sipariş oluştururken `teklif_id`). |
| Sipariş (+kalemler, teslim planı) | `siparis.js` | **Min. 3 teklif kuralı**: `talep_id` ile açılan siparişte talebe bağlı "geldi/kazandi" teklif <3 ise VE talepte istisna işaretli değilse REDDEDİLİR (test + curl ile doğrulandı). Onaylanan teklif otomatik `kazandi` işaretlenir. |
| Mal Kabul (GEÇİCİ/minimal) | `malKabul.js` | Görev metni: "Mal Kabul (Depo modülü yapar)" — Depo henüz yok, bu yüzden yalnızca "X miktar teslim alındı" OLAYI tutulur (stok hareketi/kalite kontrolü YOK); sipariş durumunu (kismi_teslim/tamamlandi) otomatik ilerletir. |
| Fatura (+kalemler, tevkifat) | `fatura.js` | Fatura no + firma UNIQUE (mükerrer fatura girişi engellenir). Tevkifat oranı ÇAĞIRANDAN gelir (parametrik — koda gömülmez). |
| 3'lü Eşleştirme | `fatura.js#eslestir` | Sipariş ↔ mal kabul (teslim_edilen_miktar) ↔ fatura (faturalanan_miktar) karşılaştırması. Tolerans PARAMETRİK (Çekirdek `satinalma_eslesme_tolerans_yuzde`, yoksa %2 varsayılan). **KABUL kriteri doğrulandı:** kısmi teslim (6/10 ton) + fazla faturalanmış (8 ton) senaryosu `miktar_asimi` istisnası olarak yakalanıyor. |
| Ödeme Talimatı | `fatura.js#odemeTalimatiOlustur` | Yalnızca istisnasız ("eslestirildi") faturalar için Çekirdek'in `odeme.talimatOlustur()`'ını çağırır; tevkifat kesinti olarak aktarılır. |
| Tedarikçi Değerlendirme | `tedarikciKarnesi.js` | Görev: "P4 mal kabul verisinden otomatik". P4 yok — mevcut sipariş+mal kabul verisinden SORGU ZAMANI hesaplanır (ayrı tablo YOK). Kalite red oranı `null` (P4/Kalite Kontrol olmadan hesaplanamaz). |
| **Ekranlar** | `src/moduller/satinalma/ekranlar/` | `TalepOlustur` (mobil, tek sütun, malzeme kartı seçimi YOK), `TalepHavuzu`, `TeklifMukayese` (kalem×teklif tablosu, önerilen hücre vurgulu), `SiparisTakip` (taslak/bekleyen/kısmi/tamam sekmeleri + mal kabul + fatura girişi), `FaturaEslestirmeIstisnalari`, `TedarikciKarnesi` — hepsi `SatinAlmaModulu` içinde birleşik. Token tabanlı tasarım (MUI EKLENMEDİ). |

**Doğrulama:** 85/85 birim testi yeşil (`npm run test` — 20 yeni satın alma/depo testi + önceki 65); `npm run build` başarılı; `npm run lint` yeni dosyalardan sıfır yeni hata; `/api/satinalma/*` ve `/api/depo/*` uçları gerçek sunucuda `curl` ile uçtan uca smoke test edildi (talep→3 teklif→mukayese→sipariş→onay[TAAHHUT]→kısmi mal kabul→fazla faturalama→eşleştirme[miktar_asimi]→ödeme talimatı reddi→tedarikçi karnesi). **Ekranlar izole bir tarayıcı oturumunda (geçici DB+port, gerçek dev veritabanına DOKUNULMADI) canlı test edildi:** mobil (375px) ve masaüstü görünümde talep formu, talep havuzu listesi, tedarikçi karnesi — ekran görüntüsüyle doğrulandı.

### Bilinçli Olarak Ertelendi (bu geçişin kapsamı dışında)

- **Ekranlar mevcut App.tsx navigasyonuna BAĞLANMADI** — P1/P2'deki AYNI karar (bkz. yukarısı), "mevcut ekranlar bozulmaz" kriterini riske atmamak için.
- **Malzeme kartı P4'e kadar GEÇİCİ/minimal** — yalnızca kod/ad/birim/stoklu_mu. Lokasyon, stok seviyesi, zimmet, kalite kontrolü P4 Depo modülünün işi.
- **Mal Kabul P4'e kadar GEÇİCİ/minimal** — yalnızca "X miktar teslim alındı" olayı; gerçek stok girişi, kalite red kaydı YOK.
- **GİB e-fatura/e-irsaliye entegrasyonu YOK** (görev kapsamı dışı, görev metninde açıkça belirtildi) — yalnızca manuel fatura girişi var; ileride bir içe aktarım noktası (`fatura.js#kaydet`'in kendisi zaten bu noktadır — otomatik bir GİB istemcisi eklenene kadar manuel çağrılır).
- **Onay Akışı hâlâ basit sabit-kodlanmış durum makinesi** — Çekirdek'in genel amaçlı Onay Akışı ortak servisi henüz yazılmadı (P1'den beri ertelenen).
- **Sözleşme (P2) entegrasyonu kısmi** — `satinalma_siparis.sozlesme_id` alanı var (çerçeve anlaşma referansı için) ama sözleşme kalemleriyle sipariş kalemlerini otomatik eşleştiren bir akış YOK; bu alan yalnızca bir REFERANS noktasıdır.
- **Kalite red oranı hesaplanamıyor** — P4/Kalite Kontrol modülü kurulmadan tedarikçi karnesindeki bu alan her zaman `null` döner.

---

## P4 Uygulama Durumu (Depo Yönetimi)

Malzeme Kartı, Stok, Mal Kabul ve Zimmet'in KESİN sahibi olarak Depo modülü kuruldu/genişletildi — `server/moduller/depo/` (backend) + `src/moduller/depo/` (frontend TS istemcisi + ekranlar).

### Taşıma/Devir (görev metninin açık isteği)

- **Malzeme Kartı** zaten P3'te doğru dosyada (`server/moduller/depo/`) GEÇİCİ olarak açılmıştı — bir "taşıma" gerekmedi, doğrudan **genişletildi** (yeni sütunlar: `grup`, `demirbas_mi`, `min_stok`, `max_stok`, `fire_toleransi_yuzde` + yeni `malzeme_birim_donusum` tablosu). Eski-şema bir tablo zaten varsa savunmacı `ALTER TABLE` ile sütunlar sonradan eklenir (bkz. `depo/db.js` başı).
- **Mal Kabul**: P3'te `server/moduller/satinalma/malKabul.js` + `satinalma_mal_kabul` tablosu GEÇİCİ/minimal duruyordu (yalnızca miktar+tarih). Bu dosya ve tablo **KALDIRILDI**; gerçek (gelen/kabul/red miktar, red nedeni, fotoğraf, depo bağlantısı) Mal Kabul burada (`depo/malKabul.js`) kuruldu. Satın Alma artık kendi `satinalma_siparis_kalem`'ine Depo tarafından DOĞRUDAN yazılmıyor — Depo, kabul ettiği miktarı Satın Alma'nın **kendi servisi** olan `siparis.teslimIlerlemesiGuncelle()`'yi çağırarak bildiriyor (sahiplik kuralı).
- **Tedarikçi Karnesi** (`satinalma/tedarikciKarnesi.js`) GÜNCELLENDİ: P3'te `kaliteRedOrani` her zaman `null` dönüyordu ("P4 kurulmadan hesaplanamaz" notuyla); şimdi Depo'nun `malKabul.kalemIcinListele()` servisini çağırarak (RAW SQL değil) gerçek red oranını hesaplıyor.

### MALİYET KURALI (çift sayımı önler)

| Olay | Kural | Uygulama |
|---|---|---|
| Stok GİRİŞİ | Maliyet Defteri'ne YAZILMAZ | `stok.js#giris` — yalnızca `stok_bakiye` (miktar + ağırlıklı ortalama maliyet) güncellenir; henüz tüketilmedi. |
| Stok ÇIKIŞI, emanet_mi=0 | GERÇEKLEŞEN yazılır | `stok.js#cikis` — tutar = miktar × hareket anındaki ağırlıklı ortalama; maliyet kodu ÇIKIŞTA ZORUNLU. |
| Stok ÇIKIŞI, emanet_mi=1 | GERÇEKLEŞEN YAZILMAZ | Emanet stok (müşteri/alt yüklenici malı) hiçbir zaman maliyete girmez (**KABUL kriteri** — testle + HTTP smoke testle doğrulandı). |
| Transfer (çıkış/giriş) | Hiçbir zaman YAZILMAZ | Gerçek bir tüketim değil, yalnızca yer değişikliği. |
| Sayım farkı | Bilinçli olarak YAZILMAZ | Muhasebeleştirme ayrı bir süreç — kapsam dışı (aşağıya bkz.). |

### Uygulandı

| Kavram | Dosya | Not |
|---|---|---|
| Birim dönüşümü | `malzeme.js#birimeCevir` | "Demir ton alınır kg çıkılır" — `malzeme_birim_donusum` katsayı tablosu; ana birimin kendisi için katsayı otomatik 1. **KABUL kriteri** (birim dönüşümlü giriş-çıkış sonrası stok/maliyet doğru) testle + HTTP smoke testle (20 torba çimento → 1 ton, ₺2.000,00/ton) doğrulandı. |
| Çoklu depo | `depo.js` | merkez/şantiye/açık saha/konteyner; `proje_id=NULL` = merkez depo (tüm projelerden görülebilir). |
| Stok Bakiye + Ağırlıklı Ortalama | `stok.js` | Parametrik yöntem seçimi FIFO'ya geçişe açık bırakıldı (tek giriş noktası: `#giris`/`#cikis`) — FIFO'nun kendisi YAZILMADI. |
| Negatif stok engeli | `stok.js#cikis` | `negatifStokOnayi` olmadan stok eksiye düşemez ("yetkili istisnası ile" — görev metni). |
| Çevrimdışı çıkış, mükerrer engeli | `stok.js#cikis`/`#giris` | `istemci_kayit_id` UNIQUE — **KABUL kriteri** testle doğrulandı (aynı kayıt ikinci kez gönderilince stok bakiyesi İKİNCİ kez düşmüyor). |
| "Kime/hangi iş için" zorunluluğu | `stok.js#cikis` | `maliyet_kodu_id` + `teslim_alan_tipi` olmadan çıkış reddedilir. |
| Taşeron/alt yükleniciye kesintili çıkış | `stok_hareketi.kesinti_adayi_mi` + `sozlesme_id` | Gerçek bir "olay" mekanizması (kuyruk/webhook) KURULMADI — yalnızca sorgulanabilir bir alan/liste (`stok.js#kesintiAdaylariniListele`) bırakıldı; P5/P6 bunu okuyacak. |
| Min stok → otomatik talep taslağı | `stok.js#cikis` → `satinalma/talep.js#acikOtomatikTalepVarMi` | Aynı proje+malzeme için AÇIK bir otomatik talep varsa TEKRAR oluşturulmaz (testle doğrulandı). |
| Transfer ("yoldaki stok") | `stok.js#transferBaslat/#transferTeslimAl` | Kaynak depodan HEMEN düşer, hedef depoya yalnızca teslim alınınca eklenir — aradaki süre "yolda" durumuyla izlenir. |
| Sayım ve fark raporu | `stok.js#sayimBaslat/#sayimKalemGir/#sayimTamamla` | Fark, `stok_bakiye`'yi sayılan değere düzeltir + `sayim_farki` hareketi ekler (Maliyet Defteri'ne YAZILMAZ — aşağıya bkz.). |
| Zimmet (demirbaş/KKD) | `zimmet.js` | Stok hareketleriyle İZLENMEZ — ayrı ver/iade akışı. `kkd_mi` alanı P8 (Şantiye/İSG) için hazır bekliyor (P8 henüz kurulmadı). |
| **Ekranlar** | `src/moduller/depo/ekranlar/` | `StokDurumu` (depo×malzeme anlık + hareket geçmişi), `HizliCikisGiris` (mobil, çevrimdışı kuyruklu — `_cekirdek/offlineQueue.ts` **yeniden kullanıldı**, yeni bir kuyruk mekanizması YAZILMADI), `MalKabulEkrani` (sipariş seçerek), `Transfer`, `ZimmetListesi` (geri dönmesi gecikenler kırmızı vurgulu), `SayimFarkRaporu` — `DepoModulu` içinde birleşik. |

**Doğrulama:** 102/102 birim testi yeşil (`npm run test` — 19 yeni depo testi + önceki 83); `npm run build` başarılı; `npm run lint` yeni dosyalardan sıfır yeni hata; `/api/depo/*` uçları gerçek sunucuda `curl` ile uçtan uca smoke test edildi (birim dönüşümlü giriş → maliyet kodlu çıkış → GERÇEKLEŞEN doğrulama → min stok tetikleyicisi → kısmi red'li mal kabul → tedarikçi karnesine yansıma). Ekranlar izole bir tarayıcı oturumunda (gerçek dev veritabanına dokunulmadan) canlı test edildi: hızlı giriş formu (20 torba → 1 ton, ₺2.000,00/ton doğru), hareket geçmişi, zimmet ver/iade akışı — ekran görüntüsüyle doğrulandı (bu sırada hareket geçmişi ekranında bir gösterim hatası — ana birim miktarı ile girilen birim etiketinin yanlış eşleştirilmesi — bulundu ve düzeltildi).

### Bilinçli Olarak Ertelendi (bu geçişin kapsamı dışında)

- **Ekranlar mevcut App.tsx navigasyonuna BAĞLANMADI** — P1/P2/P3'teki AYNI karar.
- **Barkod/QR okuma YOK** — gerçek kamera/donanım entegrasyonu gerektirir; Hızlı Çıkış/Giriş şimdilik yalnızca listeden seçerek çalışır (görev metninin "veya listeden seçerek" alternatifi).
- **FIFO maliyetlendirme YAZILMADI** — yalnızca ağırlıklı ortalama uygulandı; görev metninin "FIFO'ya geçilebilir olsun" isteği, `stok.js`'in TEK giriş noktasından (`#giris`/`#cikis`) geçmesi sayesinde mimari olarak mümkün bırakıldı.
- **Kesinti adayı gerçek bir olay/kuyruk mekanizması DEĞİL** — yalnızca sorgulanabilir bir alan+liste; P5 (Alt Yüklenici) ve P6 (Taşeron) bunu nasıl tüketeceğine kendi geçişlerinde karar verecek.
- **Fire toleransı ALANI var, otomasyonu YOK** — `fire_toleransi_yuzde` malzeme kartında tutuluyor ama "toleransı aşan kullanım" tespiti (planlanan/gerçekleşen miktar karşılaştırması) kurulmadı — bu, WBS bazlı planlanan miktar verisi gerektirir (henüz yok).
- **Sayım farkı Maliyet Defteri'ne YAZILMIYOR** — muhasebeleştirme (sayım farkının gider/gelir olarak kaydı) ayrı, kapsam dışı bir süreç olarak bırakıldı.
- **Dosya yükleme altyapısı YOK** — Mal Kabul'ün `fotograf_url` alanı yalnızca bir metin/URL alanıdır, gerçek bir dosya depolama sistemi KURULMADI.

---

## P5 Uygulama Durumu (Alt Yüklenici Takibi / Hakediş)

Hakediş'in KESİN sahibi olarak Alt Yüklenici modülü kuruldu — `server/moduller/altyuklenici/` (backend) + `src/moduller/altyuklenici/` (frontend TS istemcisi + ekranlar).

### TANIM AYRIMI (görev metninin açık isteği — Taşeron/P6 ile çakışmayı önler)

- **ALT YÜKLENİCİ** = tüzel kişilikli, kendi personeli ve SGK işyeri kaydı olan, iş kalemi/metraj üzerinden hakediş alan firma.
- **TAŞERON (P6)** = sahada ekip olarak çalışan, puantaj/yevmiye veya basit metraj ile ödenen usta başı/ekip.
- **Ölçüt sözleşme tipi ve ödeme yöntemidir — sınıf Firma'da DEĞİL, Sözleşme'de tutulur.** Bu, P2'de zaten `sozlesme.tip` alanının `'alt_yuklenici'` ve `'taseron'` değerlerini ayrı ayrı tanımlamasıyla HAZIRDI — Alt Yüklenici modülü hiçbir yeni sınıflandırma alanı EKLEMEDİ, yalnızca `hakedis.js#olustur`'da `sozlesme.tip === 'alt_yuklenici'` kontrolü yaparak bu ayrımı UYGULADI (taşeron sözleşmesi için hakediş açma denemesi reddedilir — testle doğrulandı). Aynı firma bir projede alt yüklenici, başka bir projede taşeron sözleşmesiyle çalışabilir; bu tasarım bunu doğal olarak destekler.
- Alt yüklenici işçileri zaten Çekirdek Kişi'de `'alt_yuklenici_iscisi'` rolüyle tanımlanabiliyordu (P1'den beri) — bu modül için EK bir değişiklik gerekmedi.

### Uygulandı

| Kavram | Dosya | Not |
|---|---|---|
| Hakediş (kümülatif) | `hakedis.js` | Her dönem "önceki kümülatif + bu dönem = kümülatif"; önceki kümülatif, sözleşme kaleminin EN SON ONAYLI hakedişinden otomatik devralınır. |
| Beyan / Onay ayrımı | `hakedis.js#beyanGir`/`#onayGir` | "Alt yüklenicinin beyan ettiği metraj ile şantiye şefinin onayladığı AYRI tutulmalı" — iki farklı sütun, iki farklı durum aşamasında girilir; ÖDEMEYE her zaman ONAY miktarı girer. |
| Kümülatif aşım uyarısı | `hakedis.js#onayGir` | Sözleşme kalemi miktarını aşarsa işlem ENGELLENMEZ, bir UYARI nesnesi döner ("zeyilname gerekebilir" — P2'ye bağlantı). |
| Kesinti satırları | `kesinti.js` | Avans mahsubu/ceza/SGK bekletme MANUEL; teminat kesintisi/stopaj/KDV tevkifatı PARAMETRİK (Çekirdek parametre, yürürlük tarihli); malzeme kesintisi P4'ün `kesinti_adayi_mi` işaretli stok hareketlerinden OTOMATİK toplanır — HER hareket kendi satırı olarak eklenir (mükerrer kesinti kesin eşleşmeyle önlenir). |
| Blokaj | `evrak.js#blokajKontrolu` + `hakedis.js#durumDegistir` | Eksik/süresi geçmiş evrak varken "onayli"ya geçiş REDDEDİLİR; yetkili `blokajiAsarakOnayla()` ile gerekçe yazarak aşabilir (audit_log'a yazılır) — **KABUL kriteri** testle + HTTP smoke testle doğrulandı. |
| Son hakedişte ilişiksizlik | `evrak.js` | `son_hakedis_mi` bayrağı işaretliyse `iliskiksizlik_belgesi` de zorunlu evrak listesine eklenir. |
| Maliyet Defteri + Ödeme Talimatı | `hakedis.js#taahhutuIsle`/`#odemeTalimatiOlustur` | Onaylanınca HER hakediş kalemi kendi WBS'i için `alt_yuklenici` kaynak tipli maliyet koduna GERÇEKLEŞEN yazar (kod yoksa otomatik oluşturulur); net tutar üzerinden Çekirdek Ödeme Talimatı, kesinti dökümüyle birlikte oluşturulur. |
| İlerleme Kaydı | `ilerleme.js` | WBS bazlı planlanan/gerçekleşen %; `gecikmeOzeti()` her WBS için en güncel kaydı esas alır. |
| Performans Kartı | `performans.js` | Ağırlıklar PARAMETRİK (Çekirdek parametre, tanımsızsa eşit %25); NCR/İSG ihlal sayıları bu geçişte MANUEL girilir (otomasyon için Kalite Kontrol/İSG modülü gerekir — kapsam dışı). |
| Evrak Kontrol Listesi | `evrak.js` | Çekirdek "Belge" servisi hâlâ yok (P1'den beri ertelendi) — `dokuman_id` yalnızca mevcut `tb_dokumanlar`'a opsiyonel bir referans. |
| **Ekranlar** | `src/moduller/altyuklenici/ekranlar/` | `AltYukleniciListesi` (performans rozeti, açık hakediş sayısı, blokaj vurgusu), `HakedisHazirlama` (kalem tablosu, beyan/onay/kümülatif, kesinti ekleme, durum ilerletme, blokaj aşma), `HakedisCiktisi` (yazdırılabilir — `window.print()`), `IlerlemeGecikme`, `PerformansKarnesi`, `EvrakDurumu` — `AltYukleniciModulu` içinde birleşik, MUI EKLENMEDİ. |

**Doğrulama:** 118/118 birim testi yeşil (`npm run test` — 16 yeni alt yüklenici testi + önceki 102); `npm run build` başarılı; `npm run lint` yeni dosyalardan sıfır yeni hata; `/api/altyuklenici/*` uçları gerçek sunucuda `curl` ile uçtan uca smoke test edildi. **KABUL kriteri doğrulandı:** 3 dönemlik kümülatif hakediş (100→180→300 m) + avans mahsubu (500.000 kuruş) + malzeme kesintisi (P4'ten, 200.000 kuruş) + tevkifat/teminat (parametrik %) senaryosu doğru net tutar üretti (dönem 1: 7.000.000, dönem 2: 7.800.000 kuruş — testle satır satır doğrulandı); blokaj kuralı (eksik evrak → red, tamamlanınca geçiş, yetkiliyle aşma) çalışıyor. Ekranlar izole bir tarayıcı oturumunda (gerçek dev veritabanına dokunulmadan) canlı test edildi: hakediş oluşturma, beyan (110) ile onay (100) ayrı girişi, kesinti sonrası net tutarın doğru düşmesi (₺100.000,00 → ₺95.000,00), yazdırılabilir hakediş çıktısı — ekran görüntüsüyle doğrulandı.

### Bilinçli Olarak Ertelendi (bu geçişin kapsamı dışında)

- **Ekranlar mevcut App.tsx navigasyonuna BAĞLANMADI** — P1-P4'teki AYNI karar.
- **NCR (uygunsuzluk) ve İSG ihlal sayıları OTOMATİK toplanmıyor** — manuel girilir; gerçek bir Kalite Kontrol/İSG modülü (P8+) bu alanları besleyecek entegrasyon noktasına sahip değil henüz.
- **Fiyat farkı (endeks bazlı) formülü YOK** — görev metni "formül sözleşme maddesinden (P2) okunur" diyor; P2'nin `sozlesme_madde` tablosunda `tur='fiyat_farki'` + `parametreler` (serbest JSON) alanı zaten var ama bu modül onu OKUYUP otomatik hesaplama YAPMIYOR — kapsam dışı bırakıldı.
- **Evrak dosya yükleme YOK** — yalnızca geçerlilik tarihi + opsiyonel `dokuman_id` referansı tutuluyor.
- **Malzeme kesintisi otomatik "getirme" gerektiriyor** — P4'ten kesinti adaylarının hakedişe eklenmesi OTOMATİK tetiklenmiyor, kullanıcının "Malzeme Kesintisi Getir" butonuna basması gerekiyor (bilinçli tasarım — kullanıcı hangi dönemde hangi kesintiyi uygulayacağını kontrol etmeli).

## P6 Uygulama Durumu (Taşeron Takibi)

Taşeron modülü kuruldu — `server/moduller/taseron/` (backend) + `src/moduller/taseron/` (frontend TS istemcisi + ekranlar). Puantaj için AYRI bir sistem YAZILMADI: Çekirdek'in mevcut `puantaj_kaydi` tablosu/servisi (`server/moduller/_cekirdek/puantaj.js`) genişletilerek kullanıldı.

### TANIM AYRIMI (P5'teki notla simetrik — CAKISMA_HARITASI'nin tek kaynağı)

- **TAŞERON** = sahada ekip olarak çalışan, puantaj/yevmiye veya basit metraj ile ödenen usta başı/ekip (çoğunlukla şahıs). **ALT YÜKLENİCİ (P5)** = tüzel kişilikli, iş kalemi/metraj üzerinden hakediş alan firma.
- Ölçüt yine **`sozlesme.tip`** — `ekip.js#olustur`, sözleşme tipi `'taseron'` değilse ekip kurulmasını REDDEDER (testle doğrulandı: `ekip.test.js`). Firma/Kişi'de sınıflandırma alanı YOK; aynı kişi/firma projeden projeye farklı sözleşme tipiyle çalışabilir.

### Çekirdek'te yapılan TEK değişiklik (İK dahil TÜM puantaj tüketicilerini etkiler)

- `puantaj_kaydi` tablosuna `gun_tipi` (tam/yarim/devamsiz), `bayram_pazar_mi`, `maliyet_kodu_id` sütunları eklendi (defansif `ALTER TABLE` — mevcut satırlar etkilenmez).
- **Yeni kural: aynı kişi aynı gün İKİNCİ kez puantaja yazılamaz** — `(kisi_id, tarih)` üzerinde `row_status = 1` şartlı KISMİ UNIQUE INDEX eklendi. Bu kural Çekirdek seviyesinde olduğu için Taşeron'a ÖZEL değil; ileride İK'nın personel puantajı da aynı tabloyu kullanırsa bu tekillik OTOMATİK olarak onu da kapsar.
- `maliyet_kodu_id` Çekirdek'te OPSİYONEL bırakıldı (İK'nın ihtiyacı bilinmiyor); Taşeron servis katmanında (`puantajTaseron.js#kaydet`) ise ZORUNLU kılındı — bilinçli, katmanlı bir kural.

### Uygulandı

| Kavram | Dosya | Not |
|---|---|---|
| Ekip / Ekip Üyesi | `ekip.js` | TANIM AYRIMI kontrolü; aynı kişi aynı ekibe iki kez eklenemez; yevmiye YÜRÜRLÜK TARİHLİ (`ekip_uye_yevmiye`, insert-only). |
| Puantaj | `puantajTaseron.js` | Çekirdek `puantaj.js`'in ince bir sarmalayıcısı; `maliyet_kodu_id` zorunlu; kapalı döneme ait tarihe yazma ENGELLENİR; `tumEkibeUygula()` "hepsi tam gün" + istisna akışını destekler, bir üye SGK/İSG'den başarısız olsa DİĞERLERİNİ durdurmaz (kısmi başarı döner). |
| KAYIT DIŞI İŞÇİ RİSKİ | `puantajTaseron.js#sgkIsgKontrolu` | SGK işe giriş bildirgesi veya İSG eğitim geçerliliği eksikse puantaj REDDEDİLİR; yetkili `yetkiliOnayi=true` + zorunlu `gerekce` ile aşabilir (audit_log'a yazılır) — **KABUL kriteri**, hem testle hem canlı tarayıcı testiyle doğrulandı. |
| Metraj | `metraj.js` | Beyan (`miktar`) / şef onayı (`sef_onay_miktar`) AYRI sütunlar; yalnızca ONAY miktarı ödemeye ve verimlilik raporuna girer. |
| Ödeme Dönemi | `odemeDonemi.js` | AKIŞ: açık→şef onayı→proje müdürü onayı→kapandı; kapanmış döneme ait puantaj/kesinti DEĞİŞTİRİLEMEZ (düzeltme = sonraki dönemde fark satırı); `taahhutuIsle()` yevmiye+fazla mesai+bayram/pazar çarpanlarını (PARAMETRİK) hesaplayıp HER puantaj kaydı için ayrı bir Maliyet Defteri GERÇEKLEŞEN satırı yazar; metraj/götürü ödeme tipinde puantaj tutulur ama ödemeye GİRMEZ. |
| Kesintiler | `kesinti.js` | Avans/yemek/barınma/ceza MANUEL; malzeme fire kesintisi P4'ten (P5'teki AYNI desen: her stok hareketi kendi satırı, mükerrer kesin eşleşmeyle önlenir); alet kaybı — bkz. Ertelendi. |
| Verimlilik Raporu | `verimlilik.js` | Ekip × sözleşme kalemi bazında adam-gün/birim (düşük = verimli); adam-gün, puantajın `maliyet_kodu_id`'si o kalemin WBS'ine bağlı `iscilik_taseron` koduyla eşleşerek bulunur (RAW puantaj sorgusu değil, Çekirdek'in kendi `kisiAraligiListele()` fonksiyonu üzerinden). |
| **Ekranlar** | `src/moduller/taseron/ekranlar/` | `EkipListesi`, `MobilGunlukPuantaj` ("Hepsi Tam Gün" + istisna), `HaftalikPuantajMatrisi` (kişi×gün), `AvansGirisi`, `DonemHesapPusulasi` (yazdırılabilir, `window.print()`, akış butonları), `VerimlilikRaporu`, `EksikEvrakliIsciUyarilari` — `TaseronModulu` içinde birleşik, MUI EKLENMEDİ. |

**Doğrulama:** 136/136 birim testi yeşil (`npm run test` — 15 yeni taşeron/puantaj testi + önceki 121); `npm run build` başarılı; `npm run lint` yeni dosyalardan sıfır yeni hata (yalnızca 7 önceden var olan hata). **KABUL kriteri doğrulandı** (`odemeDonemi.test.js`): yevmiye + fazla mesai + yarım gün + avans + malzeme kesintisi senaryosunda brüt 162.500, kesinti 35.000, net 127.500 kuruş — 3 ayrı GERÇEKLEŞEN hareketi toplamı brüt ile TUTARLI; aynı kişi aynı gün ikinci kez puantaja yazılamıyor; SGK/İSG eksik işçi uyarısı çalışıyor. Ekranlar izole bir tarayıcı oturumunda (gerçek dev veritabanına dokunulmadan, `ODA_DB_PATH`/`ODA_API_PORT` ile ayrı sunucu ve ayrı Vite örneği) canlı test edildi: "Hepsi Tam Gün" kaydı (1 kaydedildi) → tekrar basınca çift-puantaj engeli ("0 kaydedildi, 1 istisna") → haftalık matriste doğru görünüm → avans girişi (-₺500,00) → hesap pusulasında brüt/net doğru hesap (₺1.750,00 / ₺1.250,00 — tam gün+yarım gün+2 saat fazla mesai) → durum akışı şef onayı→proje müdürü onayı→kapandı → verimlilik raporu (20 m² / 1,5 adam-gün = 0,075) → eksik evraklı işçi uyarısı (SGK+İSG eksik ikinci üye) — hepsi ekran görüntüsüyle doğrulandı.

**Canlı testte bulunup düzeltilen hata:** `verimlilik.js#raporOlustur`, HTTP query string'inden gelen `sozlesme_kalem_id`'yi (her zaman `string`) DB'den okunan `number` değerle `===` ile karşılaştırıyordu — bu yüzden `/api/taseron/verimlilik` ucundan çağrıldığında toplam metraj HER ZAMAN 0 dönüyordu, sessizce. Otomatik test bunu yakalayamamıştı çünkü fonksiyonu doğrudan (HTTP katmanı olmadan) `number` id ile çağırıyordu. Düzeltme: fonksiyon girişinde `sozlesmeKalemId = Number(sozlesmeKalemId)` zorunlu kılındı. **Ders:** query-string parametreleriyle çalışan servis fonksiyonları, otomatik testlerde olduğu gibi doğrudan number ile değil, gerçek HTTP isteğiyle de (curl/tarayıcı) en az bir kez doğrulanmalı — tip coercion hataları birim testlerinde görünmez kalabilir.

### Bilinçli Olarak Ertelendi (bu geçişin kapsamı dışında)

- **Ekranlar mevcut App.tsx navigasyonuna BAĞLANMADI** — P1-P5'teki AYNI karar.
- **`MobilGunlukPuantaj.tsx` çevrimdışı kuyruk (`offlineQueue.ts`) KULLANMIYOR** — P4'ün `HizliCikisGiris.tsx`'i bu altyapıyı kullanıyordu; Taşeron'un mobil puantaj ekranı şimdilik doğrudan `fetch` çağrısı yapıyor. ÇALIŞMA KURALLARI'nın "sahadan veri girilen ekranlar... çevrimdışı kuyruklu olsun" maddesiyle ÇELİŞEN bilinçli bir kapsam kısıtlaması — bir sonraki geçişte `offlineQueue.ts` bu ekrana da sarmalanmalı.
- **Alet kaybı kesintisi OTOMATİK tutar üretmiyor** — P4'ün zimmet kaydında parasal bir değer alanı yok; `kesinti.js#kayipZimmetleriGetir()` yalnızca BİLGİ amaçlı listeler, kullanıcı tutarı `kesinti.js#ekle()` ile manuel girer (P5'teki performans kartı NCR/İSG sayılarının manuel girilmesiyle AYNI türde bir kısıtlama).
- **Taşeron gerçek kişiyle (taraf_kisi_id) sözleşme yapıldığında Ödeme Talimatı oluşturulamıyor** — Çekirdek'in `odeme_talimati` servisi şu an yalnızca Firma'ya (`cari_firma`) ödeme destekliyor; canlı testte bu senaryo denendi ve kullanıcıya net bir hata mesajıyla ENGELLENDİĞİ doğrulandı ("Bu sözleşmenin tarafı bir Firma değil..."). Gerçek kişi taşeronlara ödeme talimatı desteği Çekirdek'in `odeme.js`'inde ayrı bir geçiş gerektirir.
- **`kesinti.js#malzemeFireKesintisiEkle` hiçbir ekrandan tetiklenmiyor** — API/servis katmanında hazır (P5'teki AYNI desen) ama "Malzeme Kesintisi Getir" butonu bu geçişte bir ekrana EKLENMEDİ; kullanıcı şu an yalnızca API üzerinden veya bir sonraki geçişte eklenecek bir ekrandan tetikleyebilir.

## P7 Uygulama Durumu (İK Yönetimi)

İK modülü kuruldu — `server/moduller/ik/` + `src/moduller/ik/`. Puantaj için AYRI sistem yazılmadı (P6 ile aynı Çekirdek `puantaj_kaydi`).

### Çekirdek'te yapılan TEK değişiklik
- **`belge` tablosu + `belge.js`** (Çekirdek): §4.1'de "Belge" Çekirdek'e ait ama hiç yoktu. Genel metadata kaydı (`ilgili_tip`/`ilgili_id`, tür, geçerlilik); gerçek dosya baytı SAKLANMAZ (yükleme altyapısı yok). İK özlük evrakı `ilgili_tip='kisi'` ile bunu çağırır, kopyalamaz.

### Uygulandı
| Kavram | Dosya | Not |
|---|---|---|
| Personel | `personel.js` | Kişi(rol=personel) üzerine sicil/departman/unvan/çalışma şekli; ücret geçmişi yürürlük tarihli; proje ataması bilgi amaçlı; çıkışta kıdem GÜNÜ döner (tazminat hesabı YOK). |
| PDKS | `pdks.js` | Yöntem (kartlı/QR/mobil GPS/manuel/biyometrik) `ik_pdks_meta`'da; Çekirdek enum'u genişletilmedi. Biyometrik: açık rıza yoksa REDDEDİLİR (KVKK, yetkili aşamaz). Yıllık fazla mesai limiti parametrik (`ik_fazla_mesai_yillik_limit_saat`), aşımda yetkili onayı+gerekçe. Ham kayıt değişmez: `duzelt()` = eskiyi iptal + onaylı yeni kayıt. |
| İzin | `izin.js` | Kıdem bazlı hak tablosu (yürürlük tarihli) + yaş grubu asgari (`ik_izin_asgari_gun_yas_grubu`); bakiye devreder; yalnız `yillik` bakiyeden düşer. |
| Avans | `avans.js` | Onayda eşit taksit (küsurat son taksitte); mahsup dönem onayında işaretlenir, önizleme salt okunur. |
| Bordro ön hazırlık | `bordroDonemi.js` | Gün/mesai(bilgi)/izin/avans toplar; brüt = aylık/30 × gün. Proje dağıtımı PUANTAJ günlerinin `maliyet_kodu_id`'sine oranlı; onayda Maliyet Defteri GERÇEKLEŞEN. |
| Ekranlar | `src/moduller/ik/ekranlar/` | Personel listesi/kartı (6 sekme, İSG salt okunur), PDKS günlük durum (çevrimdışı kuyruklu), izin, avans, bordro+CSV, evrak süresi dolanlar. |

**İSG:** sahibi P8; P7'de Çekirdek Kişi'deki `isg_egitim_*` alanları salt okunur gösterilir.
**Doğrulama:** 167/167 test; build temiz; lint yalnızca 7 eski hata. KABUL: çok şantiyeli maliyet oranlı (testle + canlı HTTP: 900.000/450.000), izin bakiyesi kıdem/devir doğru (test), maaş `gorunenRol='sef'` iken gizli (UI simülasyonu). Canlı tarayıcıda liste/kart/belgeler/İSG/izin/PDKS "içeride" doğrulandı.

### Bilinçli Olarak Ertelendi
- Ekranlar App.tsx'e bağlanmadı (P1-P6 ile aynı).
- **Tam bordro motoru (SGK/gelir vergisi/damga/kümülatif matrah) YAZILMADI** — ayrı faz kararı sizin.
- Geofence point-in-polygon hesaplanmıyor; `geofence_icinde_mi` bilgi olarak taşınır.
- Rol bazlı maaş gizleme yalnız UI seviyesinde (gerçek oturum/yetki sistemi yok); API maaşı herkese döner.
- Ayı tamamen izinli geçen (hiç puantajı olmayan) personelin maliyeti dağıtılamaz; WBS'siz günler deftere yazılmaz (P6 ile aynı kural). Genel merkez payı → genel gider kodu otomasyonu yok.
- Kişi bazlı puantaj geçmişi için Çekirdek REST ucu yok; kart "Puantaj" sekmesi yalnız yönlendirme metni gösterir.
- Bordro/izin/avans onay uçları ve `gorunenRol` gerçek yetkiyle korunmuyor.

## P8 Uygulama Durumu (Şantiye Yönetimi)

Şantiye modülü kuruldu — `server/moduller/santiye/` + `src/moduller/santiye/`. Görev, Günlük Rapor, İSG kayıtları, Kalite (NCR/Beton) ve Ekipman'ın sahibi burasıdır (§4.1).

### Sahiplik / başka modüllere dokunuşlar (hepsi sahibinin SERVİSİ üzerinden)
- **İSG Eğitim Kaydı artık P8'in** (`isg_egitim`). Eğitim eklenince Çekirdek `kisi.isg_egitim_*` alanı **türev önbellek** olarak güncellenir (P6'nın SGK/İSG kontrolü ve P7 İSG sekmesi çalışmaya devam eder). Eski/elle girilmiş `kisi.isg_egitim_*` değeri de giriş kontrolünde geçerli sayılır (geriye uyum).
- Kişi sayıları/kim-nerede burada TOPLANMAZ: Çekirdek puantajdan (İK P7 / Taşeron P6 / alt yüklenici işçisi aynı tabloyu yazar) okunur; gelen malzeme Depo'nun yeni `malKabul.projeGunuIcinListele()`, KKD Depo `zimmet.listele()`, kira birim fiyatı Sözleşme `kalemleriGetir()`, SGK bilgisi Taşeron yeni `ekip.kisiUyelikleri()` / İK `personel.kisiIcinGetir()` üzerinden. Bu üç okuma fonksiyonu sahip modüllere eklenen TEK değişikliktir.
- **P5'e olay:** `altyuklenici/db.js`'e `performans_olay` tablosu + `performans.olayGonder()` eklendi. NCR/İSG olayının sorumlusu alt yükleniciyse olay gönderilir (kaynak başına tek — mükerrer yok). Performans kartı puanları hâlâ manuel; olaylar `olaylariListele()` ile okunur (otomatik puanlama bu turda YOK).

### Uygulandı
| Kavram | Dosya | Not |
|---|---|---|
| Günlük rapor | `gunlukRapor.js` | Çalışan (firma bazlı, puantajdan), malzeme (mal kabulden), makine (ekipman kaydından) OTOMATİK; şef düzeltir (`otomatik_sayi` korunur, `sayi` ezer). `topluKaydet()` ATOMİK + `istemci_kayit_id` idempotent (çevrimdışı kuyruk). Onaylı rapor kilitli. İç rapordan resmi defter TASLAĞI metni üretilir (resmi defter yerine geçmez). |
| Görev | `gorev.js` | Sorumlu kişi/taşeron ekibi/alt yüklenici (varlığı sahibine sorulur), WBS, blok/kat/daire veya harita noktası, son tarih; fotoğrafsız kapanış REDDEDİLİR. |
| İş programı | `isProgrami.js` | CSV içe aktarım (Excel/MS Project dışa aktarımı; `;`/`,`, GG.AA.YYYY), doğrusal beklenen %, plan-gerçekleşen. P5 ilerleme kaydıyla çelişki (parametrik eşik `santiye_ilerleme_celiski_esik`, varsayılan 10 puan) UYARI olur; tek doğru şantiye onaylı ilerleme, P5 verisi değiştirilmez. |
| İSG | `isg.js` | Eğitim, giriş kontrolü (eğitim/SGK yoksa uyarı, yetkili+gerekçe ile geçiş, her deneme kayıtlı), risk (olasılık×şiddet), iş izni akışı (onaylayan zorunlu), denetim şablon+yanıt (uygunsuz madde → otomatik düzeltici faaliyet), anonim ramak kala (kimlik hiç yazılmaz), olay/kaza (yasal bildirim son tarihi PARAMETRİK `isg_kaza_bildirim_gun`), düzeltici faaliyet (kapanış notu zorunlu). |
| Kalite | `kalite.js` | NCR akışı acik→duzeltildi→kapali; beton döküm + numune (her numune için 7 ve 28 gün kırım planı, bekleyen hatırlatma). |
| Ekipman | `ekipman.js` | Kiralıkta kira sözleşmesi ZORUNLU; çalışma kaydı saat×sözleşme birim fiyatı → Maliyet Defteri GERÇEKLEŞEN (`makine_ekipman` kodu); sayaç, arıza, operatör SRC belgesi kontrolü (Çekirdek Belge; uyarı), `istemci_kayit_id` ile çevrimdışı-idempotent. |
| GeoJSON | `geojson.js` | `GET /api/santiye/geojson?proje_id=&katmanlar=` — görev/NCR/olay/ramak kala/fotoğraf/beton, `[lon,lat]`. Harita kodu DEĞİŞTİRİLMEDİ. |
| Ekranlar | `src/moduller/santiye/ekranlar/` | Pano, mobil günlük rapor sihirbazı (6 adım, çevrimdışı kuyruklu), görev panosu (kanban/liste), Gantt plan-gerçekleşen, İSG merkezi (7 sekme), NCR, ekipman (çevrimdışı kuyruklu). |

**Doğrulama:** 191/191 test yeşil; `npm run build` temiz; `npm run lint` yalnızca 7 eski hata. KABUL: günlük rapor puantaj+mal kabulü otomatik çekiyor (test + canlı: puantajdan 2 taşeron + 1 personel geldi, şef 2→1 düzeltti); eğitimsiz kişi girişte uyarı alıyor (canlı: eğitim + SGK uyarısı); konumlu kayıtlar GeoJSON (canlı: gorev/ncr/olay). İzole tarayıcı oturumunda pano, sihirbaz (kaydet→onay→defter taslağı), görev panosu, iş programı, İSG giriş kontrolü doğrulandı; konsol hatası yok.

### Bilinçli Olarak Ertelendi
- Ekranlar App.tsx'e ve ODA harita katmanına BAĞLANMADI (yalnız GeoJSON veri servisi).
- Fotoğraf: dosya yükleme altyapısı yok — yalnızca ad/URL + konum metadata'sı (Belge ile aynı sınır).
- Turnike/kartlı donanım entegrasyonu yok; giriş kontrolü servis çağrısı olarak hazır.
- Alt yüklenici işçisi için SGK doğrulaması yapılamıyor (P5 yalnızca sözleşme düzeyinde "çalışan listesi" evrakı tutuyor) — yalnız İSG eğitimi kontrol edilir.
- Beton numune kırım sonucunun sınıf dayanımına göre kabul/red değerlendirmesi yok (yalnız kayıt + hatırlatma).
- P5 performans kartı puanı `performans_olay`'dan otomatik hesaplanmıyor (olay listesi hazır).
- Günlük rapor çalışan kırılımı `kisi.rol`+firma bazlıdır; taşeron ekibi/alt yüklenici sözleşmesi bazında ayrım yok.
- `santiye_giris`/rol bazlı yetki yok (gerçek oturum sistemi yok).
