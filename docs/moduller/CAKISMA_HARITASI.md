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
