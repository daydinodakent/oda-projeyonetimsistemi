import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const maliyetKodu = await import('./maliyetKodu.js');
const { putRecord } = await import('../../db.js');

test('olustur: var OLMAYAN bir WBS görevine bağlanamaz (sahiplik kuralı — referans doğrulanır)', () => {
  assert.throws(
    () => maliyetKodu.olustur({ proje_id: 'IGA-ETAP-1', wbs_gorev_id: 'hic-yok-boyle-bir-id', kaynak_tipi: 'malzeme' }),
    /WBS görevi bulunamadı/
  );
});

test('olustur: mevcut bir tb_wbs_gorevler kaydına REFERANS verir, onu KOPYALAMAZ', () => {
  // WBS kaydı, çekirdeğin DEĞİL server/db.js'in generic 'records' tablosunun
  // sahipliğinde — burada yalnızca varlığını simüle etmek için ekleniyor,
  // gerçek uygulamada tb_wbs_gorevler zaten mevcut bir kayıttır.
  putRecord('tb_wbs_gorevler', { id: 'wbs-21', wbs_code: '21', name: 'Test WBS', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: 'IGA-ETAP-1', wbs_gorev_id: 'wbs-21', kaynak_tipi: 'malzeme' });
  assert.equal(mk.kod, 'WBS-21.MLZ');
  assert.equal(mk.wbs_gorev_id, 'wbs-21');
  assert.equal(Object.keys(mk).includes('wbs_code'), false, 'WBS alanları maliyet_kodu satırına KOPYALANMAMALI');
});

test('olustur: aynı WBS + aynı kaynak tipi ikinci kez oluşturulamaz (UNIQUE)', () => {
  putRecord('tb_wbs_gorevler', { id: 'wbs-22', wbs_code: '22', name: 'Test WBS 2', row_status: 1 });
  maliyetKodu.olustur({ proje_id: 'IGA-ETAP-1', wbs_gorev_id: 'wbs-22', kaynak_tipi: 'iscilik_taseron' });
  assert.throws(
    () => maliyetKodu.olustur({ proje_id: 'IGA-ETAP-1', wbs_gorev_id: 'wbs-22', kaynak_tipi: 'iscilik_taseron' }),
    /zaten var/
  );
});

test('geçersiz kaynak tipi reddedilir', () => {
  putRecord('tb_wbs_gorevler', { id: 'wbs-23', wbs_code: '23', name: 'Test WBS 3', row_status: 1 });
  assert.throws(
    () => maliyetKodu.olustur({ proje_id: 'IGA-ETAP-1', wbs_gorev_id: 'wbs-23', kaynak_tipi: 'olmayan-tip' }),
    /Geçersiz kaynak tipi/
  );
});
