// Satış sonrası talep — garanti kapsamında arıza/şikâyet. Yönlendirme:
// talepte WBS varsa, o WBS'e ait kalemi olan alt yüklenici sözleşmesi (P2/P5)
// bulunur ve P8'de o alt yükleniciye görev açılır; bulunamazsa çağıran bir
// sorumlu (kişi/taşeron ekibi) verir. Garanti süresi PARAMETRİK
// ('musteri_garanti_ay'); parametre yoksa garanti durumu NULL (bilinmiyor).
import { db } from './db.js';
import * as audit from '../_cekirdek/audit.js';
import * as parametre from '../_cekirdek/parametre.js';
import * as sozlesme from '../sozlesme/sozlesme.js';
import * as gorev from '../santiye/gorev.js';
import * as bolum from './bolum.js';
import * as teslim from './teslim.js';

const stmtSatis = db.prepare('SELECT * FROM satis WHERE id = ? AND row_status = 1');
const stmtInsert = db.prepare(
  `INSERT INTO satis_sonrasi_talep (satis_id, bolum_id, tur, aciklama, wbs_gorev_id, garanti_kapsaminda_mi, talep_tarihi, olusturan)
   VALUES (@satis_id, @bolum_id, @tur, @aciklama, @wbs_gorev_id, @garanti_kapsaminda_mi, @talep_tarihi, @olusturan)`
);
const stmtGet = db.prepare('SELECT * FROM satis_sonrasi_talep WHERE id = ?');
const stmtSatisListe = db.prepare('SELECT * FROM satis_sonrasi_talep WHERE satis_id = ? ORDER BY id DESC');
const stmtProjeListe = db.prepare('SELECT t.* FROM satis_sonrasi_talep t JOIN satis s ON s.id = t.satis_id WHERE s.proje_id = ? ORDER BY t.id DESC');
const stmtYonlendir = db.prepare("UPDATE satis_sonrasi_talep SET durum = 'yonlendirildi', gorev_id = ?, yonlendirilen_sozlesme_id = ? WHERE id = ?");
const stmtKapat = db.prepare("UPDATE satis_sonrasi_talep SET durum = 'kapali' WHERE id = ?");

function garantiKapsaminda(satisId, tarih) {
  const t = teslim.satisIcinGetir(satisId);
  const ay = parametre.degerAl('musteri_garanti_ay', tarih)?.deger;
  if (!t || ay == null) return null;
  const bitis = new Date(t.tarih); bitis.setMonth(bitis.getMonth() + ay);
  return tarih <= bitis.toISOString().slice(0, 10) ? 1 : 0;
}

/** @param {{satis_id, tur, aciklama, wbs_gorev_id?, talep_tarihi}} item */
export function talepAc(item, aktor) {
  const s = stmtSatis.get(item.satis_id);
  if (!s) throw new Error('Satış bulunamadı');
  if (!['ariza', 'sikayet', 'talep'].includes(item.tur)) throw new Error(`Geçersiz talep türü: ${item.tur}`);
  const row = {
    satis_id: s.id, bolum_id: s.bolum_id, tur: item.tur, aciklama: item.aciklama, wbs_gorev_id: item.wbs_gorev_id ? String(item.wbs_gorev_id) : null,
    garanti_kapsaminda_mi: garantiKapsaminda(s.id, item.talep_tarihi), talep_tarihi: item.talep_tarihi, olusturan: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  audit.kaydet('satis_sonrasi_talep', info.lastInsertRowid, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(info.lastInsertRowid);
}
export function getir(id) { return stmtGet.get(id); }
export function satisIcinListele(satisId) { return stmtSatisListe.all(satisId); }
export function projeIcinListele(projeId) { return stmtProjeListe.all(projeId); }

/** WBS'ten sorumlu alt yükleniciyi bulur: aynı projede, kalemi bu WBS'e bağlı, sonlanmamış alt_yuklenici sözleşmesi. */
export function wbsAltYuklenicisi(projeId, wbsGorevId) {
  for (const s of sozlesme.listele(projeId)) {
    if (s.tip !== 'alt_yuklenici' || ['feshedildi', 'tamamlandi'].includes(s.durum)) continue;
    if (sozlesme.kalemleriGetir(s.id).some((k) => k.wbs_gorev_id && String(k.wbs_gorev_id) === String(wbsGorevId))) return s;
  }
  return null;
}

/** @param {{sorumlu_tipi?, sorumlu_id?, son_tarih?}} [manuel] WBS'ten alt yüklenici bulunamazsa zorunlu. */
export function yonlendir(talepId, manuel = {}, aktor) {
  const t = stmtGet.get(talepId);
  if (!t) throw new Error('Talep bulunamadı');
  if (t.durum !== 'acik') throw new Error(`Talep "${t.durum}" durumunda — yalnızca açık talep yönlendirilir.`);
  const s = stmtSatis.get(t.satis_id);
  const b = bolum.getir(t.bolum_id);
  const alt = t.wbs_gorev_id ? wbsAltYuklenicisi(s.proje_id, t.wbs_gorev_id) : null;
  let tipi; let id;
  if (alt) { tipi = 'alt_yuklenici'; id = alt.id; }
  else if (manuel.sorumlu_tipi && manuel.sorumlu_id) { tipi = manuel.sorumlu_tipi; id = manuel.sorumlu_id; }
  else throw new Error('Talebin WBS\'inden sorumlu alt yüklenici bulunamadı — sorumlu_tipi/sorumlu_id verin.');
  const g = gorev.olustur({
    proje_id: s.proje_id, baslik: `[Satış sonrası] ${bolum.etiket(b)}: ${t.aciklama}`, aciklama: `Talep #${t.id} (${t.tur})${t.garanti_kapsaminda_mi === 0 ? ' — GARANTİ DIŞI' : ''}`,
    sorumlu_tipi: tipi, sorumlu_id: id, wbs_gorev_id: t.wbs_gorev_id ?? undefined, konum_blok: b.blok, konum_kat: b.kat, konum_daire: b.kapi_no, son_tarih: manuel.son_tarih,
  }, aktor);
  stmtYonlendir.run(g.id, alt ? alt.id : null, talepId);
  audit.kaydet('satis_sonrasi_talep', talepId, 'GUNCELLE', aktor, { durum: ['acik', 'yonlendirildi'], gorev_id: g.id, alt_yuklenici_sozlesme_id: alt?.id ?? null });
  return stmtGet.get(talepId);
}
export function kapat(id, aktor) {
  if (!stmtGet.get(id)) throw new Error('Talep bulunamadı');
  stmtKapat.run(id);
  audit.kaydet('satis_sonrasi_talep', id, 'GUNCELLE', aktor, { durum: 'kapali' });
  return stmtGet.get(id);
}
