import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const talep = await import('./talep.js');
const teklif = await import('./teklif.js');
const siparis = await import('./siparis.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const maliyetDefteri = await import('../_cekirdek/maliyetDefteri.js');

const PROJE = 'IGA-ETAP-1';
let vknSayaci = 3000000000;

function tedarikciOlustur() {
  vknSayaci += 1;
  return cariFirma.olustur({ unvan: `Tedarikçi ${vknSayaci}`, vkn_tckn: String(vknSayaci), roller: ['tedarikci'] });
}

function talepVeUcTeklifHazirla(gecerliTeklifSayisi = 3) {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  const k = talep.kalemEkle(t.id, { aciklama: 'Çimento', miktar: 10, birim: 'ton' });
  const teklifler = [];
  for (let i = 0; i < gecerliTeklifSayisi; i++) {
    const firma = tedarikciOlustur();
    const tk = teklif.talepGonder({ talep_id: t.id, firma_id: firma.id });
    teklif.teklifiGir(tk.id, [{ talep_kalem_id: k.id, miktar: 10, birim_fiyat_kurus: 500000 + i * 1000 }]);
    teklifler.push(tk);
  }
  return { talep: t, kalem: k, teklifler };
}

test('olustur: talebe bağlı 3\'ten AZ teklif varsa ve istisna işaretlenmemişse reddedilir', () => {
  const { talep: t, teklifler } = talepVeUcTeklifHazirla(2);
  assert.throws(
    () => siparis.olustur({ proje_id: PROJE, firma_id: cariFirma.getir(teklifler[0].firma_id).id, talep_id: t.id, teslim_tarihi: '2026-11-01' }),
    /En az 3 teklif toplanmalı/
  );
});

test('olustur: min_teklif_istisna işaretli talepte 3\'ten az teklifle de sipariş açılabilir', () => {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01', min_teklif_istisna: true, istisna_gerekcesi: 'Acil' });
  const firma = tedarikciOlustur();
  const s = siparis.olustur({ proje_id: PROJE, firma_id: firma.id, talep_id: t.id });
  assert.equal(s.durum, 'taslak');
});

test('olustur: 3+ teklif varsa sorunsuz açılır ve seçilen teklif "kazandi" işaretlenir', () => {
  const { talep: t, teklifler } = talepVeUcTeklifHazirla(3);
  const kazananTeklif = teklifler[0];
  const s = siparis.olustur({ proje_id: PROJE, firma_id: kazananTeklif.firma_id, talep_id: t.id, teklif_id: kazananTeklif.id, teslim_tarihi: '2026-11-01' });
  assert.match(s.numara, /^SAT-\d{4}-\d{4}$/);
  assert.equal(teklif.getir(kazananTeklif.id).durum, 'kazandi');
});

test('kalemEkle: yalnızca "taslak" durumundaki siparişe kalem eklenebilir; toplam KDV dahil doğru hesaplanır', () => {
  const firma = tedarikciOlustur();
  const s = siparis.olustur({ proje_id: PROJE, firma_id: firma.id });
  siparis.kalemEkle(s.id, { aciklama: 'Demir 8mm', birim: 'ton', miktar: 5, birim_fiyat_kurus: 2000000, kdv_orani: 20 });
  const guncel = siparis.getir(s.id);
  assert.equal(guncel.toplam_tutar_kurus, 12000000, '5 ton × 2.000.000 kuruş × KDV %20 = 12.000.000 kuruş');
});

test('durumDegistir: geçersiz geçiş (taslak -> tamamlandi, onaylandi atlanarak) reddedilir', () => {
  const firma = tedarikciOlustur();
  const s = siparis.olustur({ proje_id: PROJE, firma_id: firma.id });
  assert.throws(() => siparis.durumDegistir(s.id, 'tamamlandi'), /Geçersiz durum geçişi/);
});

test('durumDegistir: onaylanınca TEK SEFERLİK TAAHHUT yazılır — kismi_teslim/tamamlandi geçişlerinde TEKRAR yazılmaz', () => {
  const firma = tedarikciOlustur();
  const s = siparis.olustur({ proje_id: PROJE, firma_id: firma.id });
  siparis.kalemEkle(s.id, { aciklama: 'Kum', birim: 'm3', miktar: 20, birim_fiyat_kurus: 50000, kdv_orani: 20 });
  const onaylanan = siparis.durumDegistir(s.id, 'onaylandi');
  assert.equal(onaylanan.taahhut_yazildi, 1);
  siparis.durumDegistir(s.id, 'kismi_teslim');
  siparis.durumDegistir(s.id, 'tamamlandi');

  const hareketler = maliyetDefteri.projeIcinListele(PROJE).filter((h) => h.kaynak_modul === 'satinalma_siparis' && h.kaynak_id === String(s.id));
  assert.equal(hareketler.length, 1, 'yalnızca 1 TAAHHUT hareketi olmalı');
  assert.equal(hareketler[0].tur, 'TAAHHUT');
  assert.equal(hareketler[0].tutar_kurus, onaylanan.toplam_tutar_kurus);
});
