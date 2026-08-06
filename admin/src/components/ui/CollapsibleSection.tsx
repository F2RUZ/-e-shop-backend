import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useTranslation } from 'react-i18next';

interface Props {
  titleKey: string;
  icon?: ReactNode;
  /** Sarlavhadagi pill — ochmasdan ham hajmi bilinadi */
  count?: number;
  /** O'ngdagi amal — akkordeonni OCHMAYDI (alohida element) */
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Har ro'yxat shu bilan o'raladi (TZ §7.2, §7A.2).
 *
 * ⚠️ Yopiq holatda ichki kontent DOM'dan butunlay olib tashlanadi —
 * yopiq bo'limdagi yuzlab qator behuda render bo'lmasin.
 */
export function CollapsibleSection({
  titleKey,
  icon,
  count,
  action,
  defaultOpen = true,
  children,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Paper variant="glass" sx={{ overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" sx={{ px: { xs: 1.75, md: 2.5 }, py: 1.5 }}>
        {/* Sarlavhaning o'zi tugma — klaviatura va skrinrider uchun */}
        <Box
          component="button"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          sx={{
            flex: 1,
            minWidth: 0, // ⚠️ uzun ruscha nom layoutni yorib chiqmasin (TZ §9.2)
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            background: 'none',
            border: 'none',
            p: 0,
            cursor: 'pointer',
            color: 'inherit',
            font: 'inherit',
            textAlign: 'left',
          }}
        >
          <ExpandMoreRoundedIcon
            sx={{
              flexShrink: 0,
              fontSize: 20,
              color: 'var(--muted-foreground)',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform .2s cubic-bezier(.4,0,.2,1)',
            }}
          />

          {icon && (
            <Box
              aria-hidden
              sx={{
                flexShrink: 0,
                width: 30,
                height: 30,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 'var(--radius-md)',
                color: 'var(--primary)',
                background: 'color-mix(in oklab, var(--primary) 14%, transparent)',
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
                '& svg': { fontSize: 17 },
              }}
            >
              {icon}
            </Box>
          )}

          <Typography
            variant="subtitle1"
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={t(titleKey)}
          >
            {t(titleKey)}
          </Typography>

          {count !== undefined && (
            <Box
              component="span"
              className="tabular"
              sx={{
                flexShrink: 0,
                px: 1,
                py: 0.25,
                fontSize: '.6875rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
                color: 'var(--muted-foreground)',
                background: 'color-mix(in oklab, var(--muted-foreground) 14%, transparent)',
              }}
            >
              {count}
            </Box>
          )}
        </Box>

        {action && (
          <Box sx={{ flexShrink: 0, ml: 1.5, display: 'flex', gap: 1 }}>{action}</Box>
        )}
      </Stack>

      <Collapse in={open} unmountOnExit timeout={250}>
        <Box sx={{ px: { xs: 1.75, md: 2.5 }, pb: 2, pt: 0.5 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
}
