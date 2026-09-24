import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const gorev = await import('./gorev.js');
const kalite = await import('./kalite.js');
const isg = await import('./isg.js');
const ekipman = await import('./ekipman.js');
const isProgrami = await import('./isProgrami.js');
const geojson = await import('./geojson.js');
const pano = await import('./pano.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const belge = await import('../_cekirdek/belge.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const maliyetKodu = await import('../_cekirdek/maliyetKodu.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const ilerleme = await import('../altyuklenici/ilerleme.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'IGA-SANTIYE-2';
const tckn = () => String(Math.floor(10000000000 + Math.random() * 89999999999));
putRecord('tb_wbs_gorevler', { id: 'wbs-s-1', wbs_code: 'W1', name: 'Kaba İnşaat', row_status: 1 });
putRecord('tb_wbs_gorevler', { id: 'wbs-s-2', wbs_code: 'W2', name: 'Makine', row_status: 1 });

test('gorev: fotoğrafsız KAPATILAMAZ; kapat yalnızca foto ile; sorumlu doğrulanır', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Sorumlu', tckn: tckn(), rol: 'personel' });
  const g = gorev.olustur({ proje_id: PROJE, baslik: 'Korkuluk tamamla', sorumlu_tipi: 'kisi', sorumlu_id: k.id, wbs_gorev_id: 'wbs-s-1', konum_blok: 'A', konum_kat: '3', lat: 41.01, lon: 28.97, son_tarih: '2026-09-15' });
  assert.throws(() => gorev.kapat(g.id, ''), /fotoğraf zorunludur/);
  assert.throws(() => gorev.durumDegistir(g.id, 'kapali'), /fotoğraflı kapanışla/);
  assert.equal(gorev.durumDegistir(g.id, 'devam').durum, 'devam');
  assert.equal(gorev.kapat(g.id, 'foto.jpg').durum, 'kapali');
  assert.throws(() => gorev.olustur({ proje_id: PROJE, baslik: 'x', sorumlu_tipi: 'kisi', sorumlu_id: 99999 }), /bulunamadı/);
  assert.throws(() => gorev.olustur({ proje_id: PROJE, baslik: 'x', sorumlu_tipi: 'kisi', sorumlu_id: k.id, wbs_gorev_id: 'yok' }), /WBS görevi bulunamadı/);
});

test('ekipman: KİRALIK çalışma kaydı, KİRA SÖZLEŞMESİ birim fiyatından Maliyet Defteri GERÇEKLEŞEN yazar (makine/ekipman)', () => {
  const firma = cariFirma.olustur({ unvan: 'Kiralama A.Ş.', vkn_tckn: '9300000001', roller: ['tedarikci'] });
  const s = sozlesme.olustur({ tip: 'kira', proje_id: PROJE, konu: 'Ekskavatör kirası', bedel_kurus: 10000000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  sozlesme.kalemEkle(s.id, { aciklama: 'Ekskavatör saatlik', birim: 'saat', miktar: 200, birim_fiyat_kurus: 150000 });
  const mk = maliyetKodu.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-s-2', kaynak_tipi: 'makine_ekipman' });
  const e = ekipman.olustur({ proje_id: PROJE, ad: 'Ekskavatör 320', sahiplik: 'kiralik', kira_sozlesme_id: s.id });
  const op = kisiMod.olustur({ ad_soyad: 'Operatör', tckn: tckn(), rol: 'personel' });

  const r = ekipman.calismaKaydet({ ekipman_id: e.id, tarih: '2026-09-10', calisma_saat: 8, yakit_litre: 120, operator_kisi_id: op.id, maliyet_kodu_id: mk.id, istemci_kayit_id: 'abc-1' });
  assert.equal(r.kayit.tutar_kurus, 1200000, '8 saat × 1.500 TL');
  assert.ok(r.uyarilar.some((u) => u.includes('SRC')), 'operatör belgesi yok uyarısı');
  const h = maliyetDefteri.projeIcinListele(PROJE).filter((x) => x.kaynak_modul === 'santiye_ekipman_calisma');
  assert.equal(h.length, 1);
  assert.equal(h[0].tur, 'GERCEKLESEN');
  assert.equal(h[0].tutar_kurus, 1200000);
  assert.equal(ekipman.getir(e.id).sayac_saat, 8);

  // çevrimdışı tekrar gönderim mükerrer AÇMAZ
  assert.equal(ekipman.calismaKaydet({ ekipman_id: e.id, tarih: '2026-09-10', calisma_saat: 8, istemci_kayit_id: 'abc-1', maliyet_kodu_id: mk.id }).tekrarGonderim, true);
  assert.equal(maliyetDefteri.projeIcinListele(PROJE).filter((x) => x.kaynak_modul === 'santiye_ekipman_calisma').length, 1);

  // geçerli SRC belgesi varsa uyarı kalkar
  belge.olustur({ ilgili_tip: 'kisi', ilgili_id: op.id, tur: 'src_operator', dosya_adi: 'src.pdf', gecerlilik_bitis: '2030-01-01' });
  assert.equal(ekipman.operatorBelgesiUyarisi(op.id, '2026-09-10'), null);
});

test('ekipman: kiralık için kira sözleşmesi zorunlu; yanlış kaynak tipli maliyet kodu reddedilir', () => {
  assert.throws(() => ekipman.olustur({ proje_id: PROJE, ad: 'X', sahiplik: 'kiralik' }), /kira/);
  const e = ekipman.olustur({ proje_id: PROJE, ad: 'Öz Vinç', sahiplik: 'oz_mal', ozmal_saat_maliyeti_kurus: 50000 });
  const mkYanlis = maliyetKodu.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-s-1', kaynak_tipi: 'malzeme' });
  assert.throws(() => ekipman.calismaKaydet({ ekipman_id: e.id, tarih: '2026-09-10', calisma_saat: 2, maliyet_kodu_id: mkYanlis.id }), /makine_ekipman/);
});

test('isProgrami: CSV içe aktarım (GG.AA.YYYY, ; ayırıcı) + hatalı satır listesi + beklenen yüzde', () => {
  const csv = 'Ad;Başlangıç;Bitiş;Yüzde;WBS\nTemel;01.09.2026;30.09.2026;40;wbs-s-1\nKaba;01.10.2026;31.10.2026;0\nBozuk;yok;yok';
  const r = isProgrami.csvIceAktar(PROJE, csv);
  assert.equal(r.eklenen, 2);
  assert.equal(r.hatalar.length, 1);
  const temel = isProgrami.listele(PROJE).find((a) => a.ad === 'Temel');
  assert.equal(isProgrami.beklenenYuzde(temel, '2026-09-16'), 51.7, '15 gün / 29 günlük plan aralığı');
  assert.equal(isProgrami.beklenenYuzde(temel, '2026-10-05'), 100);
});

test('planGerceklesen: P5 alt yüklenici ilerlemesiyle ÇELİŞKİ uyarısı (tek doğru: şantiye onaylı ilerleme)', () => {
  const firma = cariFirma.olustur({ unvan: 'AY Çelişki', vkn_tckn: '9300000002', roller: ['alt_yuklenici'] });
  const s = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: PROJE, konu: 'Temel', bedel_kurus: 100000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  ilerleme.kaydet(s.id, { wbs_gorev_id: 'wbs-s-1', tarih: '2026-09-15', planlanan_yuzde: 50, gerceklesen_yuzde: 75 }); // şantiye %40 diyor, P5 %75
  const plan = isProgrami.planGerceklesen(PROJE, '2026-09-16');
  const temel = plan.satirlar.find((a) => a.ad === 'Temel');
  assert.ok(temel.celiski);
  assert.match(temel.celiski.mesaj, /Tek doğru: şantiye onaylı ilerleme/);
  assert.equal(temel.geride_mi, true, '%40 < beklenen %50');
  assert.equal(plan.celiski_sayisi, 1);
});

test('geojson: konumlu görev/NCR/olay/ramak kala/beton GeoJSON [lon,lat] olarak dışa verilir; konumsuzlar HARİÇ (KABUL kriteri)', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Geo', tckn: tckn(), rol: 'personel' });
  gorev.olustur({ proje_id: 'GEO-P', baslik: 'Konumlu görev', sorumlu_tipi: 'kisi', sorumlu_id: k.id, lat: 41.01, lon: 28.97 });
  gorev.olustur({ proje_id: 'GEO-P', baslik: 'Konumsuz görev', sorumlu_tipi: 'kisi', sorumlu_id: k.id });
  kalite.ncrAc({ proje_id: 'GEO-P', baslik: 'NCR', sorumlu_tipi: 'kisi', sorumlu_id: k.id, lat: 41.02, lon: 28.98 });
  isg.olayKaydet({ proje_id: 'GEO-P', tur: 'yaralanmasiz_olay', tarih: '2026-09-10', aciklama: 'Ramak', lat: 41.03, lon: 28.99 });
  kalite.dokumEkle({ proje_id: 'GEO-P', tarih: '2026-09-10', eleman: 'Kolon', beton_sinifi: 'C35', miktar_m3: 5, lat: 41.04, lon: 29.0 });
  const fc = geojson.featureCollection('GEO-P');
  assert.equal(fc.type, 'FeatureCollection');
  assert.equal(fc.features.length, 4);
  const gf = fc.features.find((f) => f.properties.katman === 'gorev');
  assert.deepEqual(gf.geometry.coordinates, [28.97, 41.01]);
  assert.equal(geojson.featureCollection('GEO-P', ['ncr']).features.length, 1);
});

test('pano: bugünün özeti — açık görev/NCR sayıları', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Pano', tckn: tckn(), rol: 'personel' });
  gorev.olustur({ proje_id: 'PANO-P', baslik: 'G1', sorumlu_tipi: 'kisi', sorumlu_id: k.id, son_tarih: '2026-01-01' });
  kalite.ncrAc({ proje_id: 'PANO-P', baslik: 'N1', sorumlu_tipi: 'kisi', sorumlu_id: k.id });
  const p = pano.panoGetir('PANO-P', '2026-09-10');
  assert.equal(p.acik_gorev, 1);
  assert.equal(p.gecikmis_gorev, 1);
  assert.equal(p.acik_ncr, 1);
  assert.equal(p.gunluk_rapor_durumu, 'yok');
});
