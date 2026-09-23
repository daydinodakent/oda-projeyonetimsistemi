import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const puantaj = await import('./puantaj.js');
const kisiMod = await import('./kisi.js');

function kisiKur() {
  return kisiMod.olustur({ ad_soyad: 'Test Kişi', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'personel' });
}

test('gun_degeri yalnızca 0, 0.5 veya 1 olabilir', () => {
  const k = kisiKur();
  assert.throws(
    () => puantaj.kaydet({ proje_id: 'IGA-ETAP-1', kisi_id: k.id, tarih: '2026-09-01', gun_degeri: 0.7 }),
    /0, 0\.5 veya 1/
  );
});

test('istemci_kayit_id AYNI ise (çevrimdışı kuyruk yeniden denemesi) İKİNCİ istek hata vermez, tekrarGonderim=true döner', () => {
  const k = kisiKur();
  const istemciId = 'cihaz-A-2026-09-01-' + k.id;
  const ilk = puantaj.kaydet({ proje_id: 'IGA-ETAP-1', kisi_id: k.id, tarih: '2026-09-01', gun_degeri: 1, istemci_kayit_id: istemciId });
  assert.equal(ilk.tekrarGonderim, false);
  const ikinci = puantaj.kaydet({ proje_id: 'IGA-ETAP-1', kisi_id: k.id, tarih: '2026-09-01', gun_degeri: 1, istemci_kayit_id: istemciId });
  assert.equal(ikinci.tekrarGonderim, true);
  assert.equal(ikinci.kayit.id, ilk.kayit.id);

  const gunListesi = puantaj.projeGunuListele('IGA-ETAP-1', '2026-09-01');
  assert.equal(gunListesi.filter((x) => x.kisi_id === k.id).length, 1, 'aynı istemci_kayit_id ile İKİ SATIR oluşmamalı');
});

test('onayla: durumu ONAYLANDI yapar', () => {
  const k = kisiKur();
  const { kayit } = puantaj.kaydet({ proje_id: 'IGA-ETAP-1', kisi_id: k.id, tarih: '2026-09-02', gun_degeri: 0.5 });
  const onayli = puantaj.onayla(kayit.id, 1);
  assert.equal(onayli.durum, 'ONAYLANDI');
});
