// Puantaj — ortak yapı (kişi, proje, tarih, giriş/çıkış, gün değeri
// 0/0.5/1, fazla mesai, durum, kaynak: PDKS/manuel/mobil). İK ekranı
// personel için, Taşeron/Alt Yüklenici ekranı kendi ekibi için AYNI bu
// servisi çağırır (kaynak modülünü/rolü kisi.rol'den ayırt eder) — ayrı
// bir "taşeron puantajı" tablosu AÇILMAZ.
//
// istemci_kayit_id: sahadan çevrimdışı girilip sonradan senkron edilen
// kayıtlarda (bkz. src/moduller/_cekirdek/offlineQueue.ts) AYNI kaydın
// iki kez sunucuya yazılmasını engelleyen idempotency anahtarı.
//
// "Aynı kişi aynı gün iki yere puantaj alamaz" (P6 görev metni) — bu,
// db.js'teki UNIQUE(kisi_id, tarih) kısmi indeksiyle ÇEKİRDEK SEVİYESİNDE
// zorlanır; burada yalnızca o kısıt ihlalini kullanıcı-dostu bir Türkçe
// hataya çeviriyoruz.
import { db } from './db.js';
import * as audit from './audit.js';

const stmtInsert = db.prepare(
  `INSERT INTO puantaj_kaydi (proje_id, kisi_id, tarih, giris_saati, cikis_saati, gun_degeri, fazla_mesai_saat, gun_tipi, bayram_pazar_mi, maliyet_kodu_id, kaynak, istemci_kayit_id, olusturan)
   VALUES (@proje_id, @kisi_id, @tarih, @giris_saati, @cikis_saati, @gun_degeri, @fazla_mesai_saat, @gun_tipi, @bayram_pazar_mi, @maliyet_kodu_id, @kaynak, @istemci_kayit_id, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM puantaj_kaydi WHERE id = ?');
const stmtGetByIstemciId = db.prepare('SELECT * FROM puantaj_kaydi WHERE istemci_kayit_id = ?');
const stmtListByProjeTarih = db.prepare('SELECT * FROM puantaj_kaydi WHERE proje_id = ? AND tarih = ? AND row_status = 1 ORDER BY kisi_id');
const stmtKisiGun = db.prepare('SELECT * FROM puantaj_kaydi WHERE kisi_id = ? AND tarih = ? AND row_status = 1');
const stmtKisiAraligi = db.prepare('SELECT * FROM puantaj_kaydi WHERE kisi_id = ? AND tarih >= ? AND tarih <= ? AND row_status = 1 ORDER BY tarih');
const stmtOnayla = db.prepare("UPDATE puantaj_kaydi SET durum = 'ONAYLANDI', write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");
const stmtIptalEt = db.prepare("UPDATE puantaj_kaydi SET row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

const GECERLI_GUN_DEGERLERI = [0, 0.5, 1];
const GECERLI_KAYNAKLAR = ['pdks', 'manuel', 'mobil'];
const GECERLI_GUN_TIPLERI = ['tam', 'yarim', 'hava_muhalefeti', 'iptal'];

/**
 * @param {{proje_id, kisi_id, tarih, gun_degeri, gun_tipi?, bayram_pazar_mi?, maliyet_kodu_id?, fazla_mesai_saat?, kaynak?, istemci_kayit_id?}} item
 * @returns {{kayit: object, tekrarGonderim: boolean}} istemci_kayit_id daha
 *   önce gönderilmişse (çevrimdışı kuyruk yeniden denemesi) hata vermez,
 *   MEVCUT kaydı döner.
 */
export function kaydet(item, aktor) {
  if (!GECERLI_GUN_DEGERLERI.includes(item.gun_degeri)) throw new Error('gun_degeri yalnızca 0, 0.5 veya 1 olabilir.');
  const kaynak = item.kaynak || 'manuel';
  if (!GECERLI_KAYNAKLAR.includes(kaynak)) throw new Error(`Geçersiz kaynak: ${kaynak}`);
  const gunTipi = item.gun_tipi || 'tam';
  if (!GECERLI_GUN_TIPLERI.includes(gunTipi)) throw new Error(`Geçersiz gun_tipi: ${gunTipi}`);
  if (item.istemci_kayit_id) {
    const mevcut = stmtGetByIstemciId.get(item.istemci_kayit_id);
    if (mevcut) return { kayit: mevcut, tekrarGonderim: true };
  }
  const row = {
    proje_id: item.proje_id, kisi_id: item.kisi_id, tarih: item.tarih,
    giris_saati: item.giris_saati ?? null, cikis_saati: item.cikis_saati ?? null,
    gun_degeri: item.gun_degeri, fazla_mesai_saat: item.fazla_mesai_saat ?? 0,
    gun_tipi: gunTipi, bayram_pazar_mi: item.bayram_pazar_mi ? 1 : 0, maliyet_kodu_id: item.maliyet_kodu_id ?? null,
    kaynak, istemci_kayit_id: item.istemci_kayit_id ?? null, olusturan: aktor ?? null,
  };
  let info;
  try {
    info = stmtInsert.run(row);
  } catch (err) {
    if (String(err.message || '').includes('idx_puantaj_kisi_tarih_tekil') || String(err.message || '').includes('UNIQUE')) {
      const cakisan = stmtKisiGun.get(item.kisi_id, item.tarih);
      throw new Error(`Bu kişi için ${item.tarih} tarihinde zaten bir puantaj kaydı var (proje: ${cakisan?.proje_id ?? '?'}) — aynı kişi aynı gün iki yere puantaj alamaz.`);
    }
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('puantaj_kaydi', id, 'OLUSTUR', aktor, { yeni: row });
  return { kayit: stmtGet.get(id), tekrarGonderim: false };
}

export function projeGunuListele(projeId, tarih) {
  return stmtListByProjeTarih.all(projeId, tarih);
}

/** Bir kişinin belirli bir tarihteki (varsa) TEK puantaj kaydı — "aynı kişi aynı gün iki yere" kontrolü için dışarıdan da kullanılabilir. */
export function kisiGunGetir(kisiId, tarih) {
  return stmtKisiGun.get(kisiId, tarih) || null;
}

/** Bir kişinin bir tarih aralığındaki puantaj kayıtları (haftalık matris, dönem hesabı için). */
export function kisiAraligiListele(kisiId, baslangic, bitis) {
  return stmtKisiAraligi.all(kisiId, baslangic, bitis);
}

export function onayla(id, aktor) {
  stmtOnayla.run(aktor ?? null, id);
  audit.kaydet('puantaj_kaydi', id, 'GUNCELLE', aktor, { durum: 'ONAYLANDI' });
  return stmtGet.get(id);
}

/** Soft-delete — "silme yerine iptal/pasif" (ÇALIŞMA KURALLARI). Düzeltme akışında (P6: kapanmış dönem) YENİ bir kayıt açmadan önce YANLIŞ girilmiş bir puantaj bu şekilde pasife alınabilir. */
export function iptalEt(id, aktor) {
  stmtIptalEt.run(aktor ?? null, id);
  audit.kaydet('puantaj_kaydi', id, 'IPTAL', aktor, null);
}
