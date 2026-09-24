import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const pdks = await import('./pdks.js');
const personel = await import('./personel.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const parametre = await import('../_cekirdek/parametre.js');
const cekirdekPuantaj = await import('../_cekirdek/puantaj.js');

function personelOlustur(biyometrikRiza = false) {
  const k = kisiMod.olustur({ ad_soyad: 'PDKS Test', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'personel' });
  return personel.olustur({ kisi_id: k.id, sicil_no: `SC-${k.id}`, ise_giris_tarihi: '2026-01-01', biyometrik_riza_verildi_mi: biyometrikRiza });
}

test('kaydet: AÇIK RIZASI olmayan personel için biyometrik yöntem REDDEDİLİR (KVKK)', () => {
  const p = personelOlustur(false);
  assert.throws(
    () => pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-02-01', yontem: 'biyometrik', giris_saati: '08:00' }),
    /AÇIK RIZA vermemiş/,
  );
});

test('kaydet: AÇIK RIZASI olan personel için biyometrik yöntem kabul edilir', () => {
  const p = personelOlustur(true);
  const sonuc = pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-02-01', yontem: 'biyometrik', giris_saati: '08:00' });
  assert.equal(sonuc.pdks.yontem, 'biyometrik');
});

test('kaydet: Çekirdek çift-puantaj engeli PDKS üzerinden de geçerli (aynı kişi aynı gün iki proje)', () => {
  const p = personelOlustur();
  pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-02-05', yontem: 'kartli' });
  assert.throws(
    () => pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-B', tarih: '2026-02-05', yontem: 'kartli' }),
    /aynı gün iki yere puantaj alamaz/,
  );
});

test('kaydet: yıllık fazla mesai limiti aşılırsa yetkili onayı olmadan reddedilir, onayla kabul edilir', () => {
  parametre.olustur({ kod: 'ik_fazla_mesai_yillik_limit_saat', ad: 'Yıllık FM Limiti', deger: 10, birim: 'sabit_kurus', gecerli_baslangic: '2020-01-01' });
  const p = personelOlustur();
  pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-03-01', yontem: 'kartli', fazla_mesai_saat: 8 });
  assert.throws(
    () => pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-03-02', yontem: 'kartli', fazla_mesai_saat: 5 }),
    /Yıllık fazla mesai limiti aşılıyor/,
  );
  const sonuc = pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-03-02', yontem: 'kartli', fazla_mesai_saat: 5, yetkiliOnayi: true, gerekce: 'Acil teslim' });
  assert.equal(sonuc.fazla_mesai_saat, 5);
});

test('projeGunuIcindekiler: giriş yapıp ÇIKIŞ yapmayanlar "içeride" sayılır', () => {
  const p1 = personelOlustur();
  const p2 = personelOlustur();
  pdks.kaydet({ personel_id: p1.id, proje_id: 'PROJE-ICERIDE', tarih: '2026-04-01', yontem: 'kartli', giris_saati: '08:00' });
  pdks.kaydet({ personel_id: p2.id, proje_id: 'PROJE-ICERIDE', tarih: '2026-04-01', yontem: 'kartli', giris_saati: '08:00', cikis_saati: '17:00' });
  const icindekiler = pdks.projeGunuIcindekiler('PROJE-ICERIDE', '2026-04-01');
  assert.equal(icindekiler.length, 1);
});

test('duzelt: onaylayan olmadan düzeltme yapılamaz; ESKİ kayıt iptal edilir + YENİ onaylı kayıt açılır', () => {
  const p = personelOlustur();
  const ilk = pdks.kaydet({ personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-05-01', yontem: 'kartli', gun_degeri: 0.5 });
  assert.throws(() => pdks.duzelt(ilk.id, { personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-05-01', gun_degeri: 1 }, null), /yetkili onayı olmadan/);
  const duzeltilen = pdks.duzelt(ilk.id, { personel_id: p.id, proje_id: 'PROJE-A', tarih: '2026-05-01', gun_degeri: 1 }, 'sef-1');
  assert.equal(duzeltilen.gun_degeri, 1);
  const eski = cekirdekPuantaj.kisiGunGetir(p.kisi_id, '2026-05-01');
  assert.equal(eski.id, duzeltilen.id, 'eski kayıt pasife alındığından o günün TEK aktif kaydı yeni (düzeltilmiş) kayıt olmalı');
});
