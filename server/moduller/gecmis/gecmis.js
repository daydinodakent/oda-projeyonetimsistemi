// Harita katmanı değişiklik geçmişi — CBS veritabanı katmanlarındaki (proje
// sınırı, bina, altyapı hattı) her ekleme/düzenleme/silme için ÖNCE/SONRA
// görüntüsünü saklar; "ne değişti" özeti çıkarır ve bir değişikliği geri alır.
//
// Neden ayrı bir modül? Haritadaki geometri düzenlemeleri servis katmanından
// değil, generic "/api/:table" rotalarından geçer — bu yüzden çekirdek audit_log
// (servis çağrılarını izler) bu değişiklikleri GÖRMEZ. Kayıt, generic rotalarda
// (server/index.js) yazma işleminden hemen önce/sonra buraya bildirilerek tutulur;
// böylece Admin Paneli gibi başka yollardan yapılan düzenlemeler de izlenir.
//
// "Kim": uygulamada henüz oturum/kimlik yok; istemci isterse 'X-Oda-Aktor'
// başlığıyla bir ad gönderir, yoksa aktor boş (NULL) kalır — uydurulmaz.
import { rawDb, getRecord, putRecord } from '../../db.js';

const db = rawDb();

export const IZLENEN_TABLOLAR = ['tb_proje_sinirlari', 'tb_binalar_3d', 'tb_altyapi_hatlari'];

db.exec(`
  CREATE TABLE IF NOT EXISTS kayit_gecmisi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tablo TEXT NOT NULL,
    kayit_id TEXT NOT NULL,
    proje_id TEXT,
    eylem TEXT NOT NULL CHECK (eylem IN ('OLUSTUR','GUNCELLE','SIL','GERI_AL')),
    once TEXT,   -- değişiklikten önceki kayıt (JSON); OLUSTUR'da NULL
    sonra TEXT,  -- değişiklikten sonraki kayıt (JSON)
    aktor TEXT,
    geri_alinan_id INTEGER,
    zaman TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_kayit_gecmisi_proje ON kayit_gecmisi (proje_id, id);
  CREATE INDEX IF NOT EXISTS idx_kayit_gecmisi_kayit ON kayit_gecmisi (tablo, kayit_id, id);
`);

const stmtInsert = db.prepare(
  'INSERT INTO kayit_gecmisi (tablo, kayit_id, proje_id, eylem, once, sonra, aktor, geri_alinan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
const stmtGet = db.prepare('SELECT * FROM kayit_gecmisi WHERE id = ?');
const stmtListeProje = db.prepare('SELECT * FROM kayit_gecmisi WHERE proje_id = ? ORDER BY id DESC LIMIT ?');
const stmtListeKayit = db.prepare('SELECT * FROM kayit_gecmisi WHERE tablo = ? AND kayit_id = ? ORDER BY id DESC LIMIT ?');
const stmtListeTumu = db.prepare('SELECT * FROM kayit_gecmisi ORDER BY id DESC LIMIT ?');
const stmtSira = db.prepare('SELECT COUNT(*) AS n FROM kayit_gecmisi WHERE tablo = ? AND kayit_id = ? AND id <= ?');

// Karşılaştırmada yok sayılan (her yazmada değişen) alanlar.
const YOK_SAYILAN = new Set(['write_date', 'write_uid']);
const esit = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** İki kayıt arasında anlamlı fark var mı? (yalnızca write_date farkı anlamlı değil) */
export function farkVar(once, sonra) {
  const anahtarlar = new Set([...Object.keys(once || {}), ...Object.keys(sonra || {})]);
  for (const k of anahtarlar) if (!YOK_SAYILAN.has(k) && !esit(once?.[k], sonra?.[k])) return true;
  return false;
}

export function eylemBul(once, sonra) {
  if (!once) return 'OLUSTUR';
  if (sonra && sonra.row_status === 0 && once.row_status !== 0) return 'SIL';
  return 'GUNCELLE';
}

/**
 * Bir yazma işleminin ÖNCE/SONRA görüntüsünü kaydeder. İzlenmeyen tablolarda veya
 * anlamlı fark yoksa hiçbir şey yazmaz (null döner).
 */
export function degisiklikKaydet(tablo, kayitId, once, sonra, aktor, { eylem, geriAlinanId } = {}) {
  if (!IZLENEN_TABLOLAR.includes(tablo)) return null;
  if (once && sonra && !farkVar(once, sonra)) return null;
  const projeId = (sonra && sonra.project_id) || (once && once.project_id) || null;
  const info = stmtInsert.run(
    tablo, String(kayitId), projeId ? String(projeId) : null, eylem || eylemBul(once, sonra),
    once ? JSON.stringify(once) : null, sonra ? JSON.stringify(sonra) : null,
    aktor ? String(aktor).slice(0, 60) : null, geriAlinanId ?? null
  );
  return info.lastInsertRowid;
}

// ---------- Özet (listeleme) ----------
function koordinatlar(g) {
  const out = [];
  (function topla(c) { if (typeof c[0] === 'number') out.push(c); else c.forEach(topla); })((g && g.coordinates) || []);
  return out;
}
function ortalama(g) {
  const c = koordinatlar(g);
  if (!c.length) return null;
  return [c.reduce((s, p) => s + p[0], 0) / c.length, c.reduce((s, p) => s + p[1], 0) / c.length];
}
function metre(a, b) {
  const R = 6371008.8, r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** @returns {{degisen_alanlar:string[], geometri_degisti:boolean, tasima_m:number|null, sekil_degisti:boolean}} */
export function farkOzeti(once, sonra) {
  const alanlar = [];
  const anahtarlar = new Set([...Object.keys(once || {}), ...Object.keys(sonra || {})]);
  for (const k of anahtarlar) {
    if (YOK_SAYILAN.has(k) || k === 'the_geom' || k === 'row_status') continue;
    if (!esit(once?.[k], sonra?.[k])) alanlar.push(k);
  }
  const geometriDegisti = !esit(once?.the_geom, sonra?.the_geom);
  let tasima = null, sekil = false;
  if (geometriDegisti && once?.the_geom && sonra?.the_geom) {
    const a = koordinatlar(once.the_geom), b = koordinatlar(sonra.the_geom);
    if (a.length === b.length && a.length) {
      // aynı köşe sayısı: tüm köşeler benzer kadar kaydıysa "taşındı", değilse şekil değişmiştir
      const kaymalar = a.map((p, i) => metre(p, b[i]));
      const ort = kaymalar.reduce((s, v) => s + v, 0) / kaymalar.length;
      const sapma = Math.max(...kaymalar.map((v) => Math.abs(v - ort)));
      if (sapma <= Math.max(0.5, ort * 0.05)) tasima = Math.round(ort * 10) / 10; else sekil = true;
    } else sekil = true;
  }
  return { degisen_alanlar: alanlar, geometri_degisti: geometriDegisti, tasima_m: tasima, sekil_degisti: sekil };
}

function adBul(k) {
  // özel ad alanları genel 'name'den önce gelir (bina kayıtlarında 'name' genel bir sabittir)
  return (k && (k.block_name || k.network_name || k.project_name || k.name)) || null;
}

function ozetle(satir) {
  const once = satir.once ? JSON.parse(satir.once) : null;
  const sonra = satir.sonra ? JSON.parse(satir.sonra) : null;
  const sira = stmtSira.get(satir.tablo, satir.kayit_id, satir.id).n;
  const ref = sonra || once;
  return {
    id: satir.id, tablo: satir.tablo, kayit_id: satir.kayit_id, proje_id: satir.proje_id, eylem: satir.eylem,
    aktor: satir.aktor, zaman: satir.zaman, geri_alinan_id: satir.geri_alinan_id,
    versiyon: sira + 1,                        // ilk (değiştirilmemiş) hal v1
    ad: adBul(sonra) || adBul(once),
    merkez: ortalama(ref && ref.the_geom),
    ...farkOzeti(once, sonra),
  };
}

export function listele({ projeId, tablo, kayitId, limit = 100 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 500);
  let satirlar;
  if (tablo && kayitId) satirlar = stmtListeKayit.all(tablo, String(kayitId), lim);
  else if (projeId) satirlar = stmtListeProje.all(String(projeId), lim);
  else satirlar = stmtListeTumu.all(lim);
  if (tablo && !kayitId) satirlar = satirlar.filter((s) => s.tablo === tablo);
  return satirlar.map(ozetle);
}

export function getir(id) {
  const s = stmtGet.get(id);
  if (!s) return null;
  return { ...ozetle(s), once: s.once ? JSON.parse(s.once) : null, sonra: s.sonra ? JSON.parse(s.sonra) : null };
}

/**
 * Bir değişikliği geri alır: kaydı o değişiklikten ÖNCEKİ haline döndürür
 * (OLUSTUR'u geri almak kaydı siler). Sonraki değişiklikler de kaybolur ama
 * kendileri geçmişte durur; geri alma işlemi de GERI_AL olarak kaydedilir,
 * dolayısıyla o da geri alınabilir.
 */
export function geriAl(id, aktor) {
  const satir = stmtGet.get(id);
  if (!satir) throw new Error('Geçmiş kaydı bulunamadı');
  const suAnki = getRecord(satir.tablo, satir.kayit_id);
  const hedef = satir.once ? JSON.parse(satir.once) : null;
  let yeni;
  if (hedef) {
    yeni = { ...hedef, write_date: new Date().toISOString() };
  } else {
    if (!suAnki) throw new Error('Kayıt bulunamadı');
    yeni = { ...suAnki, row_status: 0, write_date: new Date().toISOString() }; // oluşturulmuş kaydı geri almak = silmek
  }
  if (suAnki && !farkVar(suAnki, yeni)) throw new Error('Kayıt zaten bu durumda — geri alınacak bir fark yok.');
  putRecord(satir.tablo, yeni);
  degisiklikKaydet(satir.tablo, satir.kayit_id, suAnki, yeni, aktor, { eylem: 'GERI_AL', geriAlinanId: satir.id });
  return { tablo: satir.tablo, kayit_id: satir.kayit_id, kayit: yeni, silindi: yeni.row_status === 0 };
}
