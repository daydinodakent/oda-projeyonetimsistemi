import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

export type DialogTone = 'success' | 'warning';

interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  /** Başlıktaki renkli rozet (ör. "Süper Yetkili"). */
  badge: string;
  title?: string;
  tone: DialogTone;
  children: ReactNode;
  cancelLabel: string;
  submitLabel: string;
  onSubmit: () => void;
  submitDisabled?: boolean;
}

/**
 * Global modal iskeleti (Yeni Proje / Durum Düzenleme vb.) — başlık çubuğu,
 * içerik ve eylem çubuğu tek yerde; renkler theme.palette'ten gelir.
 */
export default function AppDialog({
  open,
  onClose,
  badge,
  title,
  tone,
  children,
  cancelLabel,
  submitLabel,
  onSubmit,
  submitDisabled,
}: AppDialogProps) {
  const theme = useTheme();
  const toneColor = theme.palette[tone];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      sx={{ zIndex: 9999 }}
      slotProps={{
        backdrop: { sx: { bgcolor: alpha(theme.palette.common.black, 0.75), backdropFilter: 'blur(4px)' } },
        paper: {
          sx: {
            bgcolor: 'background.default',
            backgroundImage: 'none',
            border: 1,
            borderColor: 'divider',
            borderRadius: 4,
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 6,
          py: 4,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundImage: `linear-gradient(90deg, ${alpha(toneColor.dark, 0.25)}, ${theme.palette.background.paper})`,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            component="span"
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: toneColor.light,
              bgcolor: alpha(toneColor.main, 0.2),
            }}
          >
            {badge}
          </Box>
          {title && (
            <Typography variant="h4" component="h3" sx={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {title}
            </Typography>
          )}
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Kapat" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 6, '&&': { pt: 6 } }}>
        <Stack spacing={4}>{children}</Stack>
      </DialogContent>

      <DialogActions sx={{ px: 6, py: 4, gap: 3, borderTop: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.common.black, 0.2) }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderColor: 'divider', color: 'text.secondary' }}>
          {cancelLabel}
        </Button>
        <Button onClick={onSubmit} disabled={submitDisabled} variant="contained" color={tone}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
