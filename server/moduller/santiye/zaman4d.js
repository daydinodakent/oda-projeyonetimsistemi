// 4D zaman çizelgesi — iş programı aktivitelerini harita binalarına bağlar ve
// bir tarihte "ne olmalıydı / ne olmuştu" durumunu hesaplar.
//
// Veri sahipliği: aktiviteler İş Programı'nındır (isProgrami.js, Şantiye); bina
// geometrisi CBS katmanının (tb_binalar_3d) — burada yalnızca ID ile eşleme tutulur.
//
// Gerçekleşen ilerleme GEÇMİŞİ, denetim kaydından (audit_log) yeniden kurulur:
// aktivite oluşturulurken ve her yüzde güncellemesinde audit_log'a yüzde yazılır.
// Not: bu "kayıt tarihine göre"dir (yüzde sisteme ne zaman girildiyse) — sahadaki
// gerçek tarih değil. Geçmişi hiç yazılmamış (audit'siz) aktivitelerde geçmiş tarihler
// için gerçekleşen BİLİNMEZ (null), uydurulmaz. Gelecek tarihler için de gerçekleşen yoktur.
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as isProgrami from './isProgrami.js';
import { getRecord } from '../../db.js';

const GUN = 86400000;
const gunFark = (a, b) => (Date.parse(b) - Date.parse(a)) / GUN;
const bugunStr = () => new Date().toISOString().slice(0, 10);

const stmtEsleme = db.prepare('SELECT * FROM aktivite_bina WHERE proje_id = ? ORDER BY id');
const stmtEkle = db.prepare('INSERT OR IGNORE INTO aktivite_bina (proje_id, aktivite_id, bina_id, olusturan) VALUES (?, ?, ?, ?)');
const stmtSil = db.prepare('DELETE FROM aktivite_bina WHERE aktivite_id = ? AND bina_id = ?');
const stmtAudit = db.prepare("SELECT eylem, degisiklik, zaman FROM audit_log WHERE varlik = 'is_programi_aktivite' AND varlik_id = ? ORDER BY id");

// ---------- Eşleme ----------
function aktiviteDogrula(aktiviteId) {
  const a = isProgrami.getir(aktiviteId);
  if (!a) throw new Error('Aktivite bulunamadı');
  return a;
}
function binalariDogrula(projeId, binaIdler) {
  if (!Array.isArray(binaIdler) || !binaIdler.length) throw new Error('En az bir bina seçin.');
  if (binaIdler.length > 500) throw new Error('Tek seferde en fazla 500 bina eşlenebilir.');
  const idler = [...new Set(binaIdler.map(String))];
  for (const id of idler) {
    const b = getRecord('tb_binalar_3d', id);
    if (!b || b.row_status === 0) throw new Error(`Bina bulunamadı: ${id}`);
    if (String(b.project_id) !== String(projeId)) throw new Error(`Bina bu projeye ait değil: ${id}`);
  }
  return idler;
}

/** @returns {{eklenen:number, zaten_bagli:number}} */
export function eslemeEkle(aktiviteId, binaIdler, aktor) {
  const a = aktiviteDogrula(aktiviteId);
  const idler = binalariDogrula(a.proje_id, binaIdler);
  let eklenen = 0;
  const yeni = [];
  for (const id of idler) {
    if (stmtEkle.run(a.proje_id, a.id, id, aktor ?? null).changes) { eklenen++; yeni.push(id); }
  }
  if (eklenen) audit.kaydet('aktivite_bina', a.id, 'OLUSTUR', aktor, { eklenen: yeni });
  return { eklenen, zaten_bagli: idler.length - eklenen };
}

/** @returns {{silinen:number}} */
export function eslemeSil(aktiviteId, binaIdler, aktor) {
  const a = aktiviteDogrula(aktiviteId);
  if (!Array.isArray(binaIdler) || !binaIdler.length) throw new Error('En az bir bina seçin.');
  const silinen = [];
  for (const id of [...new Set(binaIdler.map(String))]) if (stmtSil.run(a.id, id).changes) silinen.push(id);
  if (silinen.length) audit.kaydet('aktivite_bina', a.id, 'IPTAL', aktor, { silinen });
  return { silinen: silinen.length };
}

export function eslemeListele(projeId) { return stmtEsleme.all(projeId); }

// ---------- Gerçekleşen ilerleme geçmişi (audit_log'dan) ----------
/** @returns {{tarih:string, yuzde:number}[]} tarihe göre artan; hiç kayıt yoksa boş dizi */
export function ilerlemeGecmisi(aktiviteId) {
  const out = [];
  for (const r of stmtAudit.all(String(aktiviteId))) {
    const d = r.degisiklik ? JSON.parse(r.degisiklik) : null;
    if (!d) continue;
    let yuzde = null;
    if (r.eylem === 'OLUSTUR') yuzde = d.yeni && d.yeni.gerceklesen_yuzde != null ? Number(d.yeni.gerceklesen_yuzde) : 0;
    else if (r.eylem === 'GUNCELLE' && d.gerceklesen_yuzde != null) yuzde = Number(d.gerceklesen_yuzde);
    if (yuzde != null && Number.isFinite(yuzde)) out.push({ tarih: String(r.zaman).slice(0, 10), yuzde });
  }
  return out;
}

// ---------- Saf hesaplar (istemci aynı formülleri kullanır) ----------
/** Doğrusal beklenen ilerleme (%) — isProgrami.beklenenYuzde ile AYNI. */
export const beklenen = (a, t) => isProgrami.beklenenYuzde(a, t);

/**
 * t tarihindeki gerçekleşen yüzde: t'den önceki (dahil) son kayıt. BİLİNMEYEN → null:
 * gelecek tarih (t > bugün), geçmişi hiç olmayan aktivite ve aktivitenin İLK ilerleme
 * kaydından önceki tarihler (o zaman sistemde hiç ilerleme girilmemişti — 0 demek
 * doğru olmazdı).
 */
export function gerceklesen(gecmis, t, bugun) {
  if (t > bugun) return null;
  if (!gecmis.length || t < gecmis[0].tarih) return null;
  let yuzde = gecmis[0].yuzde;
  for (const g of gecmis) { if (g.tarih <= t) yuzde = g.yuzde; else break; }
  return yuzde;
}

const agirlik = (a) => Math.max(1, gunFark(a.plan_baslangic, a.plan_bitis) + 1);

/**
 * Bir binanın t tarihindeki durumu (bağlı aktivitelerin süre ağırlıklı ortalaması).
 * @param {{plan_baslangic:string, plan_bitis:string, gecmis:{tarih:string,yuzde:number}[]}[]} aktiviteler
 */
export function binaDurumu(aktiviteler, t, bugun) {
  const w = aktiviteler.map(agirlik);
  const wt = w.reduce((s, x) => s + x, 0);
  const bek = aktiviteler.reduce((s, a, i) => s + w[i] * beklenen(a, t), 0) / wt;
  const gercekler = aktiviteler.map((a) => gerceklesen(a.gecmis, t, bugun));
  const gercek = gercekler.some((g) => g === null) ? null : gercekler.reduce((s, g, i) => s + w[i] * g, 0) / wt;
  const baslangic = aktiviteler.reduce((m, a) => (a.plan_baslangic < m ? a.plan_baslangic : m), aktiviteler[0].plan_baslangic);
  const bitis = aktiviteler.reduce((m, a) => (a.plan_bitis > m ? a.plan_bitis : m), aktiviteler[0].plan_bitis);
  const r1 = (v) => Number(v.toFixed(1));
  const sapma = gercek === null ? null : r1(gercek - bek);
  return {
    durum: t < baslangic ? 'baslamadi' : bek >= 100 ? 'tamam' : 'devam',   // PLANA göre
    beklenen_yuzde: r1(bek), gerceklesen_yuzde: gercek === null ? null : r1(gercek), sapma,
    geride_mi: sapma !== null && sapma < -10,
    baslangic, bitis,
  };
}

// ---------- Uç noktalar için veri ----------
/** İstemcinin tarihte gezinirken kendi hesaplaması için tüm ham veri (tek istek). */
export function zamanCizelgesi(projeId) {
  const bugun = bugunStr();
  const esler = stmtEsleme.all(projeId);
  const aktiviteler = isProgrami.listele(projeId).map((a) => ({
    id: a.id, ad: a.ad, plan_baslangic: a.plan_baslangic, plan_bitis: a.plan_bitis, guncel_yuzde: a.gerceklesen_yuzde,
    gecmis: ilerlemeGecmisi(a.id), bina_idler: esler.filter((e) => e.aktivite_id === a.id).map((e) => e.bina_id),
  }));
  const bagli = aktiviteler.filter((a) => a.bina_idler.length);
  const aralik = bagli.length ? {
    baslangic: bagli.reduce((m, a) => (a.plan_baslangic < m ? a.plan_baslangic : m), bagli[0].plan_baslangic),
    bitis: bagli.reduce((m, a) => (a.plan_bitis > m ? a.plan_bitis : m), bagli[0].plan_bitis),
  } : null;
  return { proje_id: projeId, bugun, aralik, aktiviteler, bagli_aktivite_sayisi: bagli.length, baglanmamis_aktivite_sayisi: aktiviteler.length - bagli.length };
}

/** Tek tarih için sunucu tarafı durum (istemci hesabının doğruluk referansı + başka tüketiciler için). */
export function durum(projeId, tarih) {
  const t = tarih || bugunStr();
  const zc = zamanCizelgesi(projeId);
  const binaAkt = new Map();
  for (const a of zc.aktiviteler) for (const id of a.bina_idler) { if (!binaAkt.has(id)) binaAkt.set(id, []); binaAkt.get(id).push(a); }
  const binalar = [...binaAkt.entries()].map(([bina_id, akts]) => ({ bina_id, aktivite_idler: akts.map((a) => a.id), ...binaDurumu(akts, t, zc.bugun) }));
  return { proje_id: projeId, tarih: t, bugun: zc.bugun, binalar };
}
