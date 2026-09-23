import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const sablon = await import('./sablon.js');

test('olustur: geçersiz sözleşme tipi reddedilir', () => {
  assert.throws(() => sablon.olustur({ tip: 'gecersiz', ad: 'x', belge_metni: 'x' }), /Geçersiz sözleşme tipi/);
});

test('olustur: belge_metni zorunludur', () => {
  assert.throws(() => sablon.olustur({ tip: 'taseron', ad: 'x' }), /belge_metni zorunludur/);
});

test('belgeUret: değişkenler yerleştirilir, bilinmeyen değişken OLDUĞU GİBİ kalır', () => {
  const s = sablon.olustur({
    tip: 'taseron', ad: 'Standart Taşeron Sözleşmesi',
    belge_metni: '{{taraf}} ile {{proje}} projesi kapsamında {{bedel}} bedelli, {{tarih}} tarihli sözleşme. Ek şart: {{bilinmeyen}}.',
  });
  const { metin } = sablon.belgeUret(s.id, { taraf: 'ABC İnşaat Ltd.', proje: 'IGA Etap 1', bedel: '500.000,00 TL', tarih: '23.09.2026' });
  assert.equal(metin, 'ABC İnşaat Ltd. ile IGA Etap 1 projesi kapsamında 500.000,00 TL bedelli, 23.09.2026 tarihli sözleşme. Ek şart: {{bilinmeyen}}.');
});

test('pasifEt: soft-delete sonrası listeden düşer', () => {
  const s = sablon.olustur({ tip: 'kira', ad: 'Ekipman Kira Şablonu', belge_metni: 'x' });
  assert.equal(sablon.listele('kira').some((x) => x.id === s.id), true);
  sablon.pasifEt(s.id);
  assert.equal(sablon.listele('kira').some((x) => x.id === s.id), false);
});
