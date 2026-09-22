import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Calendar, Pencil } from 'lucide-react';
import { Project } from '../types';
import AppDialog from './chrome/AppDialog';
import Tag from './ui/Tag';
import FeedbackToast from './ui/FeedbackToast';

interface InsaatLeftPanelProps {
  project: Project;
  timelineDate: string; // Format: '2026-08-XX'
}

interface Phase {
  id: string;
  name: string;
  start: number;
  end: number;
  responsible: string;
  progressOverride: number | undefined;
}

const INITIAL_PHASES: Phase[] = [
  { id: 'temel', name: 'Temel & Bodrum Hafriyatı', start: 1, end: 8, responsible: 'Anadolu Yapı A.Ş.', progressOverride: undefined },
  { id: 'kabayapi', name: 'Kaba Yapı (Betonarme/Karkas)', start: 8, end: 20, responsible: 'Özsoy Kalıp & Demir', progressOverride: undefined },
  { id: 'inceyapi', name: 'İnce İşler (Tuğla/Alçı/Boya)', start: 18, end: 28, responsible: 'Ege Dekorasyon', progressOverride: undefined },
  { id: 'tesisat', name: 'Mekanik & Elektrik Tesisatı', start: 22, end: 31, responsible: 'Siemens Altyapı', progressOverride: undefined },
];

const dialogFieldSx = { '& .MuiInputBase-input': { fontSize: 12 } };

export default function InsaatLeftPanel({ timelineDate }: InsaatLeftPanelProps) {
  // Extract day from the selected date string
  const currentDay = parseInt(timelineDate.split('-')[2] || '27');

  // Dynamic Gantt calculations
  const calculateProgress = (start: number, end: number, pctOverride?: number) => {
    if (pctOverride !== undefined) return pctOverride;
    if (currentDay < start) return 0;
    if (currentDay > end) return 100;
    const progress = Math.round(((currentDay - start) / (end - start)) * 100);
    return Math.min(100, Math.max(0, progress));
  };

  // State for Gantt Phases to allow superuser editing
  const [phases, setPhases] = useState<Phase[]>(INITIAL_PHASES);
  const [isEditingPhases, setIsEditingPhases] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const updatePhase = (idx: number, patch: Partial<Phase>) => {
    const updated = [...phases];
    updated[idx] = { ...updated[idx], ...patch };
    setPhases(updated);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* ŞANTİYE GANTT PROGRAMI */}
      <Box sx={{ pt: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2.5, pb: 2, pr: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box component="span" sx={{ display: 'flex', color: 'warning.main' }}>
              <Calendar className="w-4 h-4" />
            </Box>
            <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
              4D Şantiye İş Programı (Gantt)
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Tag tone="info" variant="plain" uppercase>Ağustos 2026</Tag>
            <IconButton size="small" title="İş Programını Düzenle (SpU)" onClick={() => setIsEditingPhases(true)} sx={{ p: 1, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
              <Pencil className="w-3.5 h-3.5" />
            </IconButton>
          </Stack>
        </Stack>

        <Stack spacing={4} sx={{ pt: 1 }}>
          {phases.map((phase) => {
            const pct = calculateProgress(phase.start, phase.end, phase.progressOverride);
            const isCompleted = pct === 100;
            const isActive = pct > 0 && pct < 100;
            const barColor = isCompleted ? 'success' : isActive ? 'warning' : 'inherit';

            return (
              <Stack key={phase.id} spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography component="h4" sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>{phase.name}</Typography>
                    <Typography component="span" sx={{ fontSize: 10, color: 'text.secondary' }}>Taşeron: {phase.responsible}</Typography>
                  </Box>
                  {isCompleted ? (
                    <Tag tone="success" variant="plain">Tamamlandı</Tag>
                  ) : isActive ? (
                    <Tag tone="warning">Devam Ediyor</Tag>
                  ) : (
                    <Tag variant="plain">Planlandı</Tag>
                  )}
                </Stack>

                <Box>
                  <LinearProgress
                    variant="determinate"
                    color={barColor}
                    value={pct}
                    sx={{ height: 8, borderRadius: 4, bgcolor: 'background.default', '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
                  />
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1, fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>
                    <span>Ağu {phase.start}</span>
                    <Box component="span" sx={{ color: pct > 0 ? 'text.primary' : 'inherit' }}>%{pct}</Box>
                    <span>Ağu {phase.end}</span>
                  </Stack>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <FeedbackToast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Phases Edit Modal (Süper Kullanıcı) */}
      <AppDialog
        open={isEditingPhases}
        onClose={() => setIsEditingPhases(false)}
        badge="Süper Yetkili"
        title="İş Programı Gantt Düzenleme"
        tone="warning"
        submitLabel="Kaydet ve Kapat"
        onSubmit={() => {
          setIsEditingPhases(false);
          setToastMessage('💾 Şantiye Gantt iş programı detayları güncellendi.');
        }}
      >
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Süper kullanıcı yetkisiyle tüm Gantt şeması iş kalemlerinin adını, sorumlu taşeronunu, başlangıç/bitiş günlerini ve manuel ilerleme değerini düzenleyebilirsiniz.
        </Typography>
        {phases.map((phase, idx) => (
          <Stack key={phase.id} spacing={2} sx={{ p: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <TextField label="Aşama / İş Adı" value={phase.name} onChange={(e) => updatePhase(idx, { name: e.target.value })} sx={dialogFieldSx} />
            <TextField label="Sorumlu Taşeron" value={phase.responsible} onChange={(e) => updatePhase(idx, { responsible: e.target.value })} sx={dialogFieldSx} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <TextField
                type="number"
                label="Başl. Gün"
                value={phase.start}
                onChange={(e) => updatePhase(idx, { start: parseInt(e.target.value) || 1 })}
                slotProps={{ htmlInput: { min: 1, max: 31 } }}
                sx={dialogFieldSx}
              />
              <TextField
                type="number"
                label="Bitiş Gün"
                value={phase.end}
                onChange={(e) => updatePhase(idx, { end: parseInt(e.target.value) || 1 })}
                slotProps={{ htmlInput: { min: 1, max: 31 } }}
                sx={dialogFieldSx}
              />
              <TextField
                type="number"
                label="Manuel %"
                placeholder="Otomatik"
                value={phase.progressOverride !== undefined ? phase.progressOverride : ''}
                onChange={(e) =>
                  updatePhase(idx, {
                    progressOverride: e.target.value === '' ? undefined : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                  })
                }
                slotProps={{ htmlInput: { min: 0, max: 100 }, inputLabel: { shrink: true } }}
                sx={dialogFieldSx}
              />
            </Box>
          </Stack>
        ))}
      </AppDialog>
    </Box>
  );
}
