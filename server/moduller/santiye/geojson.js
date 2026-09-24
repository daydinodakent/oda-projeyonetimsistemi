// Konumlu şantiye kayıtları (görev, NCR, olay, ramak kala, fotoğraf, beton
// döküm) → GeoJSON FeatureCollection. Yalnızca VERİ SERVİSİ — ODA harita
// modülü kodu bu fazda DEĞİŞTİRİLMEDİ; katman olarak eklemek ileride
// /api/santiye/geojson çıktısını okumakla yapılır. Koordinat sırası GeoJSON
// standardı: [boylam(lon), enlem(lat)].
import { db } from './db.js';

const KATMANLAR = {
  gorev: { sql: "SELECT id, baslik AS ad, durum, lat, lon, son_tarih AS tarih FROM gorev WHERE proje_id = ? AND row_status = 1 AND lat IS NOT NULL AND lon IS NOT NULL" },
  ncr: { sql: "SELECT id, baslik AS ad, durum, lat, lon, acilis_tarihi AS tarih FROM ncr WHERE proje_id = ? AND row_status = 1 AND lat IS NOT NULL AND lon IS NOT NULL" },
  olay: { sql: "SELECT id, tur || ': ' || aciklama AS ad, tur AS durum, lat, lon, tarih FROM isg_olay WHERE proje_id = ? AND row_status = 1 AND lat IS NOT NULL AND lon IS NOT NULL" },
  ramak_kala: { sql: "SELECT id, aciklama AS ad, 'ramak_kala' AS durum, lat, lon, tarih FROM isg_ramak_kala WHERE proje_id = ? AND lat IS NOT NULL AND lon IS NOT NULL" },
  fotograf: {
    sql: `SELECT b.id, COALESCE(b.notes, b.etiket) AS ad, 'fotograf' AS durum, b.lat, b.lon, r.tarih, b.dosya_url
          FROM gunluk_rapor_bolum b JOIN gunluk_rapor r ON r.id = b.rapor_id
          WHERE r.proje_id = ? AND b.tur = 'fotograf' AND b.lat IS NOT NULL AND b.lon IS NOT NULL`,
  },
  beton: { sql: "SELECT id, eleman || ' ' || beton_sinifi AS ad, 'beton_dokum' AS durum, lat, lon, tarih FROM beton_dokum WHERE proje_id = ? AND row_status = 1 AND lat IS NOT NULL AND lon IS NOT NULL" },
};

/** @param {string[]} [katmanlar] verilmezse hepsi. */
export function featureCollection(projeId, katmanlar) {
  const secilen = (katmanlar && katmanlar.length ? katmanlar : Object.keys(KATMANLAR)).filter((k) => KATMANLAR[k]);
  const features = [];
  for (const katman of secilen) {
    for (const r of db.prepare(KATMANLAR[katman].sql).all(projeId)) {
      if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon) || Math.abs(r.lat) > 90 || Math.abs(r.lon) > 180) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
        properties: { katman, kayit_id: r.id, ad: r.ad, durum: r.durum, tarih: r.tarih ?? null, dosya_url: r.dosya_url ?? null, proje_id: projeId },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}
export const KATMAN_ADLARI = Object.keys(KATMANLAR);
