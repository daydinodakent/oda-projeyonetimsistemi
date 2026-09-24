import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const bordroDonemi = await import('./bordroDonemi.js');
const personel = await import('./personel.js');
const pdks = await import('./pdks.js');
const avans = await import('./avans.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const maliyetKodu = await import('../_cekirdek/maliyetKodu.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const { putRecord } = await import('../../db.js');

putRecord('tb_wbs_gorevler', { id: 'wbs-ik-a', wbs_code: 'A', name: 'Şantiye A', row_status: 1 });
putRecord('tb_wbs_gorevler', { id: 'wbs-ik-b', wbs_code: 'B', name: 'Şantiye B', row_status: 1 });
const mkA = maliyetKodu.olustur({ proje_id: 'PROJE-A', wbs_gorev_id: 'wbs-ik-a', kaynak_tipi: 'iscilik_kadro' });
const mkB = maliyetKodu.olustur({ proje_id: 'PROJE-B', wbs_gorev_id: 'wbs-ik-b', kaynak_tipi: 'iscilik_kadro' });

function personelOlustur(brutMaasKurus = 3000000) {
  const k = kisiMod.olustur({ ad_soyad: 'Bordro Test', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'personel' });
  const p = personel.olustur({ kisi_id: k.id, sicil_no: `SC-${k.id}`, ise_giris_tarihi: '2025-01-01' });
  personel.ucretTanimla(p.id, brutMaasKurus, '2025-01-01');
  return p;
}

test('personelHesapla: ÇOK ŞANTİYELİ personelin maliyeti PUANTAJ ORANINA göre dağılıyor (KABUL kriteri)', () => {
  const p = personelOlustur(3000000); // aylık 30.000 TL

  // 2026-06: 10 gün PROJE-A (wbs-ik-a), 5 gün PROJE-B (wbs-ik-b) — toplam 15 çalışılan gün.
  for (let gun = 1; gun <= 10; gun++) {
    pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: `2026-06-${String(gun).padStart(2, '0')}`, yontem: 'kartli', maliyet_kodu_id: mkA.id });
  }
  for (let gun = 11; gun <= 15; gun++) {
    pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-B', tarih: `2026-06-${String(gun).padStart(2, '0')}`, yontem: 'kartli', maliyet_kodu_id: mkB.id });
  }

  const donem = bordroDonemi.olustur({ donem_yil: 2026, donem_ay: 6 });
  const satir = bordroDonemi.personelHesapla(donem.id, p.id);
  assert.equal(satir.calisilan_gun, 15);
  // Günlük ücret = 3.000.000/30 = 100.000 -> brüt hak ediş = 15 gün × 100.000 = 1.500.000
  assert.equal(satir.brut_maas_kurus, 1500000);

  const dagitimA = satir.dagitim.find((d) => d.maliyet_kodu_id === mkA.id);
  const dagitimB = satir.dagitim.find((d) => d.maliyet_kodu_id === mkB.id);
  assert.equal(dagitimA.gun_sayisi, 10);
  assert.equal(dagitimB.gun_sayisi, 5);
  // Oranlı dağıtım: A -> 1.500.000 × 10/15 = 1.000.000, B -> 1.500.000 × 5/15 = 500.000
  assert.equal(dagitimA.tutar_kurus, 1000000);
  assert.equal(dagitimB.tutar_kurus, 500000);
  assert.equal(dagitimA.tutar_kurus + dagitimB.tutar_kurus, satir.brut_maas_kurus, 'dağıtım toplamı brüt hak edişten SAPMAMALI');

  // Onaylanınca HER dağıtım satırı kendi projesine GERÇEKLEŞEN yazmalı.
  bordroDonemi.durumDegistir(donem.id, 'onaylandi');
  const hareketlerA = maliyetDefteri.projeIcinListele('PROJE-A').filter((h) => h.kaynak_modul === 'ik_bordro_donemi');
  const hareketlerB = maliyetDefteri.projeIcinListele('PROJE-B').filter((h) => h.kaynak_modul === 'ik_bordro_donemi');
  assert.equal(hareketlerA.length, 1);
  assert.equal(hareketlerA[0].tutar_kurus, 1000000);
  assert.equal(hareketlerB.length, 1);
  assert.equal(hareketlerB[0].tutar_kurus, 500000);
});

test('personelHesapla: maliyet_kodu_id OLMAYAN (WBS\'siz) puantaj günleri dağıtımda görünür ama GERÇEKLEŞEN yazılmaz', () => {
  const p = personelOlustur(3000000);
  pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-C', tarih: '2026-07-01', yontem: 'kartli' }); // maliyet_kodu_id YOK
  const donem = bordroDonemi.olustur({ donem_yil: 2026, donem_ay: 7 });
  const satir = bordroDonemi.personelHesapla(donem.id, p.id);
  const dagitilmamis = satir.dagitim.find((d) => d.maliyet_kodu_id === null);
  assert.ok(dagitilmamis, 'WBSsiz gün dağıtım önizlemesinde GÖRÜNMELİ');
  bordroDonemi.durumDegistir(donem.id, 'onaylandi');
  const hareketler = maliyetDefteri.projeIcinListele('PROJE-C').filter((h) => h.kaynak_modul === 'ik_bordro_donemi');
  assert.equal(hareketler.length, 0, 'maliyet kodu olmayan pay Maliyet Defteri\'ne YAZILMAMALI');
});

test('personelHesapla: ücreti TANIMSIZ personel için hata fırlatır', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Ücretsiz', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'personel' });
  const p = personel.olustur({ kisi_id: k.id, sicil_no: `SC-${k.id}`, ise_giris_tarihi: '2026-01-01' });
  const donem = bordroDonemi.olustur({ donem_yil: 2026, donem_ay: 8 });
  assert.throws(() => bordroDonemi.personelHesapla(donem.id, p.id), /GEÇERLİ bir ücret tanımlı değil/);
});

test('personelHesapla: onaylanmış AVANS taksiti kesinti olarak yansır, onaylanınca MAHSUP edilir', () => {
  const p = personelOlustur(3000000);
  pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-09-01', yontem: 'kartli', maliyet_kodu_id: mkA.id });
  const a = avans.talepEt({ personel_id: p.id, tutar_kurus: 200000, talep_tarihi: '2026-09-01', taksit_sayisi: 1 });
  avans.onayla(a.id, 'yetkili-1');

  const donem = bordroDonemi.olustur({ donem_yil: 2026, donem_ay: 9 });
  const satir = bordroDonemi.personelHesapla(donem.id, p.id);
  assert.equal(satir.avans_kesinti_kurus, 200000);
  assert.equal(avans.bekleyenTaksitleriGetir(p.id).length, 1, 'onaydan ÖNCE taksit hâlâ bekliyor olmalı (personelHesapla SALT OKUNUR)');

  bordroDonemi.durumDegistir(donem.id, 'onaylandi');
  assert.equal(avans.bekleyenTaksitleriGetir(p.id).length, 0, 'dönem onaylanınca taksit MAHSUP edilmeli');
});

test('durumDegistir: "acik" -> "disa_aktarildi" (ara adım atlanarak) reddedilir', () => {
  const donem = bordroDonemi.olustur({ donem_yil: 2026, donem_ay: 10 });
  assert.throws(() => bordroDonemi.durumDegistir(donem.id, 'disa_aktarildi'), /Geçersiz durum geçişi/);
});

test('olustur: aynı yıl/ay için mükerrer bordro dönemi açılamaz', () => {
  bordroDonemi.olustur({ donem_yil: 2026, donem_ay: 11 });
  assert.throws(() => bordroDonemi.olustur({ donem_yil: 2026, donem_ay: 11 }), /zaten bir bordro dönemi açılmış/);
});
