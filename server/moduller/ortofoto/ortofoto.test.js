// Ortofoto çekirdeği — public/vendor/oda-ortofoto/ortofoto.js (haritanın kullandığı AYNI dosya).
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../../../public/vendor/proj4/2.22.0/proj4.js');           // globalThis.proj4
await import('../../../public/vendor/oda-ortofoto/ortofoto.js');         // globalThis.OdaOrtofoto
const O = globalThis.OdaOrtofoto, proj4 = globalThis.proj4;
const yakin = (a, b, tol, m) => assert.ok(Math.abs(a - b) <= tol, `${m || ''} beklenen ${b}, gelen ${a} (tolerans ${tol})`);

test('tarih: dosya adından (çeşitli biçimler), geçersiz tarihler elenir; TIFF DateTime', () => {
  assert.equal(O.tarihAdindan('ortofoto_20260915.tif'), '2026-09-15');
  assert.equal(O.tarihAdindan('A Blok 2026-09-15 uçuş1.tif'), '2026-09-15');
  assert.equal(O.tarihAdindan('flight_2026_03_07_ortho.tiff'), '2026-03-07');
  assert.equal(O.tarihAdindan('15.09.2026 ortofoto.jpg'), '2026-09-15');
  assert.equal(O.tarihAdindan('ortho-31-12-2025.png'), '2025-12-31');
  assert.equal(O.tarihAdindan('ortofoto_20260231.tif'), null, '31 Şubat geçersiz');
  assert.equal(O.tarihAdindan('ortofoto_20261345.tif'), null);
  assert.equal(O.tarihAdindan('IMG_12345678.tif'), null);
  assert.equal(O.tarihAdindan('ortofoto.tif'), null);
  assert.equal(O.tarihAdindan('x_20260231_20260301.tif'), '2026-03-01', 'ilk GEÇERLİ tarih alınır');
  assert.equal(O.tarihTiffDen('2026:09:15 10:30:00'), '2026-09-15');
  assert.equal(O.tarihTiffDen('2026:13:15 10:30:00'), null);
  assert.equal(O.tarihTiffDen(undefined), null);
});

test('EPSG ve kullanıcı seçimi → proj4 tanımı; desteklenmeyen kod null', () => {
  assert.deepEqual(O.epsgTanimi(4326), { tur: 'cografi' });
  assert.match(O.epsgTanimi(5254).def, /\+lon_0=30 /);
  assert.match(O.epsgTanimi(5253).def, /\+lon_0=27 /); assert.match(O.epsgTanimi(5259).def, /\+lon_0=45 /);
  assert.match(O.epsgTanimi(32636).def, /\+proj=utm \+zone=36 \+datum=WGS84/);
  assert.match(O.epsgTanimi(32736).def, /\+zone=36 \+south/);
  assert.equal(O.epsgTanimi(3857).tur, 'projeksiyon');
  assert.equal(O.epsgTanimi(2320), null);
  assert.deepEqual(O.secimTanimi('wgs84'), { tur: 'cografi' });
  assert.match(O.secimTanimi('utm35n').def, /\+zone=35/); assert.match(O.secimTanimi('33').def, /\+lon_0=33 /);
  assert.equal(O.secimTanimi('otomatik'), null);
  // TM30 tanımı gerçekten kullanılabilir: merkez meridyeni üzerindeki bir nokta 500000 doğuya düşer
  const e = proj4('EPSG:4326', O.epsgTanimi(5254).def, [30, 41]);
  yakin(e[0], 500000, 1e-6); yakin(e[1], 4538000, 3000, 'kuzey ≈ 4,54 milyon m');
});

test('köşeler: projeksiyon kutusu → [TL,TR,BR,BL] boylam/enlem; dünya dosyası (dönük dahil); kesişim', () => {
  const def = O.epsgTanimi(5254).def;
  const conv = proj4(def, 'EPSG:4326');
  const q = O.koselerKutudan([500000, 4570000, 500400, 4570300], (p) => conv.forward(p));
  assert.ok(q[0][0] < q[1][0] && q[3][0] < q[2][0], 'sol < sağ'); assert.ok(q[0][1] > q[3][1], 'üst > alt');
  const kutu = O.kutuKoselerden(q); assert.ok(kutu[0] < kutu[2] && kutu[1] < kutu[3]);
  // dünya dosyası: 0,5 m piksel, sol-üst piksel merkezi (1000.25, 1999.75) → sol-üst KÖŞE (1000, 2000)
  const dq = O.koselerDunyaDosyasindan([0.5, 0, 0, -0.5, 1000.25, 1999.75], 100, 60);
  assert.deepEqual(dq[0], [1000, 2000]); assert.deepEqual(dq[1], [1050, 2000]); assert.deepEqual(dq[2], [1050, 1970]); assert.deepEqual(dq[3], [1000, 1970]);
  const donuk = O.koselerDunyaDosyasindan([1, 0.1, -0.1, -1, 100.5, 200.5], 10, 10);       // B,D ≠ 0 → TR ≠ aynı enlem
  assert.ok(donuk[1][1] !== donuk[0][1], 'dönük görüntüde sağ üst köşe farklı enlemde');
  assert.deepEqual(O.kutuKesisimi([0, 0, 10, 10], [5, 5, 20, 20]), [5, 5, 10, 10]);
  assert.equal(O.kutuKesisimi([0, 0, 10, 10], [10, 0, 20, 10]), null, 'yalnızca kenar paylaşan kutu: kesişim yok');
});

test('afin: kaynak piksel → ızgara piksel (köşeler doğru yere düşer; ölçek ve kayma)', () => {
  const uygula = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const quad = [[10, 50], [20, 50], [20, 40], [10, 40]];          // TL,TR,BR,BL (kuzey yukarı)
  const kutu = [10, 40, 20, 50];
  let m = O.afinKaynaktanIzgaraya(quad, 200, 100, kutu, 200, 100);   // birebir
  for (const [p, b] of [[[0, 0], [0, 0]], [[200, 0], [200, 0]], [[200, 100], [200, 100]], [[0, 100], [0, 100]]]) {
    const r = uygula(m, p[0], p[1]); yakin(r[0], b[0], 1e-9); yakin(r[1], b[1], 1e-9);
  }
  m = O.afinKaynaktanIzgaraya(quad, 200, 100, kutu, 100, 50);       // ızgara yarı çözünürlükte
  const r2 = uygula(m, 200, 100); yakin(r2[0], 100, 1e-9); yakin(r2[1], 50, 1e-9);
  m = O.afinKaynaktanIzgaraya(quad, 200, 100, [15, 40, 20, 50], 100, 100);   // ızgara görüntünün sağ yarısı
  const r3 = uygula(m, 100, 0); yakin(r3[0], 0, 1e-9); yakin(r3[1], 0, 1e-9);
  const kayik = [[10, 50], [20, 51], [20, 41], [10, 40]];            // yan kenarlar eğik paralelkenar
  m = O.afinKaynaktanIzgaraya(kayik, 200, 100, [10, 40, 20, 51], 200, 110);
  const tr = uygula(m, 200, 0); yakin(tr[0], 200, 1e-9); yakin(tr[1], 0, 1e-9, 'TR üstte');
  const bl = uygula(m, 0, 100); yakin(bl[0], 0, 1e-9); yakin(bl[1], 110, 1e-9, 'BL altta');
});

// --- deterministik dokulu test görüntüsü ---
function rastgele(tohum) { let s = tohum >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function goruntu(w, h, tohum) {
  const r = rastgele(tohum), data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const g = 130 + (r() - 0.5) * 60; data[4 * i] = g; data[4 * i + 1] = g * 0.95; data[4 * i + 2] = g * 0.9; data[4 * i + 3] = 255; }
  return { data, width: w, height: h };
}
function kopya(g) { return { data: new Uint8ClampedArray(g.data), width: g.width, height: g.height }; }
function kare(g, x0, y0, s, renk) { for (let y = y0; y < y0 + s; y++) for (let x = x0; x < x0 + s; x++) { const i = (y * g.width + x) * 4; g.data[i] = renk[0]; g.data[i + 1] = renk[1]; g.data[i + 2] = renk[2]; } }
function pozlama(g, kazanc, ofset) { for (let i = 0; i < g.width * g.height; i++) for (let c = 0; c < 3; c++) g.data[4 * i + c] = g.data[4 * i + c] * kazanc + ofset; }

test('değişim: genel ışık/pozlama farkı yanlış pozitif ÜRETMEZ, eklenen kare bulunur (normalizasyon açıkken)', () => {
  const A = goruntu(200, 150, 7), B = kopya(A);
  pozlama(B, 0.7, 15);                                  // B daha koyu çekilmiş
  kare(B, 80, 60, 20, [220, 40, 40]);                   // yeni yapı: 20×20 = 400 px
  const norm = O.farkHesapla(A, B), esik = 0.06;
  const s = O.esikUygula(norm, esik, 12);
  assert.ok(s.degisenPiksel >= 380 && s.degisenPiksel <= 520, `değişen ${s.degisenPiksel} px (≈400 beklenir)`);
  assert.equal(s.kumeler.length, 1);
  const [x0, y0, x1, y1] = s.kumeler[0].kutu;
  assert.ok(x0 >= 78 && x1 <= 101 && y0 >= 58 && y1 <= 81, `küme kutusu ${[x0, y0, x1, y1]}`);
  assert.ok(norm.normalizasyon && norm.normalizasyon.kazanc.every((g) => g > 1.2 && g < 1.6), 'kazanç ≈ 1/0,7');
  // normalizasyon KAPALIYSA aynı eşikte görüntünün büyük kısmı "değişmiş" görünür (kontrol)
  const ham = O.esikUygula(O.farkHesapla(A, B, { normalize: false }), esik, 12);
  assert.ok(ham.degisenPiksel > 10 * s.degisenPiksel, `normalizasyonsuz ${ham.degisenPiksel} px`);
});

test('değişim: tek piksellik gürültü ve küçük kümeler elenir; opak olmayan (kapsam dışı) piksel hesaba katılmaz', () => {
  const A = goruntu(120, 100, 3), B = kopya(A);
  const r = rastgele(99);
  for (let n = 0; n < 25; n++) { const x = 5 + Math.floor(r() * 110), y = 5 + Math.floor(r() * 90); const i = (y * 120 + x) * 4; B.data[i] = 0; B.data[i + 1] = 255; B.data[i + 2] = 0; }
  kare(B, 50, 40, 12, [250, 250, 20]);                  // 144 px gerçek değişim
  for (let y = 0; y < 100; y++) for (let x = 0; x < 30; x++) A.data[(y * 120 + x) * 4 + 3] = 0;   // A'nın sol 30 sütunu boş (kapsam dışı)
  const fd = O.farkHesapla(A, B);
  assert.equal(fd.gecerliPiksel, 90 * 100);
  const s = O.esikUygula(fd, 0.08, 20);
  assert.equal(s.kumeler.length, 1, 'yalnızca gerçek küme');
  assert.ok(s.degisenPiksel >= 130 && s.degisenPiksel <= 230, `değişen ${s.degisenPiksel}`);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 30; x++) assert.equal(s.maske[y * 120 + x], 0, 'kapsam dışı sütunlarda maske olmamalı');
  assert.throws(() => O.farkHesapla(A, goruntu(10, 10, 1)), /boyut/);
});

test('eşik + küme: en küçük alan filtresi, kümeler büyükten küçüğe, kutular piksel cinsinden', () => {
  const W = 40, H = 30, fark = new Float32Array(W * H), gecerli = new Uint8Array(W * H).fill(1);
  const boya = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) fark[y * W + x] = 0.5; };
  boya(2, 2, 10, 5); boya(20, 10, 2, 2); boya(30, 20, 5, 5);
  const s = O.esikUygula({ width: W, height: H, fark, gecerli }, 0.2, 10);
  assert.deepEqual(s.kumeler.map((k) => k.piksel), [50, 25]);
  assert.deepEqual(s.kumeler[0].kutu, [2, 2, 11, 6]); assert.deepEqual(s.kumeler[1].kutu, [30, 20, 34, 24]);
  assert.equal(s.degisenPiksel, 75);
  assert.equal(O.esikUygula({ width: W, height: H, fark, gecerli }, 0.2, 1).kumeler.length, 3);
  assert.equal(O.esikUygula({ width: W, height: H, fark, gecerli }, 0.9, 1).degisenPiksel, 0, 'eşik üstü yok');
  const f2 = new Float32Array(4); f2[0] = 0.5; f2[3] = 0.5;       // çapraz komşu aynı küme sayılmaz (4 bağlantı)
  assert.equal(O.esikUygula({ width: 2, height: 2, fark: f2, gecerli: new Uint8Array(4).fill(1) }, 0.2, 1).kumeler.length, 2);
});

test('değişim bindirmesi: maskeli piksel kırmızı ve yarı opak üstü, diğerleri tamamen saydam', () => {
  const fd = { width: 2, height: 1, fark: Float32Array.from([0.4, 0.01]), gecerli: Uint8Array.from([1, 1]) };
  const rgba = O.degisimRGBA(fd, Uint8Array.from([1, 0]), 0.1);
  assert.deepEqual([rgba[0], rgba[1], rgba[2]], [239, 68, 68]); assert.ok(rgba[3] >= 90 && rgba[3] <= 240);
  assert.equal(rgba[7], 0);
});
