import { Box, Paper, Typography } from '@mui/material';
import { formatNumber, percentFactor } from '../../lib/economy-admin-utils';

export interface MetricProps {
  label: string;
  value: string;
  ratio?: number;
}

export const Metric = ({ label, value, ratio }: MetricProps) => {
  return (
    <Paper className="source-panel" sx={{ p: 2, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5, color: 'primary.main' }}>
        {value}
      </Typography>
      {typeof ratio === 'number' ? (
        <Box sx={{ mt: 1 }}>
          <Box className="metric-bar">
            <span style={{ width: `${Math.max(0, Math.min(ratio, 1)) * percentFactor}%` }} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatNumber(ratio * percentFactor, 0)}%
          </Typography>
        </Box>
      ) : null}
    </Paper>
  );
};
