import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import { alpha, useTheme } from '@mui/material/styles';
import { toneColors, type Tone } from './tone';

interface StepAccordionProps {
  /** Adım rozeti ("01", "02" ...). */
  step: string;
  title: string;
  tone: Tone;
  active: boolean;
  onToggle: () => void;
  /** Başlığın sağındaki durum etiketi / eylemler. */
  trailing?: ReactNode;
  children: ReactNode;
}

/** Numaralı, açılır-kapanır panel bölümü (Plan sol paneli adımları). */
export default function StepAccordion({ step, title, tone, active, onToggle, trailing, children }: StepAccordionProps) {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        transition: 'all .3s',
        bgcolor: active ? alpha(theme.palette.background.paper, 0.8) : alpha(theme.palette.background.default, 0.4),
        boxShadow: active ? 1 : 'none',
        '&:hover': active ? undefined : { bgcolor: 'background.default' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, gap: 2 }}>
        <ButtonBase onClick={onToggle} sx={{ flex: 1, justifyContent: 'flex-start', gap: 2.5, textAlign: 'left' }}>
          <Box
            component="span"
            sx={{
              width: 20,
              height: 20,
              borderRadius: 1.5,
              fontSize: 10,
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'colors .2s',
              border: active ? 0 : 1,
              borderColor: 'divider',
              color: active ? '#fff' : 'text.secondary',
              bgcolor: active ? c.main : 'background.paper',
              boxShadow: active ? `0 0 10px ${alpha(c.main, 0.4)}` : 'none',
            }}
          >
            {step}
          </Box>
          <span className="section-eyebrow text-left">{title}</span>
        </ButtonBase>
        {trailing && <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>{trailing}</Box>}
      </Box>
      <Collapse in={active} unmountOnExit>
        <Box sx={{ p: 3, pt: 0, borderTop: 1, borderColor: 'divider', mt: 1, display: 'flex', flexDirection: 'column', gap: 3.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
