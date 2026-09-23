import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const siparis = await import('./siparis.js');
const malKabul = await import('./malKabul.js');
const fatura = await import('./fatura.js');
const malzeme = await import('../depo/malzeme.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');
const odeme = await import('../_cekirdek/odeme.js');

const PROJE = 'IGA-ETAP-1';
let vknSayaci = 4000000000;

function firmaHazirla() {
  vknSayaci += 1;
  return cariFirma.olustur({ unvan: `Tedarikçi ${vknSayaci}`, vkn_tckn: String(vknSayaci), roller: ['tedarikci'] });
}

/** Onaylanmış, iki kalemli (biri stoklu malzeme, biri stoklu olmayan hizmet) bir sipariş hazırlar. */
function siparisHazirla() {
  const firma = firmaHazirla();
  const cimento = malzeme.olustur({ kod: `CIM-${vknSayaci}`, ad: 'Çimento 42.5R', birim: 'ton', stoklu_mu: true });
  const s = siparis.olustur({ proje_id: PROJE, firma_id: firma.id, teslim_tarihi: '2026-11-01' });
  const kalemStoklu = siparis.kalemEkle(s.id, { malzeme_id: cimento.id, aciklama: 'Çimento 42.5R', birim: 'ton', miktar: 10, birim_fiyat_kurus: 500000, kdv_orani: 20 });
  const kalemHizmet = siparis.kalemEkle(s.id, { aciklama: 'Nakliye Hizmeti', birim: 'sefer', miktar: 1, birim_fiyat_kurus: 200000, kdv_orani: 20 }); // malzeme_id YOK -> stoklu sayılmaz
  siparis.durumDegistir(s.id, 'onaylandi');
  return { firma, siparis: siparis.getir(s.id), kalemStoklu, kalemHizmet };
}

test('faturaKaydet: STOKLU malzeme için GERÇEKLEŞEN YAZILMAZ, stoklu olmayan (hizmet) için YAZILIR', () => {
  const { firma, siparis: s, kalemStoklu, kalemHizmet } = siparisHazirla();
  malKabul.kaydet({ siparis_kalem_id: kalemStoklu.id, miktar: 10, tarih: '2026-10-15' });
  malKabul.kaydet({ siparis_kalem_id: kalemHizmet.id, miktar: 1, tarih: '2026-10-15' });

  const f = fatura.kaydet({
    siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-0001', fatura_tarihi: '2026-10-16', vade_tarihi: '2026-11-16',
    kalemler: [
      { siparis_kalem_id: kalemStoklu.id, miktar: 10, birim_fiyat_kurus: 500000, kdv_orani: 20 },
      { siparis_kalem_id: kalemHizmet.id, miktar: 1, birim_fiyat_kurus: 200000, kdv_orani: 20 },
    ],
  });

  const hareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'satinalma_fatura' && h.kaynak_id.startsWith(`${f.id}:`));
  assert.equal(hareketler.length, 1, 'YALNIZCA hizmet kalemi için GERÇEKLEŞEN yazılmalı — stoklu malzeme İÇİN YAZILMAMALI (P4 Depo çıkışında yazacak)');
  assert.equal(hareketler[0].tur, 'GERCEKLESEN');
  assert.equal(hareketler[0].tutar_kurus, 200000, 'yazılan tek kayıt hizmet kalemine ait olmalı (1 × 200.000)');
});

test('kaydet: aynı firmadan aynı fatura numarası İKİNCİ kez girilemez (mükerrer fatura)', () => {
  const { firma, siparis: s, kalemHizmet } = siparisHazirla();
  fatura.kaydet({ siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-DUP', fatura_tarihi: '2026-10-16', vade_tarihi: '2026-11-16', kalemler: [{ siparis_kalem_id: kalemHizmet.id, miktar: 1, birim_fiyat_kurus: 200000 }] });
  assert.throws(
    () => fatura.kaydet({ siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-DUP', fatura_tarihi: '2026-10-17', vade_tarihi: '2026-11-17', kalemler: [{ siparis_kalem_id: kalemHizmet.id, miktar: 1, birim_fiyat_kurus: 200000 }] }),
    /mükerrer fatura girişi engellendi/
  );
});

test('eslestir: KISMİ TESLİM + FAZLA FATURALANMIŞ senaryo "miktar_asimi" istisnası olarak yakalanır (KABUL kriteri)', () => {
  const { firma, siparis: s, kalemStoklu } = siparisHazirla();
  malKabul.kaydet({ siparis_kalem_id: kalemStoklu.id, miktar: 6, tarih: '2026-10-15' }); // 10 sipariş edildi, yalnızca 6 teslim alındı
  assert.equal(siparis.getir(s.id).durum, 'kismi_teslim');

  const f = fatura.kaydet({
    siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-ASIM', fatura_tarihi: '2026-10-16', vade_tarihi: '2026-11-16',
    kalemler: [{ siparis_kalem_id: kalemStoklu.id, miktar: 8, birim_fiyat_kurus: 500000, kdv_orani: 20 }], // 8 faturalandı — teslim alınandan (6) FAZLA
  });

  const sonuc = fatura.eslestir(f.id);
  assert.equal(sonuc.durum, 'eslesme_istisna');
  const miktarIstisnasi = sonuc.istisnalar.find((i) => i.tur === 'miktar_asimi');
  assert.ok(miktarIstisnasi, 'miktar_asimi istisnası üretilmeli');
  assert.equal(miktarIstisnasi.detay.faturalananMiktar, 8);
  assert.equal(miktarIstisnasi.detay.teslimAlinanMiktar, 6);
});

test('eslestir: tolerans üstü fiyat sapması "fiyat_sapmasi" istisnası olarak yakalanır', () => {
  const { firma, siparis: s, kalemHizmet } = siparisHazirla(); // sipariş birim fiyatı 200.000
  malKabul.kaydet({ siparis_kalem_id: kalemHizmet.id, miktar: 1, tarih: '2026-10-15' });
  const f = fatura.kaydet({
    siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-FIYAT', fatura_tarihi: '2026-10-16', vade_tarihi: '2026-11-16',
    kalemler: [{ siparis_kalem_id: kalemHizmet.id, miktar: 1, birim_fiyat_kurus: 260000, kdv_orani: 20 }], // %30 sapma — varsayılan %2 toleransı aşar
  });
  const sonuc = fatura.eslestir(f.id);
  assert.equal(sonuc.durum, 'eslesme_istisna');
  assert.ok(sonuc.istisnalar.some((i) => i.tur === 'fiyat_sapmasi'));
});

test('eslestir: sipariş ile birebir uyumlu fatura İSTİSNASIZ eşleşir; ardından Çekirdek Ödeme Talimatı oluşturulabilir', () => {
  const { firma, siparis: s, kalemHizmet } = siparisHazirla();
  malKabul.kaydet({ siparis_kalem_id: kalemHizmet.id, miktar: 1, tarih: '2026-10-15' });
  const f = fatura.kaydet({
    siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-TEMIZ', fatura_tarihi: '2026-10-16', vade_tarihi: '2026-11-16',
    kalemler: [{ siparis_kalem_id: kalemHizmet.id, miktar: 1, birim_fiyat_kurus: 200000, kdv_orani: 20 }],
  });
  const sonuc = fatura.eslestir(f.id);
  assert.equal(sonuc.durum, 'eslestirildi');
  assert.equal(sonuc.istisnalar.length, 0);

  const talimat = fatura.odemeTalimatiOlustur(f.id);
  assert.match(talimat.numara, /^ODM-\d{4}-\d{4}$/);
  assert.equal(talimat.tutar_kurus, fatura.getir(f.id).genel_toplam_kurus);
  assert.equal(fatura.getir(f.id).durum, 'odeme_talimati_olusturuldu');
  assert.equal(odeme.talimatlariListele(PROJE).some((t) => t.id === talimat.id), true);
});

test('odemeTalimatiOlustur: eşleşmemiş ("eslesme_istisna") faturada REDDEDİLİR', () => {
  const { firma, siparis: s, kalemStoklu } = siparisHazirla();
  malKabul.kaydet({ siparis_kalem_id: kalemStoklu.id, miktar: 4, tarih: '2026-10-15' });
  const f = fatura.kaydet({
    siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-RED', fatura_tarihi: '2026-10-16', vade_tarihi: '2026-11-16',
    kalemler: [{ siparis_kalem_id: kalemStoklu.id, miktar: 9, birim_fiyat_kurus: 500000, kdv_orani: 20 }],
  });
  fatura.eslestir(f.id);
  assert.throws(() => fatura.odemeTalimatiOlustur(f.id), /yalnızca "eslestirildi" durumundaki/);
});

test('kaydet: tevkifat oranı verilirse tevkifat tutarı ve genel toplam doğru hesaplanır', () => {
  const { firma, siparis: s, kalemHizmet } = siparisHazirla();
  // tutar: 1 × 200.000 = 200.000; KDV %20 = 40.000; tevkifat %50 (hizmet alımlarında yaygın oran) = 20.000
  const f = fatura.kaydet({
    siparis_id: s.id, firma_id: firma.id, fatura_no: 'FTR-TEVKIFAT', fatura_tarihi: '2026-10-16', vade_tarihi: '2026-11-16',
    tevkifat_orani: 50, kalemler: [{ siparis_kalem_id: kalemHizmet.id, miktar: 1, birim_fiyat_kurus: 200000, kdv_orani: 20 }],
  });
  assert.equal(f.kdv_tutari_kurus, 40000);
  assert.equal(f.tevkifat_tutari_kurus, 20000);
  assert.equal(f.genel_toplam_kurus, 200000 + 40000 - 20000);
});
