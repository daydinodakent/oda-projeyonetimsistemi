import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const gunlukRapor = await import('./gunlukRapor.js');
const cekirdekPuantaj = await import('../_cekirdek/puantaj.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const siparis = await import('../satinalma/siparis.js');
const malKabul = await import('../depo/malKabul.js');
const malzeme = await import('../depo/malzeme.js');
const depo = await import('../depo/depo.js');

const PROJE = 'IGA-SANTIYE';
const TARIH = '2026-09-10';
const tckn = () => String(Math.floor(10000000000 + Math.random() * 89999999999));

function hazirlik() {
  const firma = cariFirma.olustur({ unvan: 'Kalıpçı Taşeron A.Ş.', vkn_tckn: '9100000001', roller: ['taseron'] });
  for (let i = 0; i < 3; i++) {
    const k = kisiMod.olustur({ ad_soyad: `Usta ${i}`, tckn: tckn(), rol: 'taseron_iscisi', firma_id: firma.id });
    cekirdekPuantaj.kaydet({ proje_id: PROJE, kisi_id: k.id, tarih: TARIH, gun_degeri: 1 });
  }
  const personel = kisiMod.olustur({ ad_soyad: 'Mühendis', tckn: tckn(), rol: 'personel' });
  cekirdekPuantaj.kaydet({ proje_id: PROJE, kisi_id: personel.id, tarih: TARIH, gun_degeri: 1 });

  const tedarikci = cariFirma.olustur({ unvan: 'Beton Tedarik', vkn_tckn: '9100000002', roller: ['tedarikci'] });
  const merkez = depo.olustur({ ad: 'Merkez', tur: 'merkez' });
  const cimento = malzeme.olustur({ kod: 'CIM-GR', ad: 'Çimento', birim: 'ton' });
  const s = siparis.olustur({ proje_id: PROJE, firma_id: tedarikci.id, teslim_tarihi: TARIH });
  const kalem = siparis.kalemEkle(s.id, { malzeme_id: cimento.id, aciklama: 'Çimento', birim: 'ton', miktar: 10, birim_fiyat_kurus: 500000, kdv_orani: 20 });
  siparis.durumDegistir(s.id, 'onaylandi');
  malKabul.kaydet({ siparis_kalem_id: kalem.id, depo_id: merkez.id, gelen_miktar: 8, kabul_miktar: 8, tarih: TARIH });
}
hazirlik();

test('olustur: günlük rapor PUANTAJ ve MAL KABUL verisini OTOMATİK çeker (KABUL kriteri)', () => {
  const r = gunlukRapor.olustur(PROJE, TARIH);
  const calisan = r.bolumler.filter((b) => b.tur === 'calisan');
  assert.equal(calisan.find((b) => b.etiket === 'Taşeron: Kalıpçı Taşeron A.Ş.').otomatik_sayi, 3);
  assert.equal(calisan.find((b) => b.etiket === 'İK Personeli').otomatik_sayi, 1);
  const malz = r.bolumler.filter((b) => b.tur === 'malzeme');
  assert.equal(malz.length, 1);
  assert.equal(malz[0].otomatik_sayi, 8);
  assert.equal(malz[0].ref_modul, 'depo_mal_kabul');
});

test('olustur: aynı gün için ikinci çağrı MÜKERRER rapor açmaz', () => {
  assert.equal(gunlukRapor.olustur(PROJE, TARIH).id, gunlukRapor.olustur(PROJE, TARIH).id);
});

test('sayiDuzelt: şef düzeltmesi otomatik sayıyı EZER ama otomatik_sayi korunur; yenile düzeltilmişe dokunmaz', () => {
  const r = gunlukRapor.olustur(PROJE, TARIH);
  const tas = r.bolumler.find((b) => b.etiket.startsWith('Taşeron'));
  gunlukRapor.sayiDuzelt(tas.id, 2);
  const yeni = gunlukRapor.otomatikYenile(r.id);
  const b = yeni.bolumler.find((x) => x.etiket.startsWith('Taşeron'));
  assert.equal(b.sayi, 2);
  assert.equal(b.otomatik_sayi, 3);
  assert.equal(b.gecerli_sayi, 2);
  assert.equal(b.duzeltildi_mi, true);
  assert.equal(yeni.bolumler.filter((x) => x.etiket.startsWith('Taşeron')).length, 1, 'düzeltilmiş satır çoğalmamalı');
});

test('onayla: hava durumu olmadan onaylanamaz; onaydan sonra rapor KİLİTLENİR', () => {
  const r = gunlukRapor.olustur(PROJE, TARIH);
  assert.throws(() => gunlukRapor.onayla(r.id), /hava durumu/);
  gunlukRapor.guncelle(r.id, { hava_durumu: 'gunesli', sicaklik_c: 24, sorunlar: 'Vinç arızası' });
  gunlukRapor.bolumEkle(r.id, { tur: 'is', etiket: 'Kolon kalıbı', notes: '3. kat' });
  gunlukRapor.onayla(r.id);
  assert.throws(() => gunlukRapor.guncelle(r.id, { sorunlar: 'x' }), /Onaylanmış/);
});

test('resmiDefterTaslagiUret: iç rapordan taslak metin üretir (düzeltilmiş sayı kullanılır)', () => {
  const r = gunlukRapor.olustur(PROJE, TARIH);
  const metin = gunlukRapor.resmiDefterTaslagiUret(r.id);
  assert.match(metin, /ŞANTİYE DEFTERİ — TASLAK/);
  assert.match(metin, /Taşeron: Kalıpçı Taşeron A\.Ş\.: 2/);
  assert.match(metin, /Kolon kalıbı/);
  assert.match(metin, /Vinç arızası/);
});

test('topluKaydet: ATOMİK — aynı istemci_kayit_id tekrar gelirse mükerrer bölüm AÇMAZ; hata olursa tamamı geri alınır', () => {
  const proje = 'TOPLU-P';
  const ilk = gunlukRapor.topluKaydet({ proje_id: proje, tarih: '2026-09-11', hava_durumu: 'bulutlu', sorunlar: 'Yok', bolumler: [{ tur: 'is', etiket: 'Sıva' }], istemci_kayit_id: 'k-1' });
  assert.equal(ilk.tekrarGonderim, false);
  const tekrar = gunlukRapor.topluKaydet({ proje_id: proje, tarih: '2026-09-11', hava_durumu: 'bulutlu', bolumler: [{ tur: 'is', etiket: 'Sıva' }], istemci_kayit_id: 'k-1' });
  assert.equal(tekrar.tekrarGonderim, true);
  assert.equal(gunlukRapor.gunIcinGetir(proje, '2026-09-11').bolumler.filter((b) => b.tur === 'is').length, 1);

  assert.throws(() => gunlukRapor.topluKaydet({ proje_id: proje, tarih: '2026-09-12', hava_durumu: 'gunesli', duzeltmeler: [{ tur: 'calisan', etiket: 'Yok', sayi: 1 }], istemci_kayit_id: 'k-2' }), /Düzeltilecek bölüm bulunamadı/);
  assert.equal(gunlukRapor.gunIcinGetir(proje, '2026-09-12'), null, 'hata olunca rapor da oluşmamalı (ROLLBACK)');
});
