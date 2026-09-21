import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Başlığın üstündeki yuvarlak simge (ör. çöp kutusu). */
  icon?: ReactNode;
  /** Ana açıklama metni. */
  children: ReactNode;
  /** Küçük, monospace uyarı/not kutusu (isteğe bağlı). */
  note?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  /** error: yıkıcı işlem (silme) — kırmızı; primary: normal onay. */
  tone?: 'error' | 'primary' | 'warning';
}

/** Onay penceresi (silme vb.) — ortalanmış simge + başlık + açıklama + Vazgeç / Onayla. */
export default function ConfirmDialog({ open, onClose, onConfirm, title, icon, children, note, cancelLabel = 'Vazgeç', confirmLabel, confirmIcon, tone = 'error' }: ConfirmDialogProps) {
  const theme = useTheme();
  const c = theme.palette[tone];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      sx={{ zIndex: 9999 }}
      slotProps={{
        backdrop: { sx: { bgcolor: alpha(theme.palette.common.black, 0.6), backdropFilter: 'blur(4px)' } },
        paper: { sx: { bgcolor: 'background.paper', backgroundImage: 'none', border: 1, borderColor: alpha(c.main, 0.3), borderRadius: 4 } },
      }}
    >
      <DialogContent sx={{ pt: 6, textAlign: 'center' }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          {icon && (
            <Box sx={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.main, bgcolor: alpha(c.main, 0.15) }}>
              {icon}
            </Box>
          )}
          <Typography variant="h4" component="h3" sx={{ fontSize: 14, fontWeight: 800 }}>{title}</Typography>
          <Typography component="div" sx={{ fontSize: 12, color: 'text.secondary' }}>{children}</Typography>
          {note && (
            <Typography component="div" sx={{ width: '100%', p: 2, fontSize: 10, fontFamily: 'monospace', color: 'text.secondary', bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 2 }}>
              {note}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 5, pt: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderColor: 'divider', color: 'text.secondary' }}>{cancelLabel}</Button>
        <Button onClick={onConfirm} variant="contained" color={tone} startIcon={confirmIcon}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
