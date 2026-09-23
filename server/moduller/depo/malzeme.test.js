import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const malzeme = await import('./malzeme.js');

test('olustur: aynı kod ile ikinci malzeme kartı mükerrer olarak ENGELLENİR', () => {
  malzeme.olustur({ kod: 'CIM-42.5', ad: 'Çimento 42.5R', birim: 'ton', stoklu_mu: true });
  assert.throws(() => malzeme.olustur({ kod: 'CIM-42.5', ad: 'Başka', birim: 'ton' }), /zaten kayıtlı/);
});

test('stoklu_mu varsayılan olarak 1 (stoklu) kabul edilir; false verilirse 0 olur', () => {
  const stoklu = malzeme.olustur({ kod: 'DEM-8', ad: 'Demir 8mm', birim: 'ton' });
  assert.equal(stoklu.stoklu_mu, 1);
  const sarf = malzeme.olustur({ kod: 'NAKLIYE-1', ad: 'Nakliye Hizmeti', birim: 'sefer', stoklu_mu: false });
  assert.equal(sarf.stoklu_mu, 0);
});

test('pasifEt: soft-delete sonrası listele() artık göstermez', () => {
  const m = malzeme.olustur({ kod: 'GECICI-1', ad: 'Geçici Malzeme', birim: 'adet' });
  assert.equal(malzeme.listele().some((x) => x.id === m.id), true);
  malzeme.pasifEt(m.id);
  assert.equal(malzeme.listele().some((x) => x.id === m.id), false);
});
