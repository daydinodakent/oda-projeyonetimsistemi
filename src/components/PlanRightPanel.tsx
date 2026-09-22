import { useState, useEffect, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { DollarSign, FileCheck, AlertTriangle, Percent, Activity, Pencil } from 'lucide-react';
import { Project } from '../types';
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

const PERMIT_STATUS_TONES: Record<string, Tone> = {
  'Alındı': 'success',
  'Bekliyor': 'warning',
  'Süresi Doluyor': 'info',
  'Süresi Doldu': 'error',
};

const microLabelSx = { display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: 'text.secondary' };

/** Ölçüm kutusu: küçük etiket + değer, yüzey rengi ve kenarlıkla. */
function MetricBox({ label, children, center }: { label: string; children: ReactNode; center?: boolean }) {
  return (
    <Box sx={{ p: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider', textAlign: center ? 'center' : 'left' }}>
      <Typography component="span" sx={{ ...microLabelSx, lineHeight: 1, mb: 1 }}>{label}</Typography>
      {children}
    </Box>
  );
}

/** Bölüm başlığı (ikon + eyebrow) ve sağ tarafta isteğe bağlı eylem alanı. */
function SectionHeader({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Typography component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {icon}
        {title}
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>{right}</Stack>
    </Stack>
  );
}

function EditButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <IconButton size="small" title={title} onClick={onClick} sx={{ p: 1, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
      <Pencil className="w-3.5 h-3.5" />
    </IconButton>
  );
}

interface PlanRightPanelProps {
  project: Project;
}

export default function PlanRightPanel({ project }: PlanRightPanelProps) {
  const theme = useTheme();
  const c = (tone: Tone) => toneColors(theme, tone);

  // Dynamic state for active map buildings
  const [buildings, setBuildings] = useState<any[]>(() => {
    const saved = localStorage.getItem('iga_added_buildings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse buildings', e);
      }
    }
    return [];
  });

  // Average floor height state (adjustable)
  const [avgFloorHeight, setAvgFloorHeight] = useState<number>(3.0);

  // Superuser Edit States
  const [permits, setPermits] = useState(project.permits);
  const [isEditingPermits, setIsEditingPermits] = useState(false);

  const [subcontractorCap, setSubcontractorCap] = useState(85);
  const [plannedCost, setPlannedCost] = useState("₺142.50M");
  const [actualCost, setActualCost] = useState("₺149.20M");
  const [isEditingResources, setIsEditingResources] = useState(false);

  useEffect(() => {
    setPermits(project.permits);
  }, [project]);

  // Synchronize buildings dynamically
  useEffect(() => {
    const syncData = () => {
      const saved = localStorage.getItem('iga_added_buildings');
      if (saved) {
        try {
          setBuildings(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to parse buildings', e);
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

  // Local EVM map layer toggle state
  const [mapColorMode, setMapColorMode] = useState<'progress' | 'cost'>('progress');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showFeedbackToast = (msg: string) => setToastMessage(msg);

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

  const riskTone: Tone = project.riskLevel === 'Düşük' ? 'success' : project.riskLevel === 'Orta' ? 'warning' : 'error';
  const sectionSx = { pt: 2.5, borderTop: 1, borderColor: 'divider' };
  const updatePermit = (idx: number, patch: Partial<(typeof permits)[number]>) => {
    const updated = [...permits];
    updated[idx] = { ...updated[idx], ...patch };
    setPermits(updated);
  };

  const modeButtonSx = (active: boolean, tone: Tone) => ({
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    py: 1,
    px: 2.5,
    border: 1,
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: 10,
    fontFamily: 'inherit',
    fontWeight: active ? 800 : 500,
    color: active ? c(tone).light : 'text.secondary',
    bgcolor: active ? alpha(c(tone).main, 0.15) : 'transparent',
    borderColor: active ? c(tone).main : 'divider',
    '&:hover': { color: active ? c(tone).light : 'text.primary' },
  });

  const dialogFieldSx = { '& .MuiInputBase-input': { fontSize: 12 } };

  return (
    <Stack spacing={2.5}>
      {/* 1. PROJE GENEL METRİKLERİ */}
      <Box sx={{ py: 1.5 }}>
        <Typography component="span" sx={{ display: 'block', mb: 2, fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Proje Fizibilite Göstergeleri
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <MetricBox label="Toplam Alan">
            <Typography component="strong" sx={{ fontSize: 11, fontWeight: 900 }}>{project.area}</Typography>
          </MetricBox>
          <MetricBox label="Bütçe (BAC)">
            <Typography component="strong" sx={{ fontSize: 11, fontWeight: 900, color: 'success.main' }}>₺{project.budget}M</Typography>
          </MetricBox>
        </Box>

        <Stack spacing={2} sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Planlanan Harcama:</Typography>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 800 }}>₺{project.plannedSpent}M</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Fiziki Hazırlık Oranı:</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', fontSize: 11, fontWeight: 800, color: 'info.main' }}>
              <Percent className="w-3 h-3" />
              <span>%{project.overallProgress}</span>
            </Stack>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Risk Profil Derecesi:</Typography>
            <Tag tone={riskTone} variant="plain">{project.riskLevel} RİSK</Tag>
          </Stack>
        </Stack>
      </Box>

      {/* CANLI CBS POLİGON İNŞAAT HACMİ METRİK KARTI */}
      <VolumeCard
        totalVolume={totalVolume}
        totalArea={totalArea}
        polygonCount={currentProjectBuildings.length}
        avgFloorHeight={avgFloorHeight}
        onAvgFloorHeightChange={setAvgFloorHeight}
      />

      {/* 2. RUHSAT & İZİNLER TABLOSU */}
      <Box sx={{ ...sectionSx, py: 1.5, pt: 2.5 }}>
        <SectionHeader
          icon={<FileCheck className="w-3.5 h-3.5" style={{ color: c('info').main }} />}
          title="Yasal İzinler & Ruhsatlar"
          right={
            <>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: 'info.main' }}>({permits.length} Evrak)</Typography>
              <EditButton title="İzinleri Düzenle (SpU)" onClick={() => setIsEditingPermits(true)} />
            </>
          }
        />

        <Stack spacing={1.5} sx={{ maxHeight: 140, overflowY: 'auto', pr: 1, scrollbarWidth: 'none' }}>
          {permits.map((permit) => (
            <Box key={permit.id} sx={{ p: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider', fontSize: 10 }}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography component="span" title={permit.name} noWrap sx={{ width: 120, fontSize: 10, fontWeight: 700 }}>
                  {permit.name}
                </Typography>
                <Tag tone={PERMIT_STATUS_TONES[permit.status] ?? 'info'}>{permit.status}</Tag>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between', pt: 0.5, fontSize: 10, color: 'text.secondary' }}>
                <span>Kurum: <strong>{permit.authority}</strong></span>
                <span>Bitiş: <Box component="strong" sx={{ color: 'error.light', fontFamily: 'monospace' }}>{permit.expiryDate}</Box></span>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* 3. KAYNAK & BÜTÇE GRUBU */}
      <Box sx={{ ...sectionSx, py: 1.5, pt: 2.5 }}>
        <SectionHeader
          icon={<DollarSign className="w-3.5 h-3.5" style={{ color: c('warning').main }} />}
          title="Kaynak & Bütçe Yönetimi"
          right={
            <>
              <Tag tone="warning" variant="plain" uppercase>Çakışma Var (%{subcontractorCap})</Tag>
              <EditButton title="Kaynak ve Bütçe Düzenle (SpU)" onClick={() => setIsEditingResources(true)} />
            </>
          }
        />

        <Stack spacing={2}>
          <Typography sx={{ fontSize: 10, lineHeight: 1.6, color: 'text.secondary' }}>
            Şantiyede görevli alt yüklenici, makine-ekipman ve birim fiyat planlaması.
          </Typography>

          {/* Alt Yüklenici Detayı */}
          <Box sx={{ p: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 700 }}>Kalyon Altyapı A.Ş.</Typography>
              <Typography component="span" sx={{ fontSize: 10, fontWeight: 800, color: 'warning.main' }}>Kapasite: %{subcontractorCap}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              color="warning"
              value={subcontractorCap}
              sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
            />
          </Box>

          {/* Kaynak Çakışma Alert */}
          <Box sx={{ p: 2, bgcolor: alpha(c('warning').main, 0.1), border: 1, borderColor: alpha(c('warning').main, 0.2) }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, color: 'warning.main', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>KAYNAK ÇAKIŞMA ALARMI</span>
            </Stack>
            <Typography sx={{ fontSize: 10, lineHeight: 1.4, color: 'text.secondary' }}>
              <strong>CAT-390 Ağır Ekskavatör</strong>, kümülatif olarak Sektör-A ve Sektör-B kazılarına ortak atanmış durumda.
            </Typography>
          </Box>

          {/* Maliyet Özetleri */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <MetricBox label="PLANLANAN MALİYET">
              <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 10 }}>{plannedCost}</Typography>
            </MetricBox>
            <MetricBox label="GERÇEKLEŞEN BÜTÇE">
              <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 10 }}>{actualCost}</Typography>
            </MetricBox>
          </Box>
        </Stack>
      </Box>

      {/* 4. EVM & SAPMA RAPORU */}
      <Box sx={{ ...sectionSx, py: 1.5, pt: 2.5 }}>
        <SectionHeader
          icon={<Activity className="w-3.5 h-3.5" style={{ color: c('success').main }} />}
          title="EVM & Sapma Raporu"
          right={<Tag tone="success" variant="plain" uppercase>CPI: 1.05 | SPI: 0.98</Tag>}
        />

        <Stack spacing={2}>
          <Typography sx={{ fontSize: 10, lineHeight: 1.6, color: 'text.secondary' }}>
            Kazanılmış Değer Analizi (Earned Value Management) kümülatif SAPMA özetleri.
          </Typography>

          {/* EVM Metrics PV, EV, AC */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
            {[
              { label: 'PV', value: project.plannedSpent },
              { label: 'EV', value: project.earnedValue },
              { label: 'AC', value: project.spent },
            ].map((m) => (
              <MetricBox key={m.label} label={m.label} center>
                <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 10 }}>₺{m.value}M</Typography>
              </MetricBox>
            ))}
          </Box>

          {/* SPI & CPI Micro cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {([
              { label: 'SPI (Süreç)', state: 'Gecikme', value: '0.98', tone: 'error' },
              { label: 'CPI (Maliyet)', state: 'Karda', value: '1.05', tone: 'success' },
            ] as const).map((m) => (
              <Box
                key={m.label}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: alpha(c(m.tone).main, 0.2),
                  backgroundImage: `linear-gradient(90deg, ${alpha(c(m.tone).main, 0.1)}, transparent)`,
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>{m.label}</Typography>
                  <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: `${m.tone}.light` }}>{m.state}</Typography>
                </Stack>
                <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: `${m.tone}.main` }}>{m.value}</Typography>
              </Box>
            ))}
          </Box>

          {/* Map Color Mode Selector */}
          <Stack spacing={1.5} sx={{ pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <Typography component="span" sx={{ ...microLabelSx, fontSize: 10, fontWeight: 900, letterSpacing: '0.05em' }}>HARİTA TEMATİK ISI KATMANI</Typography>
            <Stack spacing={1}>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setMapColorMode('progress');
                  showFeedbackToast('🌡️ Haritada imalat ilerleme yüzdesi tematik renk modu (Isı Haritası) uygulandı.');
                }}
                sx={modeButtonSx(mapColorMode === 'progress', 'secondary')}
              >
                <span>İlerleme Yüzdesi Isı Haritası</span>
                <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'secondary.light' }} />
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setMapColorMode('cost');
                  showFeedbackToast('🌡️ Haritada maliyet sapma bütçe durum tematik renk modu uygulandı.');
                }}
                sx={modeButtonSx(mapColorMode === 'cost', 'warning')}
              >
                <span>Maliyet Sapması Isı Haritası</span>
                <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.light' }} />
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      <FeedbackToast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Permits Edit Modal (Süper Kullanıcı) */}
      <AppDialog
        open={isEditingPermits}
        onClose={() => setIsEditingPermits(false)}
        badge="Süper Yetkili"
        title="Yasal İzinler & Ruhsatlar Düzenleme"
        tone="secondary"
        submitLabel="Kaydet ve Kapat"
        onSubmit={() => {
          setIsEditingPermits(false);
          showFeedbackToast('💾 Yasal izinler ve ruhsat bilgileri güncellendi.');
        }}
      >
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Süper kullanıcı yetkisiyle yasal izinlerin ve ruhsatların isim, merci ve durum bilgisini güncelleyebilirsiniz.
        </Typography>
        {permits.map((p, idx) => (
          <Stack key={p.id} spacing={2} sx={{ p: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <TextField
              label="Evrak / İzin Adı"
              value={p.name}
              onChange={(e) => updatePermit(idx, { name: e.target.value })}
              sx={dialogFieldSx}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Kurum / Merci"
                value={p.authority}
                onChange={(e) => updatePermit(idx, { authority: e.target.value })}
                sx={dialogFieldSx}
              />
              <TextField
                select
                label="Durum"
                value={p.status}
                onChange={(e) => updatePermit(idx, { status: e.target.value as typeof p.status })}
                sx={dialogFieldSx}
              >
                <MenuItem value="Alındı">Alındı (Yeşil)</MenuItem>
                <MenuItem value="Bekliyor">Bekliyor (Sarı)</MenuItem>
                <MenuItem value="Süresi Doluyor">Süresi Doluyor (Mavi)</MenuItem>
                <MenuItem value="Süresi Doldu">Süresi Doldu (Kırmızı)</MenuItem>
              </TextField>
            </Box>
          </Stack>
        ))}
      </AppDialog>

      {/* Resources Edit Modal (Süper Kullanıcı) */}
      <AppDialog
        open={isEditingResources}
        onClose={() => setIsEditingResources(false)}
        badge="Süper Yetkili"
        title="Kaynak & Bütçe Düzenleme"
        tone="warning"
        submitLabel="Kaydet ve Kapat"
        onSubmit={() => {
          setIsEditingResources(false);
          showFeedbackToast('💾 Kaynak kapasitesi ve bütçe detayları güncellendi.');
        }}
      >
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Süper kullanıcı yetkisiyle kaynak çakışma kapasitelerini ve maliyet bütçe bilgilerini güncelleyebilirsiniz.
        </Typography>
        <TextField
          type="number"
          label="Alt Yüklenici Kapasite Oranı (%)"
          value={subcontractorCap}
          onChange={(e) => setSubcontractorCap(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
          slotProps={{ htmlInput: { min: 0, max: 100 } }}
          sx={dialogFieldSx}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Planlanan Maliyet" value={plannedCost} onChange={(e) => setPlannedCost(e.target.value)} sx={dialogFieldSx} />
          <TextField label="Gerçekleşen Bütçe" value={actualCost} onChange={(e) => setActualCost(e.target.value)} sx={dialogFieldSx} />
        </Box>
      </AppDialog>
    </Stack>
  );
}
