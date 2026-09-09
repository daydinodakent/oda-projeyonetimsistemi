# Geçiş Notları — Google AI Studio → Claude

Bu depo, Google AI Studio'da geliştirilen **"ODA+ Proje Yönetim Sistemi"** projesinin
dışa aktarımından oluşturuldu. Geliştirmeye Claude üzerinden devam edilecek.

## Mevcut durum tespiti

- Ana uygulama `src/App.tsx` (React 19 + Vite + TS). Gantt, CEO Dashboard,
  İnşaat/İşletme/Plan görünümleri, Admin paneli çalışır durumda.
- **`harita` sekmesi henüz boş bir placeholder içeriyor** (`App.tsx` ~satır 1804-1808):
  > "Yeni harita modülü kodları bekleniyor..."
- Üç ayrı, hiçbiri App.tsx'e bağlanmamış CBS/harita denemesi var:
  - `src/components/gis/` — GisMap.tsx (1704 satır) + yardımcı hook/bileşenler
  - `src/components/gis/kroki/` — MapModule.tsx + LayerTree/Sidebar/Modals/MapView alt klasörleri (~3160 satır TS)
  - `kroki-react/` — bağımsız bir Vite/React alt projesi (~2300 satır JS), muhtemelen
    `gis/kroki/`'nin TS'e çevrilmeden önceki hali
- `@google/genai` (Gemini SDK) `package.json`'da bağımlılık olarak var ama **kodun
  hiçbir yerinde kullanılmıyor** — gerçek bir API-key bağımlılığı yok.
- `data.ts` içinde CBS'ye hazır veri zaten mevcut: `gisBoundaryRecords`,
  `gisBuildingRecords`, `gisInfrastructureRecords`.

## Eklenen dosya

- `legacy-standalone-tools/kroki-harita-cizim-araci.html` — Claude'da ayrı olarak
  geliştirilmiş, tek dosyalık, çalışır durumda olgun bir CBS çizim aracı (vanilla JS +
  MapLibre GL + Turf.js; kendi çizim/ölçüm/katman motoru, undo/redo, snapping,
  AutoCAD tarzı dinamik giriş, 3B kat ayarları). Buraya referans/kaynak olarak eklendi.

## Tamamlanan adım: harita sekmesi entegrasyonu

`src/components/gis/KrokiMapModule.tsx` eklendi. Kroki, kendi id/DOM yapısıyla
ana uygulamaya karışmaması için `srcDoc` ile bir `<iframe>` içinde çalıştırılıyor
(`legacy-standalone-tools/kroki-harita-cizim-araci.html` Vite'ın `?raw` importuyla
derleme zamanında string olarak gömülüyor, kaynak dosya değiştirilmedi).
`App.tsx`'teki placeholder bu bileşenle değiştirildi. `npm run build` ve
`tsc --noEmit` hatasız geçiyor.

Kroki şu an ana uygulamanın proje verisinden habersiz, izole bir CBS tuvali
olarak çalışıyor.

## Planlanan sıradaki adım: proje verisiyle bağlama

`data.ts`'teki `gisBoundaryRecords`, `gisBuildingRecords`, `gisInfrastructureRecords`
verilerini aktif projeye (`activeProject`) göre Kroki'nin katman ağacına aktarmak
için iframe ile ana uygulama arasında bir `postMessage` köprüsü kurulacak
(iframe izolasyonu nedeniyle doğrudan prop/state paylaşımı mümkün değil).
Yarım kalmış üç React CBS denemesi (`gis/`, `gis/kroki/`, `kroki-react/`) hâlâ
silinmedi, parça kaynağı (store, exporters, geometry, symbols) olarak
değerlendirilebilir.
