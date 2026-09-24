import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const isg = await import('./isg.js');
const kalite = await import('./kalite.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const parametre = await import('../_cekirdek/parametre.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const ekip = await import('../taseron/ekip.js');
const performans = await import('../altyuklenici/performans.js');
const personelSrv = await import('../ik/personel.js');
const depoMalzeme = await import('../depo/malzeme.js');
const zimmet = await import('../depo/zimmet.js');

const PROJE = 'IGA-ISG';
const tckn = () => String(Math.floor(10000000000 + Math.random() * 89999999999));

test('girisKontrolu: EĞİTİMSİZ kişi için UYARI verir; eğitim eklenince uyarı kalkar (KABUL kriteri)', () => {
  const p = kisiMod.olustur({ ad_soyad: 'Eğitimsiz', tckn: tckn(), rol: 'personel' });
  personelSrv.olustur({ kisi_id: p.id, sicil_no: 'ISG-1', ise_giris_tarihi: '2026-01-01' });
  const once = isg.girisKontrolu(p.id, '2026-09-10');
  assert.equal(once.uygun, false);
  assert.ok(once.uyarilar.some((u) => u.includes('İSG')));
  isg.egitimEkle({ kisi_id: p.id, tarih: '2026-09-01', gecerlilik_bitis: '2027-09-01' });
  assert.equal(isg.girisKontrolu(p.id, '2026-09-10').uygun, true);
});

test('girisKontrolu: SÜRESİ DOLMUŞ eğitim uyarı verir', () => {
  const p = kisiMod.olustur({ ad_soyad: 'Süresi Dolmuş', tckn: tckn(), rol: 'personel' });
  personelSrv.olustur({ kisi_id: p.id, sicil_no: 'ISG-2', ise_giris_tarihi: '2020-01-01' });
  isg.egitimEkle({ kisi_id: p.id, tarih: '2024-01-01', gecerlilik_bitis: '2025-01-01' });
  assert.equal(isg.girisKontrolu(p.id, '2026-09-10').uygun, false);
  assert.equal(isg.suresiDolanEgitimler('2026-09-10').some((e) => e.kisi_id === p.id), true);
});

test('girisKontrolu: taşeron işçisinin SGK bildirgesi yoksa uyarı; girisKaydet yetkili gerekçesiz GEÇİŞ VERMEZ', () => {
  const firma = cariFirma.olustur({ unvan: 'Taşeron X', vkn_tckn: '9200000001', roller: ['taseron'] });
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Kalıp', bedel_kurus: 100000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const e = ekip.olustur({ sozlesme_id: s.id });
  const k = kisiMod.olustur({ ad_soyad: 'Kaçak İşçi', tckn: tckn(), rol: 'taseron_iscisi', firma_id: firma.id });
  ekip.uyeEkle(e.id, { kisi_id: k.id, baslangic_tarihi: '2026-01-01' }); // SGK tarihi YOK
  isg.egitimEkle({ kisi_id: k.id, tarih: '2026-09-01', gecerlilik_bitis: '2027-09-01' });
  const kontrol = isg.girisKontrolu(k.id, '2026-09-10');
  assert.equal(kontrol.uygun, false);
  assert.ok(kontrol.uyarilar.some((u) => u.includes('SGK')));
  assert.equal(isg.girisKaydet(PROJE, k.id, '2026-09-10', {}).giris_izni, false);
  assert.equal(isg.girisKaydet(PROJE, k.id, '2026-09-10', { yetkiliOnayi: true, gerekce: 'Acil kalıp işi' }).giris_izni, true);
  assert.equal(isg.girisleriGetir(PROJE, '2026-09-10').length, 2, 'her deneme kaydedilmeli');
});

test('egitimEkle: Çekirdek Kişi.isg_egitim_* önbelleğini günceller (P6 kontrolü çalışmaya devam eder)', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Önbellek', tckn: tckn(), rol: 'taseron_iscisi' });
  isg.egitimEkle({ kisi_id: k.id, tarih: '2026-08-01', gecerlilik_bitis: '2027-08-01' });
  assert.equal(kisiMod.getir(k.id).isg_egitim_gecerlilik_tarihi, '2027-08-01');
});

test('olayKaydet: yasal bildirim son tarihi PARAMETRİKTEN hesaplanır; alt yüklenici olayı P5 performansına gider', () => {
  parametre.olustur({ kod: 'isg_kaza_bildirim_gun', ad: 'Kaza bildirim süresi', deger: 3, birim: 'gun', gecerli_baslangic: '2020-01-01' });
  const firma = cariFirma.olustur({ unvan: 'Alt Yüklenici Y', vkn_tckn: '9200000002', roller: ['alt_yuklenici'] });
  const s = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: PROJE, konu: 'Kaba yapı', bedel_kurus: 100000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const o = isg.olayKaydet({ proje_id: PROJE, tur: 'is_kazasi', tarih: '2026-09-10', aciklama: 'Düşme', ilgili_alt_yuklenici_sozlesme_id: s.id, lat: 41.1, lon: 28.9 });
  assert.equal(o.yasal_bildirim_son_tarih, '2026-09-13');
  const olaylar = performans.olaylariListele(s.id);
  assert.equal(olaylar.length, 1);
  assert.equal(olaylar[0].tur, 'isg_ihlali');
  assert.ok(isg.isgUyarilari(PROJE, '2026-09-14').some((u) => u.tur === 'yasal_bildirim' && u.gecikti));
  isg.olayBildirimYapildi(o.id, '2026-09-11');
  assert.equal(isg.isgUyarilari(PROJE, '2026-09-14').some((u) => u.tur === 'yasal_bildirim'), false);
});

test('ramakKalaBildir: ANONİM bildirimde kimlik HİÇ saklanmaz', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Bildiren', tckn: tckn(), rol: 'personel' });
  isg.ramakKalaBildir({ proje_id: PROJE, tarih: '2026-09-10', aciklama: 'İskele eksik', anonim: true, bildiren_kisi_id: k.id }, k.id);
  isg.ramakKalaBildir({ proje_id: PROJE, tarih: '2026-09-10', aciklama: 'Kablo açıkta', anonim: false, bildiren_kisi_id: k.id }, k.id);
  const liste = isg.ramakKalalariGetir(PROJE);
  assert.equal(liste.find((r) => r.anonim_mi === 1).bildiren_kisi_id, null);
  assert.equal(liste.find((r) => r.anonim_mi === 0).bildiren_kisi_id, k.id);
});

test('isIzniDurumDegistir: onaylayan olmadan onaylanamaz; geçersiz geçiş reddedilir', () => {
  const i = isg.isIzniTalepEt({ proje_id: PROJE, tur: 'sicak_calisma', baslangic: '2026-09-10T08:00', bitis: '2026-09-10T17:00' });
  assert.throws(() => isg.isIzniDurumDegistir(i.id, 'onayli', null), /onaylayan zorunlu/);
  assert.throws(() => isg.isIzniDurumDegistir(i.id, 'kapali', 'x'), /Geçersiz durum geçişi/);
  assert.equal(isg.isIzniDurumDegistir(i.id, 'onayli', 'İSG Uzmanı').durum, 'onayli');
});

test('denetimYanitla: uygunsuz her madde için OTOMATİK düzeltici faaliyet açılır; kapanış notu zorunlu', () => {
  const s = isg.sablonEkle({ ad: 'Günlük', periyot: 'gunluk', maddeler: ['Baret', 'Korkuluk'] });
  const r = isg.denetimYanitla({ sablon_id: s.id, proje_id: PROJE, tarih: '2026-09-10', yanitlar: [{ madde: 'Baret', uygun: true }, { madde: 'Korkuluk', uygun: false, not: '3. kat' }] });
  assert.equal(r.uygunsuz_sayisi, 1);
  assert.equal(r.duzeltici_faaliyetler.length, 1);
  assert.throws(() => isg.duzelticiKapat(r.duzeltici_faaliyetler[0].id, ''), /Kapanış notu/);
  assert.equal(isg.duzelticiKapat(r.duzeltici_faaliyetler[0].id, 'Korkuluk takıldı').durum, 'tamamlandi');
});

test('kkdDurumu: Depo zimmetinden (kkd_mi) OKUR', () => {
  const k = kisiMod.olustur({ ad_soyad: 'KKD', tckn: tckn(), rol: 'personel' });
  const baret = depoMalzeme.olustur({ kod: 'BARET-1', ad: 'Baret', birim: 'adet' });
  zimmet.ver({ malzeme_id: baret.id, zimmet_alan_tipi: 'personel', zimmet_alan_kisi_id: k.id, kkd_mi: true, zimmet_tarihi: '2026-09-01' });
  assert.equal(isg.kkdDurumu(String(k.id)).length, 1);
});

test('ncrAc: sorumlu alt yükleniciyse P5 performans olayı gider (mükerrer AÇMAZ); akış acik->duzeltildi->kapali', () => {
  const firma = cariFirma.olustur({ unvan: 'Alt Yüklenici Z', vkn_tckn: '9200000003', roller: ['alt_yuklenici'] });
  const s = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: PROJE, konu: 'İnce işler', bedel_kurus: 100000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const n = kalite.ncrAc({ proje_id: PROJE, baslik: 'Kolon donatı paspayı yetersiz', sorumlu_tipi: 'alt_yuklenici', sorumlu_id: s.id, lat: 41.0, lon: 29.0 });
  assert.equal(performans.olaylariListele(s.id).filter((o) => o.tur === 'ncr').length, 1);
  assert.throws(() => kalite.ncrKapat(n.id), /düzeltilmiş olmalıdır/);
  assert.throws(() => kalite.ncrDuzelt(n.id, ''), /Düzeltme notu/);
  kalite.ncrDuzelt(n.id, 'Paspayı düzeltildi');
  assert.equal(kalite.ncrKapat(n.id, '2026-09-12').durum, 'kapali');
  assert.throws(() => kalite.ncrAc({ proje_id: PROJE, baslik: 'x', sorumlu_tipi: 'alt_yuklenici', sorumlu_id: 99999 }), /bulunamadı/);
});

test('dokumEkle: her numune için 7 VE 28 günlük kırım planı açılır; bekleyenler tarihe göre listelenir', () => {
  const d = kalite.dokumEkle({ proje_id: PROJE, tarih: '2026-09-01', eleman: 'Temel', beton_sinifi: 'C30', miktar_m3: 40, numune_adedi: 2 });
  assert.equal(d.numuneler.length, 4);
  assert.deepEqual(d.numuneler.filter((n) => n.kirim_gun === 7).map((n) => n.planlanan_kirim_tarihi), ['2026-09-08', '2026-09-08']);
  assert.equal(kalite.kirimiBekleyenler(PROJE, '2026-09-10').length, 2);
  kalite.numuneSonucGir(d.numuneler[0].id, 21.5, '2026-09-08');
  assert.equal(kalite.kirimiBekleyenler(PROJE, '2026-09-10').length, 1);
});
