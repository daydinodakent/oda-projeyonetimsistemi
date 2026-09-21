import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ChevronDown, Globe, Pencil, Plus } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectPickerProps {
  projects: Project[];
  selectedProjectId: string;
  compact?: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (project: Project) => void;
}

const fmt = (name: string) => name.replace(/-/g, ' ').toUpperCase();

/** "CBS Sahaları ve Projeler" seçici — MUI ButtonBase + Popover. */
export default function ProjectPicker({ projects, selectedProjectId, compact, onSelect, onAdd, onEdit }: ProjectPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const active = projects.find((p) => p.id === selectedProjectId);

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        title="CBS Sahaları ve Projeler"
        sx={{
          position: 'relative',
          justifyContent: 'space-between',
          gap: 2,
          bgcolor: '#111112',
          border: 1,
          borderColor: '#2d2d30',
          borderRadius: compact ? 2 : 3,
          color: '#dfdfe2',
          userSelect: 'none',
          pl: compact ? 7 : 8,
          pr: compact ? 8 : 10,
          py: 1.5,
          maxWidth: compact ? 286 : 442,
          minWidth: compact ? 0 : 210,
          fontSize: compact ? 10 : 11,
          fontWeight: compact ? 800 : 900,
          letterSpacing: compact ? 0 : '0.025em',
          textTransform: compact ? 'none' : 'uppercase',
          '&:hover': { bgcolor: '#202022' },
        }}
      >
        <Box sx={{ position: 'absolute', insetBlock: 0, left: 10, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#38bdf8' }}>
          <Globe className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </Box>
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1, color: '#f1c40f', fontWeight: 900 }}>
          {active ? fmt(active.name) : 'PROJE SEÇİN'}
        </Box>
        <Box sx={{ position: 'absolute', insetBlock: 0, right: 10, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#64748b' }}>
          <ChevronDown className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </Box>
      </ButtonBase>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 2,
              width: 420,
              maxWidth: '95vw',
              p: 4.5,
              bgcolor: alpha('#0c101c', 0.95),
              backgroundImage: 'none',
              backdropFilter: 'blur(12px)',
              border: 1,
              borderColor: '#1e293b',
              borderRadius: 4,
              color: 'grey.200',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2.5, mb: 3, borderBottom: 1, borderColor: alpha('#1e293b', 0.7) }}>
          <Typography sx={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>
            CBS SAHALARI VE PROJELER
          </Typography>
          <Button
            size="small"
            color="warning"
            title="Yeni Proje Ekle (Süper Yetkili)"
            startIcon={<Plus className="w-3 h-3" />}
            onClick={() => {
              close();
              onAdd();
            }}
            sx={{ fontSize: 10, fontWeight: 900, py: 1, px: 2.5, minWidth: 0, borderRadius: 2, border: 1, borderColor: alpha('#f59e0b', 0.3), bgcolor: alpha('#f59e0b', 0.1), '&:hover': { bgcolor: alpha('#f59e0b', 0.2) } }}
          >
            + Ekle
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {projects.map((proj) => {
            const isActive = proj.id === selectedProjectId;
            return (
              <Box
                key={proj.id}
                onClick={() => {
                  onSelect(proj.id);
                  close();
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 3,
                  p: 2.5,
                  cursor: 'pointer',
                  borderRadius: 3,
                  border: 1,
                  borderColor: isActive ? alpha('#3b82f6', 0.4) : 'transparent',
                  bgcolor: isActive ? alpha('#13192a', 0.95) : alpha('#111422', 0.5),
                  '&:hover': { bgcolor: isActive ? alpha('#13192a', 0.95) : alpha('#181d32', 0.8) },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {isActive && <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.025em', color: isActive ? '#fff' : 'grey.300' }}>
                      {fmt(proj.name)}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, lineHeight: 1, pl: 3.5, mt: 0.5, color: '#94a3b8' }}>
                    {proj.location || 'Genel'} • Tamamlanma: %{proj.overallProgress || 0}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  title={`${proj.name} Bilgilerini Düzenle`}
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                    onEdit(proj);
                  }}
                  sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: '#1e293b', bgcolor: alpha('#0e121e', 0.8), color: '#94a3b8', '&:hover': { color: '#fbbf24', borderColor: alpha('#f59e0b', 0.3), bgcolor: alpha('#1e293b', 0.8) } }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}
