import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../../providers/ThemeModeProvider';
import { THEMES, THEME_NAMES, type ThemeName } from '../../theme/tokens';

/** Tema tanlagichi — har variantning o'z rangli nuqtasi bilan. */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeMode();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={t('theme.title')}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('theme.title')}>
          <PaletteRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 200, mt: 1 } } }}
      >
        {THEME_NAMES.map((name: ThemeName) => (
          <MenuItem key={name} selected={theme === name} onClick={() => { setTheme(name); setAnchor(null); }}>
            <ListItemIcon>
              <Box
                aria-hidden
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: `linear-gradient(135deg, ${THEMES[name].primary}, ${THEMES[name].card})`,
                }}
              />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '.875rem' }}>
              {t(THEMES[name].i18nKey)}
            </ListItemText>
            {theme === name && <CheckRoundedIcon sx={{ fontSize: 16, ml: 1, color: 'var(--primary)' }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
