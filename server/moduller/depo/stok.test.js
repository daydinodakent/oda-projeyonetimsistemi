import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const stok = await import('./stok.js');
const malzeme = await import('./malzeme.js');
const depo = await import('./depo.js');
const maliyetKodu = await import('../_cekirdek/maliyetKodu.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'IGA-ETAP-1';
const santiyeDeposu = depo.olustur({ proje_id: PROJE, ad: 'Şantiye Deposu', tur: 'santiye' });

putRecord('tb_wbs_gorevler', { id: 'wbs-stok-1', wbs_code: 'W1', name: 'Kaba İnşaat', row_status: 1 });
const kalıpMaliyetKodu = maliyetKodu.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-stok-1', kaynak_tipi: 'malzeme' });

test('giris + cikis: BİRİM DÖNÜŞÜMLÜ giriş-çıkış sonrası stok ve maliyet DOĞRU (KABUL kriteri)', () => {
  const cimento = malzeme.olustur({ kod: 'CIM-STOK-1', ad: 'Çimento 42.5R', birim: 'ton' });
  malzeme.birimDonusumTanimla(cimento.id, 'torba', 0.05); // 1 torba = 50 kg = 0.05 ton

  // 20 torba, torba başına 10.000 kuruş -> 1 ton, ton başına 200.000 kuruş.
  const girisSonucu = stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: cimento.id, miktar: 20, birim: 'torba', birim_maliyet_kurus: 10000, proje_id: PROJE });
  assert.equal(girisSonucu.kayit.miktar, 1, '20 torba × 0,05 = 1 ton (ana birime çevrilmiş)');
  assert.equal(girisSonucu.kayit.birim_maliyet_kurus, 200000, '(20×10.000) / 1 ton = 200.000 kuruş/ton');

  const bakiyeGiristen = stok.bakiyeGetir(santiyeDeposu.id, cimento.id);
  assert.equal(bakiyeGiristen.mevcut_miktar, 1);
  assert.equal(bakiyeGiristen.agirlikli_ortalama_maliyet_kurus, 200000);

  const cikisSonucu = stok.cikis({
    depo_id: santiyeDeposu.id, malzeme_id: cimento.id, miktar: 0.4, birim: 'ton', proje_id: PROJE,
    maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'personel', teslim_alan_aciklama: 'Ahmet Usta',
  });
  assert.equal(cikisSonucu.kayit.toplam_maliyet_kurus, 80000, '0,4 ton × 200.000 = 80.000 kuruş');

  const bakiyeCikistan = stok.bakiyeGetir(santiyeDeposu.id, cimento.id);
  assert.equal(bakiyeCikistan.mevcut_miktar, 0.6);
  assert.equal(bakiyeCikistan.agirlikli_ortalama_maliyet_kurus, 200000, 'çıkışta ağırlıklı ortalama DEĞİŞMEZ');

  const hareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'depo_stok_hareketi' && h.kaynak_id === String(cikisSonucu.kayit.id));
  assert.equal(hareketler.length, 1);
  assert.equal(hareketler[0].tur, 'GERCEKLESEN');
  assert.equal(hareketler[0].tutar_kurus, 80000);
});

test('giris: ikinci giriş FARKLI fiyatla gelirse ağırlıklı ortalama DOĞRU yeniden hesaplanır', () => {
  const demir = malzeme.olustur({ kod: 'DEMIR-AGIRLIKLI', ad: 'Demir 8mm', birim: 'ton' });
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: demir.id, miktar: 2, birim: 'ton', birim_maliyet_kurus: 100000, proje_id: PROJE }); // 2 ton @ 100.000
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: demir.id, miktar: 3, birim: 'ton', birim_maliyet_kurus: 150000, proje_id: PROJE }); // 3 ton @ 150.000
  // Ağırlıklı ortalama: (2×100.000 + 3×150.000) / 5 = 130.000
  const bakiye = stok.bakiyeGetir(santiyeDeposu.id, demir.id);
  assert.equal(bakiye.mevcut_miktar, 5);
  assert.equal(bakiye.agirlikli_ortalama_maliyet_kurus, 130000);
});

test('cikis: yetersiz stokta NEGATİF STOK ENGELİ vardır; yetkili onayıyla (negatifStokOnayi) aşılabilir', () => {
  const kum = malzeme.olustur({ kod: 'KUM-NEGATIF', ad: 'Kum', birim: 'm3' });
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: kum.id, miktar: 5, birim: 'm3', birim_maliyet_kurus: 20000, proje_id: PROJE });
  assert.throws(
    () => stok.cikis({ depo_id: santiyeDeposu.id, malzeme_id: kum.id, miktar: 10, birim: 'm3', proje_id: PROJE, maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'sarf' }),
    /Yetersiz stok/
  );
  const zorlaCikis = stok.cikis({
    depo_id: santiyeDeposu.id, malzeme_id: kum.id, miktar: 10, birim: 'm3', proje_id: PROJE,
    maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'sarf', negatifStokOnayi: true,
  });
  assert.equal(zorlaCikis.tekrarGonderim, false);
  assert.equal(stok.bakiyeGetir(santiyeDeposu.id, kum.id).mevcut_miktar, -5);
});

test('cikis: EMANET stok Maliyet Defteri\'ne HİÇ GİRMEZ (KABUL kriteri)', () => {
  const emanetMalzeme = malzeme.olustur({ kod: 'EMANET-1', ad: 'Müşteri Malı Fayans', birim: 'm2' });
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: emanetMalzeme.id, miktar: 100, birim: 'm2', birim_maliyet_kurus: 5000, proje_id: PROJE, emanet_mi: true });
  const cikisSonucu = stok.cikis({
    depo_id: santiyeDeposu.id, malzeme_id: emanetMalzeme.id, miktar: 50, birim: 'm2', proje_id: PROJE,
    maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'sarf', emanet_mi: true,
  });
  const hareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'depo_stok_hareketi' && h.kaynak_id === String(cikisSonucu.kayit.id));
  assert.equal(hareketler.length, 0, 'emanet çıkışı Maliyet Defteri\'ne YAZILMAMALI');
});

test('cikis: ÇEVRİMDIŞI kuyruktan senkronda AYNI istemci_kayit_id İKİNCİ kez gönderilirse MÜKERRER hareket/stok düşümü OLUŞMAZ (KABUL kriteri)', () => {
  const tugla = malzeme.olustur({ kod: 'TUGLA-COKLU', ad: 'Tuğla', birim: 'adet' });
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: tugla.id, miktar: 1000, birim: 'adet', birim_maliyet_kurus: 300, proje_id: PROJE });
  const istemciKayitId = crypto.randomUUID();
  const ilk = stok.cikis({
    depo_id: santiyeDeposu.id, malzeme_id: tugla.id, miktar: 200, birim: 'adet', proje_id: PROJE,
    maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'sarf', istemci_kayit_id: istemciKayitId,
  });
  assert.equal(ilk.tekrarGonderim, false);
  const bakiyeIlkSonrasi = stok.bakiyeGetir(santiyeDeposu.id, tugla.id).mevcut_miktar;

  const ikinci = stok.cikis({
    depo_id: santiyeDeposu.id, malzeme_id: tugla.id, miktar: 200, birim: 'adet', proje_id: PROJE,
    maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'sarf', istemci_kayit_id: istemciKayitId,
  });
  assert.equal(ikinci.tekrarGonderim, true);
  assert.equal(ikinci.kayit.id, ilk.kayit.id);
  assert.equal(stok.bakiyeGetir(santiyeDeposu.id, tugla.id).mevcut_miktar, bakiyeIlkSonrasi, 'stok bakiyesi İKİNCİ kez DÜŞMEMELİ');
});

test('cikis: maliyet_kodu_id veya teslim_alan_tipi eksikse reddedilir ("kime/hangi iş için" zorunlu)', () => {
  const m = malzeme.olustur({ kod: 'ZORUNLU-ALAN', ad: 'Test Malzeme', birim: 'adet' });
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: m.id, miktar: 10, birim: 'adet', birim_maliyet_kurus: 100, proje_id: PROJE });
  assert.throws(() => stok.cikis({ depo_id: santiyeDeposu.id, malzeme_id: m.id, miktar: 1, birim: 'adet', proje_id: PROJE, teslim_alan_tipi: 'sarf' }), /maliyet_kodu_id/);
  assert.throws(() => stok.cikis({ depo_id: santiyeDeposu.id, malzeme_id: m.id, miktar: 1, birim: 'adet', proje_id: PROJE, maliyet_kodu_id: kalıpMaliyetKodu.id }), /teslim_alan_tipi/);
});

test('cikis: min stok altına düşünce Satın Alma\'ya OTOMATİK talep taslağı açılır; tekrar düşüşte TEKRAR açılmaz', async () => {
  const talep = await import('../satinalma/talep.js');
  const az = malzeme.olustur({ kod: 'MIN-STOK-1', ad: 'Az Kalan Malzeme', birim: 'adet', min_stok: 5 });
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: az.id, miktar: 10, birim: 'adet', birim_maliyet_kurus: 100, proje_id: PROJE });
  stok.cikis({ depo_id: santiyeDeposu.id, malzeme_id: az.id, miktar: 7, birim: 'adet', proje_id: PROJE, maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'sarf' }); // 3 kaldı, min 5 altı
  assert.equal(talep.acikOtomatikTalepVarMi(PROJE, az.id), true);

  const talepSayisiOnce = talep.listele(PROJE).length;
  stok.cikis({ depo_id: santiyeDeposu.id, malzeme_id: az.id, miktar: 1, birim: 'adet', proje_id: PROJE, maliyet_kodu_id: kalıpMaliyetKodu.id, teslim_alan_tipi: 'sarf', negatifStokOnayi: true });
  assert.equal(talep.listele(PROJE).length, talepSayisiOnce, 'zaten açık bir otomatik talep varken TEKRAR oluşturulmamalı');
});

test('transfer: kaynak depodan düşer, "yolda" durumunda hedef depoya HENÜZ eklenmez; teslim alınca hedef depoya eklenir', () => {
  const merkezDepo = depo.olustur({ ad: 'Merkez Depo', tur: 'merkez' });
  const kirec = malzeme.olustur({ kod: 'KIREC-TRANSFER', ad: 'Kireç', birim: 'ton' });
  stok.giris({ depo_id: merkezDepo.id, malzeme_id: kirec.id, miktar: 10, birim: 'ton', birim_maliyet_kurus: 400000, proje_id: PROJE });

  const transfer = stok.transferBaslat({ kaynak_depo_id: merkezDepo.id, hedef_depo_id: santiyeDeposu.id, malzeme_id: kirec.id, miktar: 3, birim: 'ton', proje_id: PROJE });
  assert.equal(transfer.durum, 'yolda');
  assert.equal(stok.bakiyeGetir(merkezDepo.id, kirec.id).mevcut_miktar, 7, 'kaynak depodan HEMEN düşer');
  assert.equal(stok.bakiyeGetir(santiyeDeposu.id, kirec.id).mevcut_miktar, 0, 'hedef depoya HENÜZ eklenmedi — yoldaki stok');

  const tamamlanan = stok.transferTeslimAl(transfer.id);
  assert.equal(tamamlanan.durum, 'tamamlandi');
  assert.equal(stok.bakiyeGetir(santiyeDeposu.id, kirec.id).mevcut_miktar, 3, 'teslim alınınca hedef depoya eklenir');
});

test('sayim: fark varsa stok_bakiye sayılan değere düzelir ve bir sayim_farki hareketi eklenir', () => {
  const civi = malzeme.olustur({ kod: 'CIVI-SAYIM', ad: 'Çivi', birim: 'kg' });
  stok.giris({ depo_id: santiyeDeposu.id, malzeme_id: civi.id, miktar: 100, birim: 'kg', birim_maliyet_kurus: 1000, proje_id: PROJE });

  const sayim = stok.sayimBaslat(santiyeDeposu.id, '2026-12-01');
  stok.sayimKalemGir(sayim.id, civi.id, 92); // 8 kg eksik çıktı
  const sonuc = stok.sayimTamamla(sayim.id);

  assert.equal(sonuc.farklar.length, 1);
  assert.equal(sonuc.farklar[0].fark, -8);
  assert.equal(stok.bakiyeGetir(santiyeDeposu.id, civi.id).mevcut_miktar, 92);

  const gecmis = stok.hareketGecmisi(santiyeDeposu.id, civi.id);
  assert.equal(gecmis.some((h) => h.tur === 'sayim_farki' && h.miktar === -8), true);
});
