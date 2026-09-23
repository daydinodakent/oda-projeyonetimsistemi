import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const sozlesme = await import('./sozlesme.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'IGA-ETAP-1';

function taseronFirmaOlustur(vkn) {
  return cariFirma.olustur({ unvan: 'Test Taşeron Ltd.', vkn_tckn: vkn, roller: ['taseron'] });
}

test('olustur: geçersiz sözleşme tipi reddedilir', () => {
  const firma = taseronFirmaOlustur('1111111111');
  assert.throws(
    () => sozlesme.olustur({ tip: 'gecersiz', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id }),
    /Geçersiz sözleşme tipi/
  );
});

test('olustur: taraf belirtilmezse (ne firma ne kişi) reddedilir', () => {
  assert.throws(
    () => sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01' }),
    /tarafı/
  );
});

test('olustur: var olmayan firmaya referans veren sözleşme reddedilir (sahiplik doğrulaması)', () => {
  assert.throws(
    () => sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: 999999 }),
    /Firma bulunamadı/
  );
});

test('olustur: geçerli sözleşme oluşur ve versiyon 1 (orijinal) otomatik açılır', () => {
  const firma = taseronFirmaOlustur('2222222222');
  const s = sozlesme.olustur({ tip: 'taseron', alt_tip: 'metraj', proje_id: PROJE, konu: 'Kaba inşaat', bedel_kurus: 500000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  assert.equal(s.durum, 'taslak');
  assert.match(s.numara, /^SOZ-\d{4}-\d{4}$/);
  const versiyonlar = sozlesme.versiyonlariGetir(s.id);
  assert.equal(versiyonlar.length, 1);
  assert.equal(versiyonlar[0].tur, 'orijinal');
  assert.equal(versiyonlar[0].bedel_farki_kurus, 500000_00);
});

test('durumDegistir: geçersiz geçiş (taslak -> yururlukte, ara adımlar atlanarak) reddedilir', () => {
  const firma = taseronFirmaOlustur('3333333333');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  assert.throws(() => sozlesme.durumDegistir(s.id, 'yururlukte'), /Geçersiz durum geçişi/);
});

test('durumDegistir: tam akış (taslak->onayda->imzali->yururlukte->askida->yururlukte) — TAAHHÜT kaydı YALNIZCA BİR KEZ yazılır (mükerrer yok)', () => {
  const firma = taseronFirmaOlustur('4444444444');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Kaba inşaat', bedel_kurus: 300000_00, baslangic_tarihi: '2026-02-01', taraf_firma_id: firma.id });
  sozlesme.durumDegistir(s.id, 'onayda');
  const imzali = sozlesme.durumDegistir(s.id, 'imzali');
  assert.equal(imzali.taahhut_yazildi, 1);
  sozlesme.durumDegistir(s.id, 'yururlukte');
  sozlesme.durumDegistir(s.id, 'askida');
  sozlesme.durumDegistir(s.id, 'yururlukte'); // tekrar yürürlüğe dönüş — YENİDEN taahhüt yazılmamalı

  const hareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'sozlesme' && h.kaynak_id === String(s.id));
  assert.equal(hareketler.length, 1, 'yalnızca 1 TAAHHUT hareketi olmalı');
  assert.equal(hareketler[0].tur, 'TAAHHUT');
  assert.equal(hareketler[0].tutar_kurus, 300000_00);
});

test('durumDegistir: musteri_satis tipi sözleşme imzalanınca GELİR (TAAHHUT değil) yazılır', () => {
  const musteri = cariFirma.olustur({ unvan: 'Ahmet Alıcı', vkn_tckn: '5555555555', roller: ['musteri'] });
  const s = sozlesme.olustur({ tip: 'musteri_satis', alt_tip: 'kat_karsiligi', proje_id: PROJE, konu: 'Daire 12 satışı', bedel_kurus: 2000000_00, baslangic_tarihi: '2026-03-01', taraf_firma_id: musteri.id });
  sozlesme.durumDegistir(s.id, 'onayda');
  sozlesme.durumDegistir(s.id, 'imzali');
  const hareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'sozlesme' && h.kaynak_id === String(s.id));
  assert.equal(hareketler[0].tur, 'GELIR');
});

test('kalemEkle: yürürlükteki sözleşmeye DOĞRUDAN kalem eklenemez — zeyilname gerekir', () => {
  const firma = taseronFirmaOlustur('6666666666');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  sozlesme.durumDegistir(s.id, 'onayda');
  sozlesme.durumDegistir(s.id, 'imzali');
  sozlesme.durumDegistir(s.id, 'yururlukte');
  assert.throws(() => sozlesme.kalemEkle(s.id, { aciklama: 'Kalıp işi', birim: 'm2', miktar: 100, birim_fiyat_kurus: 500_00 }), /doğrudan değiştirilemez/);
});

test('kalemEkle: var olmayan WBS görevine bağlanamaz; var olana REFERANS verir (kopyalamaz)', () => {
  putRecord('tb_wbs_gorevler', { id: 'wbs-soz-1', wbs_code: 'W1', name: 'Kaba İnşaat', row_status: 1 });
  const firma = taseronFirmaOlustur('7777777777');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  assert.throws(() => sozlesme.kalemEkle(s.id, { wbs_gorev_id: 'wbs-yok', aciklama: 'x', birim: 'm2', miktar: 1, birim_fiyat_kurus: 100 }), /WBS görevi bulunamadı/);
  const kalem = sozlesme.kalemEkle(s.id, { wbs_gorev_id: 'wbs-soz-1', aciklama: 'Kalıp işi', birim: 'm2', miktar: 100, birim_fiyat_kurus: 500_00 });
  assert.equal(kalem.wbs_gorev_id, 'wbs-soz-1');
  const kalemler = sozlesme.kalemleriGetir(s.id);
  assert.equal(kalemler.length, 1);
});

test('zeyilnameOlustur: bedel farkı sözleşmenin güncel bedelini doğru günceller, kalanBedel doğru hesaplanır', () => {
  const firma = taseronFirmaOlustur('8888888888');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 100000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  sozlesme.durumDegistir(s.id, 'onayda');
  sozlesme.durumDegistir(s.id, 'imzali');

  sozlesme.zeyilnameOlustur(s.id, { bedel_farki_kurus: 25000_00, aciklama: 'İş artışı #1' });
  const sonuc = sozlesme.zeyilnameOlustur(s.id, { bedel_farki_kurus: -5000_00, aciklama: 'Kalem iptali' });

  assert.equal(sonuc.sozlesme.bedel_kurus, 120000_00, '100.000 + 25.000 - 5.000 = 120.000');
  const kb = sozlesme.kalanBedel(s.id);
  assert.equal(kb.orijinalBedelKurus, 100000_00);
  assert.equal(kb.zeyilnameToplamFarkKurus, 20000_00);
  assert.equal(kb.kalanBedelKurus, 120000_00);

  const hareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'sozlesme' && h.kaynak_id.startsWith(`${s.id}:v`));
  assert.equal(hareketler.length, 2, 'her zeyilname AYRI bir maliyet hareketi olmalı (orijinal taahhüt değiştirilmez)');
});

test('zeyilnameOlustur: sonlanmış (feshedildi) bir sözleşmeye zeyilname eklenemez', () => {
  const firma = taseronFirmaOlustur('9999999999');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  sozlesme.durumDegistir(s.id, 'onayda');
  sozlesme.durumDegistir(s.id, 'imzali');
  sozlesme.durumDegistir(s.id, 'yururlukte');
  sozlesme.durumDegistir(s.id, 'feshedildi');
  assert.throws(() => sozlesme.zeyilnameOlustur(s.id, { aciklama: 'geç kalan zeyilname' }), /Sonlanmış/);
});

test('madde + teminat: ekleme ve listeleme çalışır, geçersiz türler reddedilir', () => {
  const firma = taseronFirmaOlustur('1010101010');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  assert.throws(() => sozlesme.maddeEkle(s.id, { tur: 'gecersiz' }), /Geçersiz madde türü/);
  sozlesme.maddeEkle(s.id, { tur: 'ceza', kontrol_tarihi: '2026-06-01', aciklama: 'Günlük gecikme cezası' });
  assert.equal(sozlesme.maddeleriGetir(s.id).length, 1);

  assert.throws(() => sozlesme.teminatEkle(s.id, { tur: 'gecersiz', tutar_kurus: 100 }), /Geçersiz teminat türü/);
  const teminat = sozlesme.teminatEkle(s.id, { tur: 'teminat_mektubu', banka: 'X Bank', tutar_kurus: 50000_00, bitis_tarihi: '2026-12-31' });
  assert.equal(sozlesme.teminatlariGetir(s.id).length, 1);
  sozlesme.teminatIadeIsaretle(teminat.id, 'iade_edildi');
  const guncelTeminatlar = sozlesme.teminatlariGetir(s.id);
  assert.equal(guncelTeminatlar.length, 1, 'iade edilen teminat satırı SİLİNMEZ, yalnızca iade_durumu güncellenir');
  assert.equal(guncelTeminatlar[0].iade_durumu, 'iade_edildi');
});

test('belgeBagla: var olmayan dokümana bağlanamaz; aynı doküman iki kez bağlanamaz', () => {
  putRecord('tb_dokumanlar', { id: 'dok-soz-1', name: 'İmzalı sözleşme.pdf', row_status: 1 });
  const firma = taseronFirmaOlustur('1212121212');
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  assert.throws(() => sozlesme.belgeBagla(s.id, 'dok-yok', 'ek'), /Doküman bulunamadı/);
  sozlesme.belgeBagla(s.id, 'dok-soz-1', 'imzali_nusha');
  assert.throws(() => sozlesme.belgeBagla(s.id, 'dok-soz-1', 'ek'), /zaten bağlı/);
  assert.equal(sozlesme.belgeleriGetir(s.id).length, 1);
});

test('kritikTarihler: yakın tarihli bitiş/teminat/madde doğru sınıflandırılır, uzak tarihliler hariç tutulur', () => {
  const proje = 'KRITIK-TEST-PROJE';
  const firma = taseronFirmaOlustur('1313131313');
  const yakinTarih = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10); // 5 gün sonra -> kritik
  const uzakTarih = new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10); // çok uzak -> listeye girmez

  const s1 = sozlesme.olustur({ tip: 'taseron', proje_id: proje, konu: 'Yakın biten', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', bitis_tarihi: yakinTarih, taraf_firma_id: firma.id });
  sozlesme.olustur({ tip: 'taseron', proje_id: proje, konu: 'Uzak biten', bedel_kurus: 1000_00, baslangic_tarihi: '2026-01-01', bitis_tarihi: uzakTarih, taraf_firma_id: firma.id });

  const kritikler = sozlesme.kritikTarihler(proje);
  assert.equal(kritikler.length, 1, 'yalnızca yakın tarihli sözleşme listeye girmeli');
  assert.equal(kritikler[0].sozlesme_id, s1.id);
  assert.equal(kritikler[0].aciliyet, 'kritik');
});
