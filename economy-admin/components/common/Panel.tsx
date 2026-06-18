import type React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

export interface PanelProps {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const Panel = ({ title, icon, action, children }: PanelProps) => {
  return (
    <Paper className="source-panel" sx={{ p: 2.5, width: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
          <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box>
          <Typography variant="h6" noWrap>
            {title}
          </Typography>
        </Stack>
        {action}
      </Stack>
      {children}
    </Paper>
  );
};
