import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const siparis = await import('./siparis.js');
const malKabul = await import('../depo/malKabul.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const tedarikciKarnesi = await import('./tedarikciKarnesi.js');

const PROJE = 'IGA-ETAP-1';

test('karnesi: hiç değerlendirilebilir (tamamlanmış + teslim tarihli) siparişi olmayan firma için null döner', () => {
  const firma = cariFirma.olustur({ unvan: 'Yeni Tedarikçi', vkn_tckn: '5551112233', roller: ['tedarikci'] });
  const k = tedarikciKarnesi.karnesi(firma.id);
  assert.equal(k.zamanindaTeslimYuzdesi, null);
  assert.equal(k.kaliteRedOrani, null, 'hiç mal kabul verisi yoksa hesaplanamaz');
});

test('karnesi: zamanında ve geç teslim edilen siparişlere göre yüzde doğru hesaplanır', () => {
  const firma = cariFirma.olustur({ unvan: 'Deneyimli Tedarikçi', vkn_tckn: '5551112244', roller: ['tedarikci'] });

  const zamaninda = siparis.olustur({ proje_id: PROJE, firma_id: firma.id, teslim_tarihi: '2026-11-10' });
  const kz = siparis.kalemEkle(zamaninda.id, { aciklama: 'Kum', birim: 'm3', miktar: 5, birim_fiyat_kurus: 10000 });
  siparis.durumDegistir(zamaninda.id, 'onaylandi');
  malKabul.kaydet({ siparis_kalem_id: kz.id, gelen_miktar: 5, kabul_miktar: 5, tarih: '2026-11-08' }); // vaktinden ÖNCE teslim -> zamanında

  const gec = siparis.olustur({ proje_id: PROJE, firma_id: firma.id, teslim_tarihi: '2026-11-10' });
  const kg = siparis.kalemEkle(gec.id, { aciklama: 'Çakıl', birim: 'm3', miktar: 5, birim_fiyat_kurus: 10000 });
  siparis.durumDegistir(gec.id, 'onaylandi');
  malKabul.kaydet({ siparis_kalem_id: kg.id, gelen_miktar: 5, kabul_miktar: 5, tarih: '2026-11-20' }); // vaktinden SONRA teslim -> geç

  const karne = tedarikciKarnesi.karnesi(firma.id);
  assert.equal(karne.degerlendirilebilirSiparisSayisi, 2);
  assert.equal(karne.zamanindaTeslimYuzdesi, 50);
});

test('karnesi: mal kabulde reddedilen miktar kalite red oranına yansır (P4 mal kabul verisinden otomatik hesap)', () => {
  const firma = cariFirma.olustur({ unvan: 'Kalitesiz Tedarikçi', vkn_tckn: '5551112255', roller: ['tedarikci'] });
  const s = siparis.olustur({ proje_id: PROJE, firma_id: firma.id, teslim_tarihi: '2026-11-10' });
  const k = siparis.kalemEkle(s.id, { aciklama: 'Tuğla', birim: 'adet', miktar: 100, birim_fiyat_kurus: 500 });
  siparis.durumDegistir(s.id, 'onaylandi');
  // 100 geldi, 80 kabul edildi, 20 kusurlu diye reddedildi.
  malKabul.kaydet({ siparis_kalem_id: k.id, gelen_miktar: 100, kabul_miktar: 80, red_miktar: 20, red_nedeni: 'Kırık/çatlak', tarih: '2026-11-05' });

  const karne = tedarikciKarnesi.karnesi(firma.id);
  assert.equal(karne.kaliteRedOrani, 20, '20/100 = %20 red oranı');
});
