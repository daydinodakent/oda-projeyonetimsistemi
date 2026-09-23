import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const ilerleme = await import('./ilerleme.js');
const performans = await import('./performans.js');
const parametre = await import('../_cekirdek/parametre.js');
const { putRecord } = await import('../../db.js');

const SOZLESME_ID = 1;

putRecord('tb_wbs_gorevler', { id: 'wbs-ilerleme-1', wbs_code: 'W1', name: 'Cephe İşleri', row_status: 1 });

test('kaydet: var olmayan WBS görevine bağlanamaz; var olana REFERANS verir', () => {
  assert.throws(() => ilerleme.kaydet(SOZLESME_ID, { wbs_gorev_id: 'wbs-yok', tarih: '2026-01-01', planlanan_yuzde: 10, gerceklesen_yuzde: 5 }), /WBS görevi bulunamadı/);
  const k = ilerleme.kaydet(SOZLESME_ID, { wbs_gorev_id: 'wbs-ilerleme-1', tarih: '2026-01-01', planlanan_yuzde: 10, gerceklesen_yuzde: 5 });
  assert.equal(k.wbs_gorev_id, 'wbs-ilerleme-1');
});

test('gecikmeOzeti: planlanan - gerçekleşen pozitifse GERİDE anlamına gelir, en güncel kayıt esas alınır', () => {
  ilerleme.kaydet(SOZLESME_ID, { wbs_gorev_id: 'wbs-ilerleme-1', tarih: '2026-02-01', planlanan_yuzde: 30, gerceklesen_yuzde: 18 });
  const ozet = ilerleme.gecikmeOzeti(SOZLESME_ID);
  assert.equal(ozet.length, 1, 'aynı WBS için yalnızca EN GÜNCEL kayıt özete girmeli');
  assert.equal(ozet[0].gecikmeYuzde, 12);
});

test('performans hesaplaVeKaydet: parametre TANIMLI DEĞİLSE eşit ağırlık (%25) varsayılanına düşer', () => {
  const sonuc = performans.hesaplaVeKaydet(SOZLESME_ID, { donem: '2026-Q1', zaman_puani: 80, kalite_puani: 90, isg_puani: 100, belge_puani: 70 });
  // (80+90+100+70)/4 = 85
  assert.equal(sonuc.toplam_puan, 85);
});

test('performans hesaplaVeKaydet: PARAMETRİK ağırlıklar tanımlıysa onlar kullanılır; AYNI dönem güncellenir (yeni satır açmaz)', () => {
  parametre.olustur({ kod: 'altyuklenici_performans_agirlik_zaman', ad: 'Zaman Ağırlığı', deger: 50, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });
  parametre.olustur({ kod: 'altyuklenici_performans_agirlik_kalite', ad: 'Kalite Ağırlığı', deger: 20, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });
  parametre.olustur({ kod: 'altyuklenici_performans_agirlik_isg', ad: 'İSG Ağırlığı', deger: 20, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });
  parametre.olustur({ kod: 'altyuklenici_performans_agirlik_belge', ad: 'Belge Ağırlığı', deger: 10, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });

  // AYNI dönem ('2026-Q1') için tekrar çağır — ağırlıklı: (100×50 + 0×20 + 0×20 + 0×10)/100 = 50
  const sonuc = performans.hesaplaVeKaydet(SOZLESME_ID, { donem: '2026-Q1', zaman_puani: 100, kalite_puani: 0, isg_puani: 0, belge_puani: 0 });
  assert.equal(sonuc.toplam_puan, 50);
  assert.equal(performans.listele(SOZLESME_ID).filter((p) => p.donem === '2026-Q1').length, 1, 'aynı dönem GÜNCELLENMELİ, yeni satır AÇILMAMALI');
});
