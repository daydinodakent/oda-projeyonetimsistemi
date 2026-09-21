import { createTheme } from '@mui/material/styles';
import { brand, fontSans, radius, schemes, spacingUnit, status, type SchemeName } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    surfaceSubtle: string;
    borderUi: string;
    brand: { headerBg: string; badgeGradient: string };
  }
  interface PaletteOptions {
    surfaceSubtle?: string;
    borderUi?: string;
    brand?: { headerBg: string; badgeGradient: string };
  }
}

const scheme = (name: SchemeName) => {
  const s = schemes[name];
  return {
    palette: {
      primary: status.primary,
      secondary: status.secondary,
      error: status.error,
      warning: status.warning,
      success: status.success,
      info: status.info,
      background: { default: s.bgApp, paper: s.bgSurface },
      text: { primary: s.textMain, secondary: s.textMuted },
      divider: s.borderUi,
      surfaceSubtle: s.bgSurfaceSubtle,
      borderUi: s.borderUi,
      brand,
    },
  };
};

export const theme = createTheme({
  // data-theme="dark|light" — src/App.tsx zaten <html data-theme> yönetiyor.
  cssVariables: { colorSchemeSelector: 'data-theme' },
  defaultColorScheme: 'dark',
  colorSchemes: { light: scheme('light'), dark: scheme('dark') },
  spacing: spacingUnit,
  shape: { borderRadius: radius },
  typography: {
    fontFamily: fontSans,
    fontSize: 13,
    h1: { fontSize: '2rem', lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontSize: '1.5rem', lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.25rem', lineHeight: 1.3, fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 600, letterSpacing: '-0.01em' },
    body1: { fontSize: '0.8125rem', lineHeight: 1.5, letterSpacing: '-0.005em' },
    body2: { fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '-0.005em' },
    caption: { fontSize: '0.6875rem', lineHeight: 1.4 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
});
