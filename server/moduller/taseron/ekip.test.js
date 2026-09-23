import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const ekip = await import('./ekip.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const kisiMod = await import('../_cekirdek/kisi.js');

const PROJE = 'IGA-ETAP-1';
let vknSayaci = 7000000000;

function firmaOlustur() {
  vknSayaci += 1;
  return cariFirma.olustur({ unvan: `Taşeron Firma ${vknSayaci}`, vkn_tckn: String(vknSayaci), roller: ['taseron'] });
}

function kisiOlustur(rol = 'taseron_iscisi') {
  return kisiMod.olustur({ ad_soyad: 'Test İşçi', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol });
}

test('olustur: ALT YÜKLENİCİ tipi sözleşme için ekip kurulamaz (TANIM AYRIMI — P5 ile çakışmayı önler)', () => {
  const firma = firmaOlustur();
  const altYukleniciSozlesmesi = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: PROJE, konu: 'Elektrik', bedel_kurus: 1000000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  assert.throws(
    () => ekip.olustur({ sozlesme_id: altYukleniciSozlesmesi.id }),
    /yalnızca "taseron" tipi sözleşmeler/
  );
});

test('olustur: TAŞERON tipi sözleşme için ekip kurulur, proje_id sözleşmeden devralınır', () => {
  const firma = firmaOlustur();
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Kalıp işleri', bedel_kurus: 500000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const e = ekip.olustur({ sozlesme_id: s.id, is_kolu: 'Kalıp', odeme_tipi: 'yevmiye' });
  assert.equal(e.proje_id, PROJE);
  assert.equal(e.odeme_tipi, 'yevmiye');
});

test('uyeEkle: aynı kişi AYNI ekibe İKİNCİ kez eklenemez', () => {
  const firma = firmaOlustur();
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Sıva işleri', bedel_kurus: 300000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const e = ekip.olustur({ sozlesme_id: s.id });
  const k = kisiOlustur();
  ekip.uyeEkle(e.id, { kisi_id: k.id, rol_saha: 'usta', baslangic_tarihi: '2026-01-01' });
  assert.throws(() => ekip.uyeEkle(e.id, { kisi_id: k.id, baslangic_tarihi: '2026-01-02' }), /zaten bu ekipte kayıtlı/);
});

test('yevmiyeTanimla + yevmiyeGetir: yürürlük tarihli — tanımsız tarihte null döner (varsayım YOK)', () => {
  const firma = firmaOlustur();
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Demir işleri', bedel_kurus: 300000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const e = ekip.olustur({ sozlesme_id: s.id });
  const k = kisiOlustur();
  const uye = ekip.uyeEkle(e.id, { kisi_id: k.id, baslangic_tarihi: '2026-01-01' });

  assert.equal(ekip.yevmiyeGetir(uye.id, '2026-01-15'), null);
  ekip.yevmiyeTanimla(uye.id, 50000, '2026-02-01');
  assert.equal(ekip.yevmiyeGetir(uye.id, '2026-01-15'), null, 'yürürlük başlangıcından ÖNCESİ hâlâ tanımsız olmalı');
  assert.equal(ekip.yevmiyeGetir(uye.id, '2026-02-15').yevmiye_kurus, 50000);

  ekip.yevmiyeTanimla(uye.id, 60000, '2026-03-01');
  assert.equal(ekip.yevmiyeGetir(uye.id, '2026-02-15').yevmiye_kurus, 50000, 'eski dönem KORUNUR');
  assert.equal(ekip.yevmiyeGetir(uye.id, '2026-03-15').yevmiye_kurus, 60000, 'yeni dönem geçerli olur');
});
