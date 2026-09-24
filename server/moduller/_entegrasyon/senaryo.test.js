// P11 — Uçtan uca entegrasyon senaryosu (TEK proje, 9 modül). Her adımda
// beklenen Maliyet Defteri kaydı assert edilir. Adımlar sırayla çalışır ve
// paylaşılan duruma (S) yazar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const M = (p) => import(`../${p}`);
const [
  cariFirma, kisiMod, maliyetKodu, maliyetDefteri, parametre, odeme, sozlesme,
  bolum, satis, odemePlani, tahsilat,
  hakedis, evrak, altKesinti, performans,
  ekip, puantajTaseron, odemeDonemi, taseronKesinti,
  talep, teklif, siparis, fatura, malKabul, stok, malzeme, depo,
  personel, pdks, bordro,
  gunlukRapor, kalite, isProgrami,
  butce, rapor, evm, nakit, mutabakat, uyari,
] = await Promise.all([
  '_cekirdek/cariFirma.js', '_cekirdek/kisi.js', '_cekirdek/maliyetKodu.js', '_cekirdek/maliyetDefteri.js', '_cekirdek/parametre.js', '_cekirdek/odeme.js', 'sozlesme/sozlesme.js',
  'musteri/bolum.js', 'musteri/satis.js', 'musteri/odemePlani.js', 'musteri/tahsilat.js',
  'altyuklenici/hakedis.js', 'altyuklenici/evrak.js', 'altyuklenici/kesinti.js', 'altyuklenici/performans.js',
  'taseron/ekip.js', 'taseron/puantajTaseron.js', 'taseron/odemeDonemi.js', 'taseron/kesinti.js',
  'satinalma/talep.js', 'satinalma/teklif.js', 'satinalma/siparis.js', 'satinalma/fatura.js', 'depo/malKabul.js', 'depo/stok.js', 'depo/malzeme.js', 'depo/depo.js',
  'ik/personel.js', 'ik/pdks.js', 'ik/bordroDonemi.js',
  'santiye/gunlukRapor.js', 'santiye/kalite.js', 'santiye/isProgrami.js',
  'maliyet/butce.js', 'maliyet/rapor.js', 'maliyet/evm.js', 'maliyet/nakit.js', 'maliyet/mutabakat.js', 'maliyet/uyari.js',
].map(M));
const { putRecord } = await import('../../db.js');

const P = 'ENT-1';
const TL = (x) => x * 100;
const tckn = () => String(Math.floor(10000000000 + Math.random() * 89999999999));
let vkn = 9500000000;
const firma = (roller) => { vkn += 1; return cariFirma.olustur({ unvan: `Firma ${vkn}`, vkn_tckn: String(vkn), roller }); };
const defter = (modul, tur) => maliyetDefteri.projeIcinListele(P).filter((h) => h.kaynak_modul === modul && (!tur || h.tur === tur) && !h.iptal_edildi);
const topla = (liste) => liste.reduce((t, h) => t + h.tutar_kurus, 0);

putRecord('tb_wbs_gorevler', { id: 'ent-w1', wbs_code: 'E1', name: 'Kaba İnşaat (alt yüklenici)', row_status: 1 });
putRecord('tb_wbs_gorevler', { id: 'ent-w2', wbs_code: 'E2', name: 'Kalıp (taşeron)', row_status: 1 });
putRecord('tb_wbs_gorevler', { id: 'ent-w3', wbs_code: 'E3', name: 'Malzeme / Kadro', row_status: 1 });
const mkAY = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'ent-w1', kaynak_tipi: 'alt_yuklenici' });
const mkTS = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'ent-w2', kaynak_tipi: 'iscilik_taseron' });
const mkMZ = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'ent-w3', kaynak_tipi: 'malzeme' });
const mkKD = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'ent-w3', kaynak_tipi: 'iscilik_kadro' });
const S = {};

test('1) SATIŞ: sözleşme (P2) + ödeme planı + tahsilat → GELİR taahhüdü ve tahsilat defterde', () => {
  const musteri = kisiMod.olustur({ ad_soyad: 'Müşteri A', tckn: tckn(), rol: 'musteri' });
  const b = bolum.olustur({ proje_id: P, blok: 'A', kat: '1', kapi_no: '1', tip: '3+1', brut_m2: 120 });
  bolum.fiyatTanimla(b.id, TL(1500000), '2026-01-01');
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: musteri.id }], satis_tarihi: '2026-02-01' });
  odemePlani.olustur(s.id, [
    { tur: 'pesinat', vade_tarihi: '2026-02-01', tutar_kurus: TL(300000) },
    { tur: 'taksit', vade_tarihi: '2026-10-01', tutar_kurus: TL(400000) },
    { tur: 'taksit', vade_tarihi: '2026-11-01', tutar_kurus: TL(400000) },
    { tur: 'taksit', vade_tarihi: '2026-12-01', tutar_kurus: TL(400000) },
  ]);
  satis.onayla(s.id);
  const g = defter('sozlesme', 'GELIR');
  assert.equal(g.length, 1); assert.equal(g[0].tutar_kurus, TL(1500000));
  tahsilat.kaydet({ satis_id: s.id, tutar_kurus: TL(300000), tarih: '2026-02-05', yontem: 'havale' });
  const t = defter('musteri_tahsilat', 'GELIR');
  assert.equal(t.length, 1); assert.equal(t[0].tutar_kurus, TL(300000));
  S.satis = s;
});

test('2) ALT YÜKLENİCİ: sözleşme TAAHHÜT + 2 hakediş → 2 GERÇEKLEŞEN (hakediş başına kalem)', () => {
  const f = firma(['alt_yuklenici']);
  const s = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: P, konu: 'Kaba yapı', bedel_kurus: TL(1000000), baslangic_tarihi: '2026-03-01', taraf_firma_id: f.id });
  const kalem = sozlesme.kalemEkle(s.id, { wbs_gorev_id: 'ent-w1', aciklama: 'Kaba yapı', birim: 'm3', miktar: 200, birim_fiyat_kurus: TL(5000) });
  sozlesme.durumDegistir(s.id, 'onayda'); sozlesme.durumDegistir(s.id, 'imzali');
  const taahhut = defter('sozlesme', 'TAAHHUT').filter((h) => h.kaynak_id.startsWith(`${s.id}:kalem-`));
  assert.equal(taahhut.length, 1); assert.equal(taahhut[0].tutar_kurus, TL(1000000));
  assert.equal(taahhut[0].maliyet_kodu_id, mkAY.id, 'P11 düzeltmesi: sözleşme taahhüdü WBS kalemi üzerinden alt yüklenici maliyet koduna yazılır (kodsuz DEĞİL)');
  for (const tur of ['sgk_isyeri_sicili', 'sigorta', 'isg_uzmani_atamasi', 'calisan_listesi']) evrak.ekleVeyaGuncelle(s.id, tur, { gecerlilik_baslangic: '2026-01-01', gecerlilik_bitis: '2030-01-01' });
  const donem = (bas, bit, miktar) => {
    const h = hakedis.olustur({ sozlesme_id: s.id, donem_baslangic: bas, donem_bitis: bit });
    const hk = hakedis.kalemEkle(h.id, kalem.id);
    hakedis.durumDegistir(h.id, 'alt_yuklenici_beyani'); hakedis.beyanGir(hk.id, miktar);
    hakedis.durumDegistir(h.id, 'santiye_onayi'); hakedis.onayGir(hk.id, miktar);
    hakedis.durumDegistir(h.id, 'teknik_ofis'); hakedis.durumDegistir(h.id, 'onayli');
    return h;
  };
  const h1 = donem('2026-03-01', '2026-03-31', 60);
  const h2 = donem('2026-04-01', '2026-04-30', 40);
  const gerc = defter('altyuklenici_hakedis', 'GERCEKLESEN');
  assert.equal(gerc.length, 2);
  assert.deepEqual(gerc.map((h) => h.tutar_kurus).sort((a, b) => a - b), [TL(200000), TL(300000)]);
  assert.ok(gerc.every((h) => h.maliyet_kodu_id === mkAY.id));
  const tal = hakedis.odemeTalimatiOlustur(h1.id, '2026-05-15');
  assert.equal(tal.tutar_kurus, TL(300000));
  S.altSoz = s; S.hakedisler = [h1, h2]; S.talimatlar = [tal];
});

test('3) TAŞERON: 2 haftalık puantaj (2 işçi × 14 gün) + avans; dönem henüz açık → defterde YOK', () => {
  const f = firma(['taseron']);
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: P, konu: 'Kalıp işleri', bedel_kurus: TL(100000), baslangic_tarihi: '2026-05-01', taraf_firma_id: f.id });
  const e = ekip.olustur({ sozlesme_id: s.id, odeme_tipi: 'yevmiye' });
  S.tsFirma = f; S.tsSoz = s; S.tsEkip = e; S.uyeler = [];
  for (let i = 0; i < 2; i++) {
    const k = kisiMod.olustur({ ad_soyad: `Usta ${i}`, tckn: tckn(), rol: 'taseron_iscisi', firma_id: f.id, isg_egitim_tarihi: '2026-01-01', isg_egitim_gecerlilik_tarihi: '2030-01-01' });
    const u = ekip.uyeEkle(e.id, { kisi_id: k.id, baslangic_tarihi: '2026-01-01', sgk_giris_bildirge_tarihi: '2026-01-01' });
    ekip.yevmiyeTanimla(u.id, TL(1000), '2026-01-01');
    S.uyeler.push({ k, u });
    for (let g = 4; g <= 17; g++) puantajTaseron.kaydet({ ekip_uye_id: u.id, tarih: `2026-05-${String(g).padStart(2, '0')}`, gun_degeri: 1, maliyet_kodu_id: mkTS.id });
  }
  S.donem = odemeDonemi.olustur({ ekip_id: e.id, donem_baslangic: '2026-05-04', donem_bitis: '2026-05-17' });
  const hesap = odemeDonemi.hesapla(S.donem.id);
  assert.equal(hesap.brut_tutar_kurus, TL(28000), '28 işçi-günü × 1.000 TL');
  taseronKesinti.ekle(S.donem.id, { tur: 'avans', tutar_kurus: TL(3000), aciklama: 'Nakit avans' });
  assert.equal(defter('taseron_odeme_donemi').length, 0, 'dönem kapanmadan GERÇEKLEŞEN yazılmaz');
});

test('4) SATINALMA: talep → 3 teklif → sipariş (onayda TAAHHÜT); KISMİ mal kabul deftere YAZMAZ; stoklu fatura YAZMAZ', () => {
  const t = talep.olustur({ proje_id: P, ihtiyac_tarihi: '2026-05-10' });
  const tk = talep.kalemEkle(t.id, { aciklama: 'Çimento', miktar: 10, birim: 'ton' });
  const teklifler = [];
  for (let i = 0; i < 3; i++) {
    const f = firma(['tedarikci']);
    const x = teklif.talepGonder({ talep_id: t.id, firma_id: f.id });
    teklif.teklifiGir(x.id, [{ talep_kalem_id: tk.id, miktar: 10, birim_fiyat_kurus: TL(5000) + i * 1000 }]);
    teklifler.push(x);
  }
  S.depo = depo.olustur({ proje_id: P, ad: 'Şantiye Deposu', tur: 'santiye' });
  S.cimento = malzeme.olustur({ kod: 'ENT-CIM', ad: 'Çimento', birim: 'ton', stoklu_mu: true });
  const s = siparis.olustur({ proje_id: P, firma_id: teklifler[0].firma_id, talep_id: t.id, teklif_id: teklifler[0].id, maliyet_kodu_id: mkMZ.id, teslim_tarihi: '2026-05-05' });
  S.spKalem = siparis.kalemEkle(s.id, { malzeme_id: S.cimento.id, aciklama: 'Çimento', birim: 'ton', miktar: 10, birim_fiyat_kurus: TL(5000), kdv_orani: 20 });
  siparis.durumDegistir(s.id, 'onaylandi');
  const ta = defter('satinalma_siparis', 'TAAHHUT');
  assert.equal(ta.length, 1); assert.equal(ta[0].tutar_kurus, TL(60000), '10 ton × 5.000 × 1,2 KDV');
  const oncesi = maliyetDefteri.projeIcinListele(P).length;
  malKabul.kaydet({ siparis_kalem_id: S.spKalem.id, depo_id: S.depo.id, gelen_miktar: 6, kabul_miktar: 6, tarih: '2026-05-05' });
  assert.equal(siparis.getir(s.id).durum, 'kismi_teslim');
  assert.equal(stok.bakiyeGetir(S.depo.id, S.cimento.id).mevcut_miktar, 6);
  const f = fatura.kaydet({ siparis_id: s.id, firma_id: teklifler[0].firma_id, fatura_no: 'ENT-F1', fatura_tarihi: '2026-05-06', vade_tarihi: '2026-06-06', kalemler: [{ siparis_kalem_id: S.spKalem.id, miktar: 6, birim_fiyat_kurus: TL(5000), kdv_orani: 20 }] });
  assert.equal(maliyetDefteri.projeIcinListele(P).length, oncesi, 'mal kabul + stoklu fatura defterde SATIR YARATMAZ (Maliyet Kuralı)');
  S.siparis = s; S.fatura = f;
});

test('5) DEPO: taşerona çıkış (kesinti adayı) → GERÇEKLEŞEN; malzeme kesintisi dönem netine düşer; dönem KAPANINCA malzeme maliyeti ÇİFT SAYILMAZ', () => {
  const c = stok.cikis({ depo_id: S.depo.id, malzeme_id: S.cimento.id, miktar: 4, birim: 'ton', proje_id: P, maliyet_kodu_id: mkMZ.id, teslim_alan_tipi: 'taseron_ekibi', kesinti_adayi_mi: true, sozlesme_id: S.tsSoz.id, tarih: '2026-05-08' });
  const cikisDefter = defter('depo_stok_hareketi', 'GERCEKLESEN');
  assert.equal(cikisDefter.length, 1); assert.equal(cikisDefter[0].tutar_kurus, TL(20000), '4 ton × ort. 5.000');
  const eklenen = taseronKesinti.malzemeFireKesintisiEkle(S.donem.id, S.tsSoz.id);
  assert.equal(eklenen.length, 1); assert.equal(eklenen[0].tutar_kurus, TL(20000));
  odemeDonemi.tutarlariYenidenHesapla(S.donem.id);
  for (const d of ['sef_onayi', 'proje_muduru_onayi', 'kapandi']) odemeDonemi.durumDegistir(S.donem.id, d);
  const kapali = odemeDonemi.getir(S.donem.id);
  assert.equal(kapali.brut_tutar_kurus, TL(28000));
  assert.equal(kapali.kesintiler_toplam_kurus, TL(3000) + TL(20000));
  assert.equal(kapali.net_tutar_kurus, TL(5000), '28.000 − 3.000 avans − 20.000 malzeme');
  const ts = defter('taseron_odeme_donemi', 'GERCEKLESEN');
  assert.equal(ts.filter((h) => h.kaynak_id.includes('puantaj-')).length, 28, 'her puantaj kaydı ayrı satır');
  assert.equal(topla(ts.filter((h) => h.kaynak_id.includes('puantaj-'))), TL(28000));
  // ÇİFT SAYIM KONTROLÜ: taşerondan kesilen malzeme bedeli proje maliyetini İKİ KEZ artırmamalı
  const projeMaliyeti = topla(maliyetDefteri.projeIcinListele(P).filter((h) => h.tur === 'GERCEKLESEN' && ['taseron_odeme_donemi', 'depo_stok_hareketi'].includes(h.kaynak_modul)));
  assert.equal(projeMaliyeti, TL(28000), 'taşeron brüt 28.000 (içinde bize geri kesilen 20.000 malzeme dahil) → malzeme kesintisi ters kayıtla düşülür');
  S.cikis = c;
});

test('6) İK: personel puantajı (10 gün) + bordro ön hazırlık → GERÇEKLEŞEN (işçilik-kadro) = brüt hak ediş', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Personel Ali', tckn: tckn(), rol: 'personel' });
  const p = personel.olustur({ kisi_id: k.id, sicil_no: 'ENT-P1', ise_giris_tarihi: '2025-01-01' });
  personel.ucretTanimla(p.id, TL(30000), '2025-01-01');
  for (let g = 4; g <= 13; g++) pdks.kaydet({ personel_id: p.id, proje_id: P, tarih: `2026-05-${String(g).padStart(2, '0')}`, yontem: 'kartli', giris_saati: '08:00', cikis_saati: '17:00', maliyet_kodu_id: mkKD.id });
  const d = bordro.olustur({ donem_yil: 2026, donem_ay: 5 });
  const satir = bordro.personelHesapla(d.id, p.id);
  assert.equal(satir.calisilan_gun, 10);
  assert.equal(satir.brut_maas_kurus, TL(10000), '10 gün × 30.000/30');
  bordro.durumDegistir(d.id, 'onaylandi');
  const g = defter('ik_bordro_donemi', 'GERCEKLESEN');
  assert.equal(g.length, 1); assert.equal(g[0].tutar_kurus, TL(10000)); assert.equal(g[0].maliyet_kodu_id, mkKD.id);
  S.personel = p;
});

test('7) ŞANTİYE: günlük rapor puantaj+mal kabulü çeker; NCR alt yükleniciye → P5 performans olayı; NCR defterde satır YARATMAZ', () => {
  const r = gunlukRapor.olustur(P, '2026-05-05');
  const cal = r.bolumler.filter((b) => b.tur === 'calisan');
  assert.equal(cal.reduce((t, b) => t + b.otomatik_sayi, 0), 3, '2 taşeron işçisi + 1 personel');
  assert.equal(r.bolumler.filter((b) => b.tur === 'malzeme')[0].otomatik_sayi, 6, 'kısmi mal kabul');
  const oncesi = maliyetDefteri.projeIcinListele(P).length;
  const n = kalite.ncrAc({ proje_id: P, baslik: 'Donatı paspayı', sorumlu_tipi: 'alt_yuklenici', sorumlu_id: S.altSoz.id });
  assert.equal(performans.olaylariListele(S.altSoz.id).filter((o) => o.tur === 'ncr').length, 1);
  assert.equal(maliyetDefteri.projeIcinListele(P).length, oncesi);
  S.ncr = n;
});

test('8) MALİYET: bütçe + rapor + EAC + kâr + nakit akışı — defter toplamlarıyla TUTARLI; mutabakat HATASIZ', () => {
  const v = butce.versiyonOlustur(P, {});
  for (const [k, t] of [[mkAY, 1000000], [mkTS, 30000], [mkMZ, 70000], [mkKD, 12000]]) butce.satirKaydet(v.id, { maliyet_kodu_id: k.id, tutar_kurus: TL(t) });
  butce.onayla(v.id, 'GM');
  const r = rapor.maliyetRaporu(P);
  const kod = (id) => r.satirlar.flatMap((w) => w.kodlar).find((k) => k.maliyet_kodu_id === id);
  assert.equal(kod(mkAY.id).gerceklesen, TL(500000));
  assert.equal(kod(mkAY.id).taahhut, TL(1000000));
  assert.equal(kod(mkAY.id).eac, TL(1000000), 'gerçekleşen 500k + kalan taahhüt 500k');
  assert.equal(kod(mkTS.id).gerceklesen, TL(28000));
  assert.equal(kod(mkKD.id).gerceklesen, TL(10000));
  assert.equal(kod(mkMZ.id).taahhut, TL(60000));
  assert.equal(kod(mkMZ.id).gerceklesen, 0, 'çıkış maliyeti taşerondan geri kesildiği için net 0');
  assert.equal(r.toplam.gerceklesen, TL(500000 + 28000 + 10000), 'proje toplamı = hakediş + taşeron + bordro');
  assert.equal(r.gelir.beklenen_kurus, TL(1500000));
  assert.equal(r.gelir.tahsil_edilen_kurus, TL(300000));

  const n = nakit.nakitAkisi(P, { periyot: 'aylik', tarih: '2026-09-24' });
  assert.equal(n.toplam_giris_kurus, TL(1200000), 'müşteri kalan taksitleri');
  assert.equal(n.toplam_cikis_kurus, S.talimatlar.reduce((t, x) => t + x.tutar_kurus, 0), 'onay bekleyen hakediş talimatı');

  const m = mutabakat.mutabakatRaporu(P);
  assert.deepEqual(m.bulgular.filter((b) => b.seviye === 'hata'), [], JSON.stringify(m.bulgular.filter((b) => b.seviye === 'hata'), null, 1));
  assert.ok(uyari.uyarilar(P).uyarilar.every((u) => u.tur !== 'butce_uyumsuz'));
});
