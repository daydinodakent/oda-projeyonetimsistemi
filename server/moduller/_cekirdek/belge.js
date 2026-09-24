// Belge — Çekirdek. Bir varlığa (şimdilik yalnızca Kişi — İK özlük evrakı,
// P7) bağlı doküman kaydının TEK sahibi. Gerçek dosya baytı SAKLANMAZ
// (yükleme altyapısı bu turun kapsamı dışında) — yalnızca tür/ad/geçerlilik
// METADATA'sı.
import { db } from './db.js';
import * as audit from './audit.js';

const TURLER = ['is_sozlesmesi', 'kimlik', 'ikametgah', 'diploma', 'ehliyet', 'src_operator', 'mesleki_yeterlilik', 'saglik_raporu', 'isg_sertifikasi', 'diger'];

const stmtInsert = db.prepare(
  `INSERT INTO belge (ilgili_tip, ilgili_id, tur, dosya_adi, gecerlilik_baslangic, gecerlilik_bitis, notes, create_uid)
   VALUES (@ilgili_tip, @ilgili_id, @tur, @dosya_adi, @gecerlilik_baslangic, @gecerlilik_bitis, @notes, @create_uid)`
);
const stmtGet = db.prepare('SELECT * FROM belge WHERE id = ? AND row_status = 1');
const stmtListeleIlgili = db.prepare('SELECT * FROM belge WHERE ilgili_tip = ? AND ilgili_id = ? AND row_status = 1 ORDER BY tur');
const stmtListeleTumIlgiliTip = db.prepare('SELECT * FROM belge WHERE ilgili_tip = ? AND row_status = 1');
const stmtPasifEt = db.prepare("UPDATE belge SET row_status = 0, write_uid = ?, write_date = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?");

/** @param {{ilgili_tip, ilgili_id, tur, dosya_adi, gecerlilik_baslangic?, gecerlilik_bitis?, notes?}} item */
export function olustur(item, aktor) {
  if (!TURLER.includes(item.tur)) throw new Error(`Geçersiz belge türü: ${item.tur}`);
  const row = {
    ilgili_tip: item.ilgili_tip, ilgili_id: String(item.ilgili_id), tur: item.tur, dosya_adi: item.dosya_adi,
    gecerlilik_baslangic: item.gecerlilik_baslangic ?? null, gecerlilik_bitis: item.gecerlilik_bitis ?? null,
    notes: item.notes ?? null, create_uid: aktor ?? null,
  };
  const info = stmtInsert.run(row);
  const id = info.lastInsertRowid;
  audit.kaydet('belge', id, 'OLUSTUR', aktor, { yeni: row });
  return stmtGet.get(id);
}

export function ilgiliIcinListele(ilgiliTip, ilgiliId) {
  return stmtListeleIlgili.all(ilgiliTip, String(ilgiliId));
}

/** Bir tarihte (verilmezse bugün) süresi DOLMUŞ veya `gunOncesi` içinde dolacak belgeleri döner. */
export function suresiDolanlariGetir(ilgiliTip, tarih, gunOncesi = 0) {
  const t = tarih || new Date().toISOString().slice(0, 10);
  const esik = new Date(t);
  esik.setDate(esik.getDate() + gunOncesi);
  const esikStr = esik.toISOString().slice(0, 10);
  return stmtListeleTumIlgiliTip.all(ilgiliTip).filter((b) => b.gecerlilik_bitis && b.gecerlilik_bitis <= esikStr);
}

export function pasifEt(id, aktor) {
  stmtPasifEt.run(aktor ?? null, id);
  audit.kaydet('belge', id, 'IPTAL', aktor, null);
}
