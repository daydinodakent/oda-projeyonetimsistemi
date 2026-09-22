import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { DollarSign, FileText, Layers, TrendingUp, UserCheck, X } from 'lucide-react';

export type ModuleId = 'dashboard' | 'report' | 'gis' | 'hakedis' | 'resources' | 'documents';

interface ModuleCard {
  id: ModuleId;
  color: string;
  icon: ReactNode;
  title: string;
  desc: string;
  cta: string;
}

const CARDS: ModuleCard[] = [
  { id: 'dashboard', color: '#3b82f6', icon: <TrendingUp className="w-4 h-4" />, title: 'Yönetici Analitiği', desc: 'Proje bütçeleri, fiziki imalat ilerlemeleri ve şantiye riskleri özet raporları.', cta: 'Dashboard Panelini Aç →' },
  { id: 'report', color: '#10b981', icon: <FileText className="w-4 h-4" />, title: 'Rapor Al (Dışa Aktar)', desc: 'Tüm proje, yapı ve şantiye imalat verilerini PDF veya Excel formatlarında indirin.', cta: 'Rapor Oluşturucuyu Aç →' },
  { id: 'gis', color: '#6366f1', icon: <Layers className="w-4 h-4" />, title: 'GIS / BIM / CAD Ortak Alanı', desc: 'SHP, KML, DWG ve IFC BIM modellerinin koordinat tabanlı entegrasyonu.', cta: 'Ortak Çalışma Konsolu Aç →' },
  { id: 'hakedis', color: '#f59e0b', icon: <DollarSign className="w-4 h-4" />, title: 'Otomatik Hakediş Raporu', desc: 'Sahada tamamlanan imalat metrajlarına göre anlık hakediş hiyerarşisi oluşturun.', cta: 'Hakediş Oluşturucu Aç →' },
  { id: 'resources', color: '#a855f7', icon: <UserCheck className="w-4 h-4" />, title: 'İnsan Kaynakları & Tedarik', desc: 'Şantiye mühendis ve taşeron atamaları, kapasite çakışma ve kaynak havuz dengeleme.', cta: 'Kaynak Panelini Aç →' },
  { id: 'documents', color: '#6366f1', icon: <FileText className="w-4 h-4" />, title: 'Doküman Yönetimi', desc: 'Şartnameler, sözleşmeler ve as-built teknik çizimlerin versiyonlu onay akışları.', cta: 'Doküman Panelini Aç →' },
];

interface ModuleGridDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: ModuleId) => void;
}

/** "Yönetim Modülleri" ızgarası — MUI Dialog + Grid; renkler theme.palette'ten (açık/koyu otomatik). */
export default function ModuleGridDialog({ open, onClose, onSelect }: ModuleGridDialogProps) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        backdrop: { sx: { bgcolor: alpha(theme.palette.common.black, 0.75), backdropFilter: 'blur(12px)' } },
        paper: { sx: { p: 6, borderRadius: 6, border: 1, borderColor: 'divider', bgcolor: 'background.paper', backgroundImage: 'none', position: 'relative' } },
      }}
    >
      <IconButton id="grid-btn-close" title="Kapat" onClick={onClose} sx={{ '&&': { position: 'absolute' }, top: 24, right: 24, color: 'text.secondary' }}>
        <X className="w-5 h-5" />
      </IconButton>

      <Box sx={{ mb: 6, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box component="span" sx={{ display: 'block', width: 'max-content', mb: 1.5, px: 2, py: 0.5, borderRadius: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.2) }}>
          ODA+PYS
        </Box>
        <Typography variant="h3" component="h3" sx={{ fontSize: 18, fontWeight: 900 }}>Yönetim Modülleri</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Tek veri omurgasına bağlı alt uygulamalara hızlıca erişin.</Typography>
      </Box>

      <Grid container spacing={4}>
        {CARDS.map((c) => (
          <Grid key={c.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Box
              sx={{
                height: '100%',
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRadius: 4,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.default',
                transition: 'border-color .2s',
                '&:hover': { borderColor: alpha('#3b82f6', 0.5) },
              }}
            >
              <Box>
                <Box sx={{ width: 32, height: 32, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, bgcolor: alpha(c.color, 0.1) }}>{c.icon}</Box>
                <Typography variant="h4" component="h4" sx={{ fontSize: 12, fontWeight: 900, mb: 1 }}>{c.title}</Typography>
                <Typography sx={{ fontSize: 10, lineHeight: 1.6, color: 'text.secondary' }}>{c.desc}</Typography>
              </Box>
              <Button
                onClick={() => {
                  onSelect(c.id);
                  onClose();
                }}
                sx={{ mt: 4, p: 0, minWidth: 0, justifyContent: 'flex-start', fontSize: 12, fontWeight: 900, color: c.color, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
              >
                {c.cta}
              </Button>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Dialog>
  );
}
