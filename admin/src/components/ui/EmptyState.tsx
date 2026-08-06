import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  titleKey?: string;
  descriptionKey?: string;
  icon?: ReactNode;
  action?: { labelKey: string; onClick: () => void; icon?: ReactNode };
}

/** Bo'sh ro'yxat (TZ §7.5) — hech qachon shunchaki bo'sh joy qoldirilmaydi. */
export function EmptyState({ titleKey = 'empty.title', descriptionKey, icon, action }: Props) {
  const { t } = useTranslation();

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{
        py: 6,
        px: 3,
        textAlign: 'center',
        border: '1px dashed color-mix(in oklab, var(--border) 80%, transparent)',
        borderRadius: 'var(--radius-xl)',
        background: 'color-mix(in oklab, var(--muted) 30%, transparent)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 52,
          height: 52,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--muted-foreground)',
          background: 'color-mix(in oklab, var(--muted-foreground) 12%, transparent)',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
        }}
      >
        {icon ?? <InboxRoundedIcon />}
      </Box>

      <Typography variant="subtitle1" sx={{ color: 'text.primary' }}>
        {t(titleKey)}
      </Typography>

      {descriptionKey && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 380 }}>
          {t(descriptionKey)}
        </Typography>
      )}

      {action && (
        <Button variant="soft" startIcon={action.icon} onClick={action.onClick} sx={{ mt: 0.5 }}>
          {t(action.labelKey)}
        </Button>
      )}
    </Stack>
  );
}
