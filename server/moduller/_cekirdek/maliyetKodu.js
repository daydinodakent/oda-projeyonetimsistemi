// Maliyet Kodu = WBS düğümü × Kaynak Tipi. wbs_gorev_id, server/db.js'in
// GENERIC 'records' tablosundaki tb_wbs_gorevler kaydına REFERANS verir —
// WBS verisini KOPYALAMAZ (bkz. db.js başındaki sahiplik notu). Varlık,
// mevcut generic getRecord() ile doğrulanır; bu servisin server/db.js'e
// tek bağımlılığı budur.
import { db } from './db.js';
import { getRecord } from '../../db.js';
import * as audit from './audit.js';

const KAYNAK_TIPLERI = ['malzeme', 'iscilik_kadro', 'iscilik_taseron', 'alt_yuklenici', 'makine_ekipman', 'genel_gider'];
const KAYNAK_TIPI_KISALTMA = { malzeme: 'MLZ', iscilik_kadro: 'ISK', iscilik_taseron: 'IST', alt_yuklenici: 'AYK', makine_ekipman: 'MKN', genel_gider: 'GEN' };

const stmtInsert = db.prepare(
  'INSERT INTO maliyet_kodu (proje_id, wbs_gorev_id, kaynak_tipi, kod, notes, create_uid) VALUES (?, ?, ?, ?, ?, ?)'
);
const stmtGet = db.prepare('SELECT * FROM maliyet_kodu WHERE id = ? AND row_status = 1');
const stmtListByProje = db.prepare('SELECT * FROM maliyet_kodu WHERE proje_id = ? AND row_status = 1 ORDER BY kod');
const stmtListByWbs = db.prepare('SELECT * FROM maliyet_kodu WHERE wbs_gorev_id = ? AND row_status = 1');

export function listele(projeId) {
  return stmtListByProje.all(projeId);
}

export function wbsIcinListele(wbsGorevId) {
  return stmtListByWbs.all(String(wbsGorevId));
}

/**
 * @param {{proje_id, wbs_gorev_id, kaynak_tipi}} item
 * wbs_gorev_id'nin GERÇEKTEN var olan bir tb_wbs_gorevler kaydı olduğu
 * burada doğrulanır (sahiplik kuralı: referans veren taraf kontrol eder).
 */
export function olustur(item, aktor) {
  if (!KAYNAK_TIPLERI.includes(item.kaynak_tipi)) throw new Error(`Geçersiz kaynak tipi: ${item.kaynak_tipi}`);
  const wbsKaydi = getRecord('tb_wbs_gorevler', item.wbs_gorev_id);
  if (!wbsKaydi) throw new Error(`WBS görevi bulunamadı: ${item.wbs_gorev_id} (maliyet kodu, var olmayan bir WBS'e bağlanamaz)`);
  const kod = `WBS-${wbsKaydi.wbs_code || item.wbs_gorev_id}.${KAYNAK_TIPI_KISALTMA[item.kaynak_tipi]}`;
  let info;
  try {
    info = stmtInsert.run(item.proje_id, String(item.wbs_gorev_id), item.kaynak_tipi, kod, item.notes ?? null, aktor ?? null);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      throw new Error(`Bu WBS görevi için "${item.kaynak_tipi}" maliyet kodu zaten var (${kod}).`);
    }
    throw err;
  }
  const id = info.lastInsertRowid;
  audit.kaydet('maliyet_kodu', id, 'OLUSTUR', aktor, { yeni: { ...item, kod } });
  return stmtGet.get(id);
}
