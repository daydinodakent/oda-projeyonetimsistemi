import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const belge = await import('./belge.js');

test('olustur: geçersiz tür reddedilir', () => {
  assert.throws(() => belge.olustur({ ilgili_tip: 'kisi', ilgili_id: 1, tur: 'gecersiz', dosya_adi: 'x.pdf' }), /Geçersiz belge türü/);
});

test('ilgiliIcinListele: yalnızca o ilgili_tip+ilgili_id belgeleri döner', () => {
  belge.olustur({ ilgili_tip: 'kisi', ilgili_id: 10, tur: 'kimlik', dosya_adi: 'kimlik.pdf' });
  belge.olustur({ ilgili_tip: 'kisi', ilgili_id: 11, tur: 'kimlik', dosya_adi: 'baskasi.pdf' });
  const liste = belge.ilgiliIcinListele('kisi', 10);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].dosya_adi, 'kimlik.pdf');
});

test('suresiDolanlariGetir: yalnızca süresi geçmiş/eşikte olan belgeleri döner, süresiz belgeler HARİÇ tutulur', () => {
  belge.olustur({ ilgili_tip: 'kisi', ilgili_id: 20, tur: 'saglik_raporu', dosya_adi: 'gecmis.pdf', gecerlilik_bitis: '2020-01-01' });
  belge.olustur({ ilgili_tip: 'kisi', ilgili_id: 20, tur: 'diploma', dosya_adi: 'suresiz.pdf' }); // gecerlilik_bitis YOK
  belge.olustur({ ilgili_tip: 'kisi', ilgili_id: 20, tur: 'ehliyet', dosya_adi: 'gelecek.pdf', gecerlilik_bitis: '2099-01-01' });
  const dolanlar = belge.suresiDolanlariGetir('kisi', '2026-01-01');
  assert.equal(dolanlar.length, 1);
  assert.equal(dolanlar[0].dosya_adi, 'gecmis.pdf');
});

test('pasifEt: soft delete — listeleme dışında kalır', () => {
  const b = belge.olustur({ ilgili_tip: 'kisi', ilgili_id: 30, tur: 'diger', dosya_adi: 'iptal.pdf' });
  belge.pasifEt(b.id);
  assert.equal(belge.ilgiliIcinListele('kisi', 30).length, 0);
});
