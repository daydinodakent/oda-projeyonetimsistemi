import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

interface PermissionDialogProps {
  open: boolean;
  onClose: () => void;
  camera: boolean;
  setCamera: (v: boolean) => void;
  microphone: boolean;
  setMicrophone: (v: boolean) => void;
  dontAsk: boolean;
  setDontAsk: (v: boolean) => void;
  onApply: () => void;
}

/** "Access request" izin kutusu — küçük, kompakt bir MUI Dialog. */
export default function PermissionDialog(p: PermissionDialogProps) {
  const theme = useTheme();
  const row = (label: string, checked: boolean, set: (v: boolean) => void) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1.5,
        pl: 2,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography sx={{ fontSize: 10 }}>{label}</Typography>
      <Switch size="small" checked={checked} onChange={(e) => set(e.target.checked)} slotProps={{ input: { 'aria-label': label } }} />
    </Box>
  );

  return (
    <Dialog
      open={p.open}
      onClose={p.onClose}
      sx={{ zIndex: 10000 }}
      slotProps={{
        backdrop: { sx: { bgcolor: alpha(theme.palette.common.black, 0.8), backdropFilter: 'blur(4px)' } },
        paper: { sx: { width: 210, p: 3, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.default', backgroundImage: 'none' } },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h3" sx={{ fontSize: 12, fontWeight: 400, color: 'text.secondary' }}>
          Access request
        </Typography>
        <IconButton size="small" onClick={p.onClose} aria-label="Close" sx={{ p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Stack>

      <Typography sx={{ fontSize: 9, mb: 3, color: 'text.secondary' }}>
        The app requests access to the following permissions:
      </Typography>

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {row('Camera', p.camera, p.setCamera)}
        {row('Microphone', p.microphone, p.setMicrophone)}
      </Stack>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <FormControlLabel
          control={<Checkbox size="small" checked={p.dontAsk} onChange={(e) => p.setDontAsk(e.target.checked)} sx={{ p: 0.5 }} />}
          label={<Typography sx={{ fontSize: 9 }}>Daha sorma</Typography>}
          sx={{ m: 0 }}
        />
        <Button variant="contained" color="inherit" size="small" onClick={p.onApply} sx={{ fontSize: 9, px: 2.5, py: 1, bgcolor: 'text.primary', color: 'background.default', '&:hover': { bgcolor: 'text.secondary' } }}>
          Apply
        </Button>
      </Stack>
    </Dialog>
  );
}
