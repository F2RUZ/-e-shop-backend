import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface Props {
  labelKey: string;
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  /** Semantik token nomi: primary | success | warning | destructive | info | violet */
  tone?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'violet';
  loading?: boolean;
}

export function StatCard({ label, value, hint, icon, tone = 'primary', loading }: Props) {
  const color = `var(--${tone})`;

  return (
    <Paper variant="glass" sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 42,
            height: 42,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 'var(--radius-lg)',
            color,
            background: `color-mix(in oklab, ${color} 14%, transparent)`,
            border: `1px solid color-mix(in oklab, ${color} 24%, transparent)`,
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
            '& svg': { fontSize: 21 },
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap title={label}>
            {label}
          </Typography>

          {loading ? (
            <Skeleton variant="text" sx={{ width: '60%', height: 30 }} />
          ) : (
            <Typography
              className="tabular"
              sx={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.25, mt: 0.25 }}
              noWrap
              title={value}
            >
              {value}
            </Typography>
          )}

          {hint && !loading && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap title={hint}>
              {hint}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
