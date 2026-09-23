import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const siparis = await import('./siparis.js');
const malKabul = await import('./malKabul.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const tedarikciKarnesi = await import('./tedarikciKarnesi.js');

const PROJE = 'IGA-ETAP-1';

test('karnesi: hiç değerlendirilebilir (tamamlanmış + teslim tarihli) siparişi olmayan firma için null döner', () => {
  const firma = cariFirma.olustur({ unvan: 'Yeni Tedarikçi', vkn_tckn: '5551112233', roller: ['tedarikci'] });
  const k = tedarikciKarnesi.karnesi(firma.id);
  assert.equal(k.zamanindaTeslimYuzdesi, null);
  assert.equal(k.kaliteRedOrani, null, 'P4/Kalite Kontrol kurulmadan hesaplanamaz');
});

test('karnesi: zamanında ve geç teslim edilen siparişlere göre yüzde doğru hesaplanır', () => {
  const firma = cariFirma.olustur({ unvan: 'Deneyimli Tedarikçi', vkn_tckn: '5551112244', roller: ['tedarikci'] });

  const zamaninda = siparis.olustur({ proje_id: PROJE, firma_id: firma.id, teslim_tarihi: '2026-11-10' });
  const kz = siparis.kalemEkle(zamaninda.id, { aciklama: 'Kum', birim: 'm3', miktar: 5, birim_fiyat_kurus: 10000 });
  siparis.durumDegistir(zamaninda.id, 'onaylandi');
  malKabul.kaydet({ siparis_kalem_id: kz.id, miktar: 5, tarih: '2026-11-08' }); // vaktinden ÖNCE teslim -> zamanında

  const gec = siparis.olustur({ proje_id: PROJE, firma_id: firma.id, teslim_tarihi: '2026-11-10' });
  const kg = siparis.kalemEkle(gec.id, { aciklama: 'Çakıl', birim: 'm3', miktar: 5, birim_fiyat_kurus: 10000 });
  siparis.durumDegistir(gec.id, 'onaylandi');
  malKabul.kaydet({ siparis_kalem_id: kg.id, miktar: 5, tarih: '2026-11-20' }); // vaktinden SONRA teslim -> geç

  const karne = tedarikciKarnesi.karnesi(firma.id);
  assert.equal(karne.degerlendirilebilirSiparisSayisi, 2);
  assert.equal(karne.zamanindaTeslimYuzdesi, 50);
});
