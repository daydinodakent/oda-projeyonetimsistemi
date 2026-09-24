import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Building2, Calculator, HardHat, Handshake, HardDrive, Package, ScrollText, ShoppingCart, Users, X } from 'lucide-react';

export type ModuleId = 'altyuklenici' | 'taseron' | 'maliyet' | 'musteri' | 'satinalma' | 'santiye' | 'sozlesme' | 'depo' | 'ik';

interface ModuleCard {
  id: ModuleId;
  color: string;
  icon: ReactNode;
  title: string;
  desc: string;
  cta: string;
}

const CARDS: ModuleCard[] = [
  { id: 'altyuklenici', color: '#3b82f6', icon: <Building2 className="w-4 h-4" />, title: 'Alt Yüklenici Takibi', desc: 'Projeye dahil tüm alt yüklenici firmaların sözleşme şartlarını, iş ilerlemelerini ve performanslarını izler; işlerin istenen kalitede ve zamanda tamamlanmasını güvence altına alır.', cta: 'Alt Yüklenici Panelini Aç →' },
  { id: 'taseron', color: '#f59e0b', icon: <HardHat className="w-4 h-4" />, title: 'Taşeron Takibi', desc: 'Şantiyede görev alan taşeron ekiplerin çalışmalarını, puantajlarını ve ödemelerini yönetir; iş gücü verimliliğini artırır.', cta: 'Taşeron Panelini Aç →' },
  { id: 'maliyet', color: '#10b981', icon: <Calculator className="w-4 h-4" />, title: 'Maliyet Yönetimi', desc: 'Başlangıçtan sona tüm harcamaları detaylı takip eder; bütçe aşımını önler ve kârlılığı anlık kontrol etmenizi sağlar.', cta: 'Maliyet Panelini Aç →' },
  { id: 'musteri', color: '#ec4899', icon: <Handshake className="w-4 h-4" />, title: 'Müşteri Yönetimi', desc: 'Potansiyel alıcılardan mülk sahiplerine tüm müşteri bilgilerini, taleplerini ve ödeme planlarını tek yerde toplar.', cta: 'Müşteri Panelini Aç →' },
  { id: 'satinalma', color: '#a855f7', icon: <ShoppingCart className="w-4 h-4" />, title: 'Satın Alma Yönetimi', desc: 'Malzeme ve hizmetlerin talebinden tedarikine tüm süreci yönetir; doğru zamanda ve en uygun fiyata alım yapar.', cta: 'Satın Alma Panelini Aç →' },
  { id: 'santiye', color: '#f97316', icon: <HardDrive className="w-4 h-4" />, title: 'Şantiye Yönetimi', desc: 'Saha içi günlük operasyonları, görev atamalarını ve iş güvenliği prosedürlerini koordine eder.', cta: 'Şantiye Panelini Aç →' },
  { id: 'sozlesme', color: '#6366f1', icon: <ScrollText className="w-4 h-4" />, title: 'Sözleşme Yönetimi', desc: 'Müşteri, tedarikçi ve alt yüklenici sözleşmelerini dijital ortamda saklar; şart takibiyle yasal ve finansal riski azaltır.', cta: 'Sözleşme Panelini Aç →' },
  { id: 'depo', color: '#14b8a6', icon: <Package className="w-4 h-4" />, title: 'Depo Yönetimi', desc: 'Şantiye deposuna giren ve çıkan malzemelerin stokunu anlık izler; israf ve kayıpları önler.', cta: 'Depo Panelini Aç →' },
  { id: 'ik', color: '#3b82f6', icon: <Users className="w-4 h-4" />, title: 'İK Yönetimi', desc: 'PDKS kayıtlarını, maaş ve avans ödemelerini, izinleri ve özlük dosyalarını yönetir; idari yükü hafifletir.', cta: 'İK Panelini Aç →' },
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
