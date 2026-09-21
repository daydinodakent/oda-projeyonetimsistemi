/**
 * Tek doğruluk kaynağı (design tokens). MUI teması (theme.ts) VE Tailwind'in
 * kullandığı CSS değişkenleri (AppThemeProvider → legacyCssVars) buradan
 * türetilir — iki paralel sistem yok. Değerler önceki src/index.css :root /
 * [data-theme="dark"] bloklarından birebir taşınmıştır.
 */
export type SchemeName = 'light' | 'dark';

export interface SchemeTokens {
  bgApp: string;
  bgSurface: string;
  bgSurfaceSubtle: string;
  borderUi: string;
  textMain: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  panelLeft: string;
  panelRight: string;
  panelTop: string;
  shadowCard: string;
  shadowPanel: string;
  borderGlow: string;
  cardGradients: [string, string, string, string];
}

export const schemes: Record<SchemeName, SchemeTokens> = {
  light: {
    bgApp: '#F8FAFC',
    bgSurface: '#FFFFFF',
    bgSurfaceSubtle: '#F1F5F9',
    borderUi: '#E2E8F0',
    textMain: '#0F172A',
    textMuted: '#64748B',
    accent: '#ff4757',
    accentHover: '#ff6b81',
    panelLeft: '#3742fa',
    panelRight: '#2ed573',
    panelTop: '#ffa502',
    shadowCard:
      '0 1px 2px 0 rgba(15, 23, 42, 0.03), 0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
    shadowPanel:
      '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 12px 24px -4px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
    borderGlow: '0 0 0 1px rgba(59, 130, 246, 0.15), 0 0 8px 0 rgba(59, 130, 246, 0.08)',
    cardGradients: [
      'linear-gradient(135deg, #3742fa, #2ed573)',
      'linear-gradient(135deg, #ff4757, #ffa502)',
      'linear-gradient(135deg, #10b981, #06b6d4)',
      'linear-gradient(135deg, #8b5cf6, #ec4899)',
    ],
  },
  dark: {
    bgApp: '#0B0F19',
    bgSurface: '#1B2436',
    bgSurfaceSubtle: '#25314B',
    borderUi: 'rgba(255, 255, 255, 0.08)',
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    accent: '#6366f1',
    accentHover: '#818cf8',
    panelLeft: '#4f46e5',
    panelRight: '#10b981',
    panelTop: '#f59e0b',
    shadowCard: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06) inset',
    shadowPanel: '0 12px 40px 0 rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
    borderGlow: '0 0 20px 2px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(99, 102, 241, 0.45) inset',
    cardGradients: [
      'linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(79, 70, 229, 0.15))',
      'linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(239, 68, 68, 0.15))',
      'linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(16, 185, 129, 0.15))',
      'linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(168, 85, 247, 0.15))',
    ],
  },
};

/** Uygulamada fiilen kullanılan durum renkleri (Tailwind blue/indigo/red/amber/emerald/cyan). */
export const status = {
  primary: { light: '#60a5fa', main: '#3b82f6', dark: '#1d4ed8' },
  secondary: { light: '#818cf8', main: '#6366f1', dark: '#4f46e5' },
  error: { light: '#f87171', main: '#ef4444', dark: '#dc2626' },
  warning: { light: '#fbbf24', main: '#f59e0b', dark: '#d97706' },
  success: { light: '#34d399', main: '#10b981', dark: '#059669' },
  info: { light: '#22d3ee', main: '#06b6d4', dark: '#0891b2' },
} as const;

/** Header/marka çubuğu: koyu bar + cyan→blue→indigo rozet gradyanı. */
export const brand = {
  headerBg: '#222224',
  badgeGradient: 'linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)',
} as const;

export const fontSans =
  '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const fontMono = '"Geist Mono", monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas';

/** Tailwind taban birimiyle (0.25rem = 4px) aynı: theme.spacing(n) === Tailwind `n`. */
export const spacingUnit = 4;
/** index.css --radius-xl (0.25rem). */
export const radius = 4;
