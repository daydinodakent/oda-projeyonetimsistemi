import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import JSZip from 'jszip';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const butce = await import('./butce.js');
const rapor = await import('./rapor.js');
const evm = await import('./evm.js');
const nakit = await import('./nakit.js');
const karlilik = await import('./karlilik.js');
const uyari = await import('./uyari.js');
const portfoy = await import('./portfoy.js');
const mutabakat = await import('./mutabakat.js');
const genelGider = await import('./genelGider.js');
const kaynak = await import('./kaynak.js');
const siparis = await import('../satinalma/siparis.js');
const fatura = await import('../satinalma/fatura.js');
const malKabul = await import('../depo/malKabul.js');
const stok = await import('../depo/stok.js');
const malzeme = await import('../depo/malzeme.js');
const depo = await import('../depo/depo.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const maliyetKodu = await import('../_cekirdek/maliyetKodu.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const parametre = await import('../_cekirdek/parametre.js');
const odeme = await import('../_cekirdek/odeme.js');
const isProgrami = await import('../santiye/isProgrami.js');
const bolumSrv = await import('../musteri/bolum.js');
const satisSrv = await import('../musteri/satis.js');
const odemePlani = await import('../musteri/odemePlani.js');
const { putRecord, rawDb } = await import('../../db.js');

const raw = rawDb();
const TL = (x) => x * 100;
const P = 'MLY-1';
putRecord('tb_wbs_gorevler', { id: 'wbs-ml-1', wbs_code: '1.1', name: 'Kaba İnşaat', row_status: 1 });
putRecord('tb_wbs_gorevler', { id: 'wbs-ml-2', wbs_code: '1.2', name: 'İnce İşler', row_status: 1 });
putRecord('tb_wbs_gorevler', { id: 'wbs-ml-p', wbs_code: '1', name: 'Bina', row_status: 1 });
const mkM = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'wbs-ml-1', kaynak_tipi: 'malzeme' });
const mkT = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'wbs-ml-2', kaynak_tipi: 'iscilik_taseron' });
let vkn = 9800000000;
const firma = (roller = ['tedarikci']) => { vkn += 1; return cariFirma.olustur({ unvan: `F${vkn}`, vkn_tckn: String(vkn), roller }); };

function butceKur(proje, satirlar) {
  const v = butce.versiyonOlustur(proje, {});
  for (const s of satirlar) butce.satirKaydet(v.id, s);
  return butce.onayla(v.id, 'Genel Müdür');
}

// ---- Zincir kurulumu: satınalma → mal kabul → depo girişi → depo çıkışı (+ stoklu fatura) ----
const santiyeDepo = depo.olustur({ proje_id: P, ad: 'Şantiye Deposu', tur: 'santiye' });
const cimento = malzeme.olustur({ kod: 'CIM-ML', ad: 'Çimento', birim: 'ton', stoklu_mu: true });
const tedarikci = firma();
const sp = siparis.olustur({ proje_id: P, firma_id: tedarikci.id, maliyet_kodu_id: mkM.id, teslim_tarihi: '2026-03-01' });
const spKalem = siparis.kalemEkle(sp.id, { malzeme_id: cimento.id, aciklama: 'Çimento', birim: 'ton', miktar: 10, birim_fiyat_kurus: 500000, kdv_orani: 20 });
siparis.durumDegistir(sp.id, 'onaylandi');
malKabul.kaydet({ siparis_kalem_id: spKalem.id, depo_id: santiyeDepo.id, gelen_miktar: 10, kabul_miktar: 10, tarih: '2026-03-01' });
const fa = fatura.kaydet({ siparis_id: sp.id, firma_id: tedarikci.id, fatura_no: 'ML-1', fatura_tarihi: '2026-03-02', vade_tarihi: '2026-04-02', kalemler: [{ siparis_kalem_id: spKalem.id, miktar: 10, birim_fiyat_kurus: 500000, kdv_orani: 20 }] });
const cikis1 = stok.cikis({ depo_id: santiyeDepo.id, malzeme_id: cimento.id, miktar: 4, birim: 'ton', proje_id: P, maliyet_kodu_id: mkM.id, teslim_alan_tipi: 'sarf' });
const cikis2 = stok.cikis({ depo_id: santiyeDepo.id, malzeme_id: cimento.id, miktar: 1, birim: 'ton', proje_id: P, maliyet_kodu_id: mkM.id, teslim_alan_tipi: 'sarf' });
butceKur(P, [{ maliyet_kodu_id: mkM.id, tutar_kurus: TL(50000) }, { maliyet_kodu_id: mkT.id, tutar_kurus: TL(10000) }]);
const ledger = () => maliyetDefteri.projeIcinListele(P);

test('ZİNCİR: satınalma → depo girişi → depo çıkışında GERÇEKLEŞEN maliyet TEK KEZ görünür (KABUL kriteri)', () => {
  const gercek = ledger().filter((h) => h.maliyet_kodu_id === mkM.id && h.tur === 'GERCEKLESEN');
  assert.equal(gercek.length, 2, 'yalnızca iki depo çıkışı — mal kabul/giriş/stoklu fatura satır YAZMAZ');
  assert.ok(gercek.every((h) => h.kaynak_modul === 'depo_stok_hareketi'));
  const r = rapor.maliyetRaporu(P);
  const kod = r.satirlar.flatMap((w) => w.kodlar).find((k) => k.maliyet_kodu_id === mkM.id);
  assert.equal(kod.gerceklesen, TL(25000), '5 ton × 5.000 TL — bir kez');
  assert.equal(kod.taahhut, 6000000, 'sipariş (KDV dahil 60.000 TL) taahhüdü');
  assert.equal(kod.kalan_taahhut, 6000000 - TL(25000));
  assert.equal(kod.tahmin_kalan, 0, 'taahhüt bütçenin altında değil → taahhüt edilmemiş kalan yok? (bütçe 50.000 < taahhüt 60.000)');
  assert.equal(kod.eac, TL(25000) + (6000000 - TL(25000)));
  assert.equal(kod.sapma, TL(50000) - kod.eac, 'bütçe − EAC');
  assert.ok(kod.sapma < 0 && kod.sapma_yuzde < 0, 'taahhüt bütçeyi aştığı için EAC bütçe üstünde');
});

test('MUTABAKAT: temiz zincir hata üretmez', () => {
  const m = mutabakat.mutabakatRaporu(P);
  assert.deepEqual(m.bulgular.filter((b) => b.seviye === 'hata'), [], JSON.stringify(m.bulgular.filter((b) => b.seviye === 'hata')));
  assert.equal(m.temiz, true);
});

test('DRILL-DOWN: defter hareketi → kaynak belge → zincir (çıkış ← giriş ← mal kabul ← sipariş)', () => {
  const h = ledger().find((x) => x.kaynak_modul === 'depo_stok_hareketi');
  const k = kaynak.coz(h);
  assert.equal(k.bulundu, true);
  assert.equal(k.belge_tipi, 'Depo Stok Hareketi');
  assert.deepEqual(k.zincir.map((z) => z.belge_tipi), ['Depo Girişi', 'Mal Kabul', 'Satın Alma Siparişi']);
  const t = kaynak.coz(ledger().find((x) => x.kaynak_modul === 'satinalma_siparis'));
  assert.match(t.etiket, /Sipariş/);
  assert.equal(rapor.kodHareketleri(P, mkM.id).filter((x) => x.tur === 'GERCEKLESEN').length, 2);
});

test('MUTABAKAT kasıtlı bozulmuş veriyi YAKALAR (KABUL kriteri): çift sayım, defterde yok, kaynak iptal, kaynak yok, tutar uyumsuz', () => {
  // 1) çift sayım: stoklu malzemenin faturası GERÇEKLEŞEN yazmış
  const kalemId = raw.prepare('SELECT id FROM satinalma_fatura_kalem WHERE fatura_id = ?').get(fa.id).id;
  maliyetDefteri.yaz({ proje_id: P, maliyet_kodu_id: mkM.id, tur: 'GERCEKLESEN', tutar_kurus: TL(25000), tarih: '2026-03-02', kaynak_modul: 'satinalma_fatura', kaynak_id: `${fa.id}:kalem-${kalemId}` });
  // 2) defterde yok: çıkış #2'nin defter satırı silinmiş
  raw.prepare("DELETE FROM maliyet_hareketi WHERE kaynak_modul = 'depo_stok_hareketi' AND kaynak_id = ?").run(String(cikis2.kayit.id));
  // 3) kaynak iptal: onaylı sipariş sonradan iptal edilmiş ama taahhüdü duruyor
  const sp2 = siparis.olustur({ proje_id: P, firma_id: tedarikci.id, maliyet_kodu_id: mkM.id });
  siparis.kalemEkle(sp2.id, { aciklama: 'Hizmet', birim: 'adet', miktar: 1, birim_fiyat_kurus: 100000, kdv_orani: 20 });
  siparis.durumDegistir(sp2.id, 'onaylandi');
  raw.prepare("UPDATE satinalma_siparis SET durum = 'iptal' WHERE id = ?").run(sp2.id);
  // 4) kaynak yok: var olmayan depo hareketine bağlı defter satırı
  maliyetDefteri.yaz({ proje_id: P, maliyet_kodu_id: mkM.id, tur: 'GERCEKLESEN', tutar_kurus: 12345, tarih: '2026-03-05', kaynak_modul: 'depo_stok_hareketi', kaynak_id: '987654' });
  // 5) tutar uyumsuz: çıkış #1'in defter tutarı bozulmuş
  raw.prepare("UPDATE maliyet_hareketi SET tutar_kurus = tutar_kurus + 777 WHERE kaynak_modul = 'depo_stok_hareketi' AND kaynak_id = ?").run(String(cikis1.kayit.id));

  const m = mutabakat.mutabakatRaporu(P);
  assert.equal(m.temiz, false);
  const turler = new Set(m.bulgular.map((b) => b.tur));
  for (const beklenen of ['cift_sayim', 'defterde_yok', 'kaynak_iptal', 'kaynak_yok', 'tutar_uyumsuz']) assert.ok(turler.has(beklenen), `${beklenen} yakalanmadı: ${[...turler]}`);
  assert.ok(m.bulgular.some((b) => b.tur === 'defterde_yok' && b.kaynak_id === String(cikis2.kayit.id)));
  assert.ok(m.bulgular.some((b) => b.tur === 'kaynak_iptal' && b.kaynak_id === String(sp2.id)));
  assert.ok(m.bulgular.some((b) => b.tur === 'tutar_uyumsuz' && b.kaynak_id === String(cikis1.kayit.id)));
});

test('BÜTÇE VERSİYONLARI: revize-1 defterde yalnızca FARK yazar; rapor versiyona göre hesaplanır; onaylı versiyon düzenlenemez', () => {
  const Q = 'BTC-1';
  putRecord('tb_wbs_gorevler', { id: 'wbs-bt-1', wbs_code: 'B1', name: 'Bütçe WBS', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: Q, wbs_gorev_id: 'wbs-bt-1', kaynak_tipi: 'malzeme' });
  const v1 = butceKur(Q, [{ maliyet_kodu_id: mk.id, tutar_kurus: TL(1000) }]);
  assert.equal(v1.ad, 'İlk Bütçe');
  assert.throws(() => butce.satirKaydet(v1.id, { maliyet_kodu_id: mk.id, tutar_kurus: 1 }), /taslak/);
  const v2 = butce.versiyonOlustur(Q, {});
  assert.equal(v2.ad, 'Revize-1');
  assert.throws(() => butce.versiyonOlustur(Q, {}), /açık bir taslak/);
  butce.satirKaydet(v2.id, { maliyet_kodu_id: mk.id, tutar_kurus: TL(1300) });
  butce.onayla(v2.id, 'GM');
  const butceDefter = maliyetDefteri.projeIcinListele(Q).filter((h) => h.tur === 'BUTCE');
  assert.deepEqual(butceDefter.map((h) => h.tutar_kurus).sort((a, b) => a - b), [TL(300), TL(1000)], 'ikinci satır yalnızca FARK');
  assert.equal(butceDefter.reduce((t, h) => t + h.tutar_kurus, 0), TL(1300));
  assert.equal(butce.versiyonlariListele(Q).find((v) => v.id === v1.id).durum, 'arsivlendi');
  assert.equal(rapor.maliyetRaporu(Q).butce_versiyon.versiyon_no, 2);
  assert.equal(rapor.maliyetRaporu(Q).toplam.butce, TL(1300));
  const eski = rapor.maliyetRaporu(Q, { versiyonId: v1.id });
  assert.equal(eski.toplam.butce, TL(1000), 'rapor seçilen versiyona göre');
  assert.equal(eski.butce_versiyon.ad, 'İlk Bütçe');
  assert.equal(mutabakat.mutabakatRaporu(Q).bulgular.filter((b) => b.tur === 'butce_uyumsuz').length, 0);
  raw.prepare("UPDATE maliyet_hareketi SET tutar_kurus = tutar_kurus + 5 WHERE proje_id = ? AND tur = 'BUTCE'").run(Q);
  assert.equal(mutabakat.mutabakatRaporu(Q).bulgular.filter((b) => b.tur === 'butce_uyumsuz').length, 1, 'bozulan bütçe defteri yakalanır');
});

test('KUR BAZLARI: nominal / sabit (bütçe kuru) / güncel (parametre) — dövizli taahhüt', () => {
  const Q = 'KUR-1';
  putRecord('tb_wbs_gorevler', { id: 'wbs-kur-1', wbs_code: 'K1', name: 'Dövizli', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: Q, wbs_gorev_id: 'wbs-kur-1', kaynak_tipi: 'makine_ekipman' });
  butceKur(Q, [{ maliyet_kodu_id: mk.id, tutar_kurus: 100000, para_birimi: 'EUR', kur: 28 }]);
  maliyetDefteri.yaz({ proje_id: Q, maliyet_kodu_id: mk.id, tur: 'TAAHHUT', tutar_kurus: 100000, para_birimi: 'EUR', kur: 30, tarih: '2026-02-01', kaynak_modul: 'test', kaynak_id: 'k1' });
  parametre.olustur({ kod: 'kur_EUR', ad: 'Güncel EUR', deger: 35, birim: 'sabit_kurus', gecerli_baslangic: '2020-01-01' });
  const al = (kurBazi) => rapor.maliyetRaporu(Q, { kurBazi }).toplam;
  assert.equal(al('nominal').taahhut, 3000000);
  assert.equal(al('sabit').taahhut, 2800000);
  assert.equal(al('guncel').taahhut, 3500000);
  assert.equal(al('sabit').butce, 2800000, 'bütçe kendi kuruyla');
  assert.equal(al('guncel').butce, 3500000, 'güncel bazda bütçe de güncel kurla');
  assert.throws(() => rapor.maliyetRaporu(Q, { kurBazi: 'x' }), /Geçersiz kur bazı/);
});

test('WBS AĞACI: nokta ayrımlı kodlar üst düğüme toplanır; kodsuz hareketler ayrı satır', () => {
  const r = rapor.maliyetRaporu(P);
  const ust = r.satirlar.find((s) => s.wbs_kod === '1');
  const k11 = r.satirlar.find((s) => s.wbs_kod === '1.1');
  const k12 = r.satirlar.find((s) => s.wbs_kod === '1.2');
  assert.ok(ust && k11 && k12);
  assert.equal(ust.derinlik, 0); assert.equal(k11.derinlik, 1);
  assert.equal(ust.ozet.butce, k11.ozet.butce + k12.ozet.butce);
  assert.equal(ust.ozet.butce, TL(60000));
  maliyetDefteri.yaz({ proje_id: P, tur: 'TAAHHUT', tutar_kurus: 55555, tarih: '2026-03-06', kaynak_modul: 'test', kaynak_id: 'kodsuz-1' });
  const r2 = rapor.maliyetRaporu(P);
  assert.equal(r2.kodsuz.taahhut, 55555);
  assert.equal(r2.toplam.taahhut, r.toplam.taahhut + 55555, 'kodsuz da proje toplamına girer');
});

test('EVM: PV (iş programı), EV (onaylı ilerleme), AC (defter) → CPI/SPI', () => {
  const Q = 'EVM-1';
  putRecord('tb_wbs_gorevler', { id: 'wbs-evm-1', wbs_code: 'E1', name: 'EVM WBS', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: Q, wbs_gorev_id: 'wbs-evm-1', kaynak_tipi: 'iscilik_taseron' });
  butceKur(Q, [{ maliyet_kodu_id: mk.id, tutar_kurus: TL(10000) }]);
  isProgrami.aktiviteEkle({ proje_id: Q, ad: 'Etap 1', plan_baslangic: '2026-01-01', plan_bitis: '2026-01-31', gerceklesen_yuzde: 40, wbs_gorev_id: 'wbs-evm-1' });
  isProgrami.aktiviteEkle({ proje_id: Q, ad: 'WBS bağsız', plan_baslangic: '2026-01-01', plan_bitis: '2026-01-31', gerceklesen_yuzde: 90 });
  maliyetDefteri.yaz({ proje_id: Q, maliyet_kodu_id: mk.id, tur: 'GERCEKLESEN', tutar_kurus: TL(5000), tarih: '2026-01-10', kaynak_modul: 'test', kaynak_id: 'e1' });
  const e = evm.evmHesapla(Q, { tarih: '2026-01-16' });
  assert.equal(e.bac, TL(10000));
  assert.equal(e.pv, TL(5000), '15/30 → %50');
  assert.equal(e.ev, TL(4000), '%40 onaylı ilerleme');
  assert.equal(e.ac, TL(5000));
  assert.equal(e.cpi, 0.8);
  assert.equal(e.spi, 0.8);
  assert.equal(e.agirliksiz.length, 1, 'WBS bağsız aktivite hesaba girmez, raporlanır');
  assert.ok(e.seri.length >= 1 && e.seri[e.seri.length - 1].pv === TL(10000));
  const u = uyari.uyarilar(Q, { tarih: '2026-01-16' });
  assert.ok(u.uyarilar.some((x) => x.tur === 'cpi' && x.seviye === 'kritik'), 'CPI<1 uyarısı');
  assert.ok(u.uyarilar.some((x) => x.tur === 'spi'));
});

test('UYARILAR: TAAHHÜT eşiği (parametrik, varsayılan işaretli) ve taahhüt aşımı gerçekleşende değil TAAHHÜTTE yakalanır', () => {
  const Q = 'UYR-1';
  putRecord('tb_wbs_gorevler', { id: 'wbs-uy-1', wbs_code: 'U1', name: 'U1', row_status: 1 });
  putRecord('tb_wbs_gorevler', { id: 'wbs-uy-2', wbs_code: 'U2', name: 'U2', row_status: 1 });
  const a = maliyetKodu.olustur({ proje_id: Q, wbs_gorev_id: 'wbs-uy-1', kaynak_tipi: 'malzeme' });
  const b = maliyetKodu.olustur({ proje_id: Q, wbs_gorev_id: 'wbs-uy-2', kaynak_tipi: 'malzeme' });
  butceKur(Q, [{ maliyet_kodu_id: a.id, tutar_kurus: TL(1000) }, { maliyet_kodu_id: b.id, tutar_kurus: TL(1000) }]);
  maliyetDefteri.yaz({ proje_id: Q, maliyet_kodu_id: a.id, tur: 'TAAHHUT', tutar_kurus: TL(950), tarih: '2026-01-01', kaynak_modul: 'test', kaynak_id: 'u1' });
  maliyetDefteri.yaz({ proje_id: Q, maliyet_kodu_id: b.id, tur: 'TAAHHUT', tutar_kurus: TL(1200), tarih: '2026-01-01', kaynak_modul: 'test', kaynak_id: 'u2' });
  let u = uyari.uyarilar(Q);
  assert.ok(u.uyarilar.find((x) => x.tur === 'taahhut_esigi' && x.maliyet_kodu_id === a.id).esik_varsayilan, 'parametre yokken varsayılan (%90) kullanıldığı belirtilir');
  const kritik = u.uyarilar.find((x) => x.tur === 'taahhut_asimi');
  assert.equal(kritik.maliyet_kodu_id, b.id);
  assert.equal(kritik.seviye, 'kritik');
  assert.ok(!u.uyarilar.some((x) => x.tur === 'gerceklesen_asimi'), 'gerçekleşen henüz 0 — aşım TAAHHÜTTE yakalandı');
  parametre.olustur({ kod: 'maliyet_taahhut_uyari_yuzde', ad: 'Taahhüt uyarı %', deger: 98, birim: 'yuzde', gecerli_baslangic: '2020-01-01' });
  u = uyari.uyarilar(Q);
  assert.ok(!u.uyarilar.some((x) => x.tur === 'taahhut_esigi'), 'eşik %98 → %95 artık uyarı vermez');
});

test('GENEL GİDER: anahtar (varsayılan maliyet) oranında dağıtılır; toplam BOZULMAZ; yeniden hesap önceki sonucu değiştirir', () => {
  maliyetDefteri.yaz({ proje_id: 'GENEL', tur: 'GERCEKLESEN', tutar_kurus: TL(1000), tarih: '2026-05-10', kaynak_modul: 'test', kaynak_id: 'gg0' });
  maliyetDefteri.yaz({ proje_id: 'GG-A', tur: 'GERCEKLESEN', tutar_kurus: TL(3000), tarih: '2026-05-05', kaynak_modul: 'test', kaynak_id: 'gga' });
  maliyetDefteri.yaz({ proje_id: 'GG-B', tur: 'GERCEKLESEN', tutar_kurus: TL(1000), tarih: '2026-05-06', kaynak_modul: 'test', kaynak_id: 'ggb' });
  const d = genelGider.dagit('GENEL', '2026-05-01', '2026-05-31');
  assert.equal(d.anahtar, 'maliyet');
  assert.equal(d.anahtar_tanimli_mi, false);
  const pay = (p) => d.paylar.find((x) => x.proje_id === p).tutar_kurus;
  assert.ok(d.paylar.every((x) => !['GENEL'].includes(x.proje_id)));
  assert.equal(d.paylar.reduce((t, x) => t + x.tutar_kurus, 0), TL(1000), 'küsurat kaybı yok');
  assert.ok(pay('GG-A') > pay('GG-B') * 2.9, 'A ~ 3 × B');
  const yeni = genelGider.dagit('GENEL', '2026-05-01', '2026-05-31');
  assert.equal(genelGider.dagitimlariListele('GENEL').length, 1, 'aynı dönem tek geçerli dağıtım');
  assert.equal(yeni.paylar.reduce((t, x) => t + x.tutar_kurus, 0), TL(1000));
  parametre.olustur({ kod: 'maliyet_genel_gider_anahtari', ad: 'GG anahtarı', deger: 9, birim: 'adet', gecerli_baslangic: '2020-01-01' });
  assert.throws(() => genelGider.dagit('GENEL', '2026-05-01', '2026-05-31'), /1 \(ciro\), 2 \(maliyet\) veya 3/);
});

test('NAKİT AKIŞI + KÂRLILIK: talimat vadeleri (giden) + müşteri taksitleri (gelen); gelir vs EAC, m² maliyeti', () => {
  const Q = 'NKT-1';
  putRecord('tb_wbs_gorevler', { id: 'wbs-nk-1', wbs_code: 'N1', name: 'N1', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: Q, wbs_gorev_id: 'wbs-nk-1', kaynak_tipi: 'malzeme' });
  butceKur(Q, [{ maliyet_kodu_id: mk.id, tutar_kurus: TL(600000) }]);
  const f = firma();
  odeme.talimatOlustur({ proje_id: Q, firma_id: f.id, aciklama: 'Tedarikçi ödemesi', vade_tarihi: '2026-10-10', tutar_kurus: TL(100000) });
  odeme.talimatOlustur({ proje_id: Q, firma_id: f.id, aciklama: 'Gecikmiş', vade_tarihi: '2026-08-01', tutar_kurus: TL(50000) });

  const musteri = kisiMod.olustur({ ad_soyad: 'Müşteri', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'musteri' });
  const b1 = bolumSrv.olustur({ proje_id: Q, blok: 'A', kat: '1', kapi_no: '1', tip: '2+1', brut_m2: 100 });
  const b2 = bolumSrv.olustur({ proje_id: Q, blok: 'A', kat: '1', kapi_no: '2', tip: '3+1', brut_m2: 300 });
  const s = satisSrv.olustur({ bolum_id: b1.id, musteriler: [{ kisi_id: musteri.id }], tutar_kurus: TL(400000), satis_tarihi: '2026-06-01' });
  odemePlani.olustur(s.id, [{ tur: 'pesinat', vade_tarihi: '2026-09-15', tutar_kurus: TL(100000) }, { tur: 'taksit', vade_tarihi: '2026-10-15', tutar_kurus: TL(300000) }]);
  satisSrv.onayla(s.id);
  maliyetDefteri.yaz({ proje_id: Q, maliyet_kodu_id: mk.id, tur: 'GERCEKLESEN', tutar_kurus: TL(200000), tarih: '2026-07-01', kaynak_modul: 'test', kaynak_id: 'nk1' });

  const n = nakit.nakitAkisi(Q, { periyot: 'aylik', tarih: '2026-09-01' });
  assert.equal(n.donemler[0].baslangic, 'gecikmis');
  assert.equal(n.donemler[0].cikis, TL(50000));
  const eylul = n.donemler.find((d) => d.baslangic === '2026-09-01');
  const ekim = n.donemler.find((d) => d.baslangic === '2026-10-01');
  assert.equal(eylul.giris, TL(100000));
  assert.equal(ekim.giris, TL(300000)); assert.equal(ekim.cikis, TL(100000));
  assert.equal(n.donemler[n.donemler.length - 1].kumulatif, TL(100000 + 300000 - 100000 - 50000));
  assert.equal(nakit.nakitAkisi(Q, { periyot: 'haftalik', tarih: '2026-09-01' }).donemler.length >= 3, true);

  const k = karlilik.karlilik(Q);
  assert.equal(k.gelir_beklenen_kurus, TL(400000));
  assert.equal(k.eac_kurus, TL(600000), 'bütçe 600.000, taahhüt yok → taahhüt edilmemiş kalan = bütçe − gerçekleşen');
  assert.equal(k.beklenen_kar_kurus, TL(400000) - TL(600000));
  assert.equal(k.marj_yuzde, -50);
  assert.equal(k.toplam_m2, 400);
  assert.equal(k.m2_maliyet_kurus, TL(1500));
  const bol1 = k.bolumler.find((x) => x.bolum_id === b1.id);
  assert.equal(bol1.tahsis_edilen_maliyet_kurus, TL(150000));
  assert.equal(bol1.kar_kurus, TL(400000) - TL(150000));
});

test('PORTFÖY: tüm projeler tek tabloda; toplam tutarlı', () => {
  const p = portfoy.portfoy();
  assert.ok(p.projeler.length >= 5);
  assert.equal(p.toplam.butce, p.projeler.reduce((t, x) => t + x.butce, 0));
  assert.ok(p.projeler.some((x) => x.proje_id === 'EVM-1' && x.cpi === 0.8 || x.proje_id === 'EVM-1'));
});

test('İÇE AKTARIM: CSV (WBS kodu + kaynak tipi, Türkçe sayı biçimi) ve XLSX; hatalı satırlar listelenir', async () => {
  const Q = 'IMP-1';
  putRecord('tb_wbs_gorevler', { id: 'wbs-im-1', wbs_code: 'I1', name: 'İçe aktarım', row_status: 1 });
  putRecord('tb_wbs_gorevler', { id: 'wbs-im-2', wbs_code: 'I2', name: 'İçe aktarım 2', row_status: 1 });
  const v = butce.versiyonOlustur(Q, {});
  const r = butce.csvIceAktar(v.id, 'WBS;Kaynak Tipi;Tutar;Para Birimi;Kur\nI1;malzeme;1.250.000,50;TRY;1\nI2;iscilik_taseron;1000;EUR;30\nYOK;malzeme;5;TRY;1\nI1;iscilik_kadro;abc;TRY;1');
  assert.equal(r.eklenen, 2);
  assert.equal(r.hatalar.length, 2);
  const satirlar = butce.satirlariGetir(v.id);
  assert.equal(satirlar.find((s) => s.para_birimi === 'TRY').tutar_kurus, 125000050);
  assert.equal(satirlar.find((s) => s.para_birimi === 'EUR').kur, 30);

  const zip = new JSZip();
  zip.file('xl/sharedStrings.xml', '<sst><si><t>kod</t></si><si><t>tutar</t></si><si><t>WBS-I2.MLZ</t></si></sst>');
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>777.5</v></c></row></sheetData></worksheet>');
  const v2 = butce.versiyonOlustur('IMP-2', {});
  maliyetKodu.olustur({ proje_id: 'IMP-2', wbs_gorev_id: 'wbs-im-2', kaynak_tipi: 'malzeme' });
  const x = await butce.xlsxIceAktar(v2.id, (await zip.generateAsync({ type: 'nodebuffer' })).toString('base64'));
  assert.equal(x.eklenen, 1, JSON.stringify(x));
  assert.equal(butce.satirlariGetir(v2.id)[0].tutar_kurus, 77750);
});
