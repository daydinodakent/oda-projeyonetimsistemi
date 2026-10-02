import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const gecmis = await import('./gecmis.js');
const { putRecord, getRecord } = await import('../../db.js');

const T = 'tb_binalar_3d';
const kare = (lng, lat, d = 0.0002) => ({ tip: 'Polygon', coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]] });
const bina = (id, extra = {}) => ({ id, project_id: 'GP-1', block_name: 'A Blok', floors_count: 4, row_status: 1, the_geom: kare(28.79, 41.25), ...extra });

/** Servisin (index.js generic PUT) yaptığı işlemin birebir karşılığı. */
function yaz(id, yeni, aktor) {
  const once = getRecord(T, id);
  const sonra = { ...(once || { id, row_status: 1 }), ...yeni, id };
  putRecord(T, sonra);
  return gecmis.degisiklikKaydet(T, id, once, sonra, aktor);
}

test('izlenmeyen tablo ve yalnızca write_date farkı geçmişe YAZILMAZ', () => {
  assert.equal(gecmis.degisiklikKaydet('tb_projeler', 'x', null, { id: 'x' }, 'u'), null);
  putRecord(T, bina('b-fark'));
  const once = getRecord(T, 'b-fark');
  assert.equal(gecmis.degisiklikKaydet(T, 'b-fark', once, { ...once, write_date: '2030-01-01' }, 'u'), null);
  assert.equal(gecmis.listele({ tablo: T, kayitId: 'b-fark' }).length, 0);
});

test('taşıma: aynı köşe sayısı + benzer kayma → "taşındı" ve metre cinsinden mesafe; öznitelik alanları listelenir', () => {
  putRecord(T, bina('b-tasi'));
  yaz('b-tasi', { the_geom: kare(28.79, 41.2501) }, 'Ayşe');     // 0.0001° enlem ≈ 11,1 m
  yaz('b-tasi', { floors_count: 5, block_name: 'A Blok (rev)' }, 'Ayşe');
  const l = gecmis.listele({ tablo: T, kayitId: 'b-tasi' });
  assert.equal(l.length, 2);
  const [oznitelik, tasima] = l;                                  // en yeni önce
  assert.equal(tasima.eylem, 'GUNCELLE');
  assert.equal(tasima.geometri_degisti, true);
  assert.ok(tasima.tasima_m > 10 && tasima.tasima_m < 12.5, `taşıma ${tasima.tasima_m} m`);
  assert.equal(tasima.sekil_degisti, false);
  assert.equal(tasima.aktor, 'Ayşe');
  assert.equal(tasima.proje_id, 'GP-1');
  assert.deepEqual(oznitelik.degisen_alanlar.sort(), ['block_name', 'floors_count']);
  assert.equal(oznitelik.geometri_degisti, false);
  assert.equal(oznitelik.ad, 'A Blok (rev)');
  assert.equal(tasima.versiyon, 2); assert.equal(oznitelik.versiyon, 3);
  assert.ok(Array.isArray(tasima.merkez) && Math.abs(tasima.merkez[0] - 28.7901) < 0.001);
});

test('köşe sayısı değişirse "şekli değişti" (taşıma değil)', () => {
  putRecord(T, bina('b-sekil'));
  const g = kare(28.79, 41.25); g.coordinates[0].splice(2, 0, [28.7902, 41.2503]);
  yaz('b-sekil', { the_geom: g });
  const [e] = gecmis.listele({ tablo: T, kayitId: 'b-sekil' });
  assert.equal(e.sekil_degisti, true); assert.equal(e.tasima_m, null);
});

test('geri al: kayıt önceki haline döner, GERI_AL kaydı düşer ve o da geri alınabilir', () => {
  putRecord(T, bina('b-geri'));
  yaz('b-geri', { the_geom: kare(28.8, 41.26) }, 'Ali');
  const [tasima] = gecmis.listele({ tablo: T, kayitId: 'b-geri' });
  const sonuc = gecmis.geriAl(tasima.id, 'Veli');
  assert.equal(sonuc.silindi, false);
  assert.deepEqual(getRecord(T, 'b-geri').the_geom, kare(28.79, 41.25));
  const l = gecmis.listele({ tablo: T, kayitId: 'b-geri' });
  assert.equal(l[0].eylem, 'GERI_AL'); assert.equal(l[0].geri_alinan_id, tasima.id); assert.equal(l[0].aktor, 'Veli');
  // geri almayı geri al → taşınmış hale dönülür
  gecmis.geriAl(l[0].id, 'Veli');
  assert.deepEqual(getRecord(T, 'b-geri').the_geom, kare(28.8, 41.26));
  // aynı değişikliği art arda iki kez geri almak: ikincisinde fark yok
  gecmis.geriAl(tasima.id, 'Veli');
  assert.deepEqual(getRecord(T, 'b-geri').the_geom, kare(28.79, 41.25));
  assert.throws(() => gecmis.geriAl(tasima.id, 'Veli'), /geri alınacak bir fark yok/);
});

test('oluşturmayı geri almak kaydı siler (row_status=0); silmeyi geri almak kaydı döndürür', () => {
  yaz('b-yeni', bina('b-yeni'), 'Ali');
  const [olustur] = gecmis.listele({ tablo: T, kayitId: 'b-yeni' });
  assert.equal(olustur.eylem, 'OLUSTUR');
  assert.equal(gecmis.geriAl(olustur.id, 'Ali').silindi, true);
  assert.equal(getRecord(T, 'b-yeni').row_status, 0);

  putRecord(T, bina('b-sil'));
  yaz('b-sil', { row_status: 0 }, 'Ali');
  const [sil] = gecmis.listele({ tablo: T, kayitId: 'b-sil' });
  assert.equal(sil.eylem, 'SIL');
  gecmis.geriAl(sil.id, 'Ali');
  assert.equal(getRecord(T, 'b-sil').row_status, 1);
});

test('proje filtresi ve limit; getir() önce/sonra görüntüsünü verir', () => {
  putRecord(T, { ...bina('b-p2'), project_id: 'GP-2' });
  yaz('b-p2', { floors_count: 9 });
  const p2 = gecmis.listele({ projeId: 'GP-2' });
  assert.equal(p2.length, 1);
  assert.ok(gecmis.listele({ projeId: 'GP-1' }).every((e) => e.proje_id === 'GP-1'));
  assert.equal(gecmis.listele({ projeId: 'GP-1', limit: 2 }).length, 2);
  const tam = gecmis.getir(p2[0].id);
  assert.equal(tam.once.floors_count, 4); assert.equal(tam.sonra.floors_count, 9);
  assert.equal(gecmis.getir(999999), null);
});
