import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const zimmet = await import('./zimmet.js');
const malzeme = await import('./malzeme.js');

test('ver: geçersiz zimmet_alan_tipi reddedilir', () => {
  const matkap = malzeme.olustur({ kod: 'MATKAP-Z1', ad: 'Matkap', birim: 'adet', demirbas_mi: true, stoklu_mu: false });
  assert.throws(() => zimmet.ver({ malzeme_id: matkap.id, zimmet_alan_tipi: 'gecersiz', zimmet_tarihi: '2026-01-01' }), /Geçersiz zimmet_alan_tipi/);
});

test('ver + listele: KKD zimmeti kkd_mi=1 ile işaretlenir; yalnızca AÇIK zimmetler filtrelenebilir', () => {
  const baret = malzeme.olustur({ kod: 'BARET-Z1', ad: 'Baret', birim: 'adet', demirbas_mi: true, stoklu_mu: false });
  const z = zimmet.ver({ malzeme_id: baret.id, zimmet_alan_tipi: 'personel', zimmet_alan_aciklama: 'Ahmet Usta', kkd_mi: true, zimmet_tarihi: '2026-01-01' });
  assert.equal(z.durum, 'zimmette');
  assert.equal(z.kkd_mi, 1);
  assert.equal(zimmet.listele(true).some((x) => x.id === z.id), true);
});

test('iadeEt: yalnızca "zimmette" olan bir kayıt iade edilebilir; iade sonrası tekrar iade edilemez', () => {
  const iskele = malzeme.olustur({ kod: 'ISKELE-Z1', ad: 'İskele Bacağı', birim: 'adet', demirbas_mi: true, stoklu_mu: false });
  const z = zimmet.ver({ malzeme_id: iskele.id, zimmet_alan_tipi: 'taseron_ekibi', zimmet_alan_aciklama: 'Ekip A', zimmet_tarihi: '2026-01-01' });
  const iadeEdilen = zimmet.iadeEt(z.id, '2026-02-01');
  assert.equal(iadeEdilen.durum, 'iade_edildi');
  assert.equal(zimmet.listele(true).some((x) => x.id === z.id), false, 'iade edilen zimmet AÇIK listede görünmemeli');
  assert.throws(() => zimmet.iadeEt(z.id, '2026-02-02'), /yalnızca "zimmette" olanlar/);
});

test('kayipIsaretle: durumu "kayip" yapar', () => {
  const kalip = malzeme.olustur({ kod: 'KALIP-Z1', ad: 'Kalıp Paneli', birim: 'adet', demirbas_mi: true, stoklu_mu: false });
  const z = zimmet.ver({ malzeme_id: kalip.id, zimmet_alan_tipi: 'alt_yuklenici_ekibi', zimmet_alan_aciklama: 'Alt Yüklenici X', zimmet_tarihi: '2026-01-01' });
  const kayip = zimmet.kayipIsaretle(z.id);
  assert.equal(kayip.durum, 'kayip');
});
