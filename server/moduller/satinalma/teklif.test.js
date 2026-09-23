import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const talep = await import('./talep.js');
const teklif = await import('./teklif.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');

const PROJE = 'IGA-ETAP-1';

function tedarikciOlustur(vkn) {
  return cariFirma.olustur({ unvan: `Tedarikçi ${vkn}`, vkn_tckn: vkn, roller: ['tedarikci'] });
}

test('talepGonder: var olmayan talebe/firmaya gönderilemez', () => {
  const firma = tedarikciOlustur('2001000001');
  assert.throws(() => teklif.talepGonder({ talep_id: 999999, firma_id: firma.id }), /Talep bulunamadı/);
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  assert.throws(() => teklif.talepGonder({ talep_id: t.id, firma_id: 999999 }), /Firma bulunamadı/);
});

test('talepGonder: aynı firmaya aynı talep için İKİNCİ kez gönderilemez (mükerrer)', () => {
  const firma = tedarikciOlustur('2001000002');
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  teklif.talepGonder({ talep_id: t.id, firma_id: firma.id });
  assert.throws(() => teklif.talepGonder({ talep_id: t.id, firma_id: firma.id }), /zaten.*gönderilmiş/);
});

test('teklifiGir: kalem fiyatları girilince teklif "geldi" durumuna geçer', () => {
  const firma = tedarikciOlustur('2001000003');
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  const k = talep.kalemEkle(t.id, { aciklama: 'Çimento', miktar: 10, birim: 'ton' });
  const tk = teklif.talepGonder({ talep_id: t.id, firma_id: firma.id });
  assert.equal(tk.durum, 'istendi');
  const guncel = teklif.teklifiGir(tk.id, [{ talep_kalem_id: k.id, miktar: 10, birim_fiyat_kurus: 500000 }]);
  assert.equal(guncel.durum, 'geldi');
  assert.equal(teklif.kalemleriGetir(tk.id).length, 1);
});

test('mukayeseSonucu: birden fazla teklif arasından KDV dahil en düşük toplamlı teklif önerilir', () => {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  const k = talep.kalemEkle(t.id, { aciklama: 'Demir 8mm', miktar: 5, birim: 'ton' });

  const ucuzFirma = tedarikciOlustur('2001000004');
  const pahaliFirma = tedarikciOlustur('2001000005');
  const ucuzTeklif = teklif.talepGonder({ talep_id: t.id, firma_id: ucuzFirma.id });
  const pahaliTeklif = teklif.talepGonder({ talep_id: t.id, firma_id: pahaliFirma.id });
  teklif.teklifiGir(ucuzTeklif.id, [{ talep_kalem_id: k.id, miktar: 5, birim_fiyat_kurus: 1000000, kdv_orani: 20 }]);
  teklif.teklifiGir(pahaliTeklif.id, [{ talep_kalem_id: k.id, miktar: 5, birim_fiyat_kurus: 1200000, kdv_orani: 20 }]);

  const mukayese = teklif.mukayeseSonucu(t.id);
  assert.equal(mukayese.teklifSayisi, 2);
  assert.equal(mukayese.kalemler[0].onerilenTeklifId, ucuzTeklif.id);
});

test('mukayeseSonucu: bir talep kalemi için teklif girilmemişse ("girildi:false") önerilen teklif diğerlerinden seçilir', () => {
  const t = talep.olustur({ proje_id: PROJE, ihtiyac_tarihi: '2026-10-01' });
  const k1 = talep.kalemEkle(t.id, { aciklama: 'Kum', miktar: 20, birim: 'm3' });
  const k2 = talep.kalemEkle(t.id, { aciklama: 'Çakıl', miktar: 10, birim: 'm3' });
  const firma1 = tedarikciOlustur('2001000006');
  const teklif1 = teklif.talepGonder({ talep_id: t.id, firma_id: firma1.id });
  // Yalnızca k1 için fiyat girildi — k2 boş bırakıldı.
  teklif.teklifiGir(teklif1.id, [{ talep_kalem_id: k1.id, miktar: 20, birim_fiyat_kurus: 30000 }]);
  const mukayese = teklif.mukayeseSonucu(t.id);
  const k2Satiri = mukayese.kalemler.find((x) => x.talep_kalem_id === k2.id);
  assert.equal(k2Satiri.onerilenTeklifId, null);
  assert.equal(k2Satiri.teklifler[0].girildi, false);
});
