// Design tokens extracted from the app's existing CSS custom properties
// (src/index.css). This is a typed, JS-accessible mirror of those tokens for
// places that can't consume CSS variables directly — chart series colors
// (recharts), map/marker styling (maplibre), canvas draws — plus a single
// source of truth for the semantic tone names used by the primitives in
// this folder (Badge, Button, ...).

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

interface ToneColors {
  light: string;
  dark: string;
}

// Formalizes the bg-{color}-500/10 text-{color}-400 border-{color}-500/20
// convention already used throughout the codebase (e.g. permitStatusColors
// in PlanRightPanel.tsx) into named, theme-aware tokens. Also registered as
// CSS custom properties (--success, --warning, ...) and Tailwind utilities
// (bg-success, text-success, ...) in src/index.css.
export const toneColors: Record<Tone, ToneColors> = {
  success: { light: '#10b981', dark: '#34d399' }, // completed / ok / active
  warning: { light: '#f59e0b', dark: '#fbbf24' }, // pending / expiring / at-risk
  danger: { light: '#ef4444', dark: '#f87171' },  // overdue / failed / critical
  info: { light: '#3b82f6', dark: '#60a5fa' },    // in progress / informational
  neutral: { light: '#64748b', dark: '#94a3b8' }, // planned / inactive / unknown
  accent: { light: '#ff4757', dark: '#6366f1' },  // brand accent (--accent)
};

// Categorical series colors for charts (recharts BarChart/LineChart/AreaChart
// `fill`/`stroke` props need real hex values, not Tailwind class names).
export const chartPalette = [
  '#3742fa', '#2ed573', '#ff4757', '#ffa502', '#8b5cf6', '#06b6d4', '#ec4899',
];

export const radius = {
  // The app overrides Tailwind's built-in `rounded-xl` scale value via
  // `--radius-xl` in the @theme block, so every `rounded-xl` in the codebase
  // renders at this size, not Tailwind's default 0.75rem. Cards, panels and
  // glass surfaces (.card, .panel, .glass-card, .premium-glass) all key off
  // this one value — it's the deliberate "sharp, dense, enterprise" corner
  // radius for structural surfaces.
  surface: 'var(--radius-xl)', // 0.25rem / 4px
  // Everything below is unmodified Tailwind default scale, used freely for
  // pills, chips and small controls (rounded-md, rounded-full, etc).
  pill: '9999px',
} as const;

export const shadow = {
  card: 'var(--shadow-card)',
  panel: 'var(--shadow-panel)',
  borderGlow: 'var(--border-glow)',
} as const;

export const motion = {
  ease: 'var(--ease-premium)', // cubic-bezier(0.16, 1, 0.3, 1) — used ~14x across the app
  duration: {
    fast: 'var(--duration-fast)',   // 150ms — micro state changes (active/pressed)
    base: 'var(--duration-base)',   // 200ms — hover states
    slow: 'var(--duration-slow)',   // 300ms — panel/card transitions (most common, 81 occurrences)
    slower: 'var(--duration-slower)', // 500ms — large layout transitions
  },
} as const;

// Mirrors the heading/body/label classes already defined globally in
// src/index.css (h1-h4, .text-body, .text-subtitle, .text-caption) plus the
// UI-role classes used across headers/panels/cards. Kept here so a
// component can pick a role by name instead of copying font-size/weight
// pairs inline.
export const typography = {
  h1: 'text-h1',
  h2: 'text-h2',
  h3: 'text-h3',
  h4: 'text-h4',
  body: 'text-body',
  subtitle: 'text-subtitle',
  caption: 'text-caption',
  headerBrand: 'app-header-brand',
  headerSubtitle: 'app-header-subtitle',
  panelTitle: 'panel-main-title',
  panelSubtitle: 'panel-main-subtitle',
  windowTitle: 'window-main-title',
  windowSubtitle: 'window-main-subtitle',
  cardTitle: 'card-header-title',
  cardSubtitle: 'card-header-subtitle',
  sectionEyebrow: 'section-eyebrow',
  microLabel: 'micro-label',
  statValue: 'stat-value',
} as const;

// Tailwind class strings for a soft "tinted" surface in the given tone —
// the bg-{tone}/10 text-{tone} border-{tone}/20 pattern used for badges,
// pills and status chips throughout the app. Written out per-tone (rather
// than built with a template string) because Tailwind's scanner needs the
// full class name to appear literally in source to generate it.
export const toneSoftClasses: Record<Tone, string> = {
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  info: 'bg-info/10 text-info border-info/20',
  neutral: 'bg-neutral/10 text-neutral border-neutral/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
};

// Solid-fill variant (used by primary buttons / strong emphasis chips).
export const toneSolidClasses: Record<Tone, string> = {
  success: 'bg-success text-white border-success',
  warning: 'bg-warning text-white border-warning',
  danger: 'bg-danger text-white border-danger',
  info: 'bg-info text-white border-info',
  neutral: 'bg-neutral text-white border-neutral',
  accent: 'bg-accent text-white border-accent',
};
