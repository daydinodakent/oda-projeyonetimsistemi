# Kroki — CBS Editör (React + Vite + MapLibre)

## Kurulum
```bash
npm install
npm run dev
```
Tarayıcıda http://localhost:5173 açılır.

## Üretim derlemesi
```bash
npm run build
npm run preview
```

## Bu portta neler var
- React + Vite + Zustand + MapLibre GL JS mimarisi
- Harita/Editör/Analiz sekmeleri, sol kenar çubuğu (aç/kapa)
- Klasör hiyerarşili katman ağacı (Genel > Yapılar/Altyapı), sürükle-bırak ile taşıma
- Katman Stili modalı: renk (poligonlarda dolgu+çerçeve ayrı), kalınlık, çizgi tipi, nokta sembol kütüphanesi
- Çizim: Nokta/Çizgi/Poligon/Dikdörtgen/Çember, "+ Yerleştir" veri giriş akışı
- Seç/Düzenle: tıkla-seç, sürükle-taşı, köşe düzenleme
- Snap sistemi: uç nokta/orta nokta/en yakın/merkez/kesişim/dik (6 tür, ayrı işaretler)
- Ölçüm: Mesafe/Alan, sonuçlar harita üzerinde kalıcı kalır ("Ölçümleri Temizle" ile silinir)
- Bina gölge analizi (güneş konumuna göre yaklaşık gölge izdüşümü)
- Katman bazlı dışa aktarma: GeoJSON, KML, KMZ, Shapefile (.zip), DXF
- GeoJSON içe aktarma (dosya adına göre otomatik katman oluşturur)

## Bu portta HENÜZ taşınmayanlar (orijinal tek-dosya sürümde vardı)
- DXF/SHP/KML/GML/GLTF/IFC dosya İÇE AKTARMA (şu an sadece GeoJSON içe aktarılıyor)
- Zamana bağlı raster görüntü karşılaştırma (opaklık kaydırıcı + yanıp-sön)
- 3B Poligon kat/yükseklik paneli, boru ekstrüzyonu
- AutoCAD tarzı imleç-üstü koordinat girişi
- Sorgu / Rapor / Çıktı sekmelerinin tam işlevi

Bu eksikler istenirse ayrı adımlarda tamamlanabilir — mimari (store, hook yapısı) bunlara uygun şekilde genişletilebilir olacak şekilde kuruldu.
