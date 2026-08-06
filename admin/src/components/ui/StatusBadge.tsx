import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

/**
 * Holat belgisi (TZ §7.4).
 *
 * ⚠️ Xaritada MATN saqlanmaydi — faqat rang tokeni va i18n kaliti (TZ §9.3).
 * Rang yagona signal emas: rang + nuqta + matn birga ishlaydi (TZ §11.5).
 */
export type StatusKey = 'active' | 'inactive' | 'inStock' | 'outOfStock' | 'lowStock';

const STATUS: Record<StatusKey, { color: string; i18nKey: string }> = {
  active: { color: 'var(--success)', i18nKey: 'status.active' },
  inactive: { color: 'var(--muted-foreground)', i18nKey: 'status.inactive' },
  inStock: { color: 'var(--success)', i18nKey: 'status.inStock' },
  outOfStock: { color: 'var(--destructive)', i18nKey: 'status.outOfStock' },
  lowStock: { color: 'var(--warning)', i18nKey: 'status.lowStock' },
};

export function StatusBadge({ status }: { status: StatusKey }) {
  const { t } = useTranslation();
  const { color, i18nKey } = STATUS[status];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 'var(--radius-pill)',
        fontSize: '.75rem',
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        color,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      {t(i18nKey)}
    </Box>
  );
}
