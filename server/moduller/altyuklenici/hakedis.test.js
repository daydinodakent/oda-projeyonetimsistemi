import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const hakedis = await import('./hakedis.js');
const evrak = await import('./evrak.js');
const kesinti = await import('./kesinti.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const parametre = await import('../_cekirdek/parametre.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const odeme = await import('../_cekirdek/odeme.js');
const stok = await import('../depo/stok.js');
const depo = await import('../depo/depo.js');
const malzeme = await import('../depo/malzeme.js');
const maliyetKoduSrv = await import('../_cekirdek/maliyetKodu.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'IGA-ETAP-1';
putRecord('tb_wbs_gorevler', { id: 'wbs-hak-1', wbs_code: 'W1', name: 'Elektrik Tesisatı', row_status: 1 });

parametre.olustur({ kod: 'altyuklenici_teminat_kesinti_yuzde', ad: 'Teminat Kesintisi', deger: 5, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });
parametre.olustur({ kod: 'altyuklenici_stopaj_yuzde', ad: 'Gelir Vergisi Stopajı', deger: 20, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });

let vknSayaci = 6000000000;
function altYukleniciFirmaOlustur() {
  vknSayaci += 1;
  return cariFirma.olustur({ unvan: `Elektrik AY ${vknSayaci}`, vkn_tckn: String(vknSayaci), roller: ['alt_yuklenici'] });
}

function altYukleniciSozlesmesiHazirla(miktar = 300) {
  const firma = altYukleniciFirmaOlustur();
  const s = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: PROJE, konu: 'Elektrik Tesisatı İşleri', bedel_kurus: miktar * 100000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const kalem = sozlesme.kalemEkle(s.id, { wbs_gorev_id: 'wbs-hak-1', aciklama: 'Elektrik tesisatı', birim: 'm', miktar, birim_fiyat_kurus: 100000 });
  return { firma, sozlesme: s, kalem };
}

test('olustur: TAŞERON tipi sözleşme için hakediş açılamaz (TANIM AYRIMI — P6 ile çakışmayı önler)', () => {
  const firma = altYukleniciFirmaOlustur();
  const taseronSozlesmesi = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Kalıp işleri', bedel_kurus: 1000000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  assert.throws(
    () => hakedis.olustur({ sozlesme_id: taseronSozlesmesi.id, donem_baslangic: '2026-01-01', donem_bitis: '2026-01-31' }),
    /yalnızca "alt_yuklenici" tipi sözleşmeler/
  );
});

test('olustur: ALT YÜKLENİCİ tipi sözleşme için hakediş no otomatik ARTAR (1, 2, 3...)', () => {
  const { sozlesme: s } = altYukleniciSozlesmesiHazirla();
  const h1 = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: '2026-01-01', donem_bitis: '2026-01-31' });
  const h2 = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: '2026-02-01', donem_bitis: '2026-02-28' });
  assert.equal(h1.hakedis_no, 1);
  assert.equal(h2.hakedis_no, 2);
  assert.match(h1.numara, /^HAK-\d{4}-\d{4}$/);
});

test('onayGir: kümülatif miktar sözleşme kalemi miktarını aşarsa UYARI döner (işlem ENGELLENMEZ)', () => {
  const { sozlesme: s, kalem } = altYukleniciSozlesmesiHazirla(50); // sözleşme miktarı yalnızca 50
  const h = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: '2026-01-01', donem_bitis: '2026-01-31' });
  const hk = hakedis.kalemEkle(h.id, kalem.id);
  hakedis.durumDegistir(h.id, 'alt_yuklenici_beyani');
  hakedis.beyanGir(hk.id, 60);
  hakedis.durumDegistir(h.id, 'santiye_onayi');
  const sonuc = hakedis.onayGir(hk.id, 60); // 60 > 50 sözleşme miktarı
  assert.ok(sonuc.uyari, 'aşım uyarısı üretilmeli');
  assert.equal(sonuc.uyari.asimMiktari, 10);
  assert.equal(sonuc.kalem.kumulatif_miktar, 60, 'işlem yine de gerçekleşmiş olmalı (engellenmedi)');
});

test('durumDegistir: geçersiz sıra (taslak -> onayli, ara adımlar atlanarak) reddedilir', () => {
  const { sozlesme: s } = altYukleniciSozlesmesiHazirla();
  const h = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: '2026-01-01', donem_bitis: '2026-01-31' });
  assert.throws(() => hakedis.durumDegistir(h.id, 'onayli'), /Geçersiz durum geçişi/);
});

test('blokaj: evrak eksikken "onayli"ya geçiş REDDEDİLİR; evrak tamamlanınca geçilebilir (KABUL kriteri)', () => {
  const { sozlesme: s, kalem } = altYukleniciSozlesmesiHazirla();
  const h = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: '2026-01-01', donem_bitis: '2026-01-31' });
  hakedis.kalemEkle(h.id, kalem.id);
  hakedis.durumDegistir(h.id, 'alt_yuklenici_beyani');
  hakedis.durumDegistir(h.id, 'santiye_onayi');
  hakedis.durumDegistir(h.id, 'teknik_ofis');

  assert.throws(() => hakedis.durumDegistir(h.id, 'onayli'), /Ödeme blokajı/);
  assert.equal(hakedis.getir(h.id).blokaj_mi, 1);

  // Evrakları tamamla.
  for (const tur of ['sgk_isyeri_sicili', 'sigorta', 'isg_uzmani_atamasi', 'calisan_listesi']) {
    evrak.ekleVeyaGuncelle(s.id, tur, { gecerlilik_baslangic: '2026-01-01', gecerlilik_bitis: '2030-01-01' });
  }
  const onaylanan = hakedis.durumDegistir(h.id, 'onayli');
  assert.equal(onaylanan.durum, 'onayli');
});

test('blokaj: yetkili gerekçeyle AŞABİLİR (audit\'e yazılır)', () => {
  const { sozlesme: s, kalem } = altYukleniciSozlesmesiHazirla();
  const h = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: '2026-01-01', donem_bitis: '2026-01-31' });
  hakedis.kalemEkle(h.id, kalem.id);
  hakedis.durumDegistir(h.id, 'alt_yuklenici_beyani');
  hakedis.durumDegistir(h.id, 'santiye_onayi');
  hakedis.durumDegistir(h.id, 'teknik_ofis');
  assert.throws(() => hakedis.durumDegistir(h.id, 'onayli'), /Ödeme blokajı/);
  assert.throws(() => hakedis.blokajiAsarakOnayla(h.id, ''), /gerekçesi zorunludur/);
  const asilan = hakedis.blokajiAsarakOnayla(h.id, 'Acil ödeme — evraklar 3 gün içinde tamamlanacak');
  assert.equal(asilan.durum, 'onayli');
  assert.equal(asilan.blokaj_asildi_mi, 1);
});

test('3 DÖNEMLİK KÜMÜLATİF HAKEDİŞ + AVANS MAHSUBU + MALZEME KESİNTİSİ + TEVKİFAT — net tutar DOĞRU (KABUL kriteri)', () => {
  const { sozlesme: s, kalem, firma } = altYukleniciSozlesmesiHazirla(300);
  // Bu sözleşme için gerekli TÜM evrakları baştan tamamla (blokaj bu testin odağı değil).
  for (const tur of ['sgk_isyeri_sicili', 'sigorta', 'isg_uzmani_atamasi', 'calisan_listesi']) {
    evrak.ekleVeyaGuncelle(s.id, tur, { gecerlilik_baslangic: '2026-01-01', gecerlilik_bitis: '2030-01-01' });
  }

  function donemIsle(donemNo, ayBaslangic, ayBitis, onayMiktari) {
    const h = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: ayBaslangic, donem_bitis: ayBitis });
    assert.equal(h.hakedis_no, donemNo);
    const hk = hakedis.kalemEkle(h.id, kalem.id);
    hakedis.durumDegistir(h.id, 'alt_yuklenici_beyani');
    hakedis.beyanGir(hk.id, onayMiktari);
    hakedis.durumDegistir(h.id, 'santiye_onayi');
    hakedis.onayGir(hk.id, onayMiktari);
    hakedis.durumDegistir(h.id, 'teknik_ofis');
    return h;
  }

  // --- Dönem 1: 100 m onaylandı → brüt 10.000.000 kuruş ---
  const h1 = donemIsle(1, '2026-01-01', '2026-01-31', 100);
  kesinti.ekle(h1.id, { tur: 'avans_mahsubu', tutar_kurus: 500000, aciklama: 'Sözleşme başlangıç avansından mahsup' });
  kesinti.parametrikKesintiEkle(h1.id, 'teminat_kesintisi', 'altyuklenici_teminat_kesinti_yuzde', 10000000, '2026-01-31');
  kesinti.parametrikKesintiEkle(h1.id, 'stopaj', 'altyuklenici_stopaj_yuzde', 10000000, '2026-01-31');
  const h1Guncel = hakedis.tutarlariYenidenHesapla(h1.id);
  // brüt 10.000.000 - avans 500.000 - teminat(%5)=500.000 - stopaj(%20)=2.000.000 = 7.000.000
  assert.equal(h1Guncel.brut_tutar_kurus, 10000000);
  assert.equal(h1Guncel.kesintiler_toplam_kurus, 500000 + 500000 + 2000000);
  assert.equal(h1Guncel.net_tutar_kurus, 7000000);
  hakedis.durumDegistir(h1.id, 'onayli');
  const odemeTalimati1 = hakedis.odemeTalimatiOlustur(h1.id, '2026-02-28');
  assert.equal(odemeTalimati1.tutar_kurus, 7000000);

  // --- Dönem 2: kümülatif 100 → 180 (80 m daha) + P4'ten MALZEME KESİNTİSİ ---
  const depoKaydi = depo.olustur({ proje_id: PROJE, ad: 'Şantiye Deposu (Hakediş Testi)', tur: 'santiye' });
  const kablo = malzeme.olustur({ kod: `KABLO-${firma.id}`, ad: 'NYA Kablo', birim: 'metre' });
  stok.giris({ depo_id: depoKaydi.id, malzeme_id: kablo.id, miktar: 1000, birim: 'metre', birim_maliyet_kurus: 1000, proje_id: PROJE });
  const mkMalzeme = maliyetKoduSrv.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-hak-1', kaynak_tipi: 'malzeme' });
  const malzemeCikisi = stok.cikis({
    depo_id: depoKaydi.id, malzeme_id: kablo.id, miktar: 200, birim: 'metre', proje_id: PROJE, maliyet_kodu_id: mkMalzeme.id,
    teslim_alan_tipi: 'alt_yuklenici', teslim_alan_firma_id: firma.id, kesinti_adayi_mi: true, sozlesme_id: s.id,
  }); // 200 × 1000 kuruş = 200.000 kuruş malzeme kesintisi adayı

  const h2 = donemIsle(2, '2026-02-01', '2026-02-28', 80);
  assert.equal(hakedis.kalemleriGetir(h2.id)[0].onceki_kumulatif_miktar, 100, 'dönem 2, dönem 1\'in ONAYLI kümülatifini devralmalı');
  const eklenenMalzemeKesintileri = kesinti.malzemeKesintisiEkle(h2.id, s.id);
  assert.equal(eklenenMalzemeKesintileri.length, 1);
  assert.equal(eklenenMalzemeKesintileri[0].tutar_kurus, malzemeCikisi.kayit.toplam_maliyet_kurus);
  const h2Guncel = hakedis.tutarlariYenidenHesapla(h2.id);
  // brüt: 80 × 100.000 = 8.000.000; kesinti: yalnızca malzeme kesintisi (200.000)
  assert.equal(h2Guncel.brut_tutar_kurus, 8000000);
  assert.equal(h2Guncel.kesintiler_toplam_kurus, 200000);
  assert.equal(h2Guncel.net_tutar_kurus, 7800000);
  hakedis.durumDegistir(h2.id, 'onayli');
  const odemeTalimati2 = hakedis.odemeTalimatiOlustur(h2.id, '2026-03-31');
  assert.equal(odemeTalimati2.tutar_kurus, 7800000);

  // AYNI malzeme kesintisi bir daha eklenmemeli (mükerrer önleme).
  const tekrarDenemesi = kesinti.malzemeKesintisiEkle(h2.id, s.id);
  assert.equal(tekrarDenemesi.length, 0);

  // --- Dönem 3: kümülatif 180 → 300 (120 m daha, sözleşme miktarına TAM ulaşır — aşım YOK) ---
  const h3 = donemIsle(3, '2026-03-01', '2026-03-31', 120);
  assert.equal(hakedis.kalemleriGetir(h3.id)[0].onceki_kumulatif_miktar, 180);
  assert.equal(hakedis.kalemleriGetir(h3.id)[0].kumulatif_miktar, 300);
  const h3Guncel = hakedis.tutarlariYenidenHesapla(h3.id);
  assert.equal(h3Guncel.brut_tutar_kurus, 12000000, '120 × 100.000');
  assert.equal(h3Guncel.net_tutar_kurus, 12000000, 'bu dönem kesinti eklenmedi');
  hakedis.durumDegistir(h3.id, 'onayli');

  // --- Maliyet Defteri: HER dönem için AYRI, mükerrer OLMAYAN GERÇEKLEŞEN kayıtları ---
  const tumHareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'altyuklenici_hakedis');
  const hareketler = tumHareketler.filter((h) => !h.kaynak_id.includes('malzeme-kesinti'));
  assert.equal(hareketler.length, 3, 'her onaylı hakediş İÇİN TEK bir GERÇEKLEŞEN kaydı olmalı');
  assert.equal(hareketler.reduce((t, h) => t + h.tutar_kurus, 0), 10000000 + 8000000 + 12000000);
  // P11: hakedişten kesilen depo malzemesi (çift sayım önlemi) TERS GERÇEKLEŞEN satırıyla geri alınır
  const geriAlma = tumHareketler.filter((h) => h.kaynak_id.includes('malzeme-kesinti'));
  assert.equal(geriAlma.length, 1);
  assert.ok(geriAlma[0].tutar_kurus < 0);

  // --- Çekirdek Ödeme Talimatları listede görünüyor mu ---
  assert.equal(odeme.talimatlariListele(PROJE).filter((t) => t.id === odemeTalimati1.id || t.id === odemeTalimati2.id).length, 2);
});
