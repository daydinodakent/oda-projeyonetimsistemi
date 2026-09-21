import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { toneColors, type Tone } from './tone';

interface TagProps {
  /** Ton verilmezse nötr (yüzey) rozet. */
  tone?: Tone;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  /** border: kenarlıklı (varsayılan), plain: yalnızca dolgu. */
  variant?: 'border' | 'plain';
  uppercase?: boolean;
  mono?: boolean;
}

/** Küçük durum/etiket rozeti — theme paletinden (ör. "%60 Tamamlandı", "CPM", "Poligon"). */
export default function Tag({ tone, children, onClick, title, variant = 'border', uppercase, mono }: TagProps) {
  const theme = useTheme();
  const c = tone ? toneColors(theme, tone) : null;
  return (
    <Box
      component="span"
      title={title}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        fontSize: 10,
        fontWeight: 800,
        lineHeight: 1.2,
        flexShrink: 0,
        textTransform: uppercase ? 'uppercase' : 'none',
        fontFamily: mono ? 'monospace' : 'inherit',
        cursor: onClick ? 'pointer' : 'inherit',
        border: variant === 'border' ? 1 : 0,
        color: c ? c.light : 'text.primary',
        bgcolor: c ? alpha(c.main, 0.15) : 'background.paper',
        borderColor: c ? alpha(c.main, 0.3) : 'divider',
        ...(onClick && { transition: 'transform .15s', '&:hover': { transform: 'scale(1.05)' }, '&:active': { transform: 'scale(0.95)' } }),
      }}
    >
      {children}
    </Box>
  );
}
