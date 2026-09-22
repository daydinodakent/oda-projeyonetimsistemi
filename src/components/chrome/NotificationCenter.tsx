import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AlertTriangle, ArrowUpRight, Bell, Check, Clock, FileText, Layers, Trash, X } from 'lucide-react';
import type { Notification } from '../../types';

export type NotifFilter = 'all' | 'unread' | 'files' | 'ncr';

interface NotificationCenterProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  notifications: Notification[];
  filter: NotifFilter;
  setFilter: (f: NotifFilter) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const BADGE_TONE: Record<string, string> = { danger: '#f87171', warning: '#fbbf24' };
const BLUE = '#0091ff';

const matches = (n: Notification, f: NotifFilter) =>
  f === 'all' || (f === 'unread' && !n.read) || (f === 'files' && n.category === 'Dosyalar') || (f === 'ncr' && n.category === 'Saha NCR');

/** Bildirim Merkezi — MUI Popover + Chip filtreleri + kart listesi. */
export default function NotificationCenter(p: NotificationCenterProps) {
  const unread = p.notifications.filter((n) => !n.read).length;
  const list = p.notifications.filter((n) => matches(n, p.filter));
  const usable = p.anchorEl && p.anchorEl.isConnected ? p.anchorEl : null;

  const filterChip = (key: NotifFilter, label: string, icon?: React.ReactElement, badge?: number) => (
    <Chip
      key={key}
      onClick={() => p.setFilter(key)}
      icon={icon}
      label={
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span>{label}</span>
          {!!badge && (
            <Box component="span" sx={{ bgcolor: 'error.main', color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {badge}
            </Box>
          )}
        </Box>
      }
      sx={{
        flexShrink: 0,
        fontSize: 10,
        fontWeight: 900,
        height: 28,
        px: 1,
        border: 1,
        borderColor: p.filter === key ? BLUE : '#20293a',
        bgcolor: p.filter === key ? BLUE : '#131926',
        color: p.filter === key ? '#fff' : 'grey.300',
        '&:hover': { bgcolor: p.filter === key ? BLUE : '#1c2438' },
      }}
    />
  );

  return (
    <Popover
      open={p.open}
      onClose={p.onClose}
      {...(usable
        ? { anchorEl: usable, anchorOrigin: { vertical: 'bottom', horizontal: 'right' }, transformOrigin: { vertical: 'top', horizontal: 'right' } }
        : { anchorReference: 'anchorPosition' as const, anchorPosition: { top: 56, left: typeof window === 'undefined' ? 0 : window.innerWidth - 16 }, transformOrigin: { vertical: 'top', horizontal: 'right' } })}
      slotProps={{
        paper: {
          sx: {
            mt: 2,
            width: 490,
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 3, mb: 4, borderBottom: 1, borderColor: alpha('#1e293b', 0.7) }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: alpha(BLUE, 0.15), border: 1, borderColor: alpha(BLUE, 0.2), color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell className="w-[18px] h-[18px]" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>Bildirim Merkezi</Typography>
              {unread > 0 && (
                <Chip label={`${unread} Yeni`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 900, color: '#f87171', bgcolor: alpha('#7f1d1d', 0.85), border: 1, borderColor: alpha('#ef4444', 0.25) }} />
              )}
            </Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, mt: 0.5, color: '#94a3b8' }}>Dosya Yöneticisi & Saha Uygunsuzlukları (NCR)</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" title="Hepsini Okundu Yap" onClick={p.onMarkAllRead} sx={{ color: '#94a3b8', '&:hover': { color: '#34d399', bgcolor: '#1a2333' } }}>
            <Check className="w-4 h-4" />
          </IconButton>
          <IconButton size="small" title="Tümünü Sil" onClick={p.onClearAll} sx={{ color: '#94a3b8', '&:hover': { color: '#f87171', bgcolor: '#1a2333' } }}>
            <Trash className="w-4 h-4" />
          </IconButton>
          <IconButton size="small" title="Kapat" onClick={p.onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: '#1a2333' } }}>
            <X className="w-4 h-4" />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, mb: 4, scrollbarWidth: 'none' }}>
        {filterChip('all', `Tümü (${p.notifications.length})`)}
        {filterChip('unread', 'Okunmamış', undefined, unread)}
        {filterChip('files', `Dosyalar (${p.notifications.filter((n) => n.category === 'Dosyalar').length})`, <FileText className="w-3.5 h-3.5 text-sky-400" />)}
        {filterChip('ncr', `Saha NCR (${p.notifications.filter((n) => n.category === 'Saha NCR').length})`, <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />)}
      </Box>

      {/* List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 380, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {list.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 8, fontSize: 12, fontWeight: 700, color: '#64748b' }}>Filtreye uygun bildirim bulunmamaktadır.</Typography>
        ) : (
          list.map((n) => {
            const isNcr = n.category === 'Saha NCR';
            const tone = BADGE_TONE[n.badgeType ?? ''] ?? '#60a5fa';
            return (
              <Box
                key={n.id}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  gap: 3,
                  p: 3.5,
                  borderRadius: 3,
                  bgcolor: alpha('#131722', 0.9),
                  border: 1,
                  borderColor: alpha('#222c3f', 0.8),
                  boxShadow: n.read ? 'none' : `0 0 0 1px ${alpha(BLUE, 0.2)}`,
                  '&:hover': { borderColor: alpha('#3b82f6', 0.4) },
                }}
              >
                <Box sx={{ position: 'absolute', top: 16, bottom: 16, left: 0, width: 4, bgcolor: '#3b82f6', borderRadius: '0 4px 4px 0' }} />
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 1,
                    color: isNcr ? '#f87171' : '#38bdf8',
                    bgcolor: alpha(isNcr ? '#ef4444' : '#0ea5e9', 0.1),
                    borderColor: alpha(isNcr ? '#ef4444' : '#0ea5e9', 0.2),
                  }}
                >
                  {isNcr ? <AlertTriangle className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8' }}>{n.path || 'SİSTEM / UYARI'}</Typography>
                    <Box component="span" sx={{ px: 1.5, py: 0.5, borderRadius: 1, fontSize: 10, fontWeight: 900, border: 1, color: tone, bgcolor: alpha(tone, 0.15), borderColor: alpha(tone, 0.3) }}>
                      {n.badge || 'UYARI'}
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25, color: '#fff' }}>{n.title || n.message}</Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 600, lineHeight: 1.6, color: 'grey.300' }}>{n.message}</Typography>
                  {!!n.tags?.length && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                      {n.tags.map((tag, i) => (
                        <Box key={i} component="span" sx={{ bgcolor: '#1a2333', border: 1, borderColor: '#2b3a54', color: '#94a3b8', fontSize: 10, px: 2, py: 0.5, borderRadius: 1, fontWeight: 900 }}>
                          {tag}
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Box sx={{ borderTop: 1, borderColor: alpha('#222c3f', 0.4), my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{n.date}</span>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {n.actionText && (
                        <Link
                          href={n.actionLink || '#'}
                          underline="none"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 10, fontWeight: 700, color: '#38bdf8', bgcolor: alpha('#0ea5e9', 0.1), border: 1, borderColor: alpha('#0ea5e9', 0.2), px: 2, py: 0.5, borderRadius: 1, '&:hover': { bgcolor: alpha('#0ea5e9', 0.2) } }}
                        >
                          <span>{n.actionText}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                      {!n.read && (
                        <IconButton size="small" title="Okundu İşaretle" onClick={() => p.onMarkRead(n.id)} sx={{ p: 1, color: '#94a3b8', '&:hover': { color: '#34d399', bgcolor: '#1c2438' } }}>
                          <Check className="w-4 h-4" />
                        </IconButton>
                      )}
                      <IconButton size="small" title="Sil" onClick={() => p.onDelete(n.id)} sx={{ p: 1, color: '#94a3b8', '&:hover': { color: '#f87171', bgcolor: '#1c2438' } }}>
                        <Trash className="w-4 h-4" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Popover>
  );
}
