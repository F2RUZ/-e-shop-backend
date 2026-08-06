import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useTranslation } from 'react-i18next';

interface Props {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
}

/**
 * Yagona pagination ko'rinishi (TZ §7A.4).
 * Mijoz tomonida ham, server tomonida ham AYNAN shu ishlatiladi.
 *
 * - Bitta sahifa bo'lsa — chaqiruvchi umuman ko'rsatmaydi
 * - Raqamlar `tabular-nums` — kenglik sakramaydi
 * - ← / → klaviatura bilan sahifa almashadi
 */
export function PaginationBar({ page, pages, from, to, total, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{
        mt: 1.5,
        pt: 1.5,
        borderTop: '1px solid color-mix(in oklab, var(--border) 50%, transparent)',
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' && page > 1) onChange(page - 1);
        if (e.key === 'ArrowRight' && page < pages) onChange(page + 1);
      }}
    >
      <Typography variant="caption" className="tabular" sx={{ color: 'text.secondary' }}>
        {t('table.showing', { from, to, total })}
      </Typography>

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton
          size="small"
          aria-label={t('common.prev')}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeftRoundedIcon fontSize="small" />
        </IconButton>

        <Box
          className="tabular"
          sx={{
            px: 1,
            fontSize: '.75rem',
            color: 'text.secondary',
            minWidth: 52,
            textAlign: 'center',
          }}
        >
          {t('table.page', { page, pages })}
        </Box>

        <IconButton
          size="small"
          aria-label={t('common.next')}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRightRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
