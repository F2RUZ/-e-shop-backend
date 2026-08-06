import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  /** Raqam/ID/summa uchun — monospace + tabular-nums */
  mono?: boolean;
}

/** View modallaridagi «yorliq — qiymat» qatori. */
export function DetailRow({ label, value, mono }: Props) {
  return (
    <Stack
      direction="row"
      alignItems="baseline"
      spacing={2}
      sx={{
        py: 1,
        borderBottom: '1px solid color-mix(in oklab, var(--border) 45%, transparent)',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', flexShrink: 0, minWidth: 110 }}
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        className={mono ? 'tabular' : undefined}
        sx={{ flex: 1, minWidth: 0, textAlign: 'right', fontWeight: 500, wordBreak: 'break-word' }}
        component="div"
      >
        {value}
      </Typography>
    </Stack>
  );
}
