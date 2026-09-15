#!/usr/bin/env python3
# LAS/LAZ nokta bulutunu laspy ile okuyup GeoJSON Point FeatureCollection'a
# çevirir. Nokta bulutları milyonlarca nokta içerebildiğinden (tarayıcıda
# doğrudan render edilemez), çıktı MAX_POINTS'e göre eşit aralıklı
# örneklenir (decimation) — tam çözünürlüklü işleme (PDAL) bu ortamda
# native derleyici gerektirdiğinden mevcut değil (bkz. FAZ 2 — ETL yol
# haritası notları), bu yüzden "önizleme/yaklaşık konum" amaçlı bir
# örnekleme kullanılır.
#
# Kullanım: python pointcloud_to_geojson.py <dosya.las|.laz> [max_points]
# Çıktı (stdout): {"type":"FeatureCollection","features":[...],"count":N,
#                  "totalPoints":M,"sampled":bool}
import sys
import json


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Kullanım: pointcloud_to_geojson.py <dosya.las|.laz> [max_points]"}))
        sys.exit(1)

    las_path = sys.argv[1]
    max_points = int(sys.argv[2]) if len(sys.argv) > 2 else 20000

    try:
        import laspy
        import numpy as np
    except ImportError as e:
        print(json.dumps({"error": f"laspy yüklü değil: {e}"}))
        sys.exit(1)

    try:
        las = laspy.read(las_path)
    except Exception as e:
        print(json.dumps({"error": f"Nokta bulutu dosyası okunamadı: {e}"}))
        sys.exit(1)

    total = len(las.points)
    if total == 0:
        print(json.dumps({"type": "FeatureCollection", "features": [], "count": 0, "totalPoints": 0, "sampled": False}))
        return

    if total > max_points:
        idx = np.linspace(0, total - 1, max_points).astype(int)
        sampled = True
    else:
        idx = np.arange(total)
        sampled = False

    xs = las.x[idx]
    ys = las.y[idx]
    zs = las.z[idx]
    has_classification = hasattr(las, "classification")
    classes = las.classification[idx] if has_classification else None

    features = []
    for i in range(len(idx)):
        props = {"z": round(float(zs[i]), 3)}
        if classes is not None:
            props["classification"] = int(classes[i])
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {"type": "Point", "coordinates": [round(float(xs[i]), 6), round(float(ys[i]), 6)]},
        })

    print(json.dumps({
        "type": "FeatureCollection",
        "features": features,
        "count": len(features),
        "totalPoints": total,
        "sampled": sampled,
    }))


if __name__ == "__main__":
    main()
