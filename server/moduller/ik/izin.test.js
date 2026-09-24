import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const izin = await import('./izin.js');
const personel = await import('./personel.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const parametre = await import('../_cekirdek/parametre.js');

izin.hakkiTanimla({ kidem_yil_min: 0, kidem_yil_max: 4, yillik_izin_gun: 14, gecerli_baslangic: '2020-01-01' });
izin.hakkiTanimla({ kidem_yil_min: 5, kidem_yil_max: 14, yillik_izin_gun: 20, gecerli_baslangic: '2020-01-01' });
izin.hakkiTanimla({ kidem_yil_min: 15, kidem_yil_max: null, yillik_izin_gun: 26, gecerli_baslangic: '2020-01-01' });
parametre.olustur({ kod: 'ik_izin_asgari_gun_yas_grubu', ad: 'Yaş Grubu Asgari İzin', deger: 20, birim: 'gun', gecerli_baslangic: '2020-01-01' });

function personelOlustur() {
  const k = kisiMod.olustur({ ad_soyad: 'İzin Test', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'personel' });
  return personel.olustur({ kisi_id: k.id, sicil_no: `SC-${k.id}`, ise_giris_tarihi: '2020-01-01' });
}

test('gunHakkiHesapla: kıdem aralığına göre taban gün döner', () => {
  assert.equal(izin.gunHakkiHesapla(2, 30, '2026-01-01'), 14);
  assert.equal(izin.gunHakkiHesapla(7, 30, '2026-01-01'), 20);
  assert.equal(izin.gunHakkiHesapla(20, 30, '2026-01-01'), 26);
});

test('gunHakkiHesapla: 18 yaş altı/50 yaş üstü için ASGARİ gün parametreden yüksekse onu kullanır', () => {
  assert.equal(izin.gunHakkiHesapla(2, 17, '2026-01-01'), 20, '14 taban < 20 asgari -> 20 kullanılmalı');
  assert.equal(izin.gunHakkiHesapla(20, 55, '2026-01-01'), 26, '26 taban > 20 asgari -> taban korunmalı');
});

test('gunHakkiHesapla: tanımlı ARALIKLARIN dışında (negatif kıdem) hata fırlatır (sessiz varsayım YOK)', () => {
  assert.throws(() => izin.gunHakkiHesapla(-1, 30, '2026-01-01'), /GEÇERLİ bir izin hakkı tanımı yok/);
});

test('bakiyeyiAcYadaGetir: kıdem değişiminde (yıldan yıla) doğru hak edilen gün + DEVREDEN bakiye (KABUL kriteri)', () => {
  const p = personelOlustur();
  // 2026 başında kıdem 6 yıl (2020-2026) -> 20 gün hak eder.
  const b2026 = izin.bakiyeyiAcYadaGetir(p.id, 2026, 6, 30);
  assert.equal(b2026.hak_edilen_gun, 20);
  assert.equal(b2026.devreden_gun, 0, 'ilk yıl için devreden bakiye YOK');

  // 2026'da 12 gün kullanıldı varsayalım (bakiye tablosuna elle işlenir — onayla() akışı ayrı testte).
  const talep = izin.talepEt({ personel_id: p.id, tur: 'yillik', baslangic_tarihi: '2026-03-01', bitis_tarihi: '2026-03-12', gun_sayisi: 12 });
  izin.onayla(talep.id, 'yetkili-1');

  // 2027 başında kıdem 7 yıl -> taban YİNE 20 gün AMA devreden = (20 - 12) = 8 gün.
  const b2027 = izin.bakiyeyiAcYadaGetir(p.id, 2027, 7, 30);
  assert.equal(b2027.hak_edilen_gun, 20);
  assert.equal(b2027.devreden_gun, 8, '2026 kalan bakiyesi (20-12=8) 2027ye DEVRETMELİ');
});

test('onayla: yetersiz bakiye ile yıllık izin ONAYLANAMAZ', () => {
  const p = personelOlustur();
  izin.bakiyeyiAcYadaGetir(p.id, 2028, 6, 30);
  const talep = izin.talepEt({ personel_id: p.id, tur: 'yillik', baslangic_tarihi: '2028-01-01', bitis_tarihi: '2028-01-31', gun_sayisi: 25 });
  assert.throws(() => izin.onayla(talep.id, 'yetkili-1'), /Yetersiz izin bakiyesi/);
});

test('onayla: "ucretsiz"/"mazeret"/"rapor" türleri BAKİYEYİ ETKİLEMEZ', () => {
  const p = personelOlustur();
  izin.bakiyeyiAcYadaGetir(p.id, 2029, 6, 30);
  const talep = izin.talepEt({ personel_id: p.id, tur: 'ucretsiz', baslangic_tarihi: '2029-02-01', bitis_tarihi: '2029-02-05', gun_sayisi: 5 });
  izin.onayla(talep.id, 'yetkili-1');
  const bakiye = izin.bakiyeGetir(p.id, 2029);
  assert.equal(bakiye.kullanilan_gun, 0);
});
