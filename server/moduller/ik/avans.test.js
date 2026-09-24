import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const avans = await import('./avans.js');
const personel = await import('./personel.js');
const kisiMod = await import('../_cekirdek/kisi.js');

function personelOlustur() {
  const k = kisiMod.olustur({ ad_soyad: 'Avans Test', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'personel' });
  return personel.olustur({ kisi_id: k.id, sicil_no: `SC-${k.id}`, ise_giris_tarihi: '2026-01-01' });
}

test('onayla: taksitler EŞİT bölünür, küsurat son taksite eklenir — TOPLAM tutar BOZULMAZ', () => {
  const p = personelOlustur();
  const a = avans.talepEt({ personel_id: p.id, tutar_kurus: 100000, talep_tarihi: '2026-01-01', taksit_sayisi: 3 });
  const onaylanan = avans.onayla(a.id, 'yetkili-1');
  assert.equal(onaylanan.taksitler.length, 3);
  assert.equal(onaylanan.taksitler[0].tutar_kurus, 33333);
  assert.equal(onaylanan.taksitler[1].tutar_kurus, 33333);
  assert.equal(onaylanan.taksitler[2].tutar_kurus, 33334);
  assert.equal(onaylanan.taksitler.reduce((t, x) => t + x.tutar_kurus, 0), 100000);
});

test('bekleyenTaksitleriGetir: SALT OKUNUR — çağrılması mahsup İŞARETLEMEZ', () => {
  const p = personelOlustur();
  const a = avans.talepEt({ personel_id: p.id, tutar_kurus: 60000, talep_tarihi: '2026-01-01', taksit_sayisi: 2 });
  avans.onayla(a.id, 'yetkili-1');
  avans.bekleyenTaksitleriGetir(p.id);
  avans.bekleyenTaksitleriGetir(p.id);
  const hala = avans.bekleyenTaksitleriGetir(p.id);
  assert.equal(hala.length, 2, 'tekrar tekrar çağrılabilir olmalı (idempotent önizleme)');
});

test('taksitiMahsupEt: bir kez işaretlenince bekleyen listeden ÇIKAR', () => {
  const p = personelOlustur();
  const a = avans.talepEt({ personel_id: p.id, tutar_kurus: 40000, talep_tarihi: '2026-01-01', taksit_sayisi: 1 });
  avans.onayla(a.id, 'yetkili-1');
  const [taksit] = avans.bekleyenTaksitleriGetir(p.id);
  avans.taksitiMahsupEt(taksit.id, 999, 'yetkili-1');
  assert.equal(avans.bekleyenTaksitleriGetir(p.id).length, 0);
});

test('onayla: "talep_edildi" durumunda olmayan avans tekrar onaylanamaz', () => {
  const p = personelOlustur();
  const a = avans.talepEt({ personel_id: p.id, tutar_kurus: 10000, talep_tarihi: '2026-01-01' });
  avans.onayla(a.id, 'yetkili-1');
  assert.throws(() => avans.onayla(a.id, 'yetkili-1'), /"talep_edildi" durumunda değil/);
});
