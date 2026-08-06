import { useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import TextFieldsRoundedIcon from '@mui/icons-material/TextFieldsRounded';
import { useTranslation } from 'react-i18next';
import { useAppearance } from '../../providers/AppearanceProvider';
import { FONTS, FONT_SIZES, FONT_SIZE_KEYS, type FontSizeKey } from '../../theme/appearance';

const CATEGORY_ORDER = ['system', 'sans', 'serif', 'mono'] as const;

/** Shrift turi va o'lchami — temadan mustaqil (TZ §8). */
export function AppearanceMenu() {
  const { t } = useTranslation();
  const { fontSize, setFontSize, font, setFont } = useAppearance();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={t('appearance.title')}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('appearance.title')}>
          <TextFieldsRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 250, maxHeight: 460, mt: 1 } } }}
      >
        {/* ── O'lcham ─────────────────────────────────────────── */}
        <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('appearance.fontSize')}
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
            {FONT_SIZE_KEYS.map((key: FontSizeKey) => (
              <Box
                key={key}
                component="button"
                type="button"
                onClick={() => setFontSize(key)}
                title={t(FONT_SIZES[key].i18nKey)}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  py: 0.75,
                  border: '1px solid',
                  borderColor: fontSize === key ? 'var(--primary)' : 'var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background:
                    fontSize === key
                      ? 'color-mix(in oklab, var(--primary) 15%, transparent)'
                      : 'transparent',
                  color: fontSize === key ? 'var(--primary)' : 'var(--muted-foreground)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '.6875rem',
                  fontFamily: 'inherit',
                  transition: 'background-color .15s ease, border-color .15s ease',
                }}
              >
                {FONT_SIZES[key].px}
              </Box>
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* ── Shrift turi ─────────────────────────────────────── */}
        {CATEGORY_ORDER.map((cat) => {
          const list = FONTS.filter((f) => f.category === cat);
          if (!list.length) return null;

          return [
            <ListSubheader
              key={`h-${cat}`}
              sx={{
                background: 'transparent',
                lineHeight: '30px',
                fontSize: '.6875rem',
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--muted-foreground)',
              }}
            >
              {t(`appearance.category.${cat}`)}
            </ListSubheader>,

            ...list.map((f) => (
              <MenuItem key={f.key} selected={font === f.key} onClick={() => setFont(f.key)}>
                <Typography sx={{ flex: 1, minWidth: 0, fontFamily: f.stack, fontSize: '.875rem' }} noWrap>
                  {f.label}
                </Typography>
                {font === f.key && (
                  <CheckRoundedIcon sx={{ fontSize: 16, ml: 1, color: 'var(--primary)' }} />
                )}
              </MenuItem>
            )),
          ];
        })}
      </Menu>
    </>
  );
}
