import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const ekip = await import('./ekip.js');
const puantajTaseron = await import('./puantajTaseron.js');
const odemeDonemi = await import('./odemeDonemi.js');
const sozlesme = await import('../sozlesme/sozlesme.js');
const cariFirma = await import('../_cekirdek/cariFirma.js');
const kisiMod = await import('../_cekirdek/kisi.js');
const maliyetKodu = await import('../_cekirdek/maliyetKodu.js');
const { putRecord } = await import('../../db.js');

const PROJE = 'IGA-ETAP-1';
let vknSayaci = 7100000000;

putRecord('tb_wbs_gorevler', { id: 'wbs-taseron-1', wbs_code: 'W1', name: 'Kalıp İşleri', row_status: 1 });
const mk = maliyetKodu.olustur({ proje_id: PROJE, wbs_gorev_id: 'wbs-taseron-1', kaynak_tipi: 'iscilik_taseron' });

function ekipHazirla() {
  vknSayaci += 1;
  const firma = cariFirma.olustur({ unvan: `Taşeron ${vknSayaci}`, vkn_tckn: String(vknSayaci), roller: ['taseron'] });
  const s = sozlesme.olustur({ tip: 'taseron', proje_id: PROJE, konu: 'Kalıp işleri', bedel_kurus: 500000, baslangic_tarihi: '2026-01-01', taraf_firma_id: firma.id });
  const e = ekip.olustur({ sozlesme_id: s.id, odeme_tipi: 'yevmiye' });
  return { firma, sozlesme: s, ekip: e };
}

function uyeHazirla(ekipId, sgkTarihi = '2026-01-01') {
  const k = kisiMod.olustur({
    ad_soyad: 'Test İşçi', tckn: String(Math.floor(10000000000 + Math.random() * 89999999999)), rol: 'taseron_iscisi',
    isg_egitim_tarihi: '2026-01-01', isg_egitim_gecerlilik_tarihi: sgkTarihi ? '2030-01-01' : null,
  });
  const uye = ekip.uyeEkle(ekipId, { kisi_id: k.id, baslangic_tarihi: '2026-01-01', sgk_giris_bildirge_tarihi: sgkTarihi });
  ekip.yevmiyeTanimla(uye.id, 50000, '2026-01-01');
  return { kisi: k, uye };
}

test('kaydet: maliyet_kodu_id ZORUNLUDUR (taşeron kuralı — Çekirdek genel puantajında zorunlu DEĞİL)', () => {
  const { ekip: e } = ekipHazirla();
  const { uye } = uyeHazirla(e.id);
  assert.throws(() => puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-01-05', gun_degeri: 1 }), /maliyet_kodu_id .* zorunludur/);
});

test('kaydet: SGK bildirgesi/İSG eğitimi olmayan işçi puantaja YAZILAMAZ; yetkili gerekçeyle AŞABİLİR (KABUL kriteri)', () => {
  const { ekip: e } = ekipHazirla();
  const { uye } = uyeHazirla(e.id, null); // SGK bildirgesi YOK
  assert.throws(
    () => puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-01-05', gun_degeri: 1, maliyet_kodu_id: mk.id }),
    /Puantaj engellendi/
  );
  assert.throws(
    () => puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-01-05', gun_degeri: 1, maliyet_kodu_id: mk.id, yetkiliOnayi: true }),
    /gerekçe zorunludur/
  );
  const sonuc = puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-01-05', gun_degeri: 1, maliyet_kodu_id: mk.id, yetkiliOnayi: true, gerekce: 'Acil — bildirge yarın tamamlanacak' }, 5);
  assert.equal(sonuc.tekrarGonderim, false);
});

test('eksikEvrakliUyeleriGetir: SGK/İSG eksik olan üyeleri doğru listeler', () => {
  const { ekip: e } = ekipHazirla();
  uyeHazirla(e.id, '2026-01-01'); // tam
  uyeHazirla(e.id, null); // eksik SGK
  const eksikler = puantajTaseron.eksikEvrakliUyeleriGetir(e.id, '2026-01-05');
  assert.equal(eksikler.length, 1);
  assert.ok(eksikler[0].kontrol.nedenler.some((n) => n.includes('SGK')));
});

test('kaydet: AYNI kişi AYNI gün başka bir ekipte/projede İKİNCİ kez puantaja YAZILAMAZ (ÇEKİRDEK entegrasyonu — KABUL kriteri)', () => {
  const { ekip: e1 } = ekipHazirla();
  const { uye: uye1, kisi: k } = uyeHazirla(e1.id);
  puantajTaseron.kaydet({ ekip_uye_id: uye1.id, tarih: '2026-01-06', gun_degeri: 1, maliyet_kodu_id: mk.id });

  const { ekip: e2 } = ekipHazirla();
  const uye2 = ekip.uyeEkle(e2.id, { kisi_id: k.id, baslangic_tarihi: '2026-01-01', sgk_giris_bildirge_tarihi: '2026-01-01' });
  ekip.yevmiyeTanimla(uye2.id, 60000, '2026-01-01');
  assert.throws(
    () => puantajTaseron.kaydet({ ekip_uye_id: uye2.id, tarih: '2026-01-06', gun_degeri: 1, maliyet_kodu_id: mk.id }),
    /aynı kişi aynı gün iki yere puantaj alamaz/
  );
});

test('kaydet: kapanmış bir ödeme dönemine ait tarihte puantaj DEĞİŞTİRİLEMEZ', () => {
  const { ekip: e } = ekipHazirla();
  const { uye } = uyeHazirla(e.id);
  puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-01-10', gun_degeri: 1, maliyet_kodu_id: mk.id });

  const donem = odemeDonemi.olustur({ ekip_id: e.id, donem_baslangic: '2026-01-08', donem_bitis: '2026-01-14' });
  odemeDonemi.hesapla(donem.id);
  odemeDonemi.durumDegistir(donem.id, 'sef_onayi');
  odemeDonemi.durumDegistir(donem.id, 'proje_muduru_onayi');
  odemeDonemi.durumDegistir(donem.id, 'kapandi');

  assert.throws(
    () => puantajTaseron.kaydet({ ekip_uye_id: uye.id, tarih: '2026-01-11', gun_degeri: 1, maliyet_kodu_id: mk.id }),
    /KAPANMIŞ bir ödeme dönemine ait/
  );
});

test('tumEkibeUygula: bir üye SGK eksikse DİĞERLERİNİ durdurmaz — sonuç başarılı/başarısız ayrımıyla döner', () => {
  const { ekip: e } = ekipHazirla();
  uyeHazirla(e.id, '2026-01-01');
  uyeHazirla(e.id, '2026-01-01');
  uyeHazirla(e.id, null); // eksik
  const sonuc = puantajTaseron.tumEkibeUygula(e.id, '2026-01-20', 1, mk.id);
  assert.equal(sonuc.basarili.length, 2);
  assert.equal(sonuc.basarisiz.length, 1);
});
