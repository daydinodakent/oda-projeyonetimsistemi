import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sifrele, cozul, maskele } from './kripto.js';

test('sifrele/cozul: round-trip düz metni tam olarak geri verir', () => {
  const tckn = '12345678901';
  const sifreli = sifrele(tckn);
  assert.notEqual(sifreli, tckn, 'şifreli metin düz metinle aynı OLMAMALI');
  assert.equal(cozul(sifreli), tckn);
});

test('sifrele: aynı girdi için HER SEFERİNDE farklı bir şifreli metin üretir (rastgele IV)', () => {
  const a = sifrele('12345678901');
  const b = sifrele('12345678901');
  assert.notEqual(a, b, 'IV rastgele olduğundan iki şifreleme birbirine eşit olmamalı');
  assert.equal(cozul(a), cozul(b));
});

test('maskele: yalnızca ilk 3 ve son 2 hane görünür', () => {
  assert.equal(maskele('12345678901'), '123******01');
});

test('cozul: bozulmuş/yanlış blob authTag doğrulamasında hata fırlatır (GCM bütünlük koruması)', () => {
  assert.throws(() => cozul('bozuk-veri'));
});
