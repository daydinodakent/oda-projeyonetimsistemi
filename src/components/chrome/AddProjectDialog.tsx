import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import AppDialog from './AppDialog';

interface AddProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  name: string;
  setName: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  progress: number;
  setProgress: (v: number) => void;
  budget: number;
  setBudget: (v: number) => void;
}

export default function AddProjectDialog(p: AddProjectDialogProps) {
  return (
    <AppDialog
      open={p.open}
      onClose={p.onClose}
      badge="Süper Yetkili"
      title="Yeni Proje Ekle"
      tone="success"
      cancelLabel="İptal"
      submitLabel="Proje Yarat"
      onSubmit={p.onSubmit}
      submitDisabled={!p.name.trim()}
    >
      <TextField
        label="Proje Adı"
        placeholder="örn. IGA CITY 5. Etap - Kargo Terminali"
        value={p.name}
        onChange={(e) => p.setName(e.target.value)}
        color="success"
      />
      <Grid container spacing={4}>
        <Grid size={6}>
          <TextField label="Proje Kodu" placeholder="örn. IGA-ETAP-5" value={p.code} onChange={(e) => p.setCode(e.target.value)} color="success" />
        </Grid>
        <Grid size={6}>
          <TextField label="Konum" placeholder="örn. Arnavutköy" value={p.location} onChange={(e) => p.setLocation(e.target.value)} color="success" />
        </Grid>
        <Grid size={6}>
          <TextField
            label="Başlangıç İlerlemesi (%)"
            type="number"
            value={p.progress}
            onChange={(e) => p.setProgress(parseInt(e.target.value) || 0)}
            slotProps={{ htmlInput: { min: 0, max: 100 } }}
            color="success"
          />
        </Grid>
        <Grid size={6}>
          <TextField
            label="Toplam Bütçe (Milyon TL)"
            type="number"
            value={p.budget}
            onChange={(e) => p.setBudget(parseInt(e.target.value) || 1000)}
            slotProps={{ htmlInput: { min: 1 } }}
            color="success"
          />
        </Grid>
      </Grid>
    </AppDialog>
  );
}
