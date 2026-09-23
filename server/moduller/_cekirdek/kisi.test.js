import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const kisi = await import('./kisi.js');

test('olustur: geçerli 11 haneli TCKN kabul edilir, API yanıtı YALNIZCA maskeli hâli döner', () => {
  const k = kisi.olustur({ ad_soyad: 'Ahmet Yılmaz', tckn: '12345678901', rol: 'personel' });
  assert.equal(k.tckn_maske, '123******01');
  assert.equal(k.tckn_sifreli, undefined, 'şifreli TCKN blob\'u API yanıtında ASLA görünmemeli');
});

test('olustur: 11 haneli olmayan TCKN reddedilir', () => {
  assert.throws(() => kisi.olustur({ ad_soyad: 'X', tckn: '123', rol: 'personel' }), /11 haneli/);
});

test('olustur: geçersiz rol reddedilir', () => {
  assert.throws(() => kisi.olustur({ ad_soyad: 'X', tckn: '98765432109', rol: 'olmayan_rol' }), /Geçersiz rol/);
});

test('olustur: AYNI TCKN ile ikinci kişi mükerrer olarak ENGELLENİR (roller farklı olsa bile)', () => {
  kisi.olustur({ ad_soyad: 'Mehmet Demir', tckn: '11122233344', rol: 'personel' });
  assert.throws(
    () => kisi.olustur({ ad_soyad: 'Mehmet Demir (Taşeron İşçisi)', tckn: '11122233344', rol: 'taseron_iscisi' }),
    /mükerrer/
  );
});

test('tüm roller (personel/taşeron işçisi/alt yüklenici işçisi/müşteri/ziyaretçi) İSG alanlarını tutabilir', () => {
  const k = kisi.olustur({
    ad_soyad: 'Cihan Taş', tckn: '55566677788', rol: 'taseron_iscisi',
    santiye_giris_yetkisi: true, isg_egitim_tarihi: '2026-01-10', isg_egitim_gecerlilik_tarihi: '2027-01-10',
  });
  assert.equal(k.santiye_giris_yetkisi, 1);
  assert.equal(k.isg_egitim_tarihi, '2026-01-10');
});
