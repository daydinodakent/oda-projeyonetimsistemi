// P11 — Tekillik, gizlilik (TCKN) ve çevrimdışı/çok cihaz doğrulamaları.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { transformSync } from 'esbuild';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const M = (p) => import(`../${p}`);
const [cariFirma, kisiMod, maliyetKodu, maliyetDefteri, audit, cekirdekPuantaj, odeme, sozlesme, bolum, satis, odemePlani, tahsilat, hakedis, siparis, stok, malzeme, depo, malKabul, personel, pdks, bordro, gunlukRapor, ekipman, odemeDonemi, ekip] = await Promise.all([
  '_cekirdek/cariFirma.js', '_cekirdek/kisi.js', '_cekirdek/maliyetKodu.js', '_cekirdek/maliyetDefteri.js', '_cekirdek/audit.js', '_cekirdek/puantaj.js', '_cekirdek/odeme.js', 'sozlesme/sozlesme.js',
  'musteri/bolum.js', 'musteri/satis.js', 'musteri/odemePlani.js', 'musteri/tahsilat.js', 'altyuklenici/hakedis.js', 'satinalma/siparis.js', 'depo/stok.js', 'depo/malzeme.js', 'depo/depo.js', 'depo/malKabul.js',
  'ik/personel.js', 'ik/pdks.js', 'ik/bordroDonemi.js', 'santiye/gunlukRapor.js', 'santiye/ekipman.js', 'taseron/odemeDonemi.js', 'taseron/ekip.js',
].map(M));
const { putRecord } = await import('../../db.js');
const TL = (x) => x * 100;
const tckn = () => String(Math.floor(10000000000 + Math.random() * 89999999999));
let vkn = 9400000000;
const firma = (roller) => { vkn += 1; return cariFirma.olustur({ unvan: `F${vkn}`, vkn_tckn: String(vkn), roller }); };

test('TEKİLLİK — aynı kişi çift puantaj: İK (PDKS) iki farklı projeye aynı gün YAZAMAZ; Çekirdek kuralı tüm modülleri kapsar', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Çift Puantaj', tckn: tckn(), rol: 'personel' });
  const p = personel.olustur({ kisi_id: k.id, sicil_no: 'DGR-1', ise_giris_tarihi: '2025-01-01' });
  pdks.kaydet({ personel_id: p.id, proje_id: 'PRJ-A', tarih: '2026-06-01', yontem: 'kartli' });
  assert.throws(() => pdks.kaydet({ personel_id: p.id, proje_id: 'PRJ-B', tarih: '2026-06-01', yontem: 'qr' }), /aynı gün iki yere/);
  assert.throws(() => cekirdekPuantaj.kaydet({ proje_id: 'PRJ-C', kisi_id: k.id, tarih: '2026-06-01', gun_degeri: 1 }), /aynı gün iki yere/);
  assert.equal(cekirdekPuantaj.kisiAraligiListele(k.id, '2026-06-01', '2026-06-01').length, 1);
});

test('TEKİLLİK — aynı bölüm çift satış / çift opsiyon engellenir (DB kilidi)', () => {
  const m = kisiMod.olustur({ ad_soyad: 'Müşteri', tckn: tckn(), rol: 'musteri' });
  const b = bolum.olustur({ proje_id: 'PRJ-S', blok: 'A', kat: '1', kapi_no: '1', tip: '2+1' });
  bolum.fiyatTanimla(b.id, TL(1000), '2026-01-01');
  const s = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-01' });
  assert.throws(() => satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: m.id }], satis_tarihi: '2026-02-02' }), /satılamaz|başka bir opsiyon|zaten/);
  assert.throws(() => bolum.olustur({ proje_id: 'PRJ-S', blok: 'A', kat: '1', kapi_no: '1', tip: '2+1' }), /zaten var/, 'aynı bölüm numarası ikinci kez açılamaz');
  assert.ok(s.id);
});

test('TEKİLLİK — aynı olay çift MALİYET kaydı üretmez (defter idempotent; tekrar onaylar reddedilir; istemci anahtarları)', () => {
  const P = 'PRJ-D';
  const olay = { proje_id: P, tur: 'GERCEKLESEN', tutar_kurus: 1000, tarih: '2026-06-01', kaynak_modul: 'test', kaynak_id: 'olay-1' };
  assert.equal(maliyetDefteri.yaz(olay).tekrarGonderim, false);
  assert.equal(maliyetDefteri.yaz(olay).tekrarGonderim, true);
  assert.equal(maliyetDefteri.projeIcinListele(P).filter((h) => h.kaynak_id === 'olay-1').length, 1);

  // sipariş: ikinci onay geçersiz geçiş → ikinci TAAHHÜT yok
  const f = firma(['tedarikci']);
  const s = siparis.olustur({ proje_id: P, firma_id: f.id });
  siparis.kalemEkle(s.id, { aciklama: 'Hizmet', birim: 'adet', miktar: 1, birim_fiyat_kurus: 10000, kdv_orani: 20 });
  siparis.durumDegistir(s.id, 'onaylandi');
  assert.throws(() => siparis.durumDegistir(s.id, 'onaylandi'), /Geçersiz durum geçişi/);
  assert.equal(maliyetDefteri.projeIcinListele(P).filter((h) => h.kaynak_modul === 'satinalma_siparis').length, 1);

  // sözleşme: ikinci imza reddedilir
  const az = firma(['alt_yuklenici']);
  const soz = sozlesme.olustur({ tip: 'alt_yuklenici', proje_id: P, konu: 'x', bedel_kurus: 5000, baslangic_tarihi: '2026-01-01', taraf_firma_id: az.id });
  sozlesme.durumDegistir(soz.id, 'onayda'); sozlesme.durumDegistir(soz.id, 'imzali');
  assert.throws(() => sozlesme.durumDegistir(soz.id, 'imzali'), /Geçersiz durum geçişi/);
  assert.equal(maliyetDefteri.projeIcinListele(P).filter((h) => h.kaynak_modul === 'sozlesme').length, 1);

  // hakediş: ikinci onay reddedilir
  const h = hakedis.olustur({ sozlesme_id: soz.id, donem_baslangic: '2026-01-01', donem_bitis: '2026-01-31' });
  hakedis.durumDegistir(h.id, 'alt_yuklenici_beyani'); hakedis.durumDegistir(h.id, 'santiye_onayi'); hakedis.durumDegistir(h.id, 'teknik_ofis');
  hakedis.blokajiAsarakOnayla(h.id, 'test');
  assert.throws(() => hakedis.durumDegistir(h.id, 'onayli'), /Geçersiz durum geçişi/);
  assert.throws(() => hakedis.blokajiAsarakOnayla(h.id, 'tekrar'), /teknik_ofis/);

  // tahsilat: aynı istemci anahtarı çift para kaydı OLUŞTURMAZ (P11 düzeltmesi)
  const musteri = kisiMod.olustur({ ad_soyad: 'Tahsilat', tckn: tckn(), rol: 'musteri' });
  const b = bolum.olustur({ proje_id: P, blok: 'T', kat: '1', kapi_no: '1', tip: '1+1' });
  bolum.fiyatTanimla(b.id, TL(1000), '2026-01-01');
  const sat = satis.olustur({ bolum_id: b.id, musteriler: [{ kisi_id: musteri.id }], satis_tarihi: '2026-02-01' });
  odemePlani.olustur(sat.id, [{ tur: 'pesinat', vade_tarihi: '2026-02-01', tutar_kurus: TL(1000) }]);
  satis.onayla(sat.id);
  const t1 = tahsilat.kaydet({ satis_id: sat.id, tutar_kurus: TL(400), tarih: '2026-02-02', istemci_kayit_id: 'cihaz-1-a' });
  const t2 = tahsilat.kaydet({ satis_id: sat.id, tutar_kurus: TL(400), tarih: '2026-02-02', istemci_kayit_id: 'cihaz-1-a' });
  assert.equal(t2.tekrarGonderim, true);
  assert.equal(t1.tahsilat.id, t2.tahsilat.id);
  assert.equal(tahsilat.odemeOzeti(sat.id).tahsil_edilen_kurus, TL(400), 'çift tahsilat yok');
  assert.equal(maliyetDefteri.projeIcinListele(P).filter((x) => x.kaynak_modul === 'musteri_tahsilat').length, 1);
});

test('TEKİLLİK — VKN/TCKN mükerrer: biçim farkıyla (boşluk/nokta) mükerrer açılamaz; hane sayısı doğrulanır; TCKN şifreli tekillik', () => {
  cariFirma.olustur({ unvan: 'Tekil A.Ş.', vkn_tckn: '1234509876', roller: ['tedarikci'] });
  assert.throws(() => cariFirma.olustur({ unvan: 'Tekil 2', vkn_tckn: '1234509876', roller: ['tedarikci'] }), /mükerrer/);
  assert.throws(() => cariFirma.olustur({ unvan: 'Tekil 3', vkn_tckn: '123 450 9876', roller: ['tedarikci'] }), /mükerrer/, 'boşluklu biçim de mükerrer sayılmalı');
  assert.throws(() => cariFirma.olustur({ unvan: 'Tekil 4', vkn_tckn: '123-450-9876', roller: ['tedarikci'] }), /mükerrer/);
  assert.throws(() => cariFirma.olustur({ unvan: 'Kısa', vkn_tckn: '12345', roller: ['tedarikci'] }), /haneli/);
  const t = tckn();
  kisiMod.olustur({ ad_soyad: 'Kişi 1', tckn: t, rol: 'personel' });
  assert.throws(() => kisiMod.olustur({ ad_soyad: 'Kişi 2', tckn: t, rol: 'taseron_iscisi' }), /mükerrer/, 'farklı rolde de aynı TCKN mükerrer');
  assert.throws(() => kisiMod.olustur({ ad_soyad: 'Kısa', tckn: '123', rol: 'personel' }), /11 haneli/);
});

test('GİZLİLİK — TCKN: API çıktısında düz/şifreli değer YOK (yalnız maske); audit_log düz TCKN İÇERMEZ', () => {
  const t = tckn();
  const k = kisiMod.olustur({ ad_soyad: 'Gizli Kişi', tckn: t, rol: 'personel' });
  for (const cikti of [k, kisiMod.getir(k.id), kisiMod.listele().find((x) => x.id === k.id)]) {
    const js = JSON.stringify(cikti);
    assert.ok(!js.includes(t), 'düz TCKN sızmamalı');
    assert.ok(!('tckn_sifreli' in cikti), 'şifreli blob da API\'ye çıkmamalı');
    assert.match(cikti.tckn_maske, /\*/);
  }
  const gecmis = JSON.stringify(audit.listele('kisi', k.id));
  assert.ok(!gecmis.includes(t), 'denetim izi düz TCKN içermemeli');
  kisiMod.guncelle(k.id, { telefon: '555' });
  assert.ok(!JSON.stringify(audit.listele('kisi', k.id)).includes(t), 'güncelleme izi de temiz olmalı');
});

test('ÇEVRİMDIŞI — iki cihaz: aynı istemci_kayit_id tekrarı mükerrer AÇMAZ; farklı anahtarla AYNI kişi/gün ikinci puantaj REDDEDİLİR (kayıp değil, hata olarak görünür)', () => {
  const k = kisiMod.olustur({ ad_soyad: 'Cihaz Test', tckn: tckn(), rol: 'personel' });
  const ilk = cekirdekPuantaj.kaydet({ proje_id: 'PRJ-O', kisi_id: k.id, tarih: '2026-07-01', gun_degeri: 1, istemci_kayit_id: 'A-1' });
  const tekrar = cekirdekPuantaj.kaydet({ proje_id: 'PRJ-O', kisi_id: k.id, tarih: '2026-07-01', gun_degeri: 1, istemci_kayit_id: 'A-1' });
  assert.equal(tekrar.tekrarGonderim, true); assert.equal(tekrar.kayit.id, ilk.kayit.id);
  assert.throws(() => cekirdekPuantaj.kaydet({ proje_id: 'PRJ-O', kisi_id: k.id, tarih: '2026-07-01', gun_degeri: 1, istemci_kayit_id: 'B-1' }), /aynı gün iki yere/);
  assert.equal(cekirdekPuantaj.projeGunuListele('PRJ-O', '2026-07-01').length, 1);
});

test('ÇEVRİMDIŞI — depo çıkışı: aynı anahtar tek düşüm; iki cihaz FARKLI anahtarla aynı miktarı çekerse stok eksiye düşmez (negatif stok engeli)', () => {
  const P = 'PRJ-DEPO';
  putRecord('tb_wbs_gorevler', { id: 'dg-w', wbs_code: 'D1', name: 'D', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'dg-w', kaynak_tipi: 'malzeme' });
  const d = depo.olustur({ proje_id: P, ad: 'D', tur: 'santiye' });
  const m = malzeme.olustur({ kod: 'DG-M', ad: 'Demir', birim: 'ton' });
  stok.giris({ depo_id: d.id, malzeme_id: m.id, miktar: 10, birim: 'ton', birim_maliyet_kurus: 1000, proje_id: P });
  const cik = (id, miktar) => stok.cikis({ depo_id: d.id, malzeme_id: m.id, miktar, birim: 'ton', proje_id: P, maliyet_kodu_id: mk.id, teslim_alan_tipi: 'sarf', istemci_kayit_id: id });
  cik('cihaz-1', 6);
  assert.equal(cik('cihaz-1', 6).tekrarGonderim, true);
  assert.equal(stok.bakiyeGetir(d.id, m.id).mevcut_miktar, 4, 'tek düşüm');
  assert.throws(() => cik('cihaz-2', 6), /Yetersiz stok/, 'ikinci cihazın çakışan çıkışı stoku eksiye düşüremez');
  assert.equal(maliyetDefteri.projeIcinListele(P).filter((h) => h.kaynak_modul === 'depo_stok_hareketi').length, 1);
});

test('ÇEVRİMDIŞI — günlük rapor: iki cihaz aynı günü farklı anahtarla gönderirse tek rapor, elle bölümler ÇOĞALMAZ (P11 düzeltmesi)', () => {
  const yuk = (id) => ({ proje_id: 'PRJ-R', tarih: '2026-07-02', hava_durumu: 'gunesli', bolumler: [{ tur: 'is', etiket: 'Kolon kalıbı' }], istemci_kayit_id: id });
  const r1 = gunlukRapor.topluKaydet(yuk('tel-1'));
  const r2 = gunlukRapor.topluKaydet(yuk('tablet-1'));
  assert.equal(r1.rapor.id, r2.rapor.id);
  assert.equal(gunlukRapor.gunIcinGetir('PRJ-R', '2026-07-02').bolumler.filter((b) => b.tur === 'is').length, 1);
  assert.equal(gunlukRapor.topluKaydet(yuk('tablet-1')).tekrarGonderim, true, 'aynı cihaz aynı anahtarla tekrar → no-op');
});

test('ÇEVRİMDIŞI — ekipman çalışma kaydı aynı istemci anahtarıyla mükerrer maliyet yazmaz', () => {
  const P = 'PRJ-EKP';
  putRecord('tb_wbs_gorevler', { id: 'ek-w', wbs_code: 'K1', name: 'K', row_status: 1 });
  const mk = maliyetKodu.olustur({ proje_id: P, wbs_gorev_id: 'ek-w', kaynak_tipi: 'makine_ekipman' });
  const e = ekipman.olustur({ proje_id: P, ad: 'Öz Vinç', sahiplik: 'oz_mal', ozmal_saat_maliyeti_kurus: 1000 });
  ekipman.calismaKaydet({ ekipman_id: e.id, tarih: '2026-07-03', calisma_saat: 5, maliyet_kodu_id: mk.id, istemci_kayit_id: 'x-1' });
  ekipman.calismaKaydet({ ekipman_id: e.id, tarih: '2026-07-03', calisma_saat: 5, maliyet_kodu_id: mk.id, istemci_kayit_id: 'x-1' });
  assert.equal(maliyetDefteri.projeIcinListele(P).filter((h) => h.kaynak_modul === 'santiye_ekipman_calisma').length, 1);
  assert.equal(ekipman.getir(e.id).sayac_saat, 5);
});

// ---- offlineQueue.ts (tarayıcı kodu) — esbuild ile aktarılıp Node'da çalıştırılır ----
async function kuyrukModulu() {
  const kod = fs.readFileSync(new URL('../../../src/moduller/_cekirdek/offlineQueue.ts', import.meta.url), 'utf8');
  const js = transformSync(kod, { loader: 'ts', format: 'esm' }).code;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}#${crypto.randomUUID()}`);
}
function sahteDepo() {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('ÇEVRİMDIŞI KUYRUK — güvensiz bağlamda (crypto.randomUUID YOK, düz http) kayıt eklenebilir; id benzersiz ve UUID biçiminde', async () => {
  sahteDepo();
  const eski = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: (a) => crypto.randomFillSync(a) }, configurable: true });
  try {
    const { createOfflineQueue, yeniKayitId } = await kuyrukModulu();
    const q = createOfflineQueue({ kuyrukAdi: 'guvensiz', gonder: async () => ({}) });
    const a = q.ekle({ x: 1 }); const b = q.ekle({ x: 2 });
    assert.match(a.istemciKayitId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(a.istemciKayitId, b.istemciKayitId);
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    assert.match(yeniKayitId(), /^[0-9a-f-]{36}$/, 'crypto hiç yokken bile çalışır');
  } finally { if (eski) Object.defineProperty(globalThis, 'crypto', eski); }
});

test('ÇEVRİMDIŞI KUYRUK — kalıcı hata (çift puantaj gibi) sonsuza dek denenmez: 5 denemeden sonra ASKIYA alınır, veri SİLİNMEZ; yenidenDene ile açılır', async () => {
  sahteDepo();
  const { createOfflineQueue } = await kuyrukModulu();
  let cagri = 0; let basarili = false;
  const q = createOfflineQueue({ kuyrukAdi: 'askida', maksDeneme: 3, gonder: async () => { cagri += 1; if (!basarili) throw new Error('400 aynı gün iki yere puantaj'); return {}; } });
  q.ekle({ k: 1 });
  for (let i = 0; i < 6; i++) await q.gonderiyiDene();
  assert.equal(cagri, 3, 'yalnızca maksDeneme kadar denendi');
  assert.equal(q.askidakiler().length, 1);
  assert.equal(q.bekleyenleriListele().length, 1, 'kayıt silinmedi');
  assert.match(q.askidakiler()[0].sonHata, /aynı gün/);
  basarili = true;
  q.yenidenDene(q.askidakiler()[0].istemciKayitId);
  const s = await q.gonderiyiDene();
  assert.equal(s.basarili, 1);
  assert.equal(q.bekleyenleriListele().length, 0);
});
