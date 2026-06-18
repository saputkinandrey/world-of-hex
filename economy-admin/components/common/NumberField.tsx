import { TextField } from '@mui/material';

export interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  onChange: (value: number) => void;
}

export const NumberField = ({ label, value, min, max, step = 1, integer = false, onChange }: NumberFieldProps) => {
  const handleChange = (rawValue: string) => {
    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) return;
    const normalizedValue = integer ? Math.round(parsedValue) : parsedValue;
    const minBoundedValue = typeof min === 'number' ? Math.max(min, normalizedValue) : normalizedValue;
    const boundedValue = typeof max === 'number' ? Math.min(max, minBoundedValue) : minBoundedValue;
    onChange(boundedValue);
  };

  return (
    <TextField
      label={label}
      type="number"
      size="small"
      value={value}
      inputProps={{ min, max, step }}
      onChange={(event) => handleChange(event.target.value)}
      fullWidth
    />
  );
};
