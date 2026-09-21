import type { FormEvent, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Başlığın solundaki küçük ikon (isteğe bağlı). */
  icon?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md';
  /** <form> submit olayı — HTML `required` doğrulaması ve Enter ile gönderim çalışır. */
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  cancelLabel?: string;
  submitLabel: string;
  submitIcon?: ReactNode;
  children: ReactNode;
}

/**
 * Form içeren standart modal (Yeni/Düzenle akışları). AppDialog'un "süper yetkili"
 * rozetli iskeletinden farklı olarak başlık + ikon, native <form> ve iptal/gönder eylemleri içerir.
 */
export default function FormDialog({ open, onClose, title, icon, maxWidth = 'xs', onSubmit, cancelLabel = 'İptal', submitLabel, submitIcon, children }: FormDialogProps) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      sx={{ zIndex: 9999 }}
      slotProps={{
        backdrop: { sx: { bgcolor: alpha(theme.palette.common.black, 0.6), backdropFilter: 'blur(4px)' } },
        paper: {
          component: 'form',
          // Paper slot'u div olarak tiplenir; component:'form' ile gerçekte <form> olur.
          onSubmit: onSubmit as never,
          sx: { bgcolor: 'background.paper', backgroundImage: 'none', border: 1, borderColor: 'divider', borderRadius: 4 },
        },
      }}
    >
      <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 6, pt: 5, pb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {icon && <Box component="span" sx={{ display: 'flex', color: 'info.main' }}>{icon}</Box>}
          <Typography variant="h4" component="h3" sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label="Kapat" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 6, '&&': { pt: 2 } }}>
        <Stack spacing={3}>{children}</Stack>
      </DialogContent>

      <DialogActions sx={{ px: 6, pb: 5, pt: 3, gap: 2 }}>
        <Button type="button" onClick={onClose} variant="outlined" color="inherit" sx={{ borderColor: 'divider', color: 'text.secondary' }}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="contained" color="primary" startIcon={submitIcon}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Form alanı: küçük etiketli, tam genişlikte TextField (metin/sayı/seçim). */
export function FormField(props: TextFieldProps) {
  return <TextField {...props} sx={{ '& .MuiInputBase-input': { fontSize: 12 }, ...(props.sx as object) }} />;
}

/** Yan yana n sütunlu alan ızgarası. */
export function FieldRow({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2 }}>{children}</Box>;
}
