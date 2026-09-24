// Teslim — tutanak + eksik listesi (punch list). Teslim için ödeme
// tamamlanma şartı PARAMETRİKTİR ('musteri_teslim_odeme_tamamlanma_yuzde',
// varsayılan 100); altında ancak yetkili istisna onayı + gerekçeyle teslim
// yapılır. Eksik listesi P8 (Şantiye) Görev'ine DÖNÜŞÜR — görev P8'in
// tablosunda oluşturulur, burada kopyalanmaz (yalnızca gorev_id tutulur).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as bolum from './bolum.js';
import * as tahsilat from './tahsilat.js';
import * as gorev from '../santiye/gorev.js';

const stmtSatis = db.prepare('SELECT * FROM satis WHERE id = ? AND row_status = 1');
const stmtTutanakInsert = db.prepare(
  `INSERT INTO teslim_tutanagi (satis_id, bolum_id, tarih, teslim_alan, odeme_yuzdesi, istisna_onayi_mi, istisna_gerekcesi, notes, olusturan)
   VALUES (@satis_id, @bolum_id, @tarih, @teslim_alan, @odeme_yuzdesi, @istisna_onayi_mi, @istisna_gerekcesi, @notes, @olusturan)`
);
const stmtTutanakGet = db.prepare('SELECT * FROM teslim_tutanagi WHERE id = ?');
const stmtTutanakSatis = db.prepare('SELECT * FROM teslim_tutanagi WHERE satis_id = ?');
const stmtEksikInsert = db.prepare('INSERT INTO eksik_kalem (tutanak_id, aciklama) VALUES (?, ?)');
const stmtEksikListe = db.prepare('SELECT * FROM eksik_kalem WHERE tutanak_id = ? ORDER BY id');
const stmtEksikGorev = db.prepare('UPDATE eksik_kalem SET gorev_id = ? WHERE id = ?');

/** @param {{tarih, teslim_alan?, eksikler?: string[], istisnaOnayi?, gerekce?, notes?}} item */
export function teslimYap(satisId, item, aktor) {
  const s = stmtSatis.get(satisId);
  if (!s) throw new Error('Satış bulunamadı');
  if (s.durum !== 'onayli') throw new Error('Yalnızca onaylı satış teslim edilebilir.');
  if (stmtTutanakSatis.get(satisId)) throw new Error('Bu satış için zaten bir teslim tutanağı var.');
  const ozet = tahsilat.odemeOzeti(satisId);
  const gerekli = parametre.degerAl('musteri_teslim_odeme_tamamlanma_yuzde', item.tarih)?.deger ?? 100;
  const eksikOdeme = ozet.yuzde < gerekli;
  if (eksikOdeme && !(item.istisnaOnayi === true && item.gerekce)) {
    throw new Error(`Teslim için ödeme tamamlanma şartı %${gerekli} (şu an %${ozet.yuzde}) — yetkili istisna onayı (istisnaOnayi + gerekçe) olmadan teslim edilemez.`);
  }
  db.exec('BEGIN');
  try {
    const info = stmtTutanakInsert.run({
      satis_id: satisId, bolum_id: s.bolum_id, tarih: item.tarih, teslim_alan: item.teslim_alan ?? null, odeme_yuzdesi: ozet.yuzde,
      istisna_onayi_mi: eksikOdeme ? 1 : 0, istisna_gerekcesi: eksikOdeme ? item.gerekce : null, notes: item.notes ?? null, olusturan: aktor ?? null,
    });
    const id = info.lastInsertRowid;
    for (const e of item.eksikler || []) stmtEksikInsert.run(id, e);
    bolum.durumAyarla(s.bolum_id, 'teslim_edildi', aktor);
    audit.kaydet('teslim_tutanagi', id, 'OLUSTUR', aktor, { satis_id: satisId, odeme_yuzdesi: ozet.yuzde, istisna: eksikOdeme });
    db.exec('COMMIT');
    return getir(id);
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function getir(id) {
  const t = stmtTutanakGet.get(id);
  return t ? { ...t, eksikler: stmtEksikListe.all(id) } : undefined;
}
export function satisIcinGetir(satisId) { const t = stmtTutanakSatis.get(satisId); return t ? getir(t.id) : null; }

export function eksikEkle(tutanakId, aciklama) {
  if (!stmtTutanakGet.get(tutanakId)) throw new Error('Tutanak bulunamadı');
  const info = stmtEksikInsert.run(tutanakId, aciklama);
  return { id: info.lastInsertRowid, tutanak_id: tutanakId, aciklama, gorev_id: null };
}

/**
 * Henüz göreve dönüşmemiş eksikleri P8 Görev'e çevirir (konum: blok/kat/daire).
 * Sorumlu (kişi/taşeron ekibi/alt yüklenici) çağıran tarafından verilir — P8 doğrular.
 */
export function eksikleriGoreveDonustur(tutanakId, { sorumlu_tipi, sorumlu_id, son_tarih }, aktor) {
  const t = stmtTutanakGet.get(tutanakId);
  if (!t) throw new Error('Tutanak bulunamadı');
  const s = stmtSatis.get(t.satis_id);
  const b = bolum.getir(t.bolum_id);
  const olusan = [];
  for (const e of stmtEksikListe.all(tutanakId).filter((x) => !x.gorev_id)) {
    const g = gorev.olustur({
      proje_id: s.proje_id, baslik: `[Teslim eksiği] ${bolum.etiket(b)}: ${e.aciklama}`, aciklama: `Teslim tutanağı #${tutanakId} eksik listesi`,
      sorumlu_tipi, sorumlu_id, konum_blok: b.blok, konum_kat: b.kat, konum_daire: b.kapi_no, son_tarih,
    }, aktor);
    stmtEksikGorev.run(g.id, e.id);
    olusan.push({ eksik_id: e.id, gorev_id: g.id });
  }
  return olusan;
}
