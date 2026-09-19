# Design system

Extracted from the patterns already in use across `src/`, formalized into shared
tokens and primitives. Nothing here replaces existing CSS — it's additive: the
`.card` / `.panel` classes, typography roles (`h1`-`h4`, `.text-body`, `.card-header-title`, ...)
and CSS custom properties in `src/index.css` are unchanged and still work standalone.

## What was extracted

- **Color**: the app already had a light/dark token pair for surfaces, text and
  borders (`--bg-app`, `--text-main`, ...). Status colors did not — every screen
  picked its own `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`-style
  combination per status string. That convention is now five named, theme-aware
  tokens: `success`, `warning`, `danger`, `info`, `neutral` (plus the existing
  `accent`) — registered as CSS variables and Tailwind utilities (`bg-success`,
  `text-success`, `border-success`, ...) in `src/index.css`, and as hex values
  in `tokens.ts` for non-CSS consumers (recharts series, map markers).
- **Typography**: already unified — `h1`-`h4` plus a set of UI-role classes
  (`.panel-main-title`, `.card-header-title`, `.section-eyebrow`, ...). Re-exported
  from `tokens.ts` as `typography` so components can reference a role by name.
- **Radius**: the app redefines Tailwind's `rounded-xl` to `0.25rem` via
  `--radius-xl`, and every structural surface (`.card`, `.panel`, `.glass-card`,
  `.premium-glass`) uses it — a deliberate sharp, dense "enterprise" corner
  radius. Documented in `tokens.ts` as `radius.surface`.
- **Motion**: `cubic-bezier(0.16, 1, 0.3, 1)` and `duration-300` are repeated
  ~14 and ~81 times respectively across components. Named as `--ease-premium`
  and `--duration-*` custom properties.

## Usage

```tsx
import { Badge, Button, Card, Panel, chartPalette } from '@/src/design-system';

<Badge tone="warning">Bekliyor</Badge>
<Button variant="tone" tone="danger">Sil</Button>

<Card title="Proje Özeti" subtitle="IGA Etap 1">
  ...
</Card>
```

For chart series colors (not expressible as Tailwind classes):

```tsx
import { chartPalette } from '@/src/design-system';
<Bar dataKey="value" fill={chartPalette[0]} />
```

## Adoption

This module is opt-in — existing components keep working unchanged. New
components, and files touched for other reasons, should prefer `Badge`/`Button`/
`Card`/`Panel` and the `success`/`warning`/`danger`/`info`/`neutral` tone names
over one-off Tailwind color combinations.

The status-driven pills across the app have been migrated to `<Badge>`
(PlanRightPanel, PlanView, InsaatView, InsaatLeftPanel, IsletmeView,
IsletmeRightPanel, LaborProcurementView, ExecutiveDashboardView,
DocumentArchiveModal, AdminPanel). Elements that aren't text pills (status dots,
accent strips, whole notification cards, GlobalSearchModal's `badgeColor`
strings) keep their own shape but read colors from the same tokens
(`bg-success`, `text-danger`, `bg-warning/10`, ...).

Intentionally left alone: category/type colors (search-result categories,
maintenance log types), UI-mode highlights (GIS editor tool toggles), static
"always green" labels, threshold-driven KPI numbers, and the multi-shade
map-pin markers in InsaatView.

Notes:
- `Permit['status']` → tone is mirrored in PlanRightPanel and InsaatView; keep both in sync.
- This repo has no `@types/react`, so put `key` on a native element rather than
  directly on a custom component, and declare props explicitly instead of
  extending `React.ButtonHTMLAttributes`.
