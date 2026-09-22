import type { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { headerSurface, moduleTones, toolbarTones, type ModuleTone, type ToolbarTone } from '../../theme/tokens';

/** Sticky üst çubuk — koyu marka rengi + alt çizgi; içerik (grid satırları) çağıran taraftan gelir. */
export function HeaderBar({ children }: { children: ReactNode }) {
  return (
    <AppBar
      component="header"
      position="sticky"
      elevation={0}
      color="default"
      sx={{
        top: 0,
        zIndex: 40,
        bgcolor: headerSurface.bar,
        backgroundImage: 'none',
        color: '#fff',
        borderBottom: 1,
        borderColor: headerSurface.border,
        flexDirection: 'column',
        transition: 'all 300ms',
      }}
    >
      {children}
    </AppBar>
  );
}

interface ModuleTabProps {
  tone: ModuleTone;
  active: boolean;
  label: string;
  title: string;
  icon: ReactNode;
  onClick: () => void;
  /** compact: daraltılmış üst çubuktaki hafif sekme. */
  compact?: boolean;
}

/** PLAN / İNŞAAT / İŞLETME pill sekmesi. */
export function ModuleTab({ tone, active, label, title, icon, onClick, compact }: ModuleTabProps) {
  const t = moduleTones[tone];
  const gradient = `linear-gradient(90deg, ${t.from}, ${t.to})`;
  const glow = `0 0 12px ${alpha(t.from, compact ? 0.4 : 0.35)}`;
  if (compact) {
    return (
      <Button
        onClick={onClick}
        title={title}
        startIcon={icon}
        sx={{
          px: 3,
          py: 1,
          minWidth: 0,
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 900,
          textTransform: 'uppercase',
          color: active ? '#fff' : 'grey.300',
          backgroundImage: active ? gradient : 'none',
          boxShadow: active ? glow : 'none',
          '&:hover': { color: '#fff', backgroundImage: active ? gradient : 'none', bgcolor: 'transparent' },
        }}
      >
        {label}
      </Button>
    );
  }
  return (
    <Button
      onClick={onClick}
      title={title}
      sx={{
        flexShrink: 0,
        height: { xs: 36, sm: 40 },
        px: { xs: 2.5, sm: 4 },
        gap: { xs: 1.5, sm: 2 },
        borderRadius: 999,
        fontSize: { xs: 10, sm: 11 },
        fontWeight: 900,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        border: active ? '2px solid' : '1px solid',
        borderColor: active ? t.ring : '#1e293b',
        color: '#fff',
        bgcolor: active ? 'transparent' : alpha(headerSurface.pill, 0.9),
        backgroundImage: active ? gradient : 'none',
        boxShadow: active ? glow : 'none',
        '&:hover': { borderColor: active ? t.ring : '#334155', bgcolor: active ? 'transparent' : alpha(headerSurface.pill, 0.9), backgroundImage: active ? gradient : 'none' },
      }}
    >
      <Box
        sx={{
          width: { xs: 22, sm: 24 },
          height: { xs: 22, sm: 24 },
          borderRadius: '50%',
          border: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          borderColor: active ? alpha(t.ring, 0.8) : '#334155',
          bgcolor: active ? alpha('#0f172a', 0.6) : '#1e293b',
          color: active ? t.ring : '#94a3b8',
        }}
      >
        {icon}
      </Box>
      <span>{label}</span>
      {active && <Box component="span" sx={{ color: t.text, display: 'flex' }}>›</Box>}
    </Button>
  );
}

interface SegmentTabProps {
  kind: 'kpis' | 'map';
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  compact?: boolean;
  id?: string;
}

/** "Dinamik KPI / Harita" segment düğmesi (alt satır ve daraltılmış üst çubuk). */
export function SegmentTab({ kind, active, label, icon, onClick, compact, id }: SegmentTabProps) {
  const accent = kind === 'kpis' ? '#f59e0b' : '#38bdf8';
  const accentText = kind === 'kpis' ? '#fbbf24' : '#38bdf8';
  return (
    <Button
      id={id}
      onClick={onClick}
      startIcon={icon}
      sx={{
        minWidth: 0,
        px: compact ? 2 : kind === 'map' ? 4 : 3,
        py: compact ? 0.5 : 1.5,
        borderRadius: compact ? 1 : 1.5,
        fontSize: 10,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontWeight: active ? 900 : compact ? 700 : 800,
        border: 1,
        borderColor: active ? alpha(accent, 0.3) : 'transparent',
        bgcolor: active ? alpha(accent, 0.15) : 'transparent',
        color: active ? accentText : '#94a3b8',
        '&:hover': { color: active ? accentText : '#fff', bgcolor: active ? alpha(accent, 0.15) : alpha('#1e293b', 0.5) },
      }}
    >
      {label}
    </Button>
  );
}

/** Segment düğmelerini saran koyu grup kutusu. */
export function SegmentGroup({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1 : 1.5,
        p: compact ? 0.5 : 1,
        bgcolor: alpha(headerSurface.group, 0.95),
        border: 1,
        borderColor: alpha(headerSurface.groupBorder, compact ? 0.6 : 1),
        borderRadius: compact ? 2 : 3,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

interface ToolbarIconButtonProps {
  tone: ToolbarTone;
  active: boolean;
  title: string;
  id: string;
  icon: ReactNode;
  onClick: () => void;
}

/** Alt satırdaki renkli araç düğmeleri (Dashboard / Timeline / İş Gücü / Doküman). */
export function ToolbarIconButton({ tone, active, title, id, icon, onClick }: ToolbarIconButtonProps) {
  const t = toolbarTones[tone];
  return (
    <IconButton
      id={id}
      title={title}
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 3,
        border: 1,
        color: t.fg,
        borderColor: active ? t.accent : alpha(t.accent, 0.5),
        bgcolor: active ? 'transparent' : t.bg,
        backgroundImage: active ? `linear-gradient(90deg, ${alpha(t.from, 0.3)}, ${alpha(t.to, 0.3)})` : 'none',
        boxShadow: active ? `0 0 0 2px ${alpha(t.accent, 0.3)}, 0 0 12px ${alpha(t.accent, 0.35)}` : `0 1px 3px ${alpha('#000', 0.3)}`,
        '&:hover': { bgcolor: alpha(t.from, 0.2), borderColor: t.fg, color: t.fgHover, boxShadow: `0 0 12px ${alpha(t.accent, 0.45)}` },
      }}
    >
      {icon}
    </IconButton>
  );
}

interface AccentIconButtonProps {
  kind: 'gold' | 'orange';
  title: string;
  onClick: () => void;
  icon: ReactNode;
  id?: string;
  compact?: boolean;
}

/** Altın (modüller) / turuncu (daralt-genişlet) vurgu düğmesi. */
export function AccentIconButton({ kind, title, onClick, icon, id, compact }: AccentIconButtonProps) {
  const t = headerSurface[kind];
  return (
    <IconButton
      id={id}
      title={title}
      onClick={onClick}
      sx={{
        p: compact ? 1.5 : 2.5,
        borderRadius: compact ? 2 : 3,
        border: 1,
        borderColor: alpha(t.fg, kind === 'gold' ? (compact ? 0.15 : 0.2) : 0.3),
        bgcolor: t.bg,
        color: t.fg,
        '&:hover': { bgcolor: t.bgHover },
      }}
    >
      {icon}
    </IconButton>
  );
}

/** Arama düğmesi (şeffaf, sky vurgulu). */
export function SearchIconButton({ onClick, id, compact, icon }: { onClick: () => void; id: string; compact?: boolean; icon: ReactNode }) {
  return (
    <IconButton
      id={id}
      title="Genel Arama & Komut Paleti (Ctrl + K veya /)"
      onClick={onClick}
      sx={{ p: compact ? 1.5 : 2, borderRadius: compact ? 2 : 3, color: '#38bdf8', '&:hover': { color: '#7dd3fc', bgcolor: alpha('#0ea5e9', 0.1) } }}
    >
      {icon}
    </IconButton>
  );
}

export interface ProfileMenuItem {
  key: string;
  icon: ReactNode;
  primary: ReactNode;
  secondary?: string;
  selected?: boolean;
  onClick: () => void;
}

interface ProfileMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  name: string;
  role: string;
  items: ProfileMenuItem[];
  compact?: boolean;
}

/** Kullanıcı menüsü (Admin / Yardım / Tema / Bildirimler) — MUI Menu. */
export function ProfileMenu({ anchorEl, open, onClose, name, role, items, compact }: ProfileMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 2,
            width: compact ? 224 : 256,
            bgcolor: '#141416',
            backgroundImage: 'none',
            border: 1,
            borderColor: '#2c2c2e',
            borderRadius: compact ? 3 : 4,
            p: compact ? 2.5 : 3,
            color: 'grey.200',
          },
        },
        list: { sx: { p: 0 } },
      }}
    >
      <Box sx={{ px: 1, py: compact ? 1 : 1.5, mb: 2, borderBottom: 1, borderColor: alpha('#2c2c2e', 0.6) }}>
        <Typography sx={{ fontSize: compact ? 11 : 12, fontWeight: 900, color: '#fff' }}>{name}</Typography>
        <Typography sx={{ fontSize: 10, fontWeight: 700, mt: 0.5, color: alpha('#f59e0b', 0.8) }}>{role}</Typography>
      </Box>
      {items.map((it) => (
        <MenuItem
          key={it.key}
          onClick={it.onClick}
          selected={it.selected}
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: 'transparent',
            px: compact ? 2 : 2.5,
            py: compact ? 1.5 : 2,
            gap: 2.5,
            color: 'grey.300',
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
            '&.Mui-selected, &.Mui-selected:hover': { bgcolor: alpha('#0ea5e9', 0.1), color: '#38bdf8', borderColor: alpha('#0ea5e9', 0.2) },
            '&:hover': { bgcolor: alpha('#1e293b', 0.6) },
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: 'inherit' }}>{it.icon}</ListItemIcon>
          <ListItemText
            primary={it.primary}
            secondary={compact ? undefined : it.secondary}
            slotProps={{
              primary: { sx: { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.025em' } },
              secondary: { sx: { fontSize: 10, color: '#64748b', fontWeight: 500, textTransform: 'lowercase', letterSpacing: 'normal' } },
            }}
          />
        </MenuItem>
      ))}
    </Menu>
  );
}

interface ProfileButtonProps {
  onClick: (el: HTMLElement) => void;
  unread: number;
  compact?: boolean;
}

/** AY / SpU profil hapı + okunmamış bildirim rozeti. */
export function ProfileButton({ onClick, unread, compact }: ProfileButtonProps) {
  const avatar = (
    <Box
      component="span"
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 900,
        color: '#fff',
        backgroundImage: 'linear-gradient(135deg, #a855f7, #4f46e5)',
      }}
    >
      AY
    </Box>
  );
  return (
    <Badge
      badgeContent={unread}
      invisible={unread === 0}
      color="error"
      sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 900, minWidth: compact ? 12 : 18, height: compact ? 12 : 18, p: 0, border: 2, borderColor: '#1c1c1e', pointerEvents: 'none' } }}
    >
      {compact ? (
        <IconButton title="Kullanıcı Menüsü" onClick={(e) => onClick(e.currentTarget)} sx={{ p: 0 }}>
          {avatar}
        </IconButton>
      ) : (
        <Button
          title="Kullanıcı Menüsü"
          onClick={(e) => onClick(e.currentTarget)}
          sx={{ minWidth: 0, gap: 1.5, p: 1, pr: 2.5, borderRadius: 999, border: 1, borderColor: alpha('#334155', 0.4), bgcolor: '#1a1a1c', fontSize: 10, fontWeight: 800, '&:hover': { bgcolor: '#252528' } }}
        >
          {avatar}
          <Box component="span" sx={{ color: '#f59e0b', fontSize: 10 }}>SpU</Box>
        </Button>
      )}
    </Badge>
  );
}
