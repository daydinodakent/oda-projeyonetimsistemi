// Hafriyat (kazı-dolgu) çekirdeği — public/vendor/oda-hafriyat/hafriyat.js (haritanın kullandığı AYNI dosya).
// Hacimler ANALİTİK olarak bilinen yüzeylerle doğrulanır (düz/eğimli düzlem × dikdörtgen).
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../../../public/vendor/delaunator/5.0.1/delaunator.min.js');   // globalThis.Delaunator
await import('../../../public/vendor/oda-hafriyat/hafriyat.js');             // globalThis.OdaHafriyat
const H = globalThis.OdaHafriyat;

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const yakin = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} beklenen ${b}, gelen ${a} (tolerans ${tol})`);
/** Düzgün nokta ağı: z = f(x, y) */
function agNoktalari(x0, y0, x1, y1, adim, f) {
  const p = [];
  for (let x = x0; x <= x1 + 1e-9; x += adim) for (let y = y0; y <= y1 + 1e-9; y += adim) p.push([x, y, f(x, y)]);
  return p;
}

test('yerel çerçeve: gidiş-dönüş ve mesafeler (enlem 41°)', () => {
  const fr = H.localFrame(28.79, 41.25);
  const [x, y] = fr.toXY(28.79 + 0.001, 41.25 + 0.001);
  yakin(y, 111.1 * 1.0, 0.8, 'enlem 0,001° ≈ 111 m');
  yakin(x, 111412.84 * Math.cos(41.25 * Math.PI / 180) / 1000, 0.8, 'boylam 0,001° ≈ cos(enlem)×111,4 m');
  const [lng, lat] = fr.toLngLat(x, y);
  yakin(lng, 28.791, 1e-9); yakin(lat, 41.251, 1e-9);
});

test('nokta dosyası: virgül / noktalı virgül+ondalık virgül / sekme / boşluk / başlık / yorum / nokta adı', () => {
  assert.deepEqual(H.parsePointText('1.5,2.5,3.5\n4,5,6').points, [[1.5, 2.5, 3.5], [4, 5, 6]]);
  const tr = H.parsePointText('Y;X;Z\n500123,45;4567890,12;34,5\n500130,00;4567895,50;35,25');
  assert.equal(tr.delimiter, ';'); assert.equal(tr.headerSkipped, true);
  assert.deepEqual(tr.points, [[500123.45, 4567890.12, 34.5], [500130, 4567895.5, 35.25]]);
  assert.deepEqual(H.parsePointText('1\t2\t3').points, [[1, 2, 3]]);
  assert.deepEqual(H.parsePointText('1 2 3\n  4   5   6  ').points, [[1, 2, 3], [4, 5, 6]]);
  const yorum = H.parsePointText('# başlık\n// bu da yorum\n\n7 8 9');
  assert.deepEqual(yorum.points, [[7, 8, 9]]); assert.equal(yorum.skipped, 0);
  // sayısal olmayan nokta adı sütunu otomatik atılır; sayısal nokta no için firstColumnId gerekir
  assert.deepEqual(H.parsePointText('P1,10,20,30\nP2,11,21,31').points, [[10, 20, 30], [11, 21, 31]]);
  assert.deepEqual(H.parsePointText('1,10,20,30\n2,11,21,31', { firstColumnId: true }).points, [[10, 20, 30], [11, 21, 31]]);
  const bozuk = H.parsePointText('1,2,3\nabc,def\n4,5,6');
  assert.equal(bozuk.points.length, 2); assert.equal(bozuk.skipped, 1);
});

test('TIN: düzlemde enterpolasyon TAM; zarf dışı null; yinelenen noktalar birleşir; doğrusal veri hata verir', () => {
  const f = (x, y) => 50 + 0.05 * x - 0.02 * y;
  const s = H.buildSurface(agNoktalari(0, 0, 100, 80, 10, f));
  for (const [x, y] of [[3.3, 7.7], [55.5, 42.1], [99.9, 79.9], [0.1, 0.1]]) yakin(s.elevationAt(x, y), f(x, y), 1e-9, `(${x},${y})`);
  assert.equal(s.elevationAt(-1, 10), null); assert.equal(s.elevationAt(50, 81), null);
  yakin(s.stats.kapsananAlan, 100 * 80, 1e-6, 'kapsanan alan');
  const yin = H.buildSurface([[0, 0, 10], [0, 0, 20], [10, 0, 5], [0, 10, 5], [10, 10, 5]]);
  assert.equal(yin.stats.tekrarBirlestirilen, 1); yakin(yin.elevationAt(0.0001, 0.0001), 15 - (15 - 5) * 0.0002 / 10 * 1, 0.01, 'tekrar eden nokta ortalaması');
  assert.throws(() => H.buildSurface([[0, 0, 1], [1, 1, 1], [2, 2, 1]]), /doğrusal|yüzey oluşturulamadı/);
  assert.throws(() => H.buildSurface([[0, 0, 1], [1, 1, 1]]), /en az 3/);
});

test('TIN: boşluk (iki uzak küme arası) enterpole EDİLMEZ; kümelerin içi tanımlı', () => {
  const a = agNoktalari(0, 0, 20, 20, 2, () => 10), b = agNoktalari(200, 0, 220, 20, 2, () => 10);
  const s = H.buildSurface(a.concat(b));
  assert.equal(s.elevationAt(100, 10), null, 'boşlukta yüzey olmamalı');
  assert.equal(s.elevationAt(10, 10), 10); assert.equal(s.elevationAt(210, 10), 10);
  assert.ok(s.stats.atilanUcgen > 0);
  const filtresiz = H.buildSurface(a.concat(b), { voidFactor: 0 });
  assert.equal(filtresiz.elevationAt(100, 10), 10, 'filtre kapalıysa boşluk doldurulur');
});

test('kazı-dolgu: düz zemin 12, platform 10, 50×40 → kazı TAM 4000 m³', () => {
  const r = H.computeCutFill({ polygons: [[rect(0, 0, 50, 40)]], ground: H.flatSurface(12), design: H.flatSurface(10), cell: 1 });
  yakin(r.kazi, 4000, 1e-6); assert.equal(r.dolgu, 0); yakin(r.net, 4000, 1e-6);
  yakin(r.poligonAlani, 2000, 1e-9); yakin(r.kapsamYuzde, 100, 1e-9); yakin(r.alanFarkiYuzde, 0, 1e-9);
  yakin(r.maksKazi.dz, 2, 1e-12);
});

test('kazı-dolgu: eğimli zemin (z = 10 + 0,1·x) 100×60, platform 10 → kazı 30000; platform 15 → kazı = dolgu = 7500 (denge)', () => {
  const zemin = { elevationAt: (x) => 10 + 0.1 * x };
  const a = H.computeCutFill({ polygons: [[rect(0, 0, 100, 60)]], ground: zemin, design: H.flatSurface(10), cell: 1 });
  yakin(a.kazi, 30000, 1e-6); assert.equal(a.dolgu, 0);
  const b = H.computeCutFill({ polygons: [[rect(0, 0, 100, 60)]], ground: zemin, design: H.flatSurface(15), cell: 1 });
  yakin(b.kazi, 7500, 1e-6); yakin(b.dolgu, 7500, 1e-6); yakin(b.net, 0, 1e-6);
});

test('kazı-dolgu: TIN zemin × TIN tasarım (iki yüzey farkı) = fark × alan; eğimli tasarım düzlemi analitik', () => {
  const zemin = H.buildSurface(agNoktalari(-5, -5, 105, 65, 5, (x, y) => 20 + 0.03 * x + 0.01 * y));
  const tasarim = H.buildSurface(agNoktalari(-5, -5, 105, 65, 5, (x, y) => 18.5 + 0.03 * x + 0.01 * y));   // 1,5 m aşağıda
  const r = H.computeCutFill({ polygons: [[rect(0, 0, 100, 60)]], ground: zemin, design: tasarim, cell: 1 });
  yakin(r.kazi, 1.5 * 6000, 1e-3); assert.equal(r.dolgu, 0);
  // düz zemin 10, tasarım yukarı eğimli düzlem (kuzeye %2, merkezde 10) → kazı = dolgu = 2500
  const e = H.computeCutFill({ polygons: [[rect(0, 0, 100, 100)]], ground: H.flatSurface(10),
    design: H.planeSurface({ z0: 10, x0: 50, y0: 50, azimuthDeg: 0, slopePct: 2 }), cell: 1 });
  yakin(e.kazi, 2500, 1e-6); yakin(e.dolgu, 2500, 1e-6);
  // doğu yönlü eğim (azimut 90°): aynı sayılar
  const d = H.computeCutFill({ polygons: [[rect(0, 0, 100, 100)]], ground: H.flatSurface(10),
    design: H.planeSurface({ z0: 10, x0: 50, y0: 50, azimuthDeg: 90, slopePct: 2 }), cell: 1 });
  yakin(d.kazi, 2500, 1e-6);
});

test('delikli poligon alanı düşer; çoklu poligon toplanır; hücre boyu hizalı olmasa da hata < %1', () => {
  const delikli = [rect(0, 0, 100, 100), rect(40, 40, 60, 60)];
  const r = H.computeCutFill({ polygons: [delikli], ground: H.flatSurface(11), design: H.flatSurface(10), cell: 1 });
  yakin(r.kazi, (10000 - 400) * 1, 1e-6); yakin(r.poligonAlani, 9600, 1e-9);
  const iki = H.computeCutFill({ polygons: [[rect(0, 0, 10, 10)], [rect(100, 100, 120, 110)]], ground: H.flatSurface(11), design: H.flatSurface(10), cell: 1 });
  yakin(iki.kazi, 100 + 200, 1e-6);
  const hizasiz = H.computeCutFill({ polygons: [[rect(0, 0, 50, 40)]], ground: H.flatSurface(12), design: H.flatSurface(10), cell: 3 });
  assert.ok(Math.abs(hizasiz.kazi - 4000) / 4000 < 0.01, `hizasız hücre kazı ${hizasiz.kazi}`);
  assert.ok(Math.abs(hizasiz.alanFarkiYuzde) < 3, 'alan farkı raporlanır');
  // üçgen (eğik kenar): hücre boyu küçülünce gerçek alana yakınsar
  const ucgenHata = (cell) => Math.abs(H.computeCutFill({ polygons: [[[[0, 0], [100, 0], [0, 100], [0, 0]]]], ground: H.flatSurface(11), design: H.flatSurface(10), cell }).kazi - 5000) / 5000;
  assert.ok(ucgenHata(0.5) < 0.01, `üçgen hata ${ucgenHata(0.5)}`);
  assert.ok(ucgenHata(0.25) < ucgenHata(2), 'hücre küçüldükçe hata azalır');
});

test('kapsam dışı alan hacme KATILMAZ ve ayrıca raporlanır (sessizce sıfır varsayılmaz)', () => {
  const yarim = H.buildSurface(agNoktalari(0, 0, 50, 80, 5, () => 12));     // yalnız x∈[0,50] tanımlı
  const r = H.computeCutFill({ polygons: [[rect(0, 0, 100, 80)]], ground: yarim, design: H.flatSurface(10), cell: 1 });
  yakin(r.kazi, 2 * 50 * 80, 2 * 80 * 1.5, 'yalnız kapsanan yarı');      // sınır hücrelerinde ≤ 1 hücre genişliği tolerans
  yakin(r.kapsamYuzde, 50, 1.5);
  yakin(r.kapsamDisiAlan, 4000, 160);
});

test('kabarma / sıkışma katsayıları; geçersiz katsayı reddedilir', () => {
  const r = H.computeCutFill({ polygons: [[rect(0, 0, 10, 10)]], ground: { elevationAt: (x) => 10 + (x > 5 ? 1 : -1) }, design: H.flatSurface(10), cell: 1, swell: 1.25, compaction: 0.9 });
  yakin(r.kazi, 50, 1e-9); yakin(r.dolgu, 50, 1e-9);
  yakin(r.gevsekKazi, 62.5, 1e-9); yakin(r.dolguIcinYerindeKazi, 50 / 0.9, 1e-9);
  assert.throws(() => H.computeCutFill({ polygons: [[rect(0, 0, 1, 1)]], ground: H.flatSurface(1), design: H.flatSurface(1), swell: 0 }), /katsayı/);
  assert.throws(() => H.computeCutFill({ polygons: [], ground: H.flatSurface(1), design: H.flatSurface(1) }), /Alan/);
});

test('otomatik hücre boyu ve sınır: çok büyük alanda hücre sayısı maxCells\'i aşmaz; gösterim ızgarası ≲ 8000 blok', () => {
  const r = H.computeCutFill({ polygons: [[rect(0, 0, 2000, 2000)]], ground: H.flatSurface(11), design: H.flatSurface(10) });
  assert.ok(r.nx * r.ny <= 400000);
  assert.ok(r.gosterim.length <= 8000, `gösterim ${r.gosterim.length}`);
  yakin(r.kazi, 4e6, 4e6 * 0.01);
});

test('performans: 200×200 m, 0,5 m hücre (160 bin hücre), 2 bin noktalı TIN — saniyeler içinde', () => {
  const t0 = Date.now();
  const z = H.buildSurface(agNoktalari(-2, -2, 202, 202, 4.5, (x, y) => 30 + 0.02 * x + 0.5 * Math.sin(x / 30)));
  const r = H.computeCutFill({ polygons: [[rect(0, 0, 200, 200)]], ground: z, design: H.flatSurface(30), cell: 0.5 });
  assert.ok(r.hucreler.x.length > 150000);
  assert.ok(Date.now() - t0 < 8000, `süre ${Date.now() - t0} ms`);
});

test('CSV: başlık + satırlar; geri okunabilir (ondalık virgül)', () => {
  const fr = H.localFrame(29, 41);
  const r = H.computeCutFill({ polygons: [[rect(0, 0, 3, 2)]], ground: H.flatSurface(10.5), design: H.flatSurface(10), cell: 1 });
  const csv = H.toCsv(r, fr);
  const satirlar = csv.split('\r\n');
  assert.equal(satirlar.length, 1 + 6); assert.match(satirlar[0], /^Doğu\(m\);Kuzey\(m\)/);
  const geri = H.parsePointText(satirlar.slice(1).map((s) => s.split(';').slice(4, 7).join(';')).join('\n'));
  assert.deepEqual(geri.points[0], [10.5, 10, 0.5]);
});
