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

test('olustur: grup/demirbas_mi/min-max stok/fire toleransı alanları doğru kaydedilir', () => {
  const demirbas = malzeme.olustur({ kod: 'MATKAP-1', ad: 'Kırıcı Matkap', birim: 'adet', grup: 'El Aletleri', demirbas_mi: true, stoklu_mu: false });
  assert.equal(demirbas.demirbas_mi, 1);
  assert.equal(demirbas.grup, 'El Aletleri');

  const stoklu = malzeme.olustur({ kod: 'CIMENTO-2', ad: 'Çimento', birim: 'ton', min_stok: 5, max_stok: 50, fire_toleransi_yuzde: 2.5 });
  assert.equal(stoklu.min_stok, 5);
  assert.equal(stoklu.max_stok, 50);
  assert.equal(stoklu.fire_toleransi_yuzde, 2.5);
});

test('birimeCevir: ana birimin KENDİSİ için katsayı 1 varsayılır (dönüşüm TANIMLANMASI gerekmez)', () => {
  const m = malzeme.olustur({ kod: 'DEMIR-BIRIM', ad: 'Demir', birim: 'ton' });
  assert.equal(malzeme.birimeCevir(m.id, 5, 'ton'), 5);
  assert.equal(malzeme.birimeCevir(m.id, 5, 'TON'), 5, 'büyük/küçük harf duyarsız');
});

test('birimeCevir: tanımsız birim için hata fırlatır; tanımlı birim doğru dönüşüm katsayısını uygular', () => {
  const m = malzeme.olustur({ kod: 'DEMIR-KG', ad: 'Demir (ton alınır, kg çıkılır)', birim: 'ton' });
  assert.throws(() => malzeme.birimeCevir(m.id, 100, 'kg'), /dönüşüm katsayısı tanımlı değil/);
  malzeme.birimDonusumTanimla(m.id, 'kg', 0.001); // 1 kg = 0.001 ton
  assert.equal(malzeme.birimeCevir(m.id, 2500, 'kg'), 2.5);
});
