import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const personel = await import('./personel.js');
const kisiMod = await import('../_cekirdek/kisi.js');

function kisiOlustur(rol = 'personel') {
  return kisiMod.olustur({ ad_soyad: 'Test Personel', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol });
}

test('olustur: rol="personel" OLMAYAN bir Kişi için personel kurulamaz', () => {
  const k = kisiOlustur('taseron_iscisi');
  assert.throws(() => personel.olustur({ kisi_id: k.id, sicil_no: 'SC-001', ise_giris_tarihi: '2026-01-01' }), /rol="personel" olan bir Kişi/);
});

test('olustur: aynı sicil no ile mükerrer kayıt engellenir', () => {
  const k1 = kisiOlustur();
  const k2 = kisiOlustur();
  personel.olustur({ kisi_id: k1.id, sicil_no: 'SC-100', ise_giris_tarihi: '2026-01-01' });
  assert.throws(() => personel.olustur({ kisi_id: k2.id, sicil_no: 'SC-100', ise_giris_tarihi: '2026-01-02' }), /zaten bir personel kaydı/);
});

test('cikisYap: soft delete + kıdem gününü hesaplar', () => {
  const k = kisiOlustur();
  const p = personel.olustur({ kisi_id: k.id, sicil_no: 'SC-200', ise_giris_tarihi: '2024-01-01' });
  const sonuc = personel.cikisYap(p.id, '2026-01-01', 'istifa');
  assert.equal(sonuc.personel.row_status, 0);
  assert.equal(sonuc.personel.cikis_nedeni, 'istifa');
  assert.ok(sonuc.kidem_gun >= 730 && sonuc.kidem_gun <= 732, `kıdem günü ~731 olmalı, geldi: ${sonuc.kidem_gun}`);
  assert.equal(personel.getir(p.id), undefined, 'pasif personel aktif listede görünmemeli');
});

test('projeyeAta: yeni atama başlarken önceki AÇIK atama otomatik kapanır (aynı anda iki aktif atama YOK)', () => {
  const k = kisiOlustur();
  const p = personel.olustur({ kisi_id: k.id, sicil_no: 'SC-300', ise_giris_tarihi: '2026-01-01' });
  personel.projeyeAta(p.id, { proje_id: 'PROJE-A', baslangic_tarihi: '2026-01-01' });
  personel.projeyeAta(p.id, { proje_id: 'PROJE-B', baslangic_tarihi: '2026-03-01' });
  const atamalar = personel.atamalariGetir(p.id);
  assert.equal(atamalar.length, 2);
  const eski = atamalar.find((a) => a.proje_id === 'PROJE-A');
  assert.equal(eski.bitis_tarihi, '2026-03-01', 'PROJE-A ataması, PROJE-B başlarken kapanmalı');
  const yeni = atamalar.find((a) => a.proje_id === 'PROJE-B');
  assert.equal(yeni.bitis_tarihi, null);
});

test('ucretGetir: yürürlük tarihli — tanımsız tarihte null döner (varsayım YOK)', () => {
  const k = kisiOlustur();
  const p = personel.olustur({ kisi_id: k.id, sicil_no: 'SC-400', ise_giris_tarihi: '2026-01-01' });
  personel.ucretTanimla(p.id, 5000000, '2026-01-01');
  assert.equal(personel.ucretGetir(p.id, '2025-12-31'), null);
  assert.equal(personel.ucretGetir(p.id, '2026-06-01').brut_maas_kurus, 5000000);
});
