import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const odeme = await import('./odeme.js');
const cariFirma = await import('./cariFirma.js');

function firmaKur() {
  return cariFirma.olustur({ unvan: 'Test Tedarikçi', vkn_tckn: String(Math.floor(1000000000 + Math.random() * 8999999999)), roller: ['tedarikci'] });
}

test('talimatOlustur: numara otomatik ve TASLAK durumunda üretilir', () => {
  const f = firmaKur();
  const t = odeme.talimatOlustur({ proje_id: 'IGA-ETAP-1', firma_id: f.id, aciklama: 'Test ödeme', vade_tarihi: '2026-09-30', tutar_kurus: 100000_00 });
  assert.match(t.numara, /^ODM-\d{4}-\d{4}$/);
  assert.equal(t.durum, 'TASLAK');
});

test('tutar_kurus tam sayı olmalı', () => {
  const f = firmaKur();
  assert.throws(() => odeme.talimatOlustur({ proje_id: 'IGA-ETAP-1', firma_id: f.id, aciklama: 'x', vade_tarihi: '2026-09-30', tutar_kurus: 100.5 }), /tam sayı/);
});

test('durumDegistir: GEÇERSİZ geçiş (TASLAK -> ODENDI, ONAY atlanarak) reddedilir', () => {
  const f = firmaKur();
  const t = odeme.talimatOlustur({ proje_id: 'IGA-ETAP-1', firma_id: f.id, aciklama: 'x', vade_tarihi: '2026-09-30', tutar_kurus: 1000_00 });
  assert.throws(() => odeme.durumDegistir(t.id, 'ODENDI', 1), /Geçersiz durum geçişi/);
});

test('odemeKaydet: yalnızca ONAYLANDI durumundaki talimata izin verir', () => {
  const f = firmaKur();
  const t = odeme.talimatOlustur({ proje_id: 'IGA-ETAP-1', firma_id: f.id, aciklama: 'x', vade_tarihi: '2026-09-30', tutar_kurus: 5000_00 });
  assert.throws(
    () => odeme.odemeKaydet({ odeme_talimati_id: t.id, tutar_kurus: 5000_00, odeme_tarihi: '2026-09-20' }, 1),
    /ONAYLANDI durumunda değil/
  );
});

test('tam akış: TASLAK -> ONAY_BEKLIYOR -> ONAYLANDI -> ödeme kaydı -> talimat ODENDI olur', () => {
  const f = firmaKur();
  const t = odeme.talimatOlustur({ proje_id: 'IGA-ETAP-1', firma_id: f.id, aciklama: 'Malzeme bedeli', vade_tarihi: '2026-09-30', tutar_kurus: 25000_00 });
  odeme.durumDegistir(t.id, 'ONAY_BEKLIYOR', 1);
  odeme.durumDegistir(t.id, 'ONAYLANDI', 2);
  const odemeKaydi = odeme.odemeKaydet({ odeme_talimati_id: t.id, tutar_kurus: 25000_00, odeme_tarihi: '2026-09-25', odeme_yontemi: 'havale' }, 2);
  assert.ok(odemeKaydi.id);
  const guncelTalimatlar = odeme.talimatlariListele('IGA-ETAP-1');
  assert.equal(guncelTalimatlar.find((x) => x.id === t.id).durum, 'ODENDI');
});

test('disaAktarimNoktasi: yeni ödeme kaydı disa_aktarildi=0 ile listeye çıkar, işaretlenince kaybolur', () => {
  const f = firmaKur();
  const t = odeme.talimatOlustur({ proje_id: 'IGA-ETAP-1', firma_id: f.id, aciklama: 'x', vade_tarihi: '2026-09-30', tutar_kurus: 100_00 });
  odeme.durumDegistir(t.id, 'ONAY_BEKLIYOR', 1);
  odeme.durumDegistir(t.id, 'ONAYLANDI', 1);
  const kayit = odeme.odemeKaydet({ odeme_talimati_id: t.id, tutar_kurus: 100_00, odeme_tarihi: '2026-09-20' }, 1);
  const oncesi = odeme.disaAktarimNoktasi();
  assert.ok(oncesi.some((x) => x.id === kayit.id));
  odeme.disaAktarildiIsaretle(kayit.id);
  const sonrasi = odeme.disaAktarimNoktasi();
  assert.ok(!sonrasi.some((x) => x.id === kayit.id));
});
