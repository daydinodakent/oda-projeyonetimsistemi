#!/usr/bin/env python3
# IFC dosyasını GERÇEK IFC semantiğiyle (IfcOpenShell) okuyup GeoJSON'a
# çevirir — legacy-standalone-tools/oda-harita-cizim-araci.html içindeki
# client-side importIFC() ile KARIŞTIRILMAMALI: o fonksiyon dosyanın TAMAMI
# için TEK bir kaba (bounding-box) taban izdüşümü çıkarır; bu script ise
# IfcOpenShell'in geometri motoruyla HER elemanın (duvar, döşeme, oda vb.)
# kendi taban izdüşümünü ve yüksekliğini ayrı ayrı üretir (bkz. FAZ 2 — ETL
# yol haritası).
#
# Koordinatlar IFC dosyasının kendi yerel/proje koordinat sisteminde kalır
# (coğrafi referans yoksa harita CRS'ine otomatik dönüştürülemez) — bu,
# BIM dosyalarının doğası gereği bir sınırlamadır, GDAL/OGR için de geçerlidir.
#
# FAZ 6 (büyük dosya performansı) — çok büyük (ör. 2GB) IFC dosyaları
# yüz binlerce/milyonlarca IfcProduct içerebilir; her birinin GeoJSON olarak
# TARAYICIYA dökülmesi hem HTTP yanıtını hem de MapLibre'nin render süresini
# pratik olmayan boyutlara taşır. Bu yüzden pointcloud_to_geojson.py'daki
# MAX_POINTS örnekleme deseniyle AYNI mantıkla, aday ürün listesi eşit
# aralıklı (evenly-spaced) örneklenir — pahalı olan create_shape() ÇAĞRISI
# ÖNCESİNDE, yalnızca seçilen elemanlar için geometri üretilir.
#
# Kullanım: python ifc_to_geojson.py <dosya.ifc> [max_elements]
# Çıktı (stdout): {"type":"FeatureCollection","features":[...],"count":N,
#                  "totalElements":M,"sampled":bool,"skipped":K}
#                 veya hata durumunda {"error":"..."}
import sys
import json


def evenly_spaced_indices(total, count):
    if count >= total:
        return list(range(total))
    if count <= 1:
        return [0]
    step = (total - 1) / (count - 1)
    return sorted(set(round(i * step) for i in range(count)))


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Kullanım: ifc_to_geojson.py <dosya.ifc> [max_elements]"}))
        sys.exit(1)

    ifc_path = sys.argv[1]
    max_elements = int(sys.argv[2]) if len(sys.argv) > 2 else 50000

    try:
        import ifcopenshell
        import ifcopenshell.geom
    except ImportError as e:
        print(json.dumps({"error": f"ifcopenshell yüklü değil: {e}"}))
        sys.exit(1)

    try:
        model = ifcopenshell.open(ifc_path)
    except Exception as e:
        print(json.dumps({"error": f"IFC dosyası açılamadı: {e}"}))
        sys.exit(1)

    settings = ifcopenshell.geom.settings()
    settings.set(settings.USE_WORLD_COORDS, True)

    all_products = list(model.by_type("IfcProduct"))
    total_products = len(all_products)
    if total_products > max_elements:
        products = [all_products[i] for i in evenly_spaced_indices(total_products, max_elements)]
        sampled = True
    else:
        products = all_products
        sampled = False

    features = []
    skipped = 0
    for product in products:
        if not getattr(product, "Representation", None):
            continue
        try:
            shape = ifcopenshell.geom.create_shape(settings, product)
        except Exception:
            skipped += 1
            continue

        verts = shape.geometry.verts
        if not verts or len(verts) < 9:
            continue

        xs = verts[0::3]
        ys = verts[1::3]
        zs = verts[2::3]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        min_z, max_z = min(zs), max(zs)
        height = max(0.1, round(max_z - min_z, 3))

        # Taban izdüşümü: elemanın 3B dışbükey sınır kutusunun (bounding box)
        # X/Y düzlemine izdüşümü — tam poligon konturu değil, ama harita
        # üzerinde 3B ekstrüzyon olarak göstermek için yeterli ve GÜVENİLİR
        # (gerçek mesh konturunu çıkarmak çok daha karmaşık/kırılgan olurdu).
        ring = [
            [min_x, min_y],
            [max_x, min_y],
            [max_x, max_y],
            [min_x, max_y],
            [min_x, min_y],
        ]
        features.append({
            "type": "Feature",
            "properties": {
                "ifc_type": product.is_a(),
                "name": product.Name or "",
                "global_id": product.GlobalId,
                "height": height,
                "base": round(min_z, 3),
                # extrude/floors/floorHeight: legacy-standalone-tools/oda-harita-cizim-araci.html
                # tarafında poligonun DÜZ değil 3B (fill-extrusion) katmanında
                # çizilmesi için gereken bayrak/alanlar — istemci tarafındaki
                # importIFC()/importGLTF() ile AYNI sözleşme (bkz. f.properties.extrude).
                "extrude": True,
                "floors": 1,
                "floorHeight": height,
            },
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        })

    print(json.dumps({
        "type": "FeatureCollection",
        "features": features,
        "count": len(features),
        "totalElements": total_products,
        "sampled": sampled,
        "skipped": skipped,
    }))


if __name__ == "__main__":
    main()
