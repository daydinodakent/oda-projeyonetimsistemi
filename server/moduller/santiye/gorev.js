// Görev — sorumlu (kişi/ekip/alt yüklenici), WBS, konum (blok/kat/daire veya
// harita noktası), son tarih, fotoğraflı kapanış.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import { getRecord } from '../../db.js';
import { sorumluDogrula } from './kalite.js';

const stmtInsert = db.prepare(
  `INSERT INTO gorev (proje_id, baslik, aciklama, sorumlu_tipi, sorumlu_id, wbs_gorev_id, konum_blok, konum_kat, konum_daire, lat, lon, son_tarih, olusturan)
   VALUES (@proje_id, @baslik, @aciklama, @sorumlu_tipi, @sorumlu_id, @wbs_gorev_id, @konum_blok, @konum_kat, @konum_daire, @lat, @lon, @son_tarih, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM gorev WHERE id = ? AND row_status = 1');
const stmtListe = db.prepare('SELECT * FROM gorev WHERE proje_id = ? AND row_status = 1 ORDER BY son_tarih');
const stmtDurum = db.prepare('UPDATE gorev SET durum = ?, write_uid = ?, write_date = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?');
const stmtKapat = db.prepare("UPDATE gorev SET durum = 'kapali', kapanis_foto_url = ?, kapanis_tarihi = ?, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtYorumInsert = db.prepare('INSERT INTO gorev_yorum (gorev_id, metin, foto_url, olusturan) VALUES (?, ?, ?, ?)');
const stmtYorumListe = db.prepare('SELECT * FROM gorev_yorum WHERE gorev_id = ? ORDER BY id');

const AKIS = { acik: ['devam', 'iptal'], devam: ['acik', 'iptal'] };

export function olustur(item, aktor) {
  sorumluDogrula(item.sorumlu_tipi, item.sorumlu_id);
  if (item.wbs_gorev_id && !getRecord('tb_wbs_gorevler', item.wbs_gorev_id)) throw new Error(`WBS görevi bulunamadı: ${item.wbs_gorev_id}`);
  const row = {
    proje_id: item.proje_id, baslik: item.baslik, aciklama: item.aciklama ?? null, sorumlu_tipi: item.sorumlu_tipi, sorumlu_id: item.sorumlu_id,
    wbs_gorev_id: item.wbs_gorev_id ? String(item.wbs_gorev_id) : null, konum_blok: item.konum_blok ?? null, konum_kat: item.konum_kat ?? null,
    konum_daire: item.konum_daire ?? null, lat: item.lat ?? null, lon: item.lon ?? null, son_tarih: item.son_tarih ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('gorev', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(info.lastInsertRowid);
}
export function getir(id) { return stmtGet.get(id); }
export function listele(projeId) { return stmtListe.all(projeId); }

export function durumDegistir(id, yeniDurum, aktor) {
  const g = stmtGet.get(id);
  if (!g) throw new Error('Görev bulunamadı');
  if (yeniDurum === 'kapali') throw new Error('Görev yalnızca fotoğraflı kapanışla (kapat) kapatılır.');
  if (!(AKIS[g.durum] || []).includes(yeniDurum)) throw new Error(`Geçersiz durum geçişi: ${g.durum} -> ${yeniDurum}`);
  stmtDurum.run(yeniDurum, aktor ?? null, id);
  audit.kaydet('gorev', id, 'GUNCELLE', aktor, { durum: [g.durum, yeniDurum] });
  return stmtGet.get(id);
}

/** "Fotoğraflı kapanış" — fotoğraf URL'i olmadan görev KAPATILAMAZ. */
export function kapat(id, fotoUrl, aktor) {
  const g = stmtGet.get(id);
  if (!g) throw new Error('Görev bulunamadı');
  if (['kapali', 'iptal'].includes(g.durum)) throw new Error(`Görev zaten "${g.durum}".`);
  if (!fotoUrl) throw new Error('Görev kapanışı için fotoğraf zorunludur.');
  stmtKapat.run(fotoUrl, new Date().toISOString().slice(0, 10), aktor ?? null, id);
  audit.kaydet('gorev', id, 'GUNCELLE', aktor, { durum: [g.durum, 'kapali'] });
  return stmtGet.get(id);
}

export function yorumEkle(id, metin, fotoUrl, aktor) {
  if (!stmtGet.get(id)) throw new Error('Görev bulunamadı');
  const info = stmtYorumInsert.run(id, metin, fotoUrl ?? null, aktor ?? null);
  return { id: info.lastInsertRowid, gorev_id: id, metin, foto_url: fotoUrl ?? null };
}
export function yorumlariGetir(id) { return stmtYorumListe.all(id); }
