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
# Kullanım: python ifc_to_geojson.py <dosya.ifc>
# Çıktı (stdout): {"type":"FeatureCollection","features":[...],"count":N}
#                 veya hata durumunda {"error":"..."}
import sys
import json


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Kullanım: ifc_to_geojson.py <dosya.ifc>"}))
        sys.exit(1)

    ifc_path = sys.argv[1]

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

    features = []
    skipped = 0
    for product in model.by_type("IfcProduct"):
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
            },
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        })

    print(json.dumps({
        "type": "FeatureCollection",
        "features": features,
        "count": len(features),
        "skipped": skipped,
    }))


if __name__ == "__main__":
    main()
