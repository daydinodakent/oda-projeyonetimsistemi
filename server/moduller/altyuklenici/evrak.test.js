import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const evrak = await import('./evrak.js');

const SOZLESME_ID = 1; // FK doğrulaması yok (evrak.js sözleşme varlığını kontrol etmez — sadece REFERANS tutar), test amaçlı sabit id yeterli

test('listele: hiç evrak girilmemişse tüm zorunlu türler "eksik" döner', () => {
  const durumlar = evrak.listele(SOZLESME_ID);
  assert.equal(durumlar.length, 4, 'son_hakedis_mi verilmezse iliskiksizlik_belgesi listeye GİRMEMELİ');
  assert.ok(durumlar.every((d) => d.durum === 'eksik'));
});

test('listele: son_hakedis_mi=true iken iliskiksizlik_belgesi de listeye eklenir', () => {
  const durumlar = evrak.listele(SOZLESME_ID, true);
  assert.equal(durumlar.length, 5);
  assert.ok(durumlar.some((d) => d.tur === 'iliskiksizlik_belgesi'));
});

test('ekleVeyaGuncelle: geçerlilik_bitis geçmişte ise durum "suresi_gecmis" olur', () => {
  evrak.ekleVeyaGuncelle(SOZLESME_ID, 'sigorta', { gecerlilik_baslangic: '2020-01-01', gecerlilik_bitis: '2020-12-31' });
  const durum = evrak.listele(SOZLESME_ID).find((d) => d.tur === 'sigorta');
  assert.equal(durum.durum, 'suresi_gecmis');
});

test('ekleVeyaGuncelle: gelecekteki geçerlilik_bitis ile durum "tamam" olur; aynı türe İKİNCİ çağrı GÜNCELLER (yeni satır AÇMAZ)', () => {
  evrak.ekleVeyaGuncelle(SOZLESME_ID, 'sgk_isyeri_sicili', { gecerlilik_bitis: '2020-01-01' });
  evrak.ekleVeyaGuncelle(SOZLESME_ID, 'sgk_isyeri_sicili', { gecerlilik_bitis: '2099-01-01' });
  const kayitlar = evrak.listele(SOZLESME_ID).filter((d) => d.tur === 'sgk_isyeri_sicili');
  assert.equal(kayitlar.length, 1);
  assert.equal(kayitlar[0].durum, 'tamam');
});

test('blokajKontrolu: eksik evrak varken blokajVar=true; tümü tamamlanınca false', () => {
  let kontrol = evrak.blokajKontrolu(SOZLESME_ID);
  assert.equal(kontrol.blokajVar, true);

  evrak.ekleVeyaGuncelle(SOZLESME_ID, 'isg_uzmani_atamasi', { gecerlilik_bitis: '2099-01-01' });
  evrak.ekleVeyaGuncelle(SOZLESME_ID, 'calisan_listesi', { gecerlilik_bitis: '2099-01-01' });
  // sgk_isyeri_sicili ve sigorta önceki testlerde zaten "tamam"/"suresi_gecmis" olarak girildi — sigortayı da düzeltelim.
  evrak.ekleVeyaGuncelle(SOZLESME_ID, 'sigorta', { gecerlilik_bitis: '2099-01-01' });

  kontrol = evrak.blokajKontrolu(SOZLESME_ID);
  assert.equal(kontrol.blokajVar, false, `hâlâ eksik: ${JSON.stringify(kontrol.eksikEvraklar)}`);
});
