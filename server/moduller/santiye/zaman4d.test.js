import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const z = await import('./zaman4d.js');
const isProgrami = await import('./isProgrami.js');
const { db } = await import('./db.js');
const { putRecord } = await import('../../db.js');

const P = '4D-P';
const bina = (id, proje = P) => putRecord('tb_binalar_3d', { id, project_id: proje, block_name: id, row_status: 1 });
const akt = (ad, bas, bit) => isProgrami.aktiviteEkle({ proje_id: P, ad, plan_baslangic: bas, plan_bitis: bit });
/** Test için belirli bir ZAMANDA yazılmış audit kaydı (gerçek akışta zaman=şimdi'dir). */
const auditYaz = (aktiviteId, eylem, degisiklik, zaman) =>
  db.prepare('INSERT INTO audit_log (varlik, varlik_id, eylem, degisiklik, zaman) VALUES (?, ?, ?, ?, ?)').run('is_programi_aktivite', String(aktiviteId), eylem, JSON.stringify(degisiklik), zaman);

bina('b1'); bina('b2'); bina('b3'); bina('b-yabanci', 'BASKA-P');

test('eşleme: ekle idempotent, sil çalışır; yabancı proje / olmayan bina / olmayan aktivite reddedilir', () => {
  const a = akt('Kaba yapı', '2026-01-01', '2026-03-31');
  assert.deepEqual(z.eslemeEkle(a.id, ['b1', 'b2'], null), { eklenen: 2, zaten_bagli: 0 });
  assert.deepEqual(z.eslemeEkle(a.id, ['b2', 'b3'], null), { eklenen: 1, zaten_bagli: 1 });
  assert.equal(z.eslemeListele(P).length, 3);
  assert.throws(() => z.eslemeEkle(a.id, ['b-yabanci'], null), /bu projeye ait değil/);
  assert.throws(() => z.eslemeEkle(a.id, ['yok'], null), /Bina bulunamadı/);
  assert.throws(() => z.eslemeEkle(99999, ['b1'], null), /Aktivite bulunamadı/);
  assert.throws(() => z.eslemeEkle(a.id, [], null), /En az bir bina/);
  assert.deepEqual(z.eslemeSil(a.id, ['b3', 'b3', 'yok'], null), { silinen: 1 });
  assert.equal(z.eslemeListele(P).length, 2);
});

test('ilerleme geçmişi audit_log\'dan kurulur (oluşturma + güncellemeler, tarih sıralı)', () => {
  const a = akt('Cephe', '2026-02-01', '2026-02-28');
  db.prepare("DELETE FROM audit_log WHERE varlik = 'is_programi_aktivite' AND varlik_id = ?").run(String(a.id)); // gerçek (bugünkü) kayıtları at
  auditYaz(a.id, 'OLUSTUR', { yeni: { gerceklesen_yuzde: 0 } }, '2026-02-01T08:00:00.000Z');
  auditYaz(a.id, 'GUNCELLE', { gerceklesen_yuzde: 30 }, '2026-02-10T08:00:00.000Z');
  auditYaz(a.id, 'GUNCELLE', { gerceklesen_yuzde: 70 }, '2026-02-20T08:00:00.000Z');
  assert.deepEqual(z.ilerlemeGecmisi(a.id), [{ tarih: '2026-02-01', yuzde: 0 }, { tarih: '2026-02-10', yuzde: 30 }, { tarih: '2026-02-20', yuzde: 70 }]);
  const g = z.ilerlemeGecmisi(a.id);
  assert.equal(z.gerceklesen(g, '2026-01-15', '2026-03-01'), null);  // ilk kayıttan önce: bilinmez (0 denmez)
  assert.equal(z.gerceklesen(g, '2026-02-10', '2026-03-01'), 30);    // kayıt günü dahil
  assert.equal(z.gerceklesen(g, '2026-02-15', '2026-03-01'), 30);
  assert.equal(z.gerceklesen(g, '2026-02-25', '2026-03-01'), 70);
  assert.equal(z.gerceklesen(g, '2026-03-05', '2026-03-01'), null);  // gelecek: bilinmez
  assert.equal(z.gerceklesen([], '2026-02-10', '2026-03-01'), null); // geçmişi olmayan: bilinmez (uydurulmaz)
});

test('gerçek akış: aktiviteEkle + yuzdeGuncelle audit\'e düşer → geçmişte "bugün" görünür', () => {
  const a = akt('İnce yapı', '2026-05-01', '2026-06-30');
  isProgrami.yuzdeGuncelle(a.id, 40, null);
  const g = z.ilerlemeGecmisi(a.id);
  assert.equal(g.length, 2);
  assert.deepEqual(g.map((x) => x.yuzde), [0, 40]);
  const bugun = new Date().toISOString().slice(0, 10);
  assert.equal(g[1].tarih, bugun);
});

test('binaDurumu: başlamadı / devam / tamam (plana göre), sapma ve geride_mi', () => {
  const a = { plan_baslangic: '2026-01-01', plan_bitis: '2026-01-31', gecmis: [{ tarih: '2026-01-01', yuzde: 0 }, { tarih: '2026-01-20', yuzde: 30 }] };
  const bugun = '2026-02-15';
  const once = z.binaDurumu([a], '2025-12-20', bugun);
  assert.equal(once.durum, 'baslamadi'); assert.equal(once.beklenen_yuzde, 0); assert.equal(once.gerceklesen_yuzde, null);
  const ilkGun = z.binaDurumu([a], '2026-01-01', bugun);
  assert.equal(ilkGun.gerceklesen_yuzde, 0);                     // ilk kayıt günü: bilinir (%0)
  const orta = z.binaDurumu([a], '2026-01-20', bugun);          // 19/30 gün ≈ %63,3 beklenen, gerçekleşen %30
  assert.equal(orta.durum, 'devam'); assert.equal(orta.beklenen_yuzde, 63.3); assert.equal(orta.gerceklesen_yuzde, 30);
  assert.equal(orta.sapma, -33.3); assert.equal(orta.geride_mi, true);
  const sonra = z.binaDurumu([a], '2026-02-05', bugun);
  assert.equal(sonra.durum, 'tamam'); assert.equal(sonra.beklenen_yuzde, 100); assert.equal(sonra.gerceklesen_yuzde, 30);
  const gelecek = z.binaDurumu([a], '2026-03-01', bugun);
  assert.equal(gelecek.gerceklesen_yuzde, null); assert.equal(gelecek.sapma, null); assert.equal(gelecek.geride_mi, false);
});

test('binaDurumu: birden çok aktivite süre ağırlıklı ortalanır; biri bilinmiyorsa gerçekleşen null', () => {
  const kisa = { plan_baslangic: '2026-01-01', plan_bitis: '2026-01-10', gecmis: [{ tarih: '2026-01-01', yuzde: 100 }] };   // 10 gün
  const uzun = { plan_baslangic: '2026-01-01', plan_bitis: '2026-01-30', gecmis: [{ tarih: '2026-01-01', yuzde: 0 }] };      // 30 gün
  const d = z.binaDurumu([kisa, uzun], '2026-02-01', '2026-02-10');
  assert.equal(d.beklenen_yuzde, 100);
  assert.equal(d.gerceklesen_yuzde, 25);                       // (10×100 + 30×0)/40
  assert.equal(d.baslangic, '2026-01-01'); assert.equal(d.bitis, '2026-01-30');
  const gecmissiz = { ...uzun, gecmis: [] };
  assert.equal(z.binaDurumu([kisa, gecmissiz], '2026-02-01', '2026-02-10').gerceklesen_yuzde, null);
});

test('zamanCizelgesi + durum: eşlenen aktiviteler, aralık, bağlanmamış sayısı; durum() istemci formülüyle aynı sonucu verir', () => {
  const proje = 'ZC-P';
  putRecord('tb_binalar_3d', { id: 'zc1', project_id: proje, row_status: 1 });
  putRecord('tb_binalar_3d', { id: 'zc2', project_id: proje, row_status: 1 });
  const a1 = isProgrami.aktiviteEkle({ proje_id: proje, ad: 'A1', plan_baslangic: '2026-03-01', plan_bitis: '2026-03-31' });
  const a2 = isProgrami.aktiviteEkle({ proje_id: proje, ad: 'A2', plan_baslangic: '2026-04-01', plan_bitis: '2026-04-30' });
  isProgrami.aktiviteEkle({ proje_id: proje, ad: 'Bağlanmamış', plan_baslangic: '2026-01-01', plan_bitis: '2026-12-31' });
  z.eslemeEkle(a1.id, ['zc1', 'zc2'], null); z.eslemeEkle(a2.id, ['zc2'], null);
  const zc = z.zamanCizelgesi(proje);
  assert.deepEqual(zc.aralik, { baslangic: '2026-03-01', bitis: '2026-04-30' });
  assert.equal(zc.bagli_aktivite_sayisi, 2); assert.equal(zc.baglanmamis_aktivite_sayisi, 1);
  const d = z.durum(proje, '2026-03-31');
  const b1 = d.binalar.find((b) => b.bina_id === 'zc1'), b2 = d.binalar.find((b) => b.bina_id === 'zc2');
  assert.equal(b1.durum, 'tamam');            // yalnız A1 → mart sonunda bitti
  assert.equal(b2.durum, 'devam');            // A1 bitti, A2 başlamadı → ağırlıklı ortalama < 100
  assert.ok(b2.beklenen_yuzde > 40 && b2.beklenen_yuzde < 60, `b2 beklenen ${b2.beklenen_yuzde}`);
  // durum() ile zamanCizelgesi verisinden yapılan hesap birebir aynı (istemci bu veriyi kullanır)
  const akts = zc.aktiviteler.filter((a) => a.bina_idler.includes('zc2'));
  const hesap = z.binaDurumu(akts, '2026-03-31', zc.bugun);
  const { bina_id: _b, aktivite_idler: _a, ...durumAlanlari } = b2;
  assert.deepEqual(hesap, durumAlanlari);
});
