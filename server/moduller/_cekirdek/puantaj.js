// Puantaj — ortak yapı (kişi, proje, tarih, giriş/çıkış, gün değeri
// 0/0.5/1, fazla mesai, durum, kaynak: PDKS/manuel/mobil). İK ekranı
// personel için, Taşeron/Alt Yüklenici ekranı kendi ekibi için AYNI bu
// servisi çağırır (kaynak modülünü/rolü kisi.rol'den ayırt eder) — ayrı
// bir "taşeron puantajı" tablosu AÇILMAZ.
//
// istemci_kayit_id: sahadan çevrimdışı girilip sonradan senkron edilen
// kayıtlarda (bkz. src/moduller/_cekirdek/offlineQueue.ts) AYNI kaydın
// iki kez sunucuya yazılmasını engelleyen idempotency anahtarı.
import { db } from './db.js';
import * as audit from './audit.js';

const stmtInsert = db.prepare(
  `INSERT INTO puantaj_kaydi (proje_id, kisi_id, tarih, giris_saati, cikis_saati, gun_degeri, fazla_mesai_saat, kaynak, istemci_kayit_id, olusturan)
   VALUES (@proje_id, @kisi_id, @tarih, @giris_saati, @cikis_saati, @gun_degeri, @fazla_mesai_saat, @kaynak, @istemci_kayit_id, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM puantaj_kaydi WHERE id = ?');
const stmtGetByIstemciId = db.prepare('SELECT * FROM puantaj_kaydi WHERE istemci_kayit_id = ?');
const stmtListByProjeTarih = db.prepare('SELECT * FROM puantaj_kaydi WHERE proje_id = ? AND tarih = ? AND row_status = 1 ORDER BY kisi_id');
const stmtOnayla = db.prepare("UPDATE puantaj_kaydi SET durum = 'ONAYLANDI', write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

const GECERLI_GUN_DEGERLERI = [0, 0.5, 1];
const GECERLI_KAYNAKLAR = ['pdks', 'manuel', 'mobil'];

/**
 * @param {{proje_id, kisi_id, tarih, gun_degeri, kaynak?, istemci_kayit_id?}} item
 * @returns {{kayit: object, tekrarGonderim: boolean}} istemci_kayit_id daha
 *   önce gönderilmişse (çevrimdışı kuyruk yeniden denemesi) hata vermez,
 *   MEVCUT kaydı döner.
 */
export function kaydet(item, aktor) {
  if (!GECERLI_GUN_DEGERLERI.includes(item.gun_degeri)) throw new Error('gun_degeri yalnızca 0, 0.5 veya 1 olabilir.');
  const kaynak = item.kaynak || 'manuel';
  if (!GECERLI_KAYNAKLAR.includes(kaynak)) throw new Error(`Geçersiz kaynak: ${kaynak}`);
  if (item.istemci_kayit_id) {
    const mevcut = stmtGetByIstemciId.get(item.istemci_kayit_id);
    if (mevcut) return { kayit: mevcut, tekrarGonderim: true };
  }
  const row = {
    proje_id: item.proje_id, kisi_id: item.kisi_id, tarih: item.tarih,
    giris_saati: item.giris_saati ?? null, cikis_saati: item.cikis_saati ?? null,
    gun_degeri: item.gun_degeri, fazla_mesai_saat: item.fazla_mesai_saat ?? 0,
    kaynak, istemci_kayit_id: item.istemci_kayit_id ?? null, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('puantaj_kaydi', id, 'OLUSTUR', aktor, { yeni: row });
  return { kayit: stmtGet.get(id), tekrarGonderim: false };
}

export function projeGunuListele(projeId, tarih) {
  return stmtListByProjeTarih.all(projeId, tarih);
}

export function onayla(id, aktor) {
  stmtOnayla.run(aktor ?? null, id);
  audit.kaydet('puantaj_kaydi', id, 'GUNCELLE', aktor, { durum: 'ONAYLANDI' });
  return stmtGet.get(id);
}
