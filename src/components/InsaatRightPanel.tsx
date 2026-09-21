import { useState, useEffect, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Project } from '../types';
import { Check, Shield, Layers, Pencil } from 'lucide-react';
import AppDialog from './chrome/AppDialog';
import Tag from './ui/Tag';
import FeedbackToast from './ui/FeedbackToast';
import VolumeCard from './ui/VolumeCard';
import { toneColors, type Tone } from './ui/tone';

// Custom lightweight shoelace calculation to find polygon area in square meters without Turf
const calculatePolygonArea = (coords: [number, number][]) => {
  if (!coords || coords.length < 3) return 0;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % n];
    const x1 = p1[0] * 85000;
    const y1 = p1[1] * 111000;
    const x2 = p2[0] * 85000;
    const y2 = p2[1] * 111000;
    area += (x1 * y2) - (x2 * y1);
  }
  return Math.abs(area / 2);
};

const labelSx = { display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: 'text.secondary' };
const dialogFieldSx = { '& .MuiInputBase-input': { fontSize: 12 } };
const monoValueSx = { fontSize: 10, fontWeight: 700, fontFamily: 'inherit' };

/** Öznitelik satırı: etiket solda, değer sağda (mono). */
function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography component="span" sx={{ ...labelSx, fontSize: 10, fontFamily: 'inherit', fontWeight: 700 }}>{label}</Typography>
      {children}
    </Stack>
  );
}

/** Dairesel gösterge: iz + dolu halka, ortada ikon veya metin; altında başlık ve durum. */
function Dial({ tone, value, label, status, center }: { tone: Tone; value: number; label: string; status: string; center: ReactNode }) {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
      <Box sx={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress variant="determinate" value={100} size={56} thickness={2.5} sx={{ position: 'absolute', color: 'action.selected' }} />
        <CircularProgress variant="determinate" value={value} size={56} thickness={2.5} sx={{ position: 'absolute', color: c.main }} />
        {center}
      </Box>
      <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.25 }}>{label}</Typography>
      <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: c.light }}>{status}</Typography>
    </Stack>
  );
}

function DialIcon({ tone, children }: { tone: Tone; children: ReactNode }) {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  return (
    <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(c.main, 0.2), border: 1, borderColor: c.light, color: c.light }}>
      {children}
    </Box>
  );
}

/** Başlık + değer satırı ve altında ilerleme çubuğu. */
function ParamBar({ label, value, valueTone, children }: { label: string; value: ReactNode; valueTone: Tone; children: ReactNode }) {
  const theme = useTheme();
  const c = toneColors(theme, valueTone);
  return (
    <Box sx={{ fontFamily: 'monospace' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', fontFamily: 'inherit' }}>{label}</Typography>
        <Typography component="span" sx={{ fontSize: 10, fontWeight: 800, color: c.light, fontFamily: 'inherit' }}>{value}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

interface InsaatRightPanelProps {
  project: Project;
  notifications: any[];
}

export default function InsaatRightPanel({ project }: InsaatRightPanelProps) {
  const theme = useTheme();
  const c = (tone: Tone) => toneColors(theme, tone);

  const [data4D, setData4D] = useState({
    karsat: '205763132',
    katarcatik: '3.14',
    hafriyat: '5.57',
    alinsat: 20000,
    butceKunam: 57581,
    ruhsatVal: 16,
    botgum: 'SIMAM'
  });

  const [isEditingBIM, setIsEditingBIM] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Underground layer toggles inside panel
  const [undergroundUtilities, setUndergroundUtilities] = useState(true);
  const [undergroundSensors, setUndergroundSensors] = useState(true);

  // Dynamic state for active map buildings
  const [buildings, setBuildings] = useState<any[]>(() => {
    const saved = localStorage.getItem('iga_added_buildings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse buildings from local storage', e);
      }
    }
    return [];
  });

  // Average floor height state (adjustable)
  const [avgFloorHeight, setAvgFloorHeight] = useState<number>(3.0);

  // Synchronize buildings dynamically
  useEffect(() => {
    const syncData = () => {
      const saved = localStorage.getItem('iga_added_buildings');
      if (saved) {
        try {
          setBuildings(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to parse buildings from local storage', e);
        }
      }
    };

    syncData();
    window.addEventListener('storage', syncData);
    window.addEventListener('iga_added_buildings_changed', syncData);
    const interval = setInterval(syncData, 1500);

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('iga_added_buildings_changed', syncData);
      clearInterval(interval);
    };
  }, []);

  // Filter buildings by current active project
  const currentProjectBuildings = buildings.filter(b => b.projectId === project.id);

  let totalArea = 0;
  let totalVolume = 0;

  currentProjectBuildings.forEach(b => {
    if (b.coordinates && b.coordinates.length >= 3) {
      try {
        const areaM2 = calculatePolygonArea(b.coordinates);
        const floors = b.floors || 8;
        const volumeM3 = areaM2 * floors * avgFloorHeight;

        totalArea += areaM2;
        totalVolume += volumeM3;
      } catch (err) {
        console.error("Volume calculation failed:", err);
      }
    }
  });

  const toggleSx = (active: boolean, tone: Tone) => ({
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    py: 1.5,
    px: 3,
    border: 1,
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 10,
    fontWeight: 900,
    color: active ? c(tone).light : 'text.disabled',
    bgcolor: active ? alpha(c(tone).main, 0.15) : 'action.hover',
    borderColor: active ? alpha(c(tone).main, 0.3) : 'divider',
  });

  const bimFields: { key: 'karsat' | 'katarcatik' | 'hafriyat' | 'botgum'; label: string }[] = [
    { key: 'karsat', label: 'Karsat ID' },
    { key: 'katarcatik', label: 'Katarçatık Değeri' },
    { key: 'hafriyat', label: 'Hafriyat Statüsü' },
    { key: 'botgum', label: 'Botgum Kodu' },
  ];

  return (
    <Stack spacing={2.5} sx={{ width: '100%', height: '100%', userSelect: 'none' }}>
      {/* 2. Key-Value Rows */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pb: 2, pr: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
          <Box component="span" sx={{ display: 'flex', color: 'secondary.main' }}><Layers className="w-3.5 h-3.5" /></Box>
          4D BIM Öznitelik Değerleri
        </Typography>
        <IconButton size="small" title="BIM Özniteliklerini Düzenle (SpU)" onClick={() => setIsEditingBIM(true)} sx={{ p: 1, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <Pencil className="w-3.5 h-3.5" />
        </IconButton>
      </Stack>

      <Stack spacing={1.5} sx={{ px: 1.5, py: 2, fontFamily: 'monospace' }}>
        <KeyValue label="Element:">
          <Typography component="span" title={project.name} noWrap sx={{ ...monoValueSx, maxWidth: 140 }}>{project.name.toUpperCase()}</Typography>
        </KeyValue>
        <KeyValue label="Propertiy:">
          <Typography component="span" sx={{ ...monoValueSx, color: 'secondary.light' }}>Block</Typography>
        </KeyValue>
        <KeyValue label="Karsat:">
          <Typography component="span" sx={monoValueSx}>{data4D.karsat}</Typography>
        </KeyValue>
        <KeyValue label="Katarçatık:">
          <Typography component="span" sx={monoValueSx}>{data4D.katarcatik}</Typography>
        </KeyValue>
        <KeyValue label="Hafriyat Status:">
          <Typography component="span" sx={monoValueSx}>{data4D.hafriyat}</Typography>
        </KeyValue>
        <KeyValue label="Bütçe:">
          <Tag tone="success" variant="plain" uppercase mono>TAMAM</Tag>
        </KeyValue>
      </Stack>

      {/* 3. Three Circular Gauges */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, py: 1 }}>
        <Dial tone="info" value={100} label="Ruhsat" status="ALINDI" center={<DialIcon tone="info"><Check className="w-4 h-4" /></DialIcon>} />
        <Dial
          tone="warning"
          value={77}
          label="İlerleme"
          status="%78"
          center={<Typography component="span" sx={{ fontSize: 10, fontWeight: 900, color: 'warning.light' }}>%78</Typography>}
        />
        <Dial tone="success" value={93} label="Bütçe" status="TAMAM" center={<DialIcon tone="success"><Shield className="w-3.5 h-3.5" /></DialIcon>} />
      </Box>

      {/* CANLI CBS POLİGON İNŞAAT HACMİ METRİK KARTI */}
      <VolumeCard
        totalVolume={totalVolume}
        totalArea={totalArea}
        polygonCount={currentProjectBuildings.length}
        avgFloorHeight={avgFloorHeight}
        onAvgFloorHeightChange={setAvgFloorHeight}
      />

      {/* 4. 4D/5D Data Sliders list */}
      <Stack spacing={3} sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography component="span" sx={{ ...labelSx, fontSize: 10, fontWeight: 900, mb: 1 }}>
          4D/5D Çizelge Parametreleri
        </Typography>

        <Stack spacing={3.5}>
          {/* Aralık göstergesi */}
          <ParamBar
            label="4D/5D Data:"
            valueTone="success"
            value={
              <Stack direction="row" spacing={2} component="span" sx={{ alignItems: 'center' }}>
                <Tag tone="success" variant="plain" mono>32.861 M</Tag>
                <Typography component="span" sx={{ fontSize: 10, fontFamily: 'inherit', color: 'text.secondary' }}>10.000</Typography>
              </Stack>
            }
          >
            <Box sx={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'action.selected' }}>
              <Box sx={{ position: 'absolute', left: '25%', right: '25%', height: '100%', borderRadius: 3, backgroundImage: `linear-gradient(90deg, ${c('success').main}, ${c('info').light})` }} />
            </Box>
          </ParamBar>

          {/* Progress */}
          <ParamBar label="Progress (Alınsat):" value="20.000" valueTone="info">
            <LinearProgress variant="determinate" color="info" value={76} sx={{ height: 6, borderRadius: 3, bgcolor: 'action.selected' }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5, fontSize: 10, color: 'text.secondary', fontFamily: 'sans-serif' }}>
              <span>%76</span>
              <span>205</span>
            </Stack>
          </ParamBar>

          {/* Bütçe Kunam */}
          <ParamBar label="Bütçe Kunam:" value="57.581" valueTone="warning">
            <LinearProgress variant="determinate" color="warning" value={68} sx={{ height: 6, borderRadius: 3, bgcolor: 'action.selected' }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5, fontSize: 10, color: 'text.secondary', fontFamily: 'sans-serif' }}>
              <span>0</span>
              <span>400</span>
            </Stack>
          </ParamBar>

          {/* Key Value metadata */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default', border: 1, borderColor: 'divider' }}>
              <Typography component="span" sx={labelSx}>Ruhsat Limit</Typography>
              <Typography component="span" sx={{ fontSize: 12, fontWeight: 900 }}>{data4D.ruhsatVal}</Typography>
            </Box>
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default', border: 1, borderColor: 'divider' }}>
              <Typography component="span" sx={labelSx}>Bötgüm</Typography>
              <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: 'secondary.light' }}>{data4D.botgum}</Typography>
            </Box>
          </Box>

          {/* Dynamic Interactive Layer Toggles */}
          <Stack spacing={2} sx={{ pt: 2.5 }}>
            <Typography component="span" sx={{ ...labelSx, fontSize: 10, fontWeight: 900 }}>Harita Gösterim Ayarları</Typography>
            <Stack spacing={1.5}>
              <Box component="button" type="button" onClick={() => setUndergroundUtilities(!undergroundUtilities)} sx={toggleSx(undergroundUtilities, 'info')}>
                <span>Underground Utilities</span>
                <Box component="span" sx={{ width: 10, height: 10, bgcolor: undergroundUtilities ? 'info.light' : 'text.disabled' }} />
              </Box>
              <Box component="button" type="button" onClick={() => setUndergroundSensors(!undergroundSensors)} sx={toggleSx(undergroundSensors, 'success')}>
                <span>Underground Sensors: IoT</span>
                <Box component="span" sx={{ width: 10, height: 10, bgcolor: undergroundSensors ? 'success.light' : 'text.disabled' }} />
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </Stack>

      <FeedbackToast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* BIM Properties Edit Modal (Süper Kullanıcı) */}
      <AppDialog
        open={isEditingBIM}
        onClose={() => setIsEditingBIM(false)}
        badge="Süper Yetkili"
        title="4D BIM Öznitelik Düzenleme"
        tone="secondary"
        submitLabel="Kaydet ve Kapat"
        onSubmit={() => {
          setIsEditingBIM(false);
          setToastMessage('💾 4D BIM öznitelik verileri güncellendi.');
        }}
      >
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Süper kullanıcı yetkisiyle 4D BIM nesnelerine ait öznitelikleri, bütçe durumlarını ve parametrelerini değiştirebilirsiniz.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {bimFields.map((f) => (
            <TextField key={f.key} label={f.label} value={data4D[f.key]} onChange={(e) => setData4D({ ...data4D, [f.key]: e.target.value })} sx={dialogFieldSx} />
          ))}
        </Box>
      </AppDialog>
    </Stack>
  );
}
