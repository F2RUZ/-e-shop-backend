import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useTranslation } from 'react-i18next';

/**
 * Jadvalning uch majburiy holati (TZ §7A.3):
 * yuklanmoqda (skeleton) · bo'sh (EmptyState) · xato (qayta urinish bilan).
 */

/** Spinner emas — kontent SHAKLI ko'rsatiladi (TZ §7.7). */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Box sx={{ py: 1 }}>
      {Array.from({ length: rows }).map((_, r) => (
        <Stack
          key={r}
          direction="row"
          alignItems="center"
          spacing={2}
          sx={{
            height: 56,
            px: 1.5,
            borderBottom: '1px solid color-mix(in oklab, var(--border) 40%, transparent)',
          }}
        >
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton
              key={c}
              variant="text"
              sx={{
                flex: c === 0 ? 2 : 1,
                height: 16,
                background: 'var(--skeleton-base)',
                '&::after': {
                  background: `linear-gradient(90deg, transparent, var(--skeleton-sheen), transparent)`,
                },
              }}
            />
          ))}
        </Stack>
      ))}
    </Box>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <Stack
      alignItems="center"
      spacing={1.5}
      sx={{
        py: 5,
        px: 3,
        textAlign: 'center',
        borderRadius: 'var(--radius-xl)',
        border: '1px dashed color-mix(in oklab, var(--destructive) 35%, transparent)',
        background: 'color-mix(in oklab, var(--destructive) 8%, transparent)',
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 46,
          height: 46,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--destructive)',
          background: 'color-mix(in oklab, var(--destructive) 15%, transparent)',
        }}
      >
        <ErrorOutlineRoundedIcon />
      </Box>

      <Typography variant="subtitle1">{t('error.title')}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
        {message === 'network' ? t('error.network') : (message ?? t('error.unknown'))}
      </Typography>

      {onRetry && (
        <Button variant="soft" startIcon={<RefreshRoundedIcon />} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </Stack>
  );
}
