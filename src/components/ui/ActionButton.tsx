import type { ReactNode } from 'react';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import { toneColors, type Tone } from './tone';

interface ActionButtonProps {
  /** solid: dolu (birincil eylem) · soft: tonlu hafif dolgu + kenarlık · surface: nötr yüzey. */
  kind?: 'solid' | 'soft' | 'surface';
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  title?: string;
  disabled?: boolean;
}

/** Panel eylem düğmesi — 10px, kalın, büyük harf; renkler theme.palette'ten. */
export default function ActionButton({ kind = 'surface', tone = 'primary', icon, children, onClick, fullWidth = true, title, disabled }: ActionButtonProps) {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  const base = { fontSize: 10, fontWeight: 900, textTransform: 'uppercase' as const, borderRadius: 2, py: 1.5, px: 1, gap: 1, minWidth: 0 };
  if (kind === 'solid') {
    return (
      <Button fullWidth={fullWidth} onClick={onClick} title={title} disabled={disabled} startIcon={icon} variant="contained" color={tone === 'purple' ? 'secondary' : tone} sx={base}>
        {children}
      </Button>
    );
  }
  if (kind === 'soft') {
    return (
      <Button
        fullWidth={fullWidth}
        onClick={onClick}
        title={title}
        disabled={disabled}
        startIcon={icon}
        sx={{ ...base, color: c.main, bgcolor: alpha(c.main, 0.1), border: 1, borderColor: alpha(c.main, 0.3), '&:hover': { bgcolor: alpha(c.main, 0.2), color: c.light } }}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      fullWidth={fullWidth}
      onClick={onClick}
      title={title}
      disabled={disabled}
      startIcon={icon}
      sx={{ ...base, color: 'text.primary', bgcolor: 'background.paper', border: 1, borderColor: 'divider', boxShadow: 1, '&:hover': { bgcolor: 'background.default' } }}
    >
      {children}
    </Button>
  );
}
