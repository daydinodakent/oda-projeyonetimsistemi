import type { ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { schemes, type SchemeTokens } from './tokens';

/** index.css'in / Tailwind @theme'in okuduğu değişken adları — artık tokens.ts'ten üretilir. */
const legacyCssVars = (s: SchemeTokens) => ({
  '--bg-app': s.bgApp,
  '--bg-surface': s.bgSurface,
  '--bg-surface-subtle': s.bgSurfaceSubtle,
  '--border-ui': s.borderUi,
  '--text-main': s.textMain,
  '--text-muted': s.textMuted,
  '--accent': s.accent,
  '--accent-hover': s.accentHover,
  '--panel-left': s.panelLeft,
  '--panel-right': s.panelRight,
  '--panel-top': s.panelTop,
  '--card-gradient-1': s.cardGradients[0],
  '--card-gradient-2': s.cardGradients[1],
  '--card-gradient-3': s.cardGradients[2],
  '--card-gradient-4': s.cardGradients[3],
  '--shadow-card': s.shadowCard,
  '--shadow-panel': s.shadowPanel,
  '--border-glow': s.borderGlow,
});

const globalStyles = {
  ':root': legacyCssVars(schemes.light),
  '[data-theme="dark"]': legacyCssVars(schemes.dark),
};

/**
 * injectFirst: emotion stilleri <head>'in BAŞINA eklenir — index.css/Tailwind
 * (sonra gelir) aynı özgüllükte MUI'yi ezer, mevcut sayfalar bozulmaz.
 */
export default function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <StyledEngineProvider injectFirst>
      {/* Tema durumunun sahibi App.tsx (useState) — MUI kendi modunu localStorage'a yazıp
          bir sonraki açılışta App ile çelişmesin diye storageManager kapalı. */}
      <ThemeProvider theme={theme} defaultMode="dark" disableTransitionOnChange storageManager={null}>
        <CssBaseline enableColorScheme />
        <GlobalStyles styles={globalStyles} />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
