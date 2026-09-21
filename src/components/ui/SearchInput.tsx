import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Px cinsinden sabit genişlik; verilmezse kapsayıcıyı doldurur. */
  width?: number;
  /** Doluyken sağda "Temizle" düğmesi göster. */
  clearable?: boolean;
}

/** Arama kutusu — sol arama simgesi, isteğe bağlı "Temizle" düğmesi; yerel <input> yerine. */
export default function SearchInput({ value, onChange, placeholder, width, clearable }: SearchInputProps) {
  return (
    <InputBase
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputProps={{ 'aria-label': placeholder ?? 'Ara' }}
      startAdornment={<Search className="w-3.5 h-3.5" style={{ marginRight: 8, opacity: 0.6, flexShrink: 0 }} />}
      endAdornment={
        clearable && value ? (
          <Button size="small" onClick={() => onChange('')} sx={{ minWidth: 0, fontSize: 10, color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
            Temizle
          </Button>
        ) : undefined
      }
      sx={{
        width: width ?? '100%',
        px: 3,
        py: 0.5,
        fontSize: 12,
        fontWeight: 700,
        bgcolor: 'background.default',
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        '&.Mui-focused': { borderColor: 'primary.main' },
      }}
    />
  );
}
