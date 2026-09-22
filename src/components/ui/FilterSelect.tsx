import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Verilirse alan etiketi (TextField label); verilmezse yalnızca aria-label. */
  label?: string;
  fullWidth?: boolean;
  minWidth?: number;
}

/** Filtre / seçim açılırı — MUI TextField select (size small); yerel <select> yerine. */
export default function FilterSelect({ value, onChange, options, label, fullWidth, minWidth = 120 }: FilterSelectProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth={fullWidth}
      slotProps={{ select: { SelectDisplayProps: { 'aria-label': label ?? 'Filtre' } } }}
      sx={{ minWidth: fullWidth ? undefined : minWidth, '& .MuiInputBase-input': { fontSize: 12, fontWeight: 700 } }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12 }}>{o.label}</MenuItem>
      ))}
    </TextField>
  );
}
