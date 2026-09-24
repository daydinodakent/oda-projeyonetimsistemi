// Ödeme Planı — VERSİYONLU. Peşinat + eşit taksit + ara ödeme (balon) + senet
// + banka kredisi (onaya bağlı dilim) + takas. Revizyonda ESKİ plan 'eski'
// olur (silinmez, tarihçe); Çekirdek tahsilat satırları HİÇ değişmez —
// yalnızca yeni planda YENİDEN DAĞITILIR (tahsilat_dagilim'e yeni satırlar;
// eski dağılım tarihçe olarak kalır). Böylece "plan revizyonunda eski
// tahsilatlar korunur".
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as odeme from '../_cekirdek/odeme.js';
import * as parametre from '../_cekirdek/parametre.js';

const TURLER = ['pesinat', 'taksit', 'ara_odeme', 'senet', 'kredi', 'takas'];

const stmtSatis = db.prepare('SELECT * FROM satis WHERE id = ? AND row_status = 1');
const stmtPlanInsert = db.prepare('INSERT INTO odeme_plani (satis_id, versiyon, revizyon_nedeni, olusturan) VALUES (?, ?, ?, ?)');
const stmtPlanAktif = db.prepare("SELECT * FROM odeme_plani WHERE satis_id = ? AND durum = 'aktif'");
const stmtPlanlar = db.prepare('SELECT * FROM odeme_plani WHERE satis_id = ? ORDER BY versiyon');
const stmtPlanEski = db.prepare("UPDATE odeme_plani SET durum = 'eski' WHERE id = ?");
const stmtMaxVersiyon = db.prepare('SELECT COALESCE(MAX(versiyon), 0) AS v FROM odeme_plani WHERE satis_id = ?');
const stmtTaksitInsert = db.prepare('INSERT INTO taksit (plan_id, sira, tur, vade_tarihi, tutar_kurus, kredi_onay_durumu, endeksli_mi, aciklama) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const stmtTaksitler = db.prepare('SELECT * FROM taksit WHERE plan_id = ? ORDER BY vade_tarihi, sira');
const stmtTaksitGet = db.prepare('SELECT * FROM taksit WHERE id = ?');
const stmtKrediDurum = db.prepare('UPDATE taksit SET kredi_onay_durumu = ? WHERE id = ? AND tur = \'kredi\'');
const stmtDagilimInsert = db.prepare('INSERT INTO tahsilat_dagilim (tahsilat_id, plan_id, taksit_id, tutar_kurus) VALUES (?, ?, ?, ?)');
const stmtOdenen = db.prepare('SELECT COALESCE(SUM(tutar_kurus), 0) AS t FROM tahsilat_dagilim WHERE plan_id = ? AND taksit_id = ?');
const stmtDagilimTahsilat = db.prepare('SELECT * FROM tahsilat_dagilim WHERE tahsilat_id = ? ORDER BY id');

function taksitlerDogrula(satis, taksitler) {
  if (!Array.isArray(taksitler) || taksitler.length === 0) throw new Error('En az bir taksit gereklidir.');
  let toplam = 0;
  for (const t of taksitler) {
    if (!TURLER.includes(t.tur)) throw new Error(`Geçersiz taksit türü: ${t.tur}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(t.vade_tarihi))) throw new Error('vade_tarihi YYYY-AA-GG olmalıdır.');
    if (!Number.isInteger(t.tutar_kurus) || t.tutar_kurus <= 0) throw new Error('Taksit tutarı pozitif tam sayı (kuruş) olmalıdır.');
    toplam += t.tutar_kurus;
  }
  if (toplam !== satis.tutar_kurus) throw new Error(`Plan toplamı (${toplam}) satış tutarına (${satis.tutar_kurus}) eşit olmalıdır — fark: ${satis.tutar_kurus - toplam} kuruş.`);
}

function planYaz(satisId, taksitler, nedeni, aktor) {
  const versiyon = stmtMaxVersiyon.get(satisId).v + 1;
  const info = stmtPlanInsert.run(satisId, versiyon, nedeni ?? null, aktor ?? null);
  const planId = info.lastInsertRowid;
  taksitler.forEach((t, i) => stmtTaksitInsert.run(planId, i + 1, t.tur, t.vade_tarihi, t.tutar_kurus, t.tur === 'kredi' ? (t.kredi_onay_durumu || 'bekliyor') : null, t.endeksli_mi ? 1 : 0, t.aciklama ?? null));
  audit.kaydet('odeme_plani', planId, 'OLUSTUR', aktor, { satis_id: satisId, versiyon, taksit_sayisi: taksitler.length, nedeni });
  return planId;
}

/** İlk plan. Aktif plan varsa hata (revize() kullanın). */
export function olustur(satisId, taksitler, aktor) {
  const s = stmtSatis.get(satisId);
  if (!s) throw new Error('Satış bulunamadı');
  if (s.durum === 'iptal') throw new Error('İptal edilmiş satışa plan açılamaz.');
  if (stmtPlanAktif.get(satisId)) throw new Error('Bu satışın zaten aktif bir ödeme planı var — revize() ile yeni versiyon açın.');
  taksitlerDogrula(s, taksitler);
  db.exec('BEGIN');
  try { planYaz(satisId, taksitler, null, aktor); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
  return planGetir(satisId);
}

/** Taksit listesi + ödenen/kalan/durum hesabı (yalnızca o planın dağılımlarından). */
function taksitDetay(plan) {
  return stmtTaksitler.all(plan.id).map((t) => {
    const odenen = stmtOdenen.get(plan.id, t.id).t;
    const kalan = t.tutar_kurus - odenen;
    return { ...t, odenen_kurus: odenen, kalan_kurus: kalan, durum: kalan <= 0 ? 'kapali' : odenen > 0 ? 'kismi' : 'acik' };
  });
}

export function planGetir(satisId) {
  const plan = stmtPlanAktif.get(satisId);
  if (!plan) return null;
  const taksitler = taksitDetay(plan);
  return { plan, taksitler, toplam_kurus: taksitler.reduce((t, x) => t + x.tutar_kurus, 0), odenen_kurus: taksitler.reduce((t, x) => t + x.odenen_kurus, 0), versiyonlar: stmtPlanlar.all(satisId) };
}
export function versiyonTaksitleri(planId) { const p = db.prepare('SELECT * FROM odeme_plani WHERE id = ?').get(planId); return p ? taksitDetay(p) : []; }

/** Kapama sırası PARAMETRİK: 'musteri_tahsilat_kapama_sirasi' 1 = en eski vadeden (varsayılan), 2 = en yeni vadeden. */
function kapamaSirasi(tarih) { return parametre.degerAl('musteri_tahsilat_kapama_sirasi', tarih)?.deger === 2 ? 'yeni' : 'eski'; }

/**
 * Bir tahsilatı plana dağıtır (transaction'ı ÇAĞIRAN yönetir).
 * opts.taksitId: belirli taksite; opts.krediBekleyeniAtla: kredi onayı bekleyen
 * dilime PARA GİRMEZ (revizyon yeniden-dağıtımında false — para zaten alınmıştı).
 */
export function dagit(tahsilatId, tutar, plan, tarih, opts = {}) {
  const detay = taksitDetay(plan);
  let adaylar;
  if (opts.taksitId) {
    const t = detay.find((x) => x.id === Number(opts.taksitId));
    if (!t) throw new Error('Taksit aktif planda bulunamadı.');
    adaylar = [t];
  } else {
    adaylar = detay.filter((t) => t.kalan_kurus > 0 && !(opts.krediBekleyeniAtla !== false && t.tur === 'kredi' && t.kredi_onay_durumu !== 'onaylandi'));
    adaylar.sort((a, b) => (a.vade_tarihi === b.vade_tarihi ? a.sira - b.sira : a.vade_tarihi < b.vade_tarihi ? -1 : 1));
    if (kapamaSirasi(tarih) === 'yeni') adaylar.reverse();
  }
  let kalan = tutar; const yazilan = [];
  for (const t of adaylar) {
    if (kalan <= 0) break;
    const pay = Math.min(kalan, t.kalan_kurus);
    if (pay <= 0) continue;
    stmtDagilimInsert.run(tahsilatId, plan.id, t.id, pay);
    yazilan.push({ taksit_id: t.id, tutar_kurus: pay });
    kalan -= pay;
  }
  if (kalan > 0) throw new Error(opts.taksitId ? 'Tutar seçilen taksitin kalanını aşıyor.' : `Tahsilat, kapatılabilir taksit toplamını ${kalan} kuruş aşıyor (plan toplamı/kredi onayı bekleyen dilimler).`);
  return yazilan;
}
export function tahsilatDagilimi(tahsilatId) { return stmtDagilimTahsilat.all(tahsilatId); }

/**
 * REVİZYON (yeniden yapılandırma). Toplam yine satış tutarına eşit olmalı.
 * Eski plan 'eski' olur; tüm iptal olmamış tahsilatlar (Çekirdek'te DEĞİŞMEDEN
 * duran) tarih sırasıyla YENİ plana yeniden dağıtılır.
 */
export function revize(satisId, taksitler, nedeni, aktor) {
  const s = stmtSatis.get(satisId);
  if (!s) throw new Error('Satış bulunamadı');
  const eski = stmtPlanAktif.get(satisId);
  if (!eski) throw new Error('Revize edilecek aktif plan yok.');
  if (!nedeni) throw new Error('Revizyon nedeni zorunludur.');
  taksitlerDogrula(s, taksitler);
  db.exec('BEGIN');
  try {
    stmtPlanEski.run(eski.id);
    const yeniId = planYaz(satisId, taksitler, nedeni, aktor);
    const yeni = db.prepare('SELECT * FROM odeme_plani WHERE id = ?').get(yeniId);
    for (const th of odeme.tahsilatlariKaynagaGore('musteri_satis', satisId)) dagit(th.id, th.tutar_kurus, yeni, th.tarih, { krediBekleyeniAtla: false });
    audit.kaydet('odeme_plani', yeniId, 'GUNCELLE', aktor, { revizyon: true, eski_plan_id: eski.id, nedeni });
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return planGetir(satisId);
}

/** Banka kredisi dilimi: onaylanınca tahsil edilebilir hale gelir. */
export function krediDurumuAyarla(taksitId, durum, aktor) {
  if (!['bekliyor', 'onaylandi', 'reddedildi'].includes(durum)) throw new Error(`Geçersiz kredi durumu: ${durum}`);
  const t = stmtTaksitGet.get(taksitId);
  if (!t || t.tur !== 'kredi') throw new Error('Kredi tipli taksit bulunamadı.');
  stmtKrediDurum.run(durum, taksitId);
  audit.kaydet('taksit', taksitId, 'GUNCELLE', aktor, { kredi_onay_durumu: [t.kredi_onay_durumu, durum] });
  return stmtTaksitGet.get(taksitId);
}
export function taksitGetir(id) { return stmtTaksitGet.get(id); }
