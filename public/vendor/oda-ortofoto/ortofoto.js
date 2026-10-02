/*
 * ODA Ortofoto — drone ortofoto zaman serisi için saf (DOM'suz) yardımcılar.
 * Harita aracı bunu <script> olarak yükler, birim testleri (server/moduller/ortofoto) Node'da çalıştırır.
 *
 *  - tarih çıkarma (dosya adı / TIFF DateTime), EPSG → proj4 tanımı
 *  - görüntü köşeleri (quad) ve afin eşleme
 *  - DEĞİŞİM TESPİTİ: iki görüntünün (aynı ızgaraya örneklenmiş RGBA) farkı
 *      1) ham fark → "kararlı" piksellerden (fark ≤ %70'lik dilim) ışık/pozlama normalizasyonu (ortalama/std eşleme)
 *      2) normalize edilmiş fark → 3×3 bulanıklaştırma (gürültü ve küçük kayıklıkları bastırır)
 *      3) eşik + en küçük küme alanı (bağlı bileşen) filtresi
 *    Bu, piksel farkı yöntemidir: gölge, bitki örtüsü ve hizalama kayıklığı yanlış pozitif üretebilir;
 *    sonuçlar "inceleme adayı" olarak yorumlanmalıdır (hakediş/metraj ölçüsü değildir).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OdaOrtofoto = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------- Tarih ----------
  function gecerliTarih(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /** Dosya adından 'YYYY-MM-DD' (20260915, 2026-09-15, 2026_09_15, 15.09.2026, 15-09-2026); bulunamazsa null. */
  function tarihAdindan(ad) {
    var s = String(ad || '');
    var m, y, mo, d;
    var re1 = /(?:^|[^0-9])(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?:[^0-9]|$)/g;
    while ((m = re1.exec(s))) {
      y = +m[1]; mo = +m[2]; d = +m[3];
      if (gecerliTarih(y, mo, d)) return y + '-' + pad(mo) + '-' + pad(d);
      re1.lastIndex = m.index + 1;
    }
    var re2 = /(?:^|[^0-9])(0[1-9]|[12]\d|3[01])[-_.](0[1-9]|1[0-2])[-_.](20\d{2})(?:[^0-9]|$)/g;
    while ((m = re2.exec(s))) {
      d = +m[1]; mo = +m[2]; y = +m[3];
      if (gecerliTarih(y, mo, d)) return y + '-' + pad(mo) + '-' + pad(d);
      re2.lastIndex = m.index + 1;
    }
    return null;
  }
  /** TIFF DateTime etiketi 'YYYY:MM:DD HH:MM:SS' → 'YYYY-MM-DD' (geçersizse null). */
  function tarihTiffDen(s) {
    var m = /^(\d{4}):(\d{2}):(\d{2})/.exec(String(s || ''));
    if (!m) return null;
    return gecerliTarih(+m[1], +m[2], +m[3]) ? m[1] + '-' + m[2] + '-' + m[3] : null;
  }

  // ---------- Koordinat sistemi ----------
  function tmTanimi(lon0) {
    return '+proj=tmerc +lat_0=0 +lon_0=' + lon0 + ' +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
  }
  function utmTanimi(zone, kuzey) {
    return '+proj=utm +zone=' + zone + (kuzey ? '' : ' +south') + ' +datum=WGS84 +units=m +no_defs';
  }
  /**
   * EPSG kodu → { tur: 'cografi' | 'projeksiyon', def?: proj4 tanımı } ; desteklenmiyorsa null.
   * Desteklenenler: 4326, 3857/900913, 326NN/327NN (UTM WGS84), 5253–5259 (TUREF/ITRF96 TM27…TM45).
   */
  function epsgTanimi(kod) {
    kod = Number(kod);
    if (kod === 4326) return { tur: 'cografi' };
    if (kod === 3857 || kod === 900913) return { tur: 'projeksiyon', def: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs' };
    if (kod >= 32601 && kod <= 32660) return { tur: 'projeksiyon', def: utmTanimi(kod - 32600, true) };
    if (kod >= 32701 && kod <= 32760) return { tur: 'projeksiyon', def: utmTanimi(kod - 32700, false) };
    if (kod >= 5253 && kod <= 5259) return { tur: 'projeksiyon', def: tmTanimi(27 + 3 * (kod - 5253)) };
    return null;
  }
  /** Kullanıcı seçimi ('wgs84' | 'utm35n' | 'utm36n' | 'utm37n' | '27'…'45') → epsgTanimi benzeri. */
  function secimTanimi(secim) {
    if (secim === 'wgs84') return { tur: 'cografi' };
    var u = /^utm(\d{2})n$/.exec(secim);
    if (u) return { tur: 'projeksiyon', def: utmTanimi(+u[1], true) };
    if (/^(27|30|33|36|39|42|45)$/.test(secim)) return { tur: 'projeksiyon', def: tmTanimi(+secim) };
    return null;
  }

  // ---------- Köşeler / afin ----------
  /** Projeksiyon sınır kutusu [minx, miny, maxx, maxy] → [TL, TR, BR, BL] boylam/enlem. convert([x,y]) → [lng,lat]. */
  function koselerKutudan(bbox, convert) {
    var pts = [[bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]]];
    return pts.map(function (p) { return convert ? convert(p) : p; });
  }
  /** Dünya dosyası (.jgw/.pgw/.wld: A D B E C F) → [TL, TR, BR, BL]; dönük (B, D ≠ 0) görüntüleri de destekler. */
  function koselerDunyaDosyasindan(nums, w, h) {
    var A = nums[0], D = nums[1], B = nums[2], E = nums[3], C = nums[4], F = nums[5];
    // piksel merkezi (0,0) → (C,F); köşe = merkez − yarım piksel
    var px = function (x, y) { return [A * x + B * y + C, D * x + E * y + F]; };
    var x0 = -0.5, y0 = -0.5, x1 = w - 0.5, y1 = h - 0.5;
    return [px(x0, y0), px(x1, y0), px(x1, y1), px(x0, y1)];
  }
  /** Köşelerden (TL, TR, BR, BL) sınır kutusu [west, south, east, north]. */
  function kutuKoselerden(q) {
    var xs = q.map(function (p) { return p[0]; }), ys = q.map(function (p) { return p[1]; });
    return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
  }
  function kutuKesisimi(a, b) {
    var w = Math.max(a[0], b[0]), s = Math.max(a[1], b[1]), e = Math.min(a[2], b[2]), n = Math.min(a[3], b[3]);
    return (e > w && n > s) ? [w, s, e, n] : null;
  }
  /**
   * Kaynak görüntü pikselinden (w×h) ızgara pikseline (gW×gH, kutu [west,south,east,north]) afin: [a,b,c,d,e,f]
   * (canvas setTransform sırası: x' = a·x + c·y + e, y' = b·x + d·y + f). Köşeler paralelkenar (TL,TR,BL) varsayılır.
   */
  function afinKaynaktanIzgaraya(quad, w, h, kutu, gW, gH) {
    var TL = quad[0], TR = quad[1], BL = quad[3];
    var sx = gW / (kutu[2] - kutu[0]), sy = gH / (kutu[3] - kutu[1]);
    var gx = function (lng) { return (lng - kutu[0]) * sx; };
    var gy = function (lat) { return (kutu[3] - lat) * sy; };
    var ux = [(TR[0] - TL[0]) / w, (TR[1] - TL[1]) / w];      // 1 kaynak px sağa
    var vy = [(BL[0] - TL[0]) / h, (BL[1] - TL[1]) / h];      // 1 kaynak px aşağı
    return [ux[0] * sx, -ux[1] * sy, vy[0] * sx, -vy[1] * sy, gx(TL[0]), gy(TL[1])];
  }
  /** Yerel metre ölçeği (derece başına) */
  function dereceMetre(lat) {
    var p = lat * Math.PI / 180;
    return { lat: 111132.92 - 559.82 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p), lng: 111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p) };
  }

  // ---------- Değişim tespiti ----------
  /**
   * @param {{data:Uint8ClampedArray, width:number, height:number}} A  eski görüntü (RGBA, ızgaraya örneklenmiş)
   * @param {{data:Uint8ClampedArray, width:number, height:number}} B  yeni görüntü (aynı boyut)
   * @param {{normalize?:boolean, blur?:boolean}} [o]
   * @returns {{width:number,height:number,fark:Float32Array,gecerli:Uint8Array,gecerliPiksel:number,normalizasyon:object|null}}
   *          fark ∈ [0,1] (normalize edilmiş renk uzaklığı); gecerli: her iki görüntüde de opak piksel.
   */
  function farkHesapla(A, B, o) {
    o = o || {};
    if (A.width !== B.width || A.height !== B.height) throw new Error('Görüntü boyutları eşit olmalı.');
    var W = A.width, H = A.height, N = W * H, a = A.data, b = B.data;
    var gecerli = new Uint8Array(N), gp = 0;
    for (var i = 0; i < N; i++) if (a[4 * i + 3] > 127 && b[4 * i + 3] > 127) { gecerli[i] = 1; gp++; }
    if (!gp) return { width: W, height: H, fark: new Float32Array(N), gecerli: gecerli, gecerliPiksel: 0, normalizasyon: null };
    var MAX = Math.sqrt(3) * 255;
    var ham = new Float32Array(N);
    for (var p = 0; p < N; p++) {
      if (!gecerli[p]) continue;
      var dr = a[4 * p] - b[4 * p], dg = a[4 * p + 1] - b[4 * p + 1], db = a[4 * p + 2] - b[4 * p + 2];
      ham[p] = Math.sqrt(dr * dr + dg * dg + db * db);
    }
    var norm = null;
    var bR = new Float32Array(N), bG = new Float32Array(N), bB = new Float32Array(N);
    for (var q = 0; q < N; q++) { bR[q] = b[4 * q]; bG[q] = b[4 * q + 1]; bB[q] = b[4 * q + 2]; }
    if (o.normalize !== false) {
      // kararlı pikseller: ham farkın %70'lik dilimi altı (gerçek değişim ve gölgeler istatistiği bozmasın)
      var hist = new Uint32Array(444);
      for (var h1 = 0; h1 < N; h1++) if (gecerli[h1]) hist[Math.min(443, Math.floor(ham[h1]))]++;
      var hedef = gp * 0.7, cum = 0, esik = 443;
      for (var k = 0; k < 444; k++) { cum += hist[k]; if (cum >= hedef) { esik = k; break; } }
      var n = 0, mA = [0, 0, 0], mB = [0, 0, 0], sA = [0, 0, 0], sB = [0, 0, 0];
      for (var s1 = 0; s1 < N; s1++) {
        if (!gecerli[s1] || ham[s1] > esik) continue;
        n++;
        for (var c = 0; c < 3; c++) { mA[c] += a[4 * s1 + c]; mB[c] += b[4 * s1 + c]; }
      }
      for (var c1 = 0; c1 < 3; c1++) { mA[c1] /= n; mB[c1] /= n; }
      for (var s2 = 0; s2 < N; s2++) {
        if (!gecerli[s2] || ham[s2] > esik) continue;
        for (var c2 = 0; c2 < 3; c2++) { var x = a[4 * s2 + c2] - mA[c2], y = b[4 * s2 + c2] - mB[c2]; sA[c2] += x * x; sB[c2] += y * y; }
      }
      var gain = [], off = [];
      for (var c3 = 0; c3 < 3; c3++) {
        var sa = Math.sqrt(sA[c3] / n), sb = Math.sqrt(sB[c3] / n);
        var g = sb > 1e-6 ? sa / sb : 1;
        g = Math.max(0.5, Math.min(2, g));            // aşırı düzeltmeyi sınırla
        gain.push(g); off.push(mA[c3] - mB[c3] * g);
      }
      var arrs = [bR, bG, bB];
      for (var c4 = 0; c4 < 3; c4++) for (var t = 0; t < N; t++) { var v = arrs[c4][t] * gain[c4] + off[c4]; arrs[c4][t] = v < 0 ? 0 : v > 255 ? 255 : v; }
      norm = { kazanc: gain, ofset: off, kararliPiksel: n, esik: esik };
    }
    var fark = new Float32Array(N);
    for (var r = 0; r < N; r++) {
      if (!gecerli[r]) continue;
      var er = a[4 * r] - bR[r], eg = a[4 * r + 1] - bG[r], eb = a[4 * r + 2] - bB[r];
      fark[r] = Math.sqrt(er * er + eg * eg + eb * eb) / MAX;
    }
    if (o.blur !== false) fark = kutuBulaniklastir(fark, gecerli, W, H);
    return { width: W, height: H, fark: fark, gecerli: gecerli, gecerliPiksel: gp, normalizasyon: norm };
  }

  /** 3×3 kutu bulanıklığı (yalnızca geçerli komşular ortalanır). */
  function kutuBulaniklastir(src, gecerli, W, H) {
    var out = new Float32Array(src.length);
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = y * W + x;
        if (!gecerli[i]) continue;
        var sum = 0, cnt = 0;
        for (var dy = -1; dy <= 1; dy++) {
          var yy = y + dy; if (yy < 0 || yy >= H) continue;
          for (var dx = -1; dx <= 1; dx++) {
            var xx = x + dx; if (xx < 0 || xx >= W) continue;
            var j = yy * W + xx;
            if (gecerli[j]) { sum += src[j]; cnt++; }
          }
        }
        out[i] = sum / cnt;
      }
    }
    return out;
  }

  /**
   * Eşik + en küçük küme filtresi (4 bağlantılı bileşenler).
   * @returns {{maske:Uint8Array, degisenPiksel:number, kumeler:{piksel:number,kutu:number[]}[]}} kutu: [minx,miny,maxx,maxy] piksel
   */
  function esikUygula(fd, esik, minKumePiksel) {
    var W = fd.width, H = fd.height, N = W * H, f = fd.fark;
    var ham = new Uint8Array(N);
    for (var i = 0; i < N; i++) if (fd.gecerli[i] && f[i] >= esik) ham[i] = 1;
    var maske = new Uint8Array(N), kumeler = [], toplam = 0;
    var min = Math.max(1, minKumePiksel || 1);
    var gordu = new Uint8Array(N), stack = new Int32Array(N);
    for (var s = 0; s < N; s++) {
      if (!ham[s] || gordu[s]) continue;
      var sp = 0, px = [], minx = W, miny = H, maxx = 0, maxy = 0;
      stack[sp++] = s; gordu[s] = 1;
      while (sp) {
        var c = stack[--sp]; px.push(c);
        var cx = c % W, cy = (c / W) | 0;
        if (cx < minx) minx = cx; if (cx > maxx) maxx = cx; if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
        if (cx > 0 && ham[c - 1] && !gordu[c - 1]) { gordu[c - 1] = 1; stack[sp++] = c - 1; }
        if (cx < W - 1 && ham[c + 1] && !gordu[c + 1]) { gordu[c + 1] = 1; stack[sp++] = c + 1; }
        if (cy > 0 && ham[c - W] && !gordu[c - W]) { gordu[c - W] = 1; stack[sp++] = c - W; }
        if (cy < H - 1 && ham[c + W] && !gordu[c + W]) { gordu[c + W] = 1; stack[sp++] = c + W; }
      }
      if (px.length >= min) {
        for (var k = 0; k < px.length; k++) maske[px[k]] = 1;
        toplam += px.length;
        kumeler.push({ piksel: px.length, kutu: [minx, miny, maxx, maxy] });
      }
    }
    kumeler.sort(function (a, b) { return b.piksel - a.piksel; });
    return { maske: maske, degisenPiksel: toplam, kumeler: kumeler };
  }

  /** Değişim bindirmesi: maskeli pikseller kırmızı (alfa fark şiddetiyle artar), diğerleri saydam. */
  function degisimRGBA(fd, maske, esik) {
    var N = fd.width * fd.height, out = new Uint8ClampedArray(N * 4);
    for (var i = 0; i < N; i++) {
      if (!maske[i]) continue;
      var t = Math.min(1, (fd.fark[i] - esik) / Math.max(1e-6, 0.5 - esik) + 0.35);   // eşiğin hemen üstü soluk, güçlü fark opak
      out[4 * i] = 239; out[4 * i + 1] = 68; out[4 * i + 2] = 68; out[4 * i + 3] = Math.round(90 + 150 * Math.max(0, t));
    }
    return out;
  }

  return {
    tarihAdindan: tarihAdindan, tarihTiffDen: tarihTiffDen,
    epsgTanimi: epsgTanimi, secimTanimi: secimTanimi, tmTanimi: tmTanimi, utmTanimi: utmTanimi,
    koselerKutudan: koselerKutudan, koselerDunyaDosyasindan: koselerDunyaDosyasindan, kutuKoselerden: kutuKoselerden, kutuKesisimi: kutuKesisimi,
    afinKaynaktanIzgaraya: afinKaynaktanIzgaraya, dereceMetre: dereceMetre,
    farkHesapla: farkHesapla, esikUygula: esikUygula, degisimRGBA: degisimRGBA,
  };
});
