import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  kickerKey: string;
  titleKey: string;
  descriptionKey?: string;
  icon: ReactNode;
  actions?: ReactNode;
}

/** Har sahifa shundan boshlanadi (TZ §7.1). */
export function PageHeader({ kickerKey, titleKey, descriptionKey, icon, actions }: Props) {
  const { t } = useTranslation();

  return (
    <Paper variant="glass" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
      >
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 52,
            height: 52,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 'var(--radius-xl)',
            color: 'var(--primary)',
            background:
              'linear-gradient(160deg, color-mix(in oklab, var(--primary) 25%, transparent), transparent)',
            border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
            '& svg': { fontSize: 26 },
          }}
        >
          {icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '.18em',
              color: 'color-mix(in oklab, var(--muted-foreground) 80%, transparent)',
            }}
          >
            // {t(kickerKey)}
          </Typography>

          <Typography
            variant="h1"
            sx={{
              mt: 0.25,
              backgroundImage:
                'linear-gradient(100deg, var(--foreground), color-mix(in oklab, var(--primary) 70%, var(--foreground)))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t(titleKey)}
          </Typography>

          {descriptionKey && (
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {t(descriptionKey)}
            </Typography>
          )}
        </Box>

        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
