import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import { X } from 'lucide-react';

interface FeedbackToastProps {
  message: string | null;
  onClose: () => void;
}

/** Panel eylem geri bildirimi — MUI Snackbar (sol altta, 4 sn sonra kapanır). */
export default function FeedbackToast({ message, onClose }: FeedbackToastProps) {
  return (
    <Snackbar
      open={!!message}
      autoHideDuration={4000}
      onClose={(_, reason) => reason !== 'clickaway' && onClose()}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      message={
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', fontSize: 10, fontWeight: 700, maxWidth: 300 }}>
          <Box sx={{ width: 6, height: 6, mt: 1, borderRadius: '50%', bgcolor: 'secondary.main', flexShrink: 0 }} />
          <Box sx={{ flex: 1 }}>{message}</Box>
        </Box>
      }
      action={
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <X className="w-3.5 h-3.5" />
        </IconButton>
      }
      slotProps={{ content: { sx: { bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider', borderRadius: 2, minWidth: 0, boxShadow: 6 } } }}
    />
  );
}
