import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Box as BoxIcon, Ruler } from 'lucide-react';
import Tag from './Tag';

interface VolumeCardProps {
  totalVolume: number;
  totalArea: number;
  polygonCount: number;
  avgFloorHeight: number;
  onAvgFloorHeightChange: (value: number) => void;
}

const labelSx = { display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: 'text.secondary' };

/** Canlı CBS poligonlarından hesaplanan tahmini inşaat hacmi kartı (Plan ve İnşaat sağ panelleri ortak kullanır). */
export default function VolumeCard({ totalVolume, totalArea, polygonCount, avgFloorHeight, onAvgFloorHeightChange }: VolumeCardProps) {
  const theme = useTheme();
  const warning = theme.palette.warning.main;
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 3,
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        border: 1,
        borderColor: alpha(warning, 0.3),
        backdropFilter: 'blur(4px)',
        boxShadow: 3,
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, right: 0, width: 96, height: 96, borderRadius: '50%', bgcolor: alpha(warning, 0.06), filter: 'blur(24px)', pointerEvents: 'none' }} />

      <Stack spacing={2.5} sx={{ position: 'relative' }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 20, height: 20, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'warning.main', bgcolor: alpha(warning, 0.1), border: 1, borderColor: alpha(warning, 0.2) }}>
              <BoxIcon className="w-3 h-3" />
            </Box>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tahmini İnşaat Hacmi</Typography>
          </Stack>
          <Tag tone="warning" variant="plain" mono>CANLI SYNC</Tag>
        </Stack>

        <Box>
          <Typography component="span" sx={{ ...labelSx, mb: 0.5 }}>Toplam Kübik Hacim</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
            <Typography component="span" sx={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString('tr-TR') : '0'}
            </Typography>
            <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: 'warning.main' }}>m³</Typography>
          </Stack>
        </Box>

        {/* Ortalama Kat Yüksekliği Parametresi Kontrolü */}
        <Box sx={{ p: 2, fontFamily: 'monospace', bgcolor: alpha(theme.palette.common.black, 0.2), border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 10, fontWeight: 700, color: 'text.secondary', fontFamily: 'inherit' }}>
              <Ruler className="w-2.5 h-2.5" /> Ort. Kat Yüksekliği:
            </Typography>
            <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, color: 'warning.light', fontFamily: 'inherit' }}>{avgFloorHeight.toFixed(1)} m</Typography>
          </Stack>
          <Slider
            size="small"
            color="warning"
            min={2.5}
            max={4.5}
            step={0.1}
            value={avgFloorHeight}
            onChange={(_, v) => onAvgFloorHeightChange(v as number)}
            aria-label="Ortalama kat yüksekliği"
            sx={{ display: 'block', mx: 1, width: 'calc(100% - 16px)', py: 1.5 }}
          />
          <Stack direction="row" sx={{ justifyContent: 'space-between', fontSize: 10, color: 'text.secondary' }}>
            <span>2.5m</span>
            <span>3.5m (Standart)</span>
            <span>4.5m</span>
          </Stack>
        </Box>

        {/* Poligon Taban Detay Özetleri */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontFamily: 'monospace' }}>
          {[
            { label: 'Çizilen Poligon', value: `${polygonCount} Adet` },
            { label: 'Toplam Taban Alanı', value: `${totalArea > 0 ? Math.round(totalArea).toLocaleString('tr-TR') : '0'} m²` },
          ].map((m) => (
            <Box key={m.label} sx={{ p: 1.5, display: 'flex', flexDirection: 'column', bgcolor: alpha(theme.palette.common.black, 0.15), border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography component="span" sx={{ ...labelSx, fontFamily: 'inherit' }}>{m.label}</Typography>
              <Typography component="span" sx={{ mt: 0.5, fontSize: 10, fontWeight: 800, fontFamily: 'inherit' }}>{m.value}</Typography>
            </Box>
          ))}
        </Box>
      </Stack>
    </Box>
  );
}
