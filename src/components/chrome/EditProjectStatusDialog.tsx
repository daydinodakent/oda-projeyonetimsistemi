import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AppDialog from './AppDialog';

const PERMITS = ['ALINDI', 'BEKLİYOR', 'REVİZYONDA', 'SÜRESİ DOLDU'];
const BUDGET_STATUSES: { value: string; color: 'success' | 'warning' | 'error' | 'info' }[] = [
  { value: 'TAMAM', color: 'success' },
  { value: 'KRİTİK', color: 'warning' },
  { value: 'AŞILDI', color: 'error' },
  { value: 'GÖZDEN GEÇİRİLİYOR', color: 'info' },
];
const PHASES = ['Planlama', 'Devam Ediyor', 'Tamamlandı', 'Kritik'];

interface EditProjectStatusDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  name: string;
  setName: (v: string) => void;
  progress: number;
  setProgress: (v: number) => void;
  permit: string;
  setPermit: (v: string) => void;
  budgetStatus: string;
  setBudgetStatus: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
}

export default function EditProjectStatusDialog(p: EditProjectStatusDialogProps) {
  return (
    <AppDialog
      open={p.open}
      onClose={p.onClose}
      badge="Durum Düzenleme"
      tone="warning"
      cancelLabel="Vazgeç"
      submitLabel="Kaydet"
      onSubmit={p.onSubmit}
    >
      <TextField label="Proje Başlığı" value={p.name} onChange={(e) => p.setName(e.target.value)} color="warning" />

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
          Genel İlerleme Durumu (%)
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Slider
            value={p.progress}
            min={0}
            max={100}
            color="warning"
            onChange={(_, v) => p.setProgress(v as number)}
            aria-label="Genel ilerleme"
          />
          <Typography sx={{ width: 48, textAlign: 'right', fontWeight: 900, color: 'warning.light' }}>%{p.progress}</Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        <Grid size={6}>
          <TextField select label="Ruhsat Durumu" value={p.permit} onChange={(e) => p.setPermit(e.target.value)} color="warning">
            {PERMITS.map((v) => (
              <MenuItem key={v} value={v}>{v}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={6}>
          <TextField select label="Bütçe Durumu" value={p.budgetStatus} onChange={(e) => p.setBudgetStatus(e.target.value)} color="warning">
            {BUDGET_STATUSES.map(({ value, color }) => (
              <MenuItem key={value} value={value} sx={{ color: `${color}.light` }}>{value}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <TextField select label="Sistem Durum Fazı" value={p.status} onChange={(e) => p.setStatus(e.target.value)} color="warning">
        {PHASES.map((v) => (
          <MenuItem key={v} value={v}>{v}</MenuItem>
        ))}
      </TextField>
    </AppDialog>
  );
}
