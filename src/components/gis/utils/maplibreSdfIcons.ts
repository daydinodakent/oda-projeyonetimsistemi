import { Map } from 'maplibre-gl';

export const SNAP_TYPES = ['vertex', 'midpoint', 'edge', 'center', 'intersection', 'perpendicular'] as const;
export type SnapType = typeof SNAP_TYPES[number];

export const SYMBOL_LIBRARY = ['circle', 'pin', 'star', 'triangle', 'square', 'home', 'flag', 'cross'] as const;
export type SymbolKey = typeof SYMBOL_LIBRARY[number];

export const SYMBOL_LABELS: Record<SymbolKey, string> = {
  circle: 'Daire',
  pin: 'İğne',
  star: 'Yıldız',
  triangle: 'Üçgen',
  square: 'Kare',
  home: 'Ev',
  flag: 'Bayrak',
  cross: 'Çarpı'
};

export const SYMBOL_SVG: Record<SymbolKey, string> = {
  circle: '<circle cx="12" cy="12" r="8"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z"/>',
  star: '<path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z"/>',
  triangle: '<path d="M12 3l9 18H3z"/>',
  square: '<rect x="4" y="4" width="16" height="16"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-7H9v7H5a1 1 0 0 1-1-1z"/>',
  flag: '<path d="M6 3v18M6 4h12l-4 4 4 4H6" fill="none" stroke="currentColor" stroke-width="2"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3"/>'
};

export function getSymbolIconSvg(key: SymbolKey): string {
  return `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">${SYMBOL_SVG[key] || SYMBOL_SVG.circle}</svg>`;
}

function drawSnapShape(ctx: CanvasRenderingContext2D, type: SnapType, c: number): void {
  ctx.beginPath();
  if (type === 'vertex') {
    const s = 8;
    ctx.rect(c - s, c - s, s * 2, s * 2);
  } else if (type === 'midpoint') {
    const r = 9.5;
    ctx.moveTo(c, c - r);
    ctx.lineTo(c + r * 0.95, c + r * 0.65);
    ctx.lineTo(c - r * 0.95, c + r * 0.65);
    ctx.closePath();
  } else if (type === 'edge') {
    const r2 = 8; // kum saati (Nearest)
    ctx.moveTo(c - r2, c - r2);
    ctx.lineTo(c + r2, c - r2);
    ctx.lineTo(c - r2, c + r2);
    ctx.lineTo(c + r2, c + r2);
    ctx.closePath();
  } else if (type === 'center') {
    const r3 = 8.5; // çember + orta çarpı
    ctx.arc(c, c, r3, 0, Math.PI * 2);
    ctx.moveTo(c - 3.5, c);
    ctx.lineTo(c + 3.5, c);
    ctx.moveTo(c, c - 3.5);
    ctx.lineTo(c, c + 3.5);
  } else if (type === 'intersection') {
    const r4 = 8; // X işareti
    ctx.moveTo(c - r4, c - r4);
    ctx.lineTo(c + r4, c + r4);
    ctx.moveTo(c + r4, c - r4);
    ctx.lineTo(c - r4, c + r4);
  } else if (type === 'perpendicular') {
    const r5 = 8; // dik açı işareti (L + köşe karesi)
    ctx.moveTo(c - r5, c - r5);
    ctx.lineTo(c - r5, c + r5);
    ctx.lineTo(c + r5, c + r5);
    ctx.moveTo(c - r5, c + r5 - 6);
    ctx.lineTo(c - r5 + 6, c + r5 - 6);
    ctx.lineTo(c - r5 + 6, c + r5);
  } else {
    ctx.arc(c, c, 8, 0, Math.PI * 2);
  }
}

function createSnapIcon(type: SnapType): ImageData | null {
  if (typeof document === 'undefined') return null;
  const size = 26;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = size / 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawSnapShape(ctx, type, c);
  ctx.strokeStyle = '#0a1620';
  ctx.lineWidth = 4.4;
  ctx.stroke();
  drawSnapShape(ctx, type, c);
  ctx.strokeStyle = '#e3a541';
  ctx.lineWidth = 2.1;
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

export function ensureSnapIcons(map: Map): void {
  try {
    SNAP_TYPES.forEach(t => {
      const id = 'snap-' + t;
      if (!map.hasImage(id)) {
        const img = createSnapIcon(t);
        if (img) map.addImage(id, img);
      }
    });
  } catch (e) {
    console.error('Snap simgeleri oluşturulamadı', e);
  }
}

function drawSymbolShape(ctx: CanvasRenderingContext2D, key: SymbolKey): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  if (key === 'square') {
    ctx.fillRect(6, 6, 20, 20);
  } else if (key === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(28, 27);
    ctx.lineTo(4, 27);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'star') {
    const cx = 16, cy = 16, spikes = 5, outerR = 13, innerR = 5.5;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = (i % 2 === 0) ? outerR : innerR;
      const ang = (Math.PI / spikes) * i - Math.PI / 2;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (key === 'pin') {
    ctx.beginPath();
    ctx.arc(16, 12, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, 15);
    ctx.lineTo(24, 15);
    ctx.lineTo(16, 29);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'home') {
    ctx.beginPath();
    ctx.moveTo(6, 16);
    ctx.lineTo(16, 5);
    ctx.lineTo(26, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(9, 16, 14, 11);
  } else if (key === 'flag') {
    ctx.fillRect(13, 4, 3, 24);
    ctx.beginPath();
    ctx.moveTo(16, 6);
    ctx.lineTo(27, 11);
    ctx.lineTo(16, 16);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'cross') {
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(24, 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24, 8);
    ctx.lineTo(8, 24);
    ctx.stroke();
  } else { // circle
    ctx.beginPath();
    ctx.arc(16, 16, 11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createSymbolIcon(key: SymbolKey): ImageData | null {
  if (typeof document === 'undefined') return null;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawSymbolShape(ctx, key);
  return ctx.getImageData(0, 0, size, size);
}

export function ensureSymbolIcons(map: Map): void {
  SYMBOL_LIBRARY.forEach(key => {
    const id = 'sym-' + key;
    try {
      if (!map.hasImage(id)) {
        const img = createSymbolIcon(key);
        if (img) map.addImage(id, img, { sdf: true });
      }
    } catch (e) {
      console.error('Sembol oluşturulamadı: ' + key, e);
    }
  });
}
