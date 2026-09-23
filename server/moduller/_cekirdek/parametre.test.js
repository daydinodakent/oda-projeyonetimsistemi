import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// Her test dosyası kendi geçici SQLite dosyasını kullanır — geliştirme
// veritabanı (server/data/oda_pys.gpkg) hiç etkilenmez (bkz. server/db.js
// ODA_DB_PATH notu). process.env burada, aşağıdaki dinamik import()'tan
// ÖNCE ayarlanmalı — statik import kullanılsaydı hoisting yüzünden bu iş
// geç kalırdı.
process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const parametre = await import('./parametre.js');

test('degerAl: aynı kod için farklı yürürlük dönemlerinden DOĞRU olanı seçer', () => {
  parametre.olustur({ kod: 'kdv_genel', ad: 'KDV Genel Oran', deger: 18, birim: 'yuzde', gecerli_baslangic: '2025-01-01', gecerli_bitis: '2025-12-31' });
  parametre.olustur({ kod: 'kdv_genel', ad: 'KDV Genel Oran', deger: 20, birim: 'yuzde', gecerli_baslangic: '2026-01-01', gecerli_bitis: null });

  assert.equal(parametre.degerAl('kdv_genel', '2025-06-15').deger, 18);
  assert.equal(parametre.degerAl('kdv_genel', '2026-03-01').deger, 20);
  assert.equal(parametre.degerAl('kdv_genel', '2030-01-01').deger, 20, 'gecerli_bitis NULL olan dönem süresiz yürürlükte kalmalı');
});

test('degerAl: hiçbir dönem kapsamıyorsa null döner (koda gömülü varsayılan YOK)', () => {
  assert.equal(parametre.degerAl('hic-olmayan-kod', '2026-01-01'), null);
});

test('pasifEt: soft-delete sonrası degerAl artık o satırı bulamaz', () => {
  const p = parametre.olustur({ kod: 'sgk_isveren_orani', ad: 'SGK İşveren Payı', deger: 20.5, gecerli_baslangic: '2026-01-01' });
  assert.ok(parametre.degerAl('sgk_isveren_orani', '2026-06-01'));
  parametre.pasifEt(p.id, 1);
  assert.equal(parametre.degerAl('sgk_isveren_orani', '2026-06-01'), null);
});
