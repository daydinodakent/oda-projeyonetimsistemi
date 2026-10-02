/*
 * ODA Hafriyat (kazı-dolgu) hesap çekirdeği — saf, DOM'suz sayısal kod.
 *
 * Harita aracı (legacy-standalone-tools/oda-harita-cizim-araci.html) bunu bir <script>
 * olarak yükler; birim testleri (server/moduller/hafriyat) Node'da aynı dosyayı çalıştırır.
 * Bu yüzden dosya public/vendor altındadır (Vite build'inde HTML ayrı bir varlık olarak
 * işlendiği için kardeş dosya yolu çalışmaz; mutlak '/vendor/...' yolu çalışır).
 *
 * YÖNTEM (ızgara / kare prizma): alan, yerel metre düzleminde cell×cell karelere bölünür;
 * her kare MERKEZİNDE mevcut zemin ve tasarım kotları okunur, fark × kare alanı toplanır.
 *   fark = mevcut − tasarım   (+ → KAZI, − → DOLGU)
 * Yüzeyler: ölçüm noktalarından Delaunay TIN (barycentric enterpolasyon), düz platform,
 * eğimli düzlem veya (harita DEM'i gibi) elevationAt(x, y) sunan herhangi bir nesne.
 *
 * Kapsam dışı (yüzeyin tanımlı olmadığı) kareler hacme KATILMAZ; alanı ayrıca raporlanır —
 * sessizce sıfır varsayılmaz.
 *
 * Yerel çerçeve küçük bir düzlem yaklaşımıdır (şantiye ölçeğinde, birkaç km; alan/hacim hatası yaklaşık %0,1 mertebesinde).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OdaHafriyat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var D2R = Math.PI / 180;

  // ---------- Yerel metre çerçevesi ----------
  function metersPerDegree(latDeg) {
    var p = latDeg * D2R;
    return {
      lat: 111132.92 - 559.82 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p) - 0.0023 * Math.cos(6 * p),
      lng: 111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p) + 0.118 * Math.cos(5 * p),
    };
  }
  function localFrame(lng0, lat0) {
    var m = metersPerDegree(lat0);
    return {
      lng0: lng0, lat0: lat0,
      toXY: function (lng, lat) { return [(lng - lng0) * m.lng, (lat - lat0) * m.lat]; },
      toLngLat: function (x, y) { return [lng0 + x / m.lng, lat0 + y / m.lat]; },
    };
  }

  // ---------- Geometri ----------
  function ringArea(ring) {
    var a = 0, n = ring.length;
    for (var i = 0, j = n - 1; i < n; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    return Math.abs(a) / 2;
  }
  /** polygon = [dışHalka, delik1, ...]; alan = dış − delikler. */
  function polygonArea(rings) {
    var a = ringArea(rings[0]);
    for (var i = 1; i < rings.length; i++) a -= ringArea(rings[i]);
    return a;
  }
  /** Çift-tek kuralı; tüm halkalar (delikler dahil) birlikte sayılır. */
  function inRings(x, y, rings) {
    var inside = false;
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r];
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    return inside;
  }

  // ---------- Nokta dosyası ayrıştırma (CSV / TXT / XYZ) ----------
  function isNum(s) { return s !== '' && isFinite(Number(s)); }
  function detectDelimiter(sample) {
    var c = { ';': 0, '\t': 0, ',': 0 };
    for (var i = 0; i < sample.length; i++) if (sample[i] in c) c[sample[i]]++;
    if (c[';'] >= 2) return ';';
    if (c['\t'] >= 2) return '\t';
    if (c[','] >= 2) return ',';
    return null;   // boşlukla ayrılmış
  }
  /**
   * @param {string} text
   * @param {{firstColumnId?: boolean}} [opts] firstColumnId: ilk sütun nokta numarası mı? (verilmezse: sayısal
   *        olmayan bir ilk sütun otomatik "nokta adı" sayılır; sayısal nokta numaraları için true verin)
   * @returns {{points:number[][], skipped:number, delimiter:string, headerSkipped:boolean}}
   *          points: her biri [a, b, z] (a,b = dosyadaki ilk iki koordinat sütunu, YORUMLAMA çağırana aittir)
   */
  function parsePointText(text, opts) {
    opts = opts || {};
    var lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
    var delim = null, detected = false;
    var points = [], skipped = 0, headerSkipped = false;
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li].trim();
      if (!line || line[0] === '#' || line.slice(0, 2) === '//' || line[0] === '!') continue;
      if (!detected) { delim = detectDelimiter(line); detected = true; }
      var tokens = (delim === null ? line.split(/\s+/) : line.split(delim)).map(function (t) { return t.trim(); });
      // ondalık virgül (yalnızca ';', sekme veya boşluk ayırıcıyla birlikte anlamlı)
      if (delim !== ',') tokens = tokens.map(function (t) { return /^-?\d+,\d+$/.test(t) ? t.replace(',', '.') : t; });
      var drop = opts.firstColumnId === true || (opts.firstColumnId === undefined && tokens.length >= 4 && !isNum(tokens[0]));
      if (drop) tokens = tokens.slice(1);
      if (tokens.length >= 3 && isNum(tokens[0]) && isNum(tokens[1]) && isNum(tokens[2])) {
        points.push([Number(tokens[0]), Number(tokens[1]), Number(tokens[2])]);
      } else if (!points.length && !headerSkipped) {
        headerSkipped = true;   // ilk sayısal olmayan satır başlık sayılır
      } else {
        skipped++;
      }
    }
    return { points: points, skipped: skipped, delimiter: delim === null ? 'boşluk' : (delim === '\t' ? 'sekme' : delim), headerSkipped: headerSkipped };
  }

  // ---------- Yüzeyler ----------
  function median(arr) {
    if (!arr.length) return 0;
    var a = Float64Array.from(arr).sort();
    return a[a.length >> 1];
  }

  /**
   * Ölçüm noktalarından TIN yüzeyi. points: yerel metre [[x, y, z], ...]
   * @param {{Delaunator?: Function, voidFactor?: number}} [opts] voidFactor: en uzun kenarı, medyan kenarın bu katından
   *        büyük üçgenler "boşluk" sayılıp çıkarılır (varsayılan 8; 0 = filtre yok) — dış bükey zarf boyunca enterpolasyonu önler.
   */
  function buildSurface(points, opts) {
    opts = opts || {};
    var Del = opts.Delaunator || (typeof globalThis !== 'undefined' ? globalThis.Delaunator : undefined);
    if (!Del) throw new Error('Delaunator yüklenemedi.');
    var voidFactor = opts.voidFactor == null ? 8 : opts.voidFactor;
    // aynı (x,y) noktalarını (1 mm) birleştir — ortalama kot
    var map = new Map();
    for (var i = 0; i < points.length; i++) {
      var key = Math.round(points[i][0] * 1000) + ',' + Math.round(points[i][1] * 1000);
      var e = map.get(key);
      if (e) { e.z += points[i][2]; e.n++; } else map.set(key, { x: points[i][0], y: points[i][1], z: points[i][2], n: 1 });
    }
    var pts = Array.from(map.values());
    if (pts.length < 3) throw new Error('Yüzey için en az 3 farklı nokta gerekli.');
    var n = pts.length, X = new Float64Array(n), Y = new Float64Array(n), Z = new Float64Array(n), coords = new Float64Array(2 * n);
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, zmin = Infinity, zmax = -Infinity;
    for (var k = 0; k < n; k++) {
      X[k] = pts[k].x; Y[k] = pts[k].y; Z[k] = pts[k].z / pts[k].n;
      coords[2 * k] = X[k]; coords[2 * k + 1] = Y[k];
      if (X[k] < minx) minx = X[k]; if (X[k] > maxx) maxx = X[k];
      if (Y[k] < miny) miny = Y[k]; if (Y[k] > maxy) maxy = Y[k];
      if (Z[k] < zmin) zmin = Z[k]; if (Z[k] > zmax) zmax = Z[k];
    }
    var tri = new Del(coords).triangles;
    if (!tri.length) throw new Error('Noktalar doğrusal/çakışık — yüzey oluşturulamadı.');
    var T = tri.length / 3;
    var longest = new Float64Array(T), allEdges = new Float64Array(T * 3);
    for (var t = 0; t < T; t++) {
      var a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
      var eab = Math.hypot(X[a] - X[b], Y[a] - Y[b]), ebc = Math.hypot(X[b] - X[c], Y[b] - Y[c]), eca = Math.hypot(X[c] - X[a], Y[c] - Y[a]);
      allEdges[3 * t] = eab; allEdges[3 * t + 1] = ebc; allEdges[3 * t + 2] = eca;
      longest[t] = Math.max(eab, ebc, eca);
    }
    var med = median(allEdges);
    var maxEdge = voidFactor > 0 ? voidFactor * med : Infinity;
    var keep = [], area = 0;
    for (var t2 = 0; t2 < T; t2++) {
      if (longest[t2] > maxEdge) continue;
      keep.push(t2);
      var a2 = tri[3 * t2], b2 = tri[3 * t2 + 1], c2 = tri[3 * t2 + 2];
      area += Math.abs((X[b2] - X[a2]) * (Y[c2] - Y[a2]) - (X[c2] - X[a2]) * (Y[b2] - Y[a2])) / 2;
    }
    if (!keep.length) throw new Error('Tüm üçgenler boşluk filtresine takıldı — boşluk çarpanını artırın.');
    // uzamsal karma (grid) — her üçgen sınır kutusunun kestiği hücrelere yazılır
    var cs = Math.max(med * 2, (maxx - minx + maxy - miny) / 2000, 1e-6);
    var nx = Math.max(1, Math.ceil((maxx - minx) / cs)), ny = Math.max(1, Math.ceil((maxy - miny) / cs));
    while (nx * ny > 4e6) { cs *= 1.5; nx = Math.max(1, Math.ceil((maxx - minx) / cs)); ny = Math.max(1, Math.ceil((maxy - miny) / cs)); }
    var buckets = new Array(nx * ny);
    for (var q = 0; q < keep.length; q++) {
      var tt = keep[q], p0 = tri[3 * tt], p1 = tri[3 * tt + 1], p2 = tri[3 * tt + 2];
      var bx0 = Math.floor((Math.min(X[p0], X[p1], X[p2]) - minx) / cs), bx1 = Math.floor((Math.max(X[p0], X[p1], X[p2]) - minx) / cs);
      var by0 = Math.floor((Math.min(Y[p0], Y[p1], Y[p2]) - miny) / cs), by1 = Math.floor((Math.max(Y[p0], Y[p1], Y[p2]) - miny) / cs);
      for (var gy = Math.max(0, by0); gy <= Math.min(ny - 1, by1); gy++) {
        for (var gx = Math.max(0, bx0); gx <= Math.min(nx - 1, bx1); gx++) {
          var bi = gy * nx + gx;
          (buckets[bi] || (buckets[bi] = [])).push(tt);
        }
      }
    }
    function elevationAt(x, y) {
      if (x < minx || x > maxx || y < miny || y > maxy) return null;
      var gx = Math.min(nx - 1, Math.floor((x - minx) / cs)), gy = Math.min(ny - 1, Math.floor((y - miny) / cs));
      var list = buckets[gy * nx + gx];
      if (!list) return null;
      for (var i = 0; i < list.length; i++) {
        var t = list[i], a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
        var x1 = X[a], y1 = Y[a], x2 = X[b], y2 = Y[b], x3 = X[c], y3 = Y[c];
        var det = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
        if (det === 0) continue;
        var l1 = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / det;
        var l2 = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / det;
        var l3 = 1 - l1 - l2;
        if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) return l1 * Z[a] + l2 * Z[b] + l3 * Z[c];
      }
      return null;
    }
    return {
      elevationAt: elevationAt,
      stats: { tur: 'tin', n: n, zMin: zmin, zMax: zmax, bbox: [minx, miny, maxx, maxy], ucgen: keep.length, atilanUcgen: T - keep.length, medyanAralik: med, kapsananAlan: area, tekrarBirlestirilen: points.length - n },
    };
  }

  function flatSurface(z) {
    return { elevationAt: function () { return z; }, stats: { tur: 'duz', z: z } };
  }
  /** Eğimli düzlem: z = z0 + eğim × (yukarı eğim yönündeki uzaklık). azimuth: kuzeyden saat yönünde derece. */
  function planeSurface(o) {
    var az = (o.azimuthDeg || 0) * D2R, s = (o.slopePct || 0) / 100, sx = Math.sin(az), sy = Math.cos(az);
    var x0 = o.x0 || 0, y0 = o.y0 || 0, z0 = o.z0;
    return {
      elevationAt: function (x, y) { return z0 + s * ((x - x0) * sx + (y - y0) * sy); },
      stats: { tur: 'duzlem', z0: z0, azimuthDeg: o.azimuthDeg || 0, slopePct: o.slopePct || 0 },
    };
  }

  // ---------- Kazı–dolgu ----------
  /**
   * @param {{polygons:number[][][][], ground:{elevationAt:Function}, design:{elevationAt:Function}, cell?:number,
   *          swell?:number, compaction?:number, maxCells?:number}} o
   *        polygons: her biri [dışHalka, delik...]; koordinatlar yerel metre.
   */
  function computeCutFill(o) {
    var polys = o.polygons, ground = o.ground, design = o.design;
    if (!polys || !polys.length) throw new Error('Alan (poligon) gerekli.');
    var swell = o.swell == null ? 1 : o.swell, compaction = o.compaction == null ? 1 : o.compaction, maxCells = o.maxCells || 400000;
    if (!(swell > 0) || !(compaction > 0)) throw new Error('Kabarma ve sıkışma katsayıları sıfırdan büyük olmalı.');
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, polyArea = 0;
    var pb = polys.map(function (rings) {
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      rings[0].forEach(function (p) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; });
      if (b[0] < minx) minx = b[0]; if (b[1] < miny) miny = b[1]; if (b[2] > maxx) maxx = b[2]; if (b[3] > maxy) maxy = b[3];
      polyArea += polygonArea(rings);
      return b;
    });
    var cell = o.cell > 0 ? o.cell : Math.min(25, Math.max(0.25, Math.round(Math.sqrt(polyArea / 40000) * 100) / 100));
    var nx, ny;
    for (;;) {
      nx = Math.max(1, Math.ceil((maxx - minx) / cell)); ny = Math.max(1, Math.ceil((maxy - miny) / cell));
      if (nx * ny <= maxCells) break;
      cell *= 1.25;
    }
    var A = cell * cell;
    var cut = 0, fill = 0, inside = 0, uncovered = 0, dzSum = 0;
    var maxCut = { dz: 0, x: null, y: null }, maxFill = { dz: 0, x: null, y: null };
    var cx = [], cy = [], zg = [], zd = [];
    // gösterim: k×k kare bloklar
    var blocks = new Map(); var k = 1;
    var estCells = polyArea / A; k = Math.max(1, Math.ceil(Math.sqrt(estCells / 6000)));
    for (var j = 0; j < ny; j++) {
      var y = miny + (j + 0.5) * cell;
      for (var i = 0; i < nx; i++) {
        var x = minx + (i + 0.5) * cell;
        var inP = false;
        for (var p = 0; p < polys.length; p++) {
          var b = pb[p];
          if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
          if (inRings(x, y, polys[p])) { inP = true; break; }
        }
        if (!inP) continue;
        inside++;
        var g = ground.elevationAt(x, y), d = design.elevationAt(x, y);
        var bk = Math.floor(i / k) + ',' + Math.floor(j / k);
        var blk = blocks.get(bk);
        if (!blk) { blk = { bx: Math.floor(i / k), by: Math.floor(j / k), sum: 0, n: 0, un: 0 }; blocks.set(bk, blk); }
        if (g == null || d == null || !isFinite(g) || !isFinite(d)) { uncovered++; blk.un++; continue; }
        var dz = g - d;
        dzSum += dz; blk.sum += dz; blk.n++;
        if (dz > 0) { cut += dz * A; if (dz > maxCut.dz) maxCut = { dz: dz, x: x, y: y }; }
        else if (dz < 0) { fill += -dz * A; if (-dz > maxFill.dz) maxFill = { dz: -dz, x: x, y: y }; }
        cx.push(x); cy.push(y); zg.push(g); zd.push(d);
      }
    }
    var covered = inside - uncovered;
    var display = [];
    blocks.forEach(function (blk) {
      display.push({ x0: minx + blk.bx * k * cell, y0: miny + blk.by * k * cell, size: k * cell, dz: blk.n ? blk.sum / blk.n : null, kapsamDisi: blk.n === 0 });
    });
    return {
      cell: cell, nx: nx, ny: ny, blokBoyu: k * cell,
      poligonAlani: polyArea, hucreAlani: inside * A, alanFarkiYuzde: polyArea > 0 ? (inside * A - polyArea) / polyArea * 100 : 0,
      kapsananAlan: covered * A, kapsamDisiAlan: uncovered * A, kapsamYuzde: inside ? covered / inside * 100 : 0,
      kazi: cut, dolgu: fill, net: cut - fill,
      gevsekKazi: cut * swell, dolguIcinYerindeKazi: fill / compaction, swell: swell, compaction: compaction,
      ortalamaFark: covered ? dzSum / covered : null,
      maksKazi: maxCut, maksDolgu: maxFill,
      hucreler: { x: cx, y: cy, zMevcut: zg, zTasarim: zd },
      gosterim: display,
    };
  }

  /** Hücre tablosu CSV'si (';' ayraç, ondalık virgül — Türkçe Excel ile açılır; kendi ayrıştırıcımızla geri okunur). */
  function toCsv(res, frame) {
    var f = function (v, n) { return Number(v).toFixed(n).replace('.', ','); };
    var rows = ['Doğu(m);Kuzey(m);Boylam;Enlem;MevcutKot(m);TasarimKot(m);Fark(m, +kazı/-dolgu)'];
    var h = res.hucreler;
    for (var i = 0; i < h.x.length; i++) {
      var ll = frame ? frame.toLngLat(h.x[i], h.y[i]) : [null, null];
      rows.push([f(h.x[i], 3), f(h.y[i], 3), ll[0] == null ? '' : f(ll[0], 7), ll[1] == null ? '' : f(ll[1], 7), f(h.zMevcut[i], 3), f(h.zTasarim[i], 3), f(h.zMevcut[i] - h.zTasarim[i], 3)].join(';'));
    }
    return rows.join('\r\n');
  }

  return {
    metersPerDegree: metersPerDegree, localFrame: localFrame,
    ringArea: ringArea, polygonArea: polygonArea, inRings: inRings,
    parsePointText: parsePointText,
    buildSurface: buildSurface, flatSurface: flatSurface, planeSurface: planeSurface,
    computeCutFill: computeCutFill, toCsv: toCsv,
  };
});
