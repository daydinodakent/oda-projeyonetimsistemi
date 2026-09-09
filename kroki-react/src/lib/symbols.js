export const SYMBOL_LIBRARY = ['circle', 'pin', 'star', 'triangle', 'square', 'home', 'flag', 'cross'];
export const SYMBOL_LABELS = { circle: 'Daire', pin: 'İğne', star: 'Yıldız', triangle: 'Üçgen', square: 'Kare', home: 'Ev', flag: 'Bayrak', cross: 'Çarpı' };

export const SYMBOL_SVG = {
  circle: '<circle cx="12" cy="12" r="8"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"/>',
  star: '<path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z"/>',
  triangle: '<path d="M12 3l9 18H3z"/>',
  square: '<rect x="4" y="4" width="16" height="16"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-7H9v7H5a1 1 0 0 1-1-1z"/>',
  flag: '<path d="M6 3v18M6 4h12l-4 4 4 4H6" fill="none" stroke="currentColor" stroke-width="2"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3"/>'
};

export function symbolIconSvg(key) {
  return `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">${SYMBOL_SVG[key] || SYMBOL_SVG.circle}</svg>`;
}

function drawSymbolShape(ctx, key) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  if (key === 'square') {
    ctx.fillRect(6, 6, 20, 20);
  } else if (key === 'triangle') {
    ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(28, 27); ctx.lineTo(4, 27); ctx.closePath(); ctx.fill();
  } else if (key === 'star') {
    const cx = 16, cy = 16, spikes = 5, outerR = 13, innerR = 5.5;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const ang = (Math.PI / spikes) * i - Math.PI / 2;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  } else if (key === 'pin') {
    ctx.beginPath(); ctx.arc(16, 12, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, 15); ctx.lineTo(24, 15); ctx.lineTo(16, 29); ctx.closePath(); ctx.fill();
  } else if (key === 'home') {
    ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(16, 5); ctx.lineTo(26, 16); ctx.closePath(); ctx.fill();
    ctx.fillRect(9, 16, 14, 11);
  } else if (key === 'flag') {
    ctx.fillRect(13, 4, 3, 24);
    ctx.beginPath(); ctx.moveTo(16, 6); ctx.lineTo(27, 11); ctx.lineTo(16, 16); ctx.closePath(); ctx.fill();
  } else if (key === 'cross') {
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(24, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 8); ctx.lineTo(8, 24); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(16, 16, 11, 0, Math.PI * 2); ctx.fill();
  }
}

export function createSymbolIcon(key) {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawSymbolShape(ctx, key);
  return ctx.getImageData(0, 0, size, size);
}

export function ensureSymbolIcons(map) {
  SYMBOL_LIBRARY.forEach((key) => {
    const id = 'sym-' + key;
    try { if (!map.hasImage(id)) map.addImage(id, createSymbolIcon(key), { sdf: true }); }
    catch (e) { console.error('Sembol oluşturulamadı: ' + key, e); }
  });
}

// ---------------- Snap işaretleri ----------------
export const SNAP_TYPES = ['vertex', 'midpoint', 'edge', 'center', 'intersection', 'perpendicular'];

function drawSnapShape(ctx, type, c) {
  ctx.beginPath();
  if (type === 'vertex') {
    const s = 8; ctx.rect(c - s, c - s, s * 2, s * 2);
  } else if (type === 'midpoint') {
    const r = 9.5;
    ctx.moveTo(c, c - r);
    ctx.lineTo(c + r * 0.95, c + r * 0.65);
    ctx.lineTo(c - r * 0.95, c + r * 0.65);
    ctx.closePath();
  } else if (type === 'edge') {
    const r2 = 8; // kum saati (Nearest)
    ctx.moveTo(c - r2, c - r2); ctx.lineTo(c + r2, c - r2); ctx.lineTo(c - r2, c + r2); ctx.lineTo(c + r2, c + r2); ctx.closePath();
  } else if (type === 'center') {
    const r3 = 8.5;
    ctx.arc(c, c, r3, 0, Math.PI * 2);
    ctx.moveTo(c - 3.5, c); ctx.lineTo(c + 3.5, c);
    ctx.moveTo(c, c - 3.5); ctx.lineTo(c, c + 3.5);
  } else if (type === 'intersection') {
    const r4 = 8;
    ctx.moveTo(c - r4, c - r4); ctx.lineTo(c + r4, c + r4);
    ctx.moveTo(c + r4, c - r4); ctx.lineTo(c - r4, c + r4);
  } else if (type === 'perpendicular') {
    const r5 = 8;
    ctx.moveTo(c - r5, c - r5); ctx.lineTo(c - r5, c + r5); ctx.lineTo(c + r5, c + r5);
    ctx.moveTo(c - r5, c + r5 - 6); ctx.lineTo(c - r5 + 6, c + r5 - 6); ctx.lineTo(c - r5 + 6, c + r5);
  } else {
    ctx.arc(c, c, 8, 0, Math.PI * 2);
  }
}

function createSnapIcon(type) {
  const size = 26;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  drawSnapShape(ctx, type, c);
  ctx.strokeStyle = '#0a1620'; ctx.lineWidth = 4.4; ctx.stroke();
  drawSnapShape(ctx, type, c);
  ctx.strokeStyle = '#e3a541'; ctx.lineWidth = 2.1; ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

export function ensureSnapIcons(map) {
  try {
    SNAP_TYPES.forEach((t) => {
      const id = 'snap-' + t;
      if (!map.hasImage(id)) map.addImage(id, createSnapIcon(t));
    });
  } catch (e) { console.error('Snap simgeleri oluşturulamadı', e); }
}

// ---------------- Klasör / geometri tipi ikonları (UI) ----------------
export const GEOM_TYPE_SVG = {
  Point: '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8"/>',
  LineString: '<circle cx="5" cy="18" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="6" r="1.6" fill="currentColor" stroke="none"/><path d="M5 18 L19 6"/>',
  Polygon: '<path d="M12 3l8 6-3 10H7L4 9z"/>'
};
export function geomTypeIcon(t) {
  const d = GEOM_TYPE_SVG[t] || '<circle cx="8" cy="8" r="3"/><path d="M13 19l6-6M13 13h6v6"/>';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${d}</svg>`;
}
export function geomTypeLabel(t) {
  return t === 'Point' ? 'Nokta' : t === 'LineString' ? 'Çizgi' : t === 'Polygon' ? 'Poligon' : 'Karma';
}
export const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>';
