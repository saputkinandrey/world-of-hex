import { TextField } from '@mui/material';

export interface TextFieldEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const TextFieldEditor = ({ label, value, onChange }: TextFieldEditorProps) => {
  return <TextField label={label} size="small" value={value} onChange={(event) => onChange(event.target.value)} fullWidth />;
};
