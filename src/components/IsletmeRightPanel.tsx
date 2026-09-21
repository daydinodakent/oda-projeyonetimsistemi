import { useState, useEffect, type ReactNode } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { ShieldCheck, CalendarRange, Thermometer, Zap, AlertTriangle, Cpu, Pencil } from 'lucide-react';
import { Project, Asset } from '../types';
import AppDialog from './chrome/AppDialog';
import Tag from './ui/Tag';
import FeedbackToast from './ui/FeedbackToast';
import type { Tone } from './ui/tone';

interface IsletmeRightPanelProps {
  project: Project;
  assets: Asset[];
  selectedAssetId: string | null;
}

interface LiveDataPoint {
  time: string;
  energy: number;
}

const dialogFieldSx = { '& .MuiInputBase-input': { fontSize: 12 } };

/** Bölüm başlığı: ikon + eyebrow, sağda isteğe bağlı eylem. */
function SectionHeader({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {icon}
        {title}
      </Typography>
      {right}
    </Stack>
  );
}

/** Canlı ölçüm kutusu (ikon + etiket + değer). */
function Readout({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ p: 2, alignItems: 'center', bgcolor: 'background.default', border: 1, borderColor: 'divider' }}>
      {icon}
      <Box>
        <Typography component="span" sx={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: 'text.secondary' }}>{label}</Typography>
        <Typography component="strong" sx={{ fontSize: 12, fontWeight: 700 }}>{value}</Typography>
      </Box>
    </Stack>
  );
}

export default function IsletmeRightPanel({ assets, selectedAssetId }: IsletmeRightPanelProps) {
  const theme = useTheme();

  // Find current selected asset
  const asset = assets.find(a => a.id === selectedAssetId) || assets[0];

  // Superuser Edit States
  const [assetWarranty, setAssetWarranty] = useState('');
  const [assetLastMaintenance, setAssetLastMaintenance] = useState('');
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setAssetWarranty(asset.warrantyStatus);
      setAssetLastMaintenance(asset.lastMaintenanceDate || '2026-08-15');
    }
  }, [asset?.id, asset?.warrantyStatus, asset?.lastMaintenanceDate]);

  // Live Scrolling IoT Energy Data State
  const [liveData, setLiveData] = useState<LiveDataPoint[]>([
    { time: '10:00', energy: 42 },
    { time: '10:05', energy: 45 },
    { time: '10:10', energy: 43 },
    { time: '10:15', energy: 48 },
    { time: '10:20', energy: 44 },
    { time: '10:25', energy: 50 },
    { time: '10:30', energy: 46 },
    { time: '10:35', energy: 52 },
  ]);

  // Live Temperature readout
  const [liveTemp, setLiveTemp] = useState<number>(23.4);

  useEffect(() => {
    // Scroll tick every 2.5 seconds
    const interval = setInterval(() => {
      // Fluctuate temperature slightly
      setLiveTemp(prev => {
        const delta = (Math.random() - 0.5) * 0.4;
        return parseFloat((prev + delta).toFixed(1));
      });

      // Append new energy data point
      setLiveData(prev => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        // Base energy consumption depending on asset state
        const baseEnergy = asset?.status === 'Arızalı' ? 10 : asset?.status === 'Bakım Bekliyor' ? 65 : 45;
        const noise = (Math.random() - 0.5) * 12;
        const newVal = Math.round(Math.max(5, baseEnergy + noise));

        return [...prev.slice(1), { time: timeStr, energy: newVal }];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [asset?.id, asset?.status]);

  if (!asset) {
    return (
      <Box sx={{ p: 5, textAlign: 'center', fontSize: 12, fontStyle: 'italic', color: 'text.disabled', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
        Bilgi kartını görmek için soldan bir varlık seçin.
      </Box>
    );
  }

  const isFaulty = asset.status === 'Arızalı';
  const statusTone: Tone = isFaulty ? 'error' : asset.status === 'Bakım Bekliyor' ? 'warning' : 'success';
  const chartColor = theme.palette.warning.main;

  return (
    <Stack spacing={2.5}>
      {/* 1. SEÇİLİ VARLIK BİLGİ KARTI */}
      <Box>
        <SectionHeader
          icon={<Box component="span" sx={{ display: 'flex', color: 'info.main' }}><Cpu className="w-3.5 h-3.5" /></Box>}
          title="Varlık Kimlik Kartı"
          right={
            <IconButton size="small" title="Varlık Bilgilerini Düzenle (SpU)" onClick={() => setIsEditingAsset(true)} sx={{ p: 1, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
              <Pencil className="w-3.5 h-3.5" />
            </IconButton>
          }
        />

        <Typography component="h4" sx={{ pt: 2, mb: 1, fontSize: 12, fontWeight: 900, lineHeight: 1.5, textAlign: 'left' }}>
          {asset.name}
        </Typography>
        <Box sx={{ textAlign: 'left', mb: 2 }}>
          <Tag tone={statusTone}>{asset.status}</Tag>
        </Box>

        <Stack spacing={1.5} sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider', fontSize: 12 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pb: 0.5 }}>
            <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, color: 'text.secondary' }}>
              <Box component="span" sx={{ display: 'flex', color: 'info.main' }}><ShieldCheck className="w-3.5 h-3.5" /></Box>
              Garanti Durumu:
            </Typography>
            <Typography component="strong" sx={{ fontSize: 11, fontWeight: 700, color: 'info.main' }}>{assetWarranty}</Typography>
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pb: 0.5 }}>
            <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, color: 'text.secondary' }}>
              <Box component="span" sx={{ display: 'flex', color: 'warning.main' }}><CalendarRange className="w-3.5 h-3.5" /></Box>
              Son Bakım Tarihi:
            </Typography>
            <Typography component="strong" sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{assetLastMaintenance}</Typography>
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>Kümülatif Bakım:</Typography>
            <Typography component="strong" sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'warning.main' }}>₺{asset.maintenanceCost}M</Typography>
          </Stack>
        </Stack>
      </Box>

      {/* 2. CANLI SCADA / SENSÖR TELEMETRİ ALANI */}
      <Stack spacing={2} sx={{ pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
        <SectionHeader
          icon={<Box component="span" sx={{ display: 'flex', color: 'warning.main' }}><Zap className="w-3.5 h-3.5" /></Box>}
          title="IoT Canlı SCADA Telemetrisi"
          right={<Tag tone="error" variant="plain">LIVE</Tag>}
        />

        {/* Readout stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Readout icon={<Box component="span" sx={{ display: 'flex', color: 'error.main', flexShrink: 0 }}><Thermometer className="w-4 h-4" /></Box>} label="Sıcaklık" value={`${liveTemp}°C`} />
          <Readout icon={<Box component="span" sx={{ display: 'flex', color: 'warning.main', flexShrink: 0 }}><Zap className="w-4 h-4" /></Box>} label="Anlık Güç" value={`${liveData[liveData.length - 1]?.energy || 45} kW`} />
        </Box>

        {/* Rolling Live Chart */}
        <Box>
          <Typography component="span" sx={{ display: 'block', mb: 1, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
            Reel-Time Enerji Akış Hızı (kW)
          </Typography>
          <Box sx={{ height: 120, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnergyLive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke={theme.palette.divider} opacity={0.6} />
                <XAxis dataKey="time" stroke={theme.palette.text.disabled} fontSize={7} tickLine={false} />
                <YAxis stroke={theme.palette.text.disabled} fontSize={7} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    borderColor: theme.palette.divider,
                    fontSize: '8px',
                    color: theme.palette.text.primary,
                  }}
                />
                <Area type="monotone" dataKey="energy" stroke={chartColor} fillOpacity={1} fill="url(#colorEnergyLive)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {isFaulty && (
          <Stack direction="row" spacing={1.5} sx={{ p: 2.5, fontSize: 10, lineHeight: 1.5, color: 'error.light', bgcolor: alpha(theme.palette.error.main, 0.1), border: 1, borderColor: alpha(theme.palette.error.main, 0.2) }}>
            <Box component="span" sx={{ display: 'flex', flexShrink: 0, color: 'error.main' }}><AlertTriangle className="w-4 h-4" /></Box>
            <span>Varlık kritik arıza modunda! Enerji tüketiminin düşmesi kompresör durmasına işaret ediyor. Acil müdahale ekibi yönlendirildi.</span>
          </Stack>
        )}
      </Stack>

      <FeedbackToast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Asset Edit Modal (Süper Kullanıcı) */}
      <AppDialog
        open={isEditingAsset}
        onClose={() => setIsEditingAsset(false)}
        badge="Süper Yetkili"
        title="Varlık Düzenleme"
        tone="primary"
        submitLabel="Kaydet ve Kapat"
        onSubmit={() => {
          setIsEditingAsset(false);
          setToastMessage('💾 İşletme varlığı garanti ve bakım detayları güncellendi.');
        }}
      >
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Süper kullanıcı yetkisiyle seçili işletme varlığının garanti süresini ve son bakım tarihini güncelleyebilirsiniz.
        </Typography>
        <TextField label="Varlık Adı" value={asset.name} slotProps={{ input: { readOnly: true } }} sx={dialogFieldSx} />
        <TextField label="Garanti Durumu" value={assetWarranty} onChange={(e) => setAssetWarranty(e.target.value)} sx={dialogFieldSx} />
        <TextField label="Son Bakım Tarihi" value={assetLastMaintenance} onChange={(e) => setAssetLastMaintenance(e.target.value)} sx={dialogFieldSx} />
      </AppDialog>
    </Stack>
  );
}
