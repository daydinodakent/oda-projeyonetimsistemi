import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const bolum = await import('./bolum.js');
const rezervasyon = await import('./rezervasyon.js');
const satis = await import('./satis.js');
const odemePlani = await import('./odemePlani.js');
const tahsilat = await import('./tahsilat.js');
const vade = await import('./vade.js');
const teslim = await import('./teslim.js');
const satisSonrasi = await import('./satisSonrasi.js');
const aday = await import('./aday.js');
const kvkk = await import('./kvkk.js');
const musteriKarti = await import('./musteriKarti.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const parametre = await import('../_cekirdek/parametre.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const gorevSrv = await import('../santiye/gorev.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'MUSTERI-P';
const tckn = () => String(Math.floor(10000000000 + Math.random() * 89999999999));
let n = 0;
const musteri = (ad = 'Müşteri') => kisiMod.olustur({ ad_soyad: ad, tckn: tckn(), rol: 'musteri' });
const yeniBolum = (extra = {}) => { n += 1; return bolum.olustur({ proje_id: PROJE, blok: 'A', kat: String(n), kapi_no: String(n), tip: '3+1', ...extra }); };
const TL = (x) => x * 100;

/** Onaylı satış + plan: peşinat 100k + 2 taksit 50k (toplam 200k). */
function onayliSatis(tutarTl = 200000, taksitler) {
  const b = yeniBolum();
  const m = musteri();
  bolum.fiyatTanimla(b.id, TL(tutarTl), '2026-01-01');
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-01' });
  odemePlani.olustur(s.id, taksitler || [
    { tur: 'pesinat', vade_tarihi: '2026-02-01', tutar_kurus: TL(100000) },
    { tur: 'taksit', vade_tarihi: '2026-03-01', tutar_kurus: TL(50000) },
    { tur: 'taksit', vade_tarihi: '2026-04-01', tutar_kurus: TL(50000) },
  ]);
  satis.onayla(s.id);
  return { b, m, s: satis.getir(s.id) };
}

test('ARSA SAHİBİ bölümü satılamaz/opsiyonlanamaz (KABUL kriteri); paylaşım listesi P2 sözleşme kaleminden gelir', () => {
  const a1 = yeniBolum(); const a2 = yeniBolum();
  const arsaFirma = cariFirma.olustur({ unvan: 'Arsa Sahibi Ltd.', vkn_tckn: '9600000001', roller: ['arsa_sahibi'] });
  const soz = sozlesme.olustur({ tip: 'arsa_sahibi', proje_id: PROJE, konu: 'Kat karşılığı', bedel_kurus: 1, baslangic_tarihi: '2026-01-01', taraf_firma_id: arsaFirma.id });
  sozlesme.kalemEkle(soz.id, { aciklama: `${bolum.etiket(a1)}, ${bolum.etiket(a2)}, Z-9-9`, birim: 'adet', miktar: 2, birim_fiyat_kurus: 1 });
  const r = bolum.paylasimListesiUygula(soz.id);
  assert.equal(r.ayrilan.length, 2);
  assert.deepEqual(r.bulunamayan, ['Z-9-9']);
  bolum.fiyatTanimla(a1.id, TL(100000), '2026-01-01');
  const m = musteri();
  assert.throws(() => satis.olustur({ bolum_id: a1.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-01' }), /ARSA SAHİBİNE aittir/);
  assert.throws(() => rezervasyon.olustur({ bolum_id: a1.id, baslangic_tarihi: '2026-02-01', bitis_tarihi: '2026-02-10' }), /ARSA SAHİBİNE aittir/);
  assert.equal(bolum.izgara(PROJE)['A'][a1.kat][0].satisa_kapali, true, 'stokta görünür ama satışa kapalı');
});

test('arsaSahibineAyir: tip="arsa_sahibi" olmayan sözleşme reddedilir', () => {
  const b = yeniBolum();
  const f = cariFirma.olustur({ unvan: 'Taşeron X', vkn_tckn: '9600000002', roller: ['taseron'] });
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'x', bedel_kurus: 1, baslangic_tarihi: '2026-01-01', taraf_firma_id: f.id });
  assert.throws(() => bolum.arsaSahibineAyir(b.id, s.id), /arsa_sahibi/);
});

test('OPSİYON KİLİDİ: aynı bölüm iki opsiyona giremez; süre dolunca OTOMATİK serbest kalır', () => {
  const b = yeniBolum();
  const r = rezervasyon.olustur({ bolum_id: b.id, baslangic_tarihi: '2026-05-01', bitis_tarihi: '2026-05-05', kaparo_kurus: TL(5000) });
  assert.equal(bolum.getir(b.id).durum, 'opsiyonlu');
  assert.throws(() => rezervasyon.olustur({ bolum_id: b.id, baslangic_tarihi: '2026-05-02', bitis_tarihi: '2026-05-06' }), /iki opsiyona/);
  // süre dolduktan sonra başka biri opsiyonlayabilir
  const r2 = rezervasyon.olustur({ bolum_id: b.id, baslangic_tarihi: '2026-05-06', bitis_tarihi: '2026-05-10' });
  assert.equal(rezervasyon.getir(r.id).durum, 'suresi_doldu');
  assert.equal(r2.durum, 'aktif');
});

test('satış: opsiyonlu bölüm yalnızca kendi rezervasyonuyla satılır; kaparo ONAYDA ilk tahsilat olur', () => {
  const b = yeniBolum(); const m = musteri();
  bolum.fiyatTanimla(b.id, TL(100000), '2026-01-01');
  const r = rezervasyon.olustur({ bolum_id: b.id, kisi_id: m.id, baslangic_tarihi: '2026-06-01', bitis_tarihi: '2026-06-30', kaparo_kurus: TL(10000) });
  assert.throws(() => satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-06-02' }), /başka bir opsiyon/);
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-06-02', rezervasyon_id: r.id });
  assert.equal(rezervasyon.getir(r.id).durum, 'satisa_donustu');
  assert.throws(() => satis.onayla(s.id), /aktif bir ödeme planı/);
  odemePlani.olustur(s.id, [{ tur: 'pesinat', vade_tarihi: '2026-06-02', tutar_kurus: TL(40000) }, { tur: 'taksit', vade_tarihi: '2026-07-02', tutar_kurus: TL(60000) }]);
  satis.onayla(s.id);
  assert.equal(bolum.getir(b.id).durum, 'satildi');
  const th = tahsilat.satisIcinListele(s.id);
  assert.equal(th.length, 1);
  assert.equal(th[0].tutar_kurus, TL(10000));
  assert.equal(th[0].yontem, 'kaparo');
});

test('satış: hisseli müşteri toplamı %100 olmalı; müşteri rolü olmayan kişi reddedilir; sözleşme P2\'de oluşur; GELİR taahhüdü TEK kez yazılır', () => {
  const b = yeniBolum(); bolum.fiyatTanimla(b.id, TL(300000), '2026-01-01');
  const m1 = musteri('Eş 1'); const m2 = musteri('Eş 2');
  const personel = kisiMod.olustur({ ad_soyad: 'Personel', tckn: tckn(), rol: 'personel' });
  assert.throws(() => satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: personel.id }], satis_tarihi: '2026-02-01' }), /müşteri rolünde değil/);
  assert.throws(() => satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m1.id, hisse_yuzde: 50 }, { kisi_id: m2.id, hisse_yuzde: 30 }], satis_tarihi: '2026-02-01' }), /%100/);
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m1.id, hisse_yuzde: 50 }, { kisi_id: m2.id, hisse_yuzde: 50 }], satis_tarihi: '2026-02-01' });
  assert.equal(sozlesme.getir(s.sozlesme_id).tip, 'musteri_satis');
  assert.equal(s.tutar_kurus, TL(300000), 'tutar liste fiyatından');
  odemePlani.olustur(s.id, [{ tur: 'pesinat', vade_tarihi: '2026-02-01', tutar_kurus: TL(300000) }]);
  satis.onayla(s.id);
  const gelirler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'sozlesme' && h.kaynak_id === String(s.sozlesme_id));
  assert.equal(gelirler.length, 1);
  assert.equal(gelirler[0].tur, 'GELIR');
  assert.equal(gelirler[0].tutar_kurus, TL(300000));
  assert.equal(satis.musteriIcinListele({ kisi_id: m2.id }).length, 1, 'hisseli ikinci müşteri de görür');
});

test('aynı bölüm için ikinci canlı satış açılamaz; taslak iptal bölümü serbest bırakır', () => {
  const b = yeniBolum(); bolum.fiyatTanimla(b.id, TL(1000), '2026-01-01'); const m = musteri();
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-01' });
  assert.throws(() => satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-02' }), /satılamaz|başka bir opsiyon/);
  satis.iptalEt(s.id);
  assert.equal(bolum.getir(b.id).durum, 'musait');
  assert.ok(satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-03' }));
});

test('ödeme planı: toplam satış tutarına eşit olmalı; kredi dilimi onay gelene kadar para KABUL ETMEZ', () => {
  const b = yeniBolum(); bolum.fiyatTanimla(b.id, TL(200000), '2026-01-01'); const m = musteri();
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-01' });
  assert.throws(() => odemePlani.olustur(s.id, [{ tur: 'pesinat', vade_tarihi: '2026-02-01', tutar_kurus: TL(1) }]), /eşit olmalıdır/);
  odemePlani.olustur(s.id, [
    { tur: 'pesinat', vade_tarihi: '2026-02-01', tutar_kurus: TL(50000) },
    { tur: 'kredi', vade_tarihi: '2026-03-01', tutar_kurus: TL(150000) },
  ]);
  satis.onayla(s.id);
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(50000), tarih: '2026-02-01' });
  assert.throws(() => tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(10000), tarih: '2026-02-05' }), /kredi onayı bekleyen/);
  const kredi = odemePlani.planGetir(s.id).taksitler.find((t) => t.tur === 'kredi');
  odemePlani.krediDurumuAyarla(kredi.id, 'onaylandi');
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(150000), tarih: '2026-03-05' });
  assert.equal(tahsilat.odemeOzeti(s.id).yuzde, 100);
});

test('tahsilat: kapama sırası varsayılan EN ESKİ VADEDEN; parametre 2 ise en yeniden; kısmi tahsilat taksitler arası taşar', () => {
  const { s } = onayliSatis();
  const r = tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(120000), tarih: '2026-02-10' });
  assert.equal(r.dagilim.length, 2, 'peşinat 100k kapandı, kalan 20k sonraki vadeye taştı');
  const plan = odemePlani.planGetir(s.id);
  const [p1, p2, p3] = plan.taksitler;
  assert.equal(p1.durum, 'kapali'); assert.equal(p2.odenen_kurus, TL(20000)); assert.equal(p3.odenen_kurus, 0);

  parametre.olustur({ kod: 'musteri_tahsilat_kapama_sirasi', ad: 'Kapama sırası', deger: 2, birim: 'adet', gecerli_baslangic: '2026-06-01' });
  const { s: s2 } = onayliSatis();
  tahsilat.kaydet({ satis_id: s2.id, tutar_kurus: TL(10000), tarih: '2026-06-10' });
  const son = odemePlani.planGetir(s2.id).taksitler.find((t) => t.odenen_kurus > 0);
  assert.equal(son.vade_tarihi, '2026-04-01', 'parametre=2 → en yeni vadeden');
});

test('tahsilat: belirli taksite; plan üstü tutar reddedilir; onaysız satışa tahsilat girilmez', () => {
  const { s } = onayliSatis();
  const p = odemePlani.planGetir(s.id).taksitler;
  assert.throws(() => tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(60000), tarih: '2026-02-10', taksit_id: p[1].id }), /kalanını aşıyor/);
  assert.equal(tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(50000), tarih: '2026-02-10', taksit_id: p[2].id }).dagilim[0].taksit_id, p[2].id);
  assert.throws(() => tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(999999), tarih: '2026-02-10' }), /aşıyor/);
  const b = yeniBolum(); bolum.fiyatTanimla(b.id, TL(10), '2026-01-01');
  const taslak = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: musteri().id }], satis_tarihi: '2026-02-01' });
  assert.throws(() => tahsilat.kaydet({ satis_id: taslak.id, tutar_kurus: 100, tarih: '2026-02-10' }), /ONAYLI/);
});

test('PLAN REVİZYONUNDA ESKİ TAHSİLATLAR KORUNUR (KABUL kriteri): Çekirdek satırları değişmez, yeni plana yeniden dağıtılır, eski plan tarihçede kalır', () => {
  const { s } = onayliSatis();
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(100000), tarih: '2026-02-01' });
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(30000), tarih: '2026-03-05' });
  const oncesi = tahsilat.satisIcinListele(s.id).map((t) => ({ id: t.id, tutar: t.tutar_kurus }));

  assert.throws(() => odemePlani.revize(s.id, [{ tur: 'taksit', vade_tarihi: '2026-09-01', tutar_kurus: TL(200000) }], ''), /nedeni zorunlu/);
  const yeni = odemePlani.revize(s.id, [
    { tur: 'taksit', vade_tarihi: '2026-09-01', tutar_kurus: TL(70000) },
    { tur: 'ara_odeme', vade_tarihi: '2026-12-01', tutar_kurus: TL(70000) },
    { tur: 'taksit', vade_tarihi: '2027-03-01', tutar_kurus: TL(60000) },
  ], 'Müşteri talebiyle yeniden yapılandırma');

  assert.equal(yeni.plan.versiyon, 2);
  assert.equal(yeni.versiyonlar.length, 2);
  assert.equal(yeni.versiyonlar[0].durum, 'eski');
  assert.equal(yeni.odenen_kurus, TL(130000), 'eski tahsilatların TOPLAMI yeni planda korunuyor');
  assert.equal(yeni.taksitler[0].odenen_kurus, TL(70000));
  assert.equal(yeni.taksitler[1].odenen_kurus, TL(60000));
  const sonrasi = tahsilat.satisIcinListele(s.id).map((t) => ({ id: t.id, tutar: t.tutar_kurus }));
  assert.deepEqual(sonrasi, oncesi, 'Çekirdek tahsilat satırları AYNEN duruyor');
  const eskiTaksitler = odemePlani.versiyonTaksitleri(yeni.versiyonlar[0].id);
  assert.equal(eskiTaksitler.reduce((t, x) => t + x.odenen_kurus, 0), TL(130000), 'eski plan tarihçesi ödemeleriyle duruyor');
  assert.equal(maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'musteri_tahsilat' && tahsilat.satisIcinListele(s.id).some((t) => String(t.id) === h.kaynak_id)).length, 2, 'revizyon defter satırı ÇOĞALTMAZ');
});

test('MALİYET DEFTERİ: tahsilat GELİR yazar; döviz KUR FARKI ve ENDEKS FARKI AYRI satır', () => {
  const b = yeniBolum(); const m = musteri();
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], tutar_kurus: 10000000, para_birimi: 'EUR', kur: 30, satis_tarihi: '2026-02-01' });
  odemePlani.olustur(s.id, [{ tur: 'pesinat', vade_tarihi: '2026-02-01', tutar_kurus: 10000000 }]);
  satis.onayla(s.id);
  const { tahsilat: t } = tahsilat.kaydet({ satis_id: s.id, tutar_kurus: 1000000, kur: 33, tarih: '2026-03-01', endeks_farki_kurus: 25000 });
  const h = maliyetDefteri.projeIcinListele(PROJE).filter((x) => x.kaynak_id.startsWith(`${t.id}`) && x.kaynak_modul === 'musteri_tahsilat');
  const ana = h.find((x) => x.kaynak_id === String(t.id));
  const kur = h.find((x) => x.kaynak_id === `${t.id}:kur_farki`);
  const endeks = h.find((x) => x.kaynak_id === `${t.id}:endeks_farki`);
  assert.equal(ana.tur, 'GELIR'); assert.equal(ana.para_birimi, 'EUR'); assert.equal(ana.tutar_kurus, 1000000);
  assert.equal(kur.tutar_kurus, 1000000 * 3, 'tutar × (33-30)'); assert.equal(kur.para_birimi, 'TRY');
  assert.equal(endeks.tutar_kurus, 25000);
});

test('TESLİM: ödeme tamamlanma şartı parametrik (varsayılan %100); istisna yetkili onayı + gerekçe ister', () => {
  const { s } = onayliSatis();
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(100000), tarih: '2026-02-01' });
  assert.throws(() => teslim.teslimYap(s.id, { tarih: '2026-08-01' }), /ödeme tamamlanma şartı %100 \(şu an %50\)/);
  assert.throws(() => teslim.teslimYap(s.id, { tarih: '2026-08-01', istisnaOnayi: true }), /istisna onayı/);
  const t = teslim.teslimYap(s.id, { tarih: '2026-08-01', teslim_alan: 'Müşteri', istisnaOnayi: true, gerekce: 'Yönetim onayı', eksikler: ['Kapı kolu'] });
  assert.equal(t.istisna_onayi_mi, 1);
  assert.equal(bolum.getir(s.bolum_id).durum, 'teslim_edildi');
  assert.throws(() => teslim.teslimYap(s.id, { tarih: '2026-08-02' }), /zaten bir teslim tutanağı/);
});

test('TESLİM: parametre %50 ise 50% ödemeyle istisnasız teslim; EKSİK LİSTESİ ŞANTİYE GÖREVİNE DÖNÜŞÜR (KABUL kriteri)', () => {
  parametre.olustur({ kod: 'musteri_teslim_odeme_tamamlanma_yuzde', ad: 'Teslim ödeme %', deger: 50, birim: 'yuzde', gecerli_baslangic: '2026-07-01' });
  const { s, b } = onayliSatis();
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(100000), tarih: '2026-02-01' });
  const t = teslim.teslimYap(s.id, { tarih: '2026-08-01', eksikler: ['Priz eksik', 'Boya çiziği'] });
  assert.equal(t.istisna_onayi_mi, 0);
  const sorumlu = kisiMod.olustur({ ad_soyad: 'Kalite Şefi', tckn: tckn(), rol: 'personel' });
  const donusen = teslim.eksikleriGoreveDonustur(t.id, { sorumlu_tipi: 'kisi', sorumlu_id: sorumlu.id, son_tarih: '2026-08-15' });
  assert.equal(donusen.length, 2);
  const g = gorevSrv.getir(donusen[0].gorev_id);
  assert.match(g.baslik, /Teslim eksiği/);
  assert.equal(g.konum_blok, b.blok); assert.equal(g.konum_daire, b.kapi_no);
  assert.equal(teslim.eksikleriGoreveDonustur(t.id, { sorumlu_tipi: 'kisi', sorumlu_id: sorumlu.id }).length, 0, 'ikinci çağrı mükerrer görev açmaz');
});

test('SATIŞ SONRASI: garanti parametrik; WBS\'ten sorumlu ALT YÜKLENİCİ bulunup P8 görevi ona açılır', () => {
  parametre.olustur({ kod: 'musteri_garanti_ay', ad: 'Garanti', deger: 12, birim: 'adet', gecerli_baslangic: '2020-01-01' });
  putRecord('tb_wbs_gorevler', { id: 'wbs-mus-1', wbs_code: 'W1', name: 'Tesisat', row_status: 1 });
  const f = cariFirma.olustur({ unvan: 'Tesisatçı A.Ş.', vkn_tckn: '9600000003', roller: ['alt_yuklenici'] });
  const altSoz = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: PROJE, konu: 'Tesisat', bedel_kurus: 1000, baslangic_tarihi: '2026-01-01', taraf_firma_id: f.id });
  sozlesme.kalemEkle(altSoz.id, { wbs_gorev_id: 'wbs-mus-1', aciklama: 'Tesisat işi', birim: 'adet', miktar: 1, birim_fiyat_kurus: 1000 });
  const { s } = onayliSatis();
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(200000), tarih: '2026-02-01' });
  teslim.teslimYap(s.id, { tarih: '2026-08-01' });
  const iceride = satisSonrasi.talepAc({ satis_id: s.id, tur: 'ariza', aciklama: 'Su kaçağı', wbs_gorev_id: 'wbs-mus-1', talep_tarihi: '2027-03-01' });
  const disarida = satisSonrasi.talepAc({ satis_id: s.id, tur: 'sikayet', aciklama: 'Eski şikayet', talep_tarihi: '2028-01-01' });
  assert.equal(iceride.garanti_kapsaminda_mi, 1);
  assert.equal(disarida.garanti_kapsaminda_mi, 0);
  const y = satisSonrasi.yonlendir(iceride.id);
  assert.equal(y.durum, 'yonlendirildi');
  assert.equal(y.yonlendirilen_sozlesme_id, altSoz.id);
  const g = gorevSrv.getir(y.gorev_id);
  assert.equal(g.sorumlu_tipi, 'alt_yuklenici'); assert.equal(g.sorumlu_id, altSoz.id);
  assert.throws(() => satisSonrasi.yonlendir(disarida.id), /alt yüklenici bulunamadı/);
});

test('VADESİ GEÇENLER: gecikme günü + faiz (sözleşme maddesindeki PARAMETREDEN); madde yoksa faiz null; hatırlatma kuyruğu mükerrer eklenmez', () => {
  const { s } = onayliSatis();
  parametre.olustur({ kod: 'musteri_gecikme_gunluk_yuzde', ad: 'Günlük gecikme %', deger: 0.1, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });
  const yok = vade.vadesiGecenler(PROJE, '2026-03-11').find((x) => x.satis_id === s.id && x.tur === 'taksit');
  assert.equal(yok.gecikme_faizi_kurus, null);
  sozlesme.maddeEkle(s.sozlesme_id, { tur: 'ceza', parametreler: { gecikme_gunluk_yuzde_parametre_kodu: 'musteri_gecikme_gunluk_yuzde' }, sorumlu_taraf: 'isveren' });
  const vg = vade.vadesiGecenler(PROJE, '2026-03-11').filter((x) => x.satis_id === s.id);
  const mart = vg.find((x) => x.vade_tarihi === '2026-03-01');
  assert.equal(mart.gecikme_gun, 10);
  assert.equal(mart.gecikme_faizi_kurus, Math.round(TL(50000) * 0.001 * 10));
  const h1 = vade.hatirlatmaUret(PROJE, '2026-02-15');
  assert.ok(h1.eklenen >= 3);
  assert.equal(vade.hatirlatmaUret(PROJE, '2026-02-15').eklenen, 0, 'mükerrer eklenmez');
  assert.ok(vade.bekleyenHatirlatmalar('2026-02-25').length > 0);
});

test('KVKK: pazarlama izni AYRI; geri çekilince izin biter, tarihçe kalır', () => {
  const m = musteri();
  assert.deepEqual(kvkk.durum('kisi', m.id), { aydinlatma: false, pazarlama: false });
  kvkk.rizaKaydet({ ilgili_tip: 'kisi', ilgili_id: m.id, tur: 'aydinlatma', metin_versiyon: 'v1', verildi_tarihi: '2026-01-01', kanal: 'yazili' });
  assert.equal(kvkk.pazarlamaIzniVarMi('kisi', m.id), false, 'aydınlatma ≠ pazarlama rızası');
  const r = kvkk.rizaKaydet({ ilgili_tip: 'kisi', ilgili_id: m.id, tur: 'pazarlama', metin_versiyon: 'v1', verildi_tarihi: '2026-01-01' });
  assert.equal(kvkk.pazarlamaIzniVarMi('kisi', m.id), true);
  kvkk.geriCek(r.id, '2026-06-01');
  assert.equal(kvkk.pazarlamaIzniVarMi('kisi', m.id), false);
  assert.equal(kvkk.listele('kisi', m.id).length, 2);
  assert.throws(() => kvkk.geriCek(r.id, '2026-06-02'), /zaten geri çekilmiş/);
  assert.throws(() => kvkk.rizaKaydet({ ilgili_tip: 'kisi', ilgili_id: m.id, tur: 'pazarlama', verildi_tarihi: '2026-01-01' }), /metin_versiyon/);
});

test('ADAY HUNİSİ: etkileşim aşamayı ilerletir; huni sayımı; müşteriye bağlama rol doğrular', () => {
  const a = aday.olustur({ proje_id: 'HUNI-P', ad_soyad: 'Aday Ali' });
  aday.olustur({ proje_id: 'HUNI-P', ad_soyad: 'Aday Ayşe' });
  aday.etkilesimEkle(a.id, { tur: 'arama', tarih: '2026-01-01', ozet: 'Ulaşıldı' });
  assert.equal(aday.getir(a.id).asama, 'gorusme');
  assert.deepEqual({ aday: aday.huni('HUNI-P').aday, gorusme: aday.huni('HUNI-P').gorusme }, { aday: 1, gorusme: 1 });
  const personel = kisiMod.olustur({ ad_soyad: 'P', tckn: tckn(), rol: 'personel' });
  assert.throws(() => aday.musteriyeBagla(a.id, { kisi_id: personel.id }), /müşteri rolünde değil/);
  assert.equal(aday.musteriyeBagla(a.id, { kisi_id: musteri().id }).kisi_id > 0, true);
});

test('MÜŞTERİ KARTI: bölümler + plan + tahsilatlar + talepler + KVKK bir arada', () => {
  const { m, s } = onayliSatis();
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(100000), tarih: '2026-02-01' });
  const k = musteriKarti.kart({ kisi_id: m.id });
  assert.equal(k.satislar.length, 1);
  assert.equal(k.satislar[0].plan.taksitler.length, 3);
  assert.equal(k.satislar[0].tahsilatlar.length, 1);
  assert.equal(k.satislar[0].odeme.yuzde, 50);
  assert.equal(k.kvkk.pazarlama, false);
});
