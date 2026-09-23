import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const cariFirma = await import('./cariFirma.js');

test('olustur: bir firma birden fazla role sahip olabilir (aynı firma taşeron + tedarikçi)', () => {
  const f = cariFirma.olustur({ unvan: 'Beta Fore Kazık A.Ş.', vkn_tckn: '1234567890', roller: ['taseron', 'tedarikci'] });
  assert.deepEqual(new Set(f.roller), new Set(['taseron', 'tedarikci']));
});

test('olustur: aynı VKN ile İKİNCİ kayıt mükerrer olarak ENGELLENİR', () => {
  cariFirma.olustur({ unvan: 'Firma A', vkn_tckn: '1111111111', roller: ['musteri'] });
  assert.throws(
    () => cariFirma.olustur({ unvan: 'Firma A (yinelenen)', vkn_tckn: '1111111111', roller: ['musteri'] }),
    /mükerrer/
  );
});

test('guncelle: roller listesi değiştirildiğinde eskiler kaldırılır, yeniler eklenir', () => {
  const f = cariFirma.olustur({ unvan: 'Ege Mekanik', vkn_tckn: '2222222222', roller: ['tedarikci'] });
  const guncel = cariFirma.guncelle(f.id, { roller: ['alt_yuklenici'] });
  assert.deepEqual(guncel.roller, ['alt_yuklenici']);
});

test('geçersiz rol reddedilir', () => {
  assert.throws(() => cariFirma.olustur({ unvan: 'X', vkn_tckn: '3333333333', roller: ['olmayan_rol'] }), /Geçersiz rol/);
});

test('pasifEt: soft-delete sonrası listele() artık göstermez', () => {
  const f = cariFirma.olustur({ unvan: 'Silinecek Firma', vkn_tckn: '4444444444', roller: ['musteri'] });
  cariFirma.pasifEt(f.id, 1);
  assert.ok(!cariFirma.listele().some((x) => x.id === f.id));
});
