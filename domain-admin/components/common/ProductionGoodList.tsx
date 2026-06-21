import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, Stack } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import type { ProductionGoodQuantity, DomainAdminConfig } from '@wohex/domain-data/economy';
import { getGoodLevelName } from '../../lib/domain-admin-utils';
import { NumberField } from './NumberField';

export interface ProductionGoodListProps {
  label: string;
  config: DomainAdminConfig;
  entries: ProductionGoodQuantity[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<ProductionGoodQuantity>) => void;
  onDelete: (index: number) => void;
}

export const ProductionGoodList = ({ label, config, entries, onAdd, onUpdate, onDelete }: ProductionGoodListProps) => {
  return (
    <Stack spacing={1}>
      {entries.map((entry, index) => (
        <Stack
          key={entry.id}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ minWidth: 0 }}
        >
          <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
            <InputLabel>{label}</InputLabel>
            <Select label={label} value={entry.goodId} onChange={(event) => onUpdate(index, { goodId: event.target.value })}>
              {config.goods.map((good) => (
                <MenuItem key={good.id} value={good.id}>
                  {good.name} - {getGoodLevelName(config, good.level)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ width: 100, flexShrink: 0 }}>
            <NumberField label="Qty" value={entry.quantity} min={0} integer onChange={(quantity) => onUpdate(index, { quantity })} />
          </Box>
          <IconButton
            color="error"
            size="small"
            disabled={entries.length <= 1}
            onClick={() => onDelete(index)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
          >
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Button size="small" startIcon={<AddRoundedIcon />} onClick={onAdd}>
        Add {label.toLowerCase()}
      </Button>
    </Stack>
  );
};
