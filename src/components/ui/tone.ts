import type { Theme } from '@mui/material/styles';

/** Panel/kart bileşenlerinin ortak durum tonları (theme.palette + mor vurgu). */
export type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'purple';

const PURPLE = { main: '#a855f7', light: '#c084fc', dark: '#7e22ce' };

/** Tona ait main/light/dark renkleri (alpha() ile birlikte kullanılabilen ham değerler). */
export function toneColors(theme: Theme, tone: Tone): { main: string; light: string; dark: string } {
  if (tone === 'purple') return PURPLE;
  const p = theme.palette[tone];
  return { main: p.main, light: p.light, dark: p.dark };
}
