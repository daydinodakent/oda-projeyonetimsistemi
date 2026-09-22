import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ChevronDown, ChevronRight, Box as BoxIcon, Radio, Building2, Pencil } from 'lucide-react';
import { Project, Asset } from '../types';
import AppDialog from './chrome/AppDialog';
import FeedbackToast from './ui/FeedbackToast';

interface IsletmeLeftPanelProps {
  project: Project;
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
}

interface TreeItem {
  id: string;
  name: string;
  type: 'building' | 'floor' | 'space';
  children?: TreeItem[];
  blockId?: string;
}

type Category = 'all' | 'HVAC' | 'Elektronik' | 'Mekanik';

const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'all', name: 'Tümü' },
  { id: 'HVAC', name: 'HVAC' },
  { id: 'Elektronik', name: 'Elek' },
  { id: 'Mekanik', name: 'Mek' },
];

const INITIAL_HIERARCHY: TreeItem[] = [
  {
    id: 'block-a',
    name: 'Kule-A (Konut & Ofis)',
    type: 'building',
    blockId: 'block-a',
    children: [
      {
        id: 'block-a-floor-basement',
        name: 'Bodrum Kat (Mekanik Daire)',
        type: 'floor',
        children: [
          { id: 'space-chiller-room', name: 'Chiller & Hidrofor Odası', type: 'space' },
          { id: 'space-electric-room', name: 'Ana Elektrik Kumanda Panosu', type: 'space' }
        ]
      },
      {
        id: 'block-a-floor-ground',
        name: 'Zemin Kat (Lobi)',
        type: 'floor',
        children: [
          { id: 'space-lobby', name: 'Ana Giriş Resepsiyon', type: 'space' }
        ]
      }
    ]
  },
  {
    id: 'block-b',
    name: 'Blok-B (AVM & Sosyal Hub)',
    type: 'building',
    blockId: 'block-b',
    children: [
      {
        id: 'block-b-floor-roof',
        name: 'Çatı Katı (HVAC İstasyonu)',
        type: 'floor',
        children: [
          { id: 'space-cooling-tower', name: 'Soğutma Kuleleri Bölgesi', type: 'space' }
        ]
      }
    ]
  }
];

const dialogFieldSx = { '& .MuiInputBase-input': { fontSize: 12 } };

export default function IsletmeLeftPanel({ assets, selectedAssetId, onSelectAsset }: IsletmeLeftPanelProps) {
  // Collapsed sections tree state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'block-a': true,
    'block-a-floor-basement': true,
    'block-b': true,
  });

  // Active Category filter for Assets
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Building Space/Floor hierarchy structure mapped from the project
  const [hierarchy, setHierarchy] = useState<TreeItem[]>(INITIAL_HIERARCHY);

  const [isEditingHierarchy, setIsEditingHierarchy] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to check what assets reside in a selected space or block
  const getSpaceAssets = (spaceId: string) => {
    return assets.filter(asset => {
      // Filter by custom category
      if (activeCategory !== 'all') {
        if (activeCategory === 'HVAC' && !asset.name.includes('VRV') && !asset.name.includes('Klima') && !asset.name.includes('Soğutma') && !asset.name.includes('Kule')) return false;
        if (activeCategory === 'Elektronik' && !asset.name.includes('Asansör') && !asset.name.includes('Sensör') && !asset.name.includes('Elektrik')) return false;
        if (activeCategory === 'Mekanik' && !asset.name.includes('Pompa') && !asset.name.includes('Kompresör') && !asset.name.includes('Hidrofor')) return false;
      }

      // Map space assets
      if (spaceId === 'space-chiller-room') {
        return asset.name.includes('Kompresör') || asset.name.includes('Hidrofor') || asset.name.includes('Pompa');
      }
      if (spaceId === 'space-electric-room') {
        return asset.name.includes('Enerji') || asset.name.includes('Elektrik') || asset.name.includes('Asansör');
      }
      if (spaceId === 'space-lobby') {
        return asset.name.includes('Sensör') || asset.name.includes('Giriş');
      }
      if (spaceId === 'space-cooling-tower') {
        return asset.name.includes('VRV') || asset.name.includes('Fan') || asset.name.includes('Kule');
      }
      return false;
    });
  };

  const renderTree = (nodes: TreeItem[]) => {
    return nodes.map((node) => {
      const isExpanded = !!expandedNodes[node.id];
      const hasChildren = !!node.children && node.children.length > 0;
      const spaceAssets = node.type === 'space' ? getSpaceAssets(node.id) : [];

      return (
        <Stack key={node.id} spacing={1} sx={{ userSelect: 'none', textAlign: 'left' }}>
          {/* Node Row */}
          <Stack
            direction="row"
            spacing={1}
            onClick={() => hasChildren && toggleNode(node.id)}
            sx={{
              alignItems: 'center',
              py: 1,
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: 12,
              pl: node.type === 'building' ? 0 : node.type === 'floor' ? 2 : 4,
              fontWeight: node.type === 'building' ? 900 : node.type === 'floor' ? 700 : 500,
              color: node.type === 'building' ? 'text.primary' : node.type === 'floor' ? 'text.secondary' : 'text.disabled',
              '&:hover': { bgcolor: node.type === 'space' ? 'transparent' : 'background.default', color: node.type === 'space' ? 'text.primary' : undefined },
            }}
          >
            {hasChildren ? (
              <Box component="span" sx={{ display: 'flex', color: 'text.disabled' }}>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </Box>
            ) : (
              <Box component="span" sx={{ display: 'inline-block', width: 14, height: 14 }} />
            )}

            {node.type === 'building' && <Box component="span" sx={{ display: 'flex', color: 'info.main' }}><Building2 className="w-3.5 h-3.5" /></Box>}

            <span>{node.name}</span>
          </Stack>

          {/* Children block */}
          {hasChildren && isExpanded && (
            <Stack spacing={1} sx={{ pl: 3, ml: 3.5, borderLeft: 1, borderColor: 'divider' }}>
              {renderTree(node.children!)}
            </Stack>
          )}

          {/* If space has assets, list assets dynamically */}
          {node.type === 'space' && spaceAssets.length > 0 && (
            <Stack spacing={1} sx={{ pl: 6, ml: 3, pt: 1, borderLeft: 1, borderStyle: 'dashed', borderColor: 'divider' }}>
              {spaceAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                const isFaulty = asset.status === 'Arızalı';
                const dotColor = isFaulty ? 'error.main' : asset.status === 'Bakım Bekliyor' ? 'warning.main' : 'success.main';

                return (
                  <ButtonBase
                    key={asset.id}
                    onClick={() => onSelectAsset(asset.id)}
                    sx={(theme) => ({
                      width: '100%',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      px: 2,
                      py: 1.5,
                      borderRadius: 2,
                      border: 1,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      color: isSelected ? 'info.light' : 'text.secondary',
                      bgcolor: isSelected ? alpha(theme.palette.info.main, 0.1) : 'transparent',
                      borderColor: isSelected ? alpha(theme.palette.info.main, 0.3) : 'transparent',
                      '&:hover': { bgcolor: isSelected ? undefined : 'background.default', color: isSelected ? undefined : 'text.primary' },
                    })}
                  >
                    <Stack direction="row" spacing={1.5} component="span" sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Box component="span" sx={{ display: 'flex', color: isFaulty ? 'error.main' : 'info.main' }}><BoxIcon className="w-3 h-3" /></Box>
                      <Typography component="span" noWrap sx={{ fontSize: 10, fontWeight: 700 }}>{asset.name}</Typography>
                    </Stack>
                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, bgcolor: dotColor }} />
                  </ButtonBase>
                );
              })}
            </Stack>
          )}
        </Stack>
      );
    });
  };

  const updateBuilding = (bIdx: number, name: string) => {
    const updated = [...hierarchy];
    updated[bIdx] = { ...updated[bIdx], name };
    setHierarchy(updated);
  };

  const updateFloor = (bIdx: number, fIdx: number, name: string) => {
    const updated = [...hierarchy];
    const bChildren = [...(updated[bIdx].children || [])];
    bChildren[fIdx] = { ...bChildren[fIdx], name };
    updated[bIdx] = { ...updated[bIdx], children: bChildren };
    setHierarchy(updated);
  };

  return (
    <Stack spacing={3} sx={{ position: 'relative' }}>
      {/* SYSTEM CATEGORY FILTERS */}
      <Stack direction="row" sx={{ pt: 1, alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', textAlign: 'left' }}>
        <Typography component="span" sx={{ width: '100%', mb: 1, fontSize: 10, fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'text.disabled' }}>
          Sistem Filtreleme
        </Typography>
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <ButtonBase
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              sx={{
                px: 2.5,
                py: 1,
                border: 1,
                fontSize: 10,
                fontWeight: 900,
                fontFamily: 'inherit',
                color: active ? 'info.contrastText' : 'text.secondary',
                bgcolor: active ? 'info.main' : 'background.default',
                borderColor: active ? 'transparent' : 'divider',
                '&:hover': { color: active ? undefined : 'text.primary' },
              }}
            >
              {cat.name}
            </ButtonBase>
          );
        })}
      </Stack>

      {/* SPACE HIERARCHY TREE */}
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1, pb: 1, pr: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box component="span" sx={{ display: 'flex', color: 'info.main' }}><Radio className="w-4 h-4" /></Box>
            <Typography component="span" sx={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Kat / Mekan Hiyerarşisi
            </Typography>
          </Stack>
          <IconButton size="small" title="Hiyerarşiyi Düzenle (SpU)" onClick={() => setIsEditingHierarchy(true)} sx={{ p: 1, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
            <Pencil className="w-3.5 h-3.5" />
          </IconButton>
        </Stack>

        <Stack spacing={1.5} sx={{ maxHeight: 300, overflowY: 'auto', pr: 1, scrollbarWidth: 'none' }}>
          {renderTree(hierarchy)}
        </Stack>
      </Stack>

      <FeedbackToast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Hierarchy Edit Modal (Süper Kullanıcı) */}
      <AppDialog
        open={isEditingHierarchy}
        onClose={() => setIsEditingHierarchy(false)}
        badge="Süper Yetkili"
        title="Hiyerarşi Düzenleme"
        tone="primary"
        submitLabel="Kaydet ve Kapat"
        onSubmit={() => {
          setIsEditingHierarchy(false);
          setToastMessage('💾 Bina ve kat hiyerarşi etiketleri güncellendi.');
        }}
      >
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Süper kullanıcı yetkisiyle kat ve bina hiyerarşi etiketlerini düzenleyebilirsiniz.
        </Typography>
        {hierarchy.map((building, bIdx) => (
          <Stack key={building.id} spacing={2} sx={{ p: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 3 }}>
            <TextField label="Bina / Blok Adı" value={building.name} onChange={(e) => updateBuilding(bIdx, e.target.value)} sx={dialogFieldSx} />
            {building.children?.map((floor, fIdx) => (
              <Box key={floor.id} sx={(theme) => ({ pl: 3, borderLeft: 1, borderColor: alpha(theme.palette.info.main, 0.3) })}>
                <TextField label="Kat Adı" value={floor.name} onChange={(e) => updateFloor(bIdx, fIdx, e.target.value)} sx={dialogFieldSx} />
              </Box>
            ))}
          </Stack>
        ))}
      </AppDialog>
    </Stack>
  );
}
