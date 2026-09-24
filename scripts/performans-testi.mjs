// Performans testi (P11): 50k stok hareketi + 200k puantaj + 10k defter kaydı ile rapor süreleri.
// Kullanım: node scripts/performans-testi.mjs [--sorgu-say]   (geçici DB; repo verisine dokunmaz)
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_perf_${crypto.randomUUID()}.sqlite`);
const M = (p) => import(`../server/moduller/${p}`);
const dbmod = await import('../server/db.js');
const [kisiMod, maliyetDefteri, cekirdekPuantaj, stok, bordro, personel, pano, gunlukRapor, rapor, evm, nakit, mutabakat, uyari, karlilik, portfoy, isProgrami, butce] = await Promise.all([
  '_cekirdek/kisi.js', '_cekirdek/maliyetDefteri.js', '_cekirdek/puantaj.js', 'depo/stok.js', 'ik/bordroDonemi.js', 'ik/personel.js', 'santiye/pano.js', 'santiye/gunlukRapor.js',
  'maliyet/rapor.js', 'maliyet/evm.js', 'maliyet/nakit.js', 'maliyet/mutabakat.js', 'maliyet/uyari.js', 'maliyet/karlilik.js', 'maliyet/portfoy.js', 'santiye/isProgrami.js', 'maliyet/butce.js',
].map(M));
const db = dbmod.rawDb();
const P = 'PERF-1';
const N_KISI = 2000; const N_GUN = 100; const N_STOK = 50000; const N_DEFTER = 10000; const N_KOD = 200;
const say = (baslik, ms, ek = '') => console.log(`${baslik.padEnd(58)} ${ms.toFixed(0).padStart(8)} ms  ${ek}`);
const olc = (baslik, fn, ek) => { const t = performance.now(); const r = fn(); say(baslik, performance.now() - t, typeof ek === 'function' ? ek(r) : ek); return r; };

console.log(`VERİ ÜRETİMİ: ${N_KISI} kişi × ${N_GUN} gün = ${N_KISI * N_GUN} puantaj, ${N_STOK} stok hareketi, ${N_DEFTER} defter kaydı, ${N_KOD} maliyet kodu`);
// Not: kisiMod.olustur her çağrıda tüm TCKN'leri çözerek mükerrer arar (O(n)); sahte şifreli değerler eklenmeden ÖNCE oluşturulur.
const pk = kisiMod.olustur({ ad_soyad: 'Bordro', tckn: '12345678901', rol: 'personel' });
const pp = personel.olustur({ kisi_id: pk.id, sicil_no: 'PERF', ise_giris_tarihi: '2025-01-01' }); personel.ucretTanimla(pp.id, 3000000, '2025-01-01');
let t0 = performance.now();
db.exec('BEGIN');
const insKisi = db.prepare("INSERT INTO kisi (ad_soyad, tckn_sifreli, tckn_maske, rol) VALUES (?, ?, '123*****01', ?)");
for (let i = 0; i < N_KISI; i++) insKisi.run(`Kişi ${i}`, `enc-${i}`, i % 3 === 0 ? 'personel' : 'taseron_iscisi');
const kisiIdleri = db.prepare('SELECT id FROM kisi ORDER BY id').all().map((r) => r.id);
const insWbs = (id) => dbmod.putRecord('tb_wbs_gorevler', { id, wbs_code: `P.${id.split('-')[1]}`, name: `WBS ${id}`, row_status: 1 });
const insKod = db.prepare('INSERT INTO maliyet_kodu (proje_id, wbs_gorev_id, kaynak_tipi, kod) VALUES (?, ?, ?, ?)');
for (let i = 0; i < N_KOD; i++) { insWbs(`pw-${i}`); insKod.run(P, `pw-${i}`, 'malzeme', `WBS-P.${i}.MLZ`); }
const kodlar = db.prepare('SELECT id FROM maliyet_kodu WHERE proje_id = ?').all(P).map((r) => r.id);
db.prepare("INSERT INTO depo (proje_id, ad, tur) VALUES (?, 'Perf Depo', 'santiye')").run(P);
const depoId = db.prepare('SELECT id FROM depo LIMIT 1').get().id;
db.prepare("INSERT INTO malzeme_karti (kod, ad, birim) VALUES ('PERF-M', 'Perf Malzeme', 'adet')").run();
const malzemeId = db.prepare('SELECT id FROM malzeme_karti LIMIT 1').get().id;
const insStok = db.prepare("INSERT INTO stok_hareketi (depo_id, malzeme_id, tur, miktar, girilen_birim, girilen_miktar, birim_maliyet_kurus, toplam_maliyet_kurus, proje_id, maliyet_kodu_id, teslim_alan_tipi) VALUES (?, ?, ?, 1, 'adet', 1, 1000, 1000, ?, ?, ?)");
for (let i = 0; i < N_STOK; i++) insStok.run(depoId, malzemeId, i % 10 === 0 ? 'giris' : 'cikis', P, kodlar[i % kodlar.length], i % 10 === 0 ? null : 'sarf');
db.prepare('INSERT INTO stok_bakiye (depo_id, malzeme_id, mevcut_miktar, agirlikli_ortalama_maliyet_kurus) VALUES (?, ?, 1000000, 1000)').run(depoId, malzemeId);
const insPuantaj = db.prepare("INSERT INTO puantaj_kaydi (proje_id, kisi_id, tarih, giris_saati, cikis_saati, gun_degeri, maliyet_kodu_id, kaynak) VALUES (?, ?, ?, '08:00', '17:00', 1, ?, 'pdks')");
const baz = new Date('2026-01-01T00:00:00Z');
for (let g = 0; g < N_GUN; g++) {
  const tarih = new Date(baz.getTime() + g * 86400000).toISOString().slice(0, 10);
  for (let i = 0; i < N_KISI; i++) insPuantaj.run(P, kisiIdleri[i], tarih, kodlar[i % kodlar.length]);
}
const cikislar = db.prepare("SELECT id, maliyet_kodu_id FROM stok_hareketi WHERE tur = 'cikis' LIMIT ?").all(N_DEFTER);
const insDefter = db.prepare("INSERT INTO maliyet_hareketi (proje_id, maliyet_kodu_id, tur, tutar_kurus, tarih, kur_tarihi, kaynak_modul, kaynak_id) VALUES (?, ?, ?, 1000, '2026-03-01', '2026-03-01', ?, ?)");
cikislar.forEach((c, i) => insDefter.run(P, c.maliyet_kodu_id, 'GERCEKLESEN', 'depo_stok_hareketi', String(c.id)));
db.exec('COMMIT');
say('veri üretimi (tek seferlik)', performance.now() - t0);
const butceV = butce.versiyonOlustur(P, {}); for (const k of kodlar) butce.satirKaydet(butceV.id, { maliyet_kodu_id: k, tutar_kurus: 10000000 }); butce.onayla(butceV.id, 'perf');
for (let i = 0; i < 50; i++) isProgrami.aktiviteEkle({ proje_id: P, ad: `A${i}`, plan_baslangic: '2026-01-01', plan_bitis: '2026-12-31', gerceklesen_yuzde: 30, wbs_gorev_id: `pw-${i}` });

// sorgu sayacı (N+1 tespiti)
const orijinalPrepare = db.prepare.bind(db);
let sorgu = 0;
db.prepare = (sql) => { const st = orijinalPrepare(sql); const sar = (f) => (...a) => { sorgu += 1; return f.apply(st, a); }; return { get: sar(st.get), all: sar(st.all), run: sar(st.run), iterate: st.iterate?.bind(st) }; };
const sayarak = (baslik, fn) => { sorgu = 0; const t = performance.now(); const r = fn(); say(baslik, performance.now() - t, `${sorgu} sorgu`); return r; };

console.log('\nRAPOR SÜRELERİ');
sayarak('Çekirdek: projeGunuListele (1 gün, 2000 puantaj)', () => cekirdekPuantaj.projeGunuListele(P, '2026-02-15'));
sayarak('Çekirdek: kisiAraligiListele (1 kişi, 100 gün)', () => cekirdekPuantaj.kisiAraligiListele(kisiIdleri[5], '2026-01-01', '2026-04-10'));
sayarak('Çekirdek: maliyetDefteri.projeIcinListele (10k satır)', () => maliyetDefteri.projeIcinListele(P));
sayarak('Depo: stok.hareketGecmisi (50k hareketli depo/malzeme)', () => stok.hareketGecmisi(depoId, malzemeId));
sayarak('Depo: stok.cikis (50k hareket varken tek çıkış)', () => stok.cikis({ depo_id: depoId, malzeme_id: malzemeId, miktar: 1, birim: 'adet', proje_id: P, maliyet_kodu_id: kodlar[0], teslim_alan_tipi: 'sarf' }));
sayarak('Şantiye: günlük rapor otomatik bölümler (2000 kişilik gün)', () => gunlukRapor.otomatikBolumler(P, '2026-02-15'));
sayarak('Şantiye: pano', () => pano.panoGetir(P, '2026-02-15'));
sayarak('Maliyet: maliyetRaporu (200 kod, 10k defter)', () => rapor.maliyetRaporu(P));
sayarak('Maliyet: evm (50 aktivite)', () => evm.evmHesapla(P));
sayarak('Maliyet: uyarilar', () => uyari.uyarilar(P));
sayarak('Maliyet: karlilik', () => karlilik.karlilik(P));
sayarak('Maliyet: nakitAkisi', () => nakit.nakitAkisi(P, { periyot: 'aylik' }));
sayarak('Maliyet: portföy', () => portfoy.portfoy());
sayarak('Maliyet: mutabakat (10k hareket)', () => mutabakat.mutabakatRaporu(P));
db.prepare('UPDATE puantaj_kaydi SET kisi_id = ? WHERE kisi_id = ? AND tarih < ?').run(pk.id, kisiIdleri[0], '2026-02-01');
const bd = bordro.olustur({ donem_yil: 2026, donem_ay: 1 });
sayarak('İK: bordro personelHesapla (1 kişi, 1 ay)', () => bordro.personelHesapla(bd.id, pp.id));
console.log('\n(Süre > 1000 ms veya sorgu sayısı ≫ satır sayısı ise N+1/indeks eksikliği şüphesi.)');
