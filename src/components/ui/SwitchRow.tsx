import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import type { Tone } from './tone';

interface SwitchRowProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: Tone;
}

/** Başlık + açıklama + MUI Switch içeren yüzey satırı (ayar/geçiş kutusu). */
export default function SwitchRow({ title, description, checked, onChange, tone = 'primary' }: SwitchRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, p: 2.5, bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.primary' }}>{title}</Typography>
        {description && <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{description}</Typography>}
      </Box>
      <Switch size="small" color={tone === 'purple' ? 'secondary' : tone} checked={checked} onChange={(e) => onChange(e.target.checked)} slotProps={{ input: { 'aria-label': title } }} />
    </Box>
  );
}
