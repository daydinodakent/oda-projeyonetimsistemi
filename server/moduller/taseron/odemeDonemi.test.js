import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const ekip = await import('./ekip.js');
const puantajTaseron = await import('./puantajTaseron.js');
const odemeDonemi = await import('./odemeDonemi.js');
const kesinti = await import('./kesinti.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const parametre = await import('../_cekirdek/parametre.js');
const maliyetKodu = await import('../_cekirdek/maliyetKodu.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const odeme = await import('../_cekirdek/odeme.js');
const stok = await import('../depo/stok.js');
const depoSrv = await import('../depo/depo.js');
const malzemeSrv = await import('../depo/malzeme.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'IGA-ETAP-1';
putRecord('tb_wbs_gorevler', { id: 'wbs-donem-1', wbs_code: 'W1', name: 'Kalıp İşleri', row_status: 1 });
const mk = maliyetKodu.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-donem-1', kaynak_tipi: 'iscilik_taseron' });

parametre.olustur({ kod: 'taseron_fazla_mesai_carpani', ad: 'Fazla Mesai Çarpanı', deger: 1.5, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });

let vknSayaci = 7200000000;
function ekipHazirla() {
  vknSayaci += 1;
  const firma = cariFirma.olustur({ unvan: `Taşeron ${vknSayaci}`, vkn_tckn: String(vknSayaci), roller: ['taseron'] });
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Kalıp işleri', bedel_kurus: 500000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const e = ekip.olustur({ sozlesme_id: s.id, odeme_tipi: 'yevmiye' });
  return { firma, sozlesme: s, ekip: e };
}

function uyeHazirla(ekipId, yevmiyeKurus) {
  const k = kisiMod.olustur({
    ad_soyad: 'Test İşçi', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'taseron_iscisi',
    isg_egitim_tarihi: '2026-01-01', isg_egitim_gecerlilik_tarihi: '2030-01-01',
  });
  const uye = ekip.uyeEkle(ekipId, { kisi_id: k.id, baslangic_tarihi: '2026-01-01', sgk_giris_bildirge_tarihi: '2026-01-01' });
  ekip.yevmiyeTanimla(uye.id, yevmiyeKurus, '2026-01-01');
  return { kisi: k, uye };
}

test('YEVMİYE + FAZLA MESAİ + YARIM GÜN + AVANS + MALZEME KESİNTİSİ — doğru NET tutar (KABUL kriteri)', () => {
  const { firma, sozlesme: s, ekip: e } = ekipHazirla();
  const { uye } = uyeHazirla(e.id, 50000); // günlük 500 TL

  // Gün 1: tam gün -> 50.000
  puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-02-01', gun_degeri: 1, maliyet_kodu_id: mk.id });
  // Gün 2: yarım gün -> 25.000
  puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-02-02', gun_degeri: 0.5, gun_tipi: 'yarim', maliyet_kodu_id: mk.id });
  // Gün 3: tam gün + 4 saat fazla mesai -> 50.000 + (4 × 50.000/8 × 1.5) = 50.000 + 37.500 = 87.500
  puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-02-03', gun_degeri: 1, fazla_mesai_saat: 4, maliyet_kodu_id: mk.id });
  // Brüt toplam: 50.000 + 25.000 + 87.500 = 162.500

  const donem = odemeDonemi.olustur({ ekip_id: e.id, donem_baslangic: '2026-02-01', donem_bitis: '2026-02-07' });
  let guncel = odemeDonemi.hesapla(donem.id);
  assert.equal(guncel.brut_tutar_kurus, 162500);

  // Avans (manuel, sık/düzensiz).
  kesinti.ekle(donem.id, { tur: 'avans', tutar_kurus: 20000, aciklama: 'Nakit avans' });

  // Malzeme kesintisi (P4'ten otomatik).
  const depoKaydi = depoSrv.olustur({ proje_id: PROJE, ad: 'Şantiye Deposu (Taşeron Testi)', tur: 'santiye' });
  const cimento = malzemeSrv.olustur({ kod: `CIM-${vknSayaci}`, ad: 'Çimento', birim: 'torba' });
  stok.giris({ depo_id: depoKaydi.id, malzeme_id: cimento.id, miktar: 10, birim: 'torba', birim_maliyet_kurus: 1500, proje_id: PROJE });
  const mkMalzeme = maliyetKodu.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-donem-1', kaynak_tipi: 'malzeme' });
  stok.cikis({
    depo_id: depoKaydi.id, malzeme_id: cimento.id, miktar: 10, birim: 'torba', proje_id: PROJE, maliyet_kodu_id: mkMalzeme.id,
    teslim_alan_tipi: 'taseron_ekibi', kesinti_adayi_mi: true, sozlesme_id: s.id,
  }); // 10 × 1.500 = 15.000 kuruş
  kesinti.malzemeFireKesintisiEkle(donem.id, s.id);

  guncel = odemeDonemi.tutarlariYenidenHesapla(donem.id);
  assert.equal(guncel.kesintiler_toplam_kurus, 20000 + 15000);
  assert.equal(guncel.net_tutar_kurus, 162500 - 20000 - 15000, '162.500 - 20.000 (avans) - 15.000 (malzeme) = 127.500');

  // Mükerrer malzeme kesintisi eklenmemeli.
  const tekrar = kesinti.malzemeFireKesintisiEkle(donem.id, s.id);
  assert.equal(tekrar.length, 0);

  // Durum akışı + kapanış.
  odemeDonemi.durumDegistir(donem.id, 'sef_onayi');
  odemeDonemi.durumDegistir(donem.id, 'proje_muduru_onayi');
  const kapanan = odemeDonemi.durumDegistir(donem.id, 'kapandi');
  assert.equal(kapanan.durum, 'kapandi');
  assert.equal(kapanan.taahhut_dusuldu_mu, 1);

  const tumu = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'taseron_odeme_donemi' && h.kaynak_id.startsWith(`${donem.id}:`));
  const geriAlma = tumu.filter((h) => h.kaynak_id.includes('malzeme-kesinti'));
  assert.equal(geriAlma.length, 1, 'P11: taşerondan kesilen depo malzemesi TERS GERÇEKLEŞEN ile geri alınır (çift sayım önlemi)');
  assert.equal(geriAlma[0].tutar_kurus, -15000);
  const hareketler = tumu.filter((h) => !h.kaynak_id.includes('malzeme-kesinti'));
  assert.equal(hareketler.length, 3, 'her puantaj kaydı için AYRI bir GERÇEKLEŞEN satırı olmalı');
  assert.equal(hareketler.reduce((t, h) => t + h.tutar_kurus, 0), 162500);

  const talimat = odemeDonemi.odemeTalimatiOlustur(donem.id, '2026-03-15');
  assert.equal(talimat.tutar_kurus, 127500);
  assert.equal(odeme.talimatlariListele(PROJE).some((t) => t.id === talimat.id), true);
});

test('hesapla: yevmiyesi TANIMSIZ bir gün varsa hesaplama DURDURULUR (varsayım/sessiz 0 YOK)', () => {
  const { ekip: e } = ekipHazirla();
  const k = kisiMod.olustur({ ad_soyad: 'Yevmiyesiz İşçi', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'taseron_iscisi', isg_egitim_gecerlilik_tarihi: '2030-01-01' });
  const uye = ekip.uyeEkle(e.id, { kisi_id: k.id, baslangic_tarihi: '2026-01-01', sgk_giris_bildirge_tarihi: '2026-01-01' });
  // Yevmiye TANIMLANMADI.
  puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-02-10', gun_degeri: 1, maliyet_kodu_id: mk.id });
  const donem = odemeDonemi.olustur({ ekip_id: e.id, donem_baslangic: '2026-02-10', donem_bitis: '2026-02-10' });
  assert.throws(() => odemeDonemi.hesapla(donem.id), /GEÇERLİ bir yevmiye tanımlı değil/);
});

test('durumDegistir: geçersiz sıra (acik -> kapandi, ara adımlar atlanarak) reddedilir', () => {
  const { ekip: e } = ekipHazirla();
  const donem = odemeDonemi.olustur({ ekip_id: e.id, donem_baslangic: '2026-02-15', donem_bitis: '2026-02-21' });
  assert.throws(() => odemeDonemi.durumDegistir(donem.id, 'kapandi'), /Geçersiz durum geçişi/);
});

test('odemeTalimatiOlustur: yalnızca "kapandi" durumundaki dönem için oluşturulabilir', () => {
  const { ekip: e } = ekipHazirla();
  const donem = odemeDonemi.olustur({ ekip_id: e.id, donem_baslangic: '2026-02-22', donem_bitis: '2026-02-28' });
  assert.throws(() => odemeDonemi.odemeTalimatiOlustur(donem.id, '2026-03-01'), /yalnızca "kapandi" durumundaki/);
});
