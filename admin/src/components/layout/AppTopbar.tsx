import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { AppearanceMenu } from './AppearanceMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

interface Props {
  titleKey: string;
  onOpenDrawer: () => void;
}

/** Sticky topbar (TZ §6.1) — `glassChrome`, balandligi 56px. */
export function AppTopbar({ titleKey, onOpenDrawer }: Props) {
  const { t } = useTranslation();
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <Paper
      variant="glassChrome"
      component="header"
      sx={{
        position: 'sticky',
        top: 12,
        zIndex: 30, // ⚠️ 1100 dan past — MUI portal'lari ustida qolmasin (TZ §3.4)
        height: 56,
        px: { xs: 1.25, md: 2 },
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <IconButton
        onClick={onOpenDrawer}
        aria-label={t('nav.section.main')}
        sx={{ display: { xs: 'inline-flex', lg: 'none' } }}
      >
        <MenuRoundedIcon fontSize="small" />
      </IconButton>

      <Typography variant="subtitle1" noWrap sx={{ flex: 1, minWidth: 0 }} title={t(titleKey)}>
        {t(titleKey)}
      </Typography>

      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, mr: 0.5 }}>
          <LanguageSwitcher />
        </Box>
        <AppearanceMenu />
        <ThemeSwitcher />

        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('auth.profile')} sx={{ ml: 0.5 }}>
          <Avatar
            sx={{
              width: 30,
              height: 30,
              fontSize: '.8125rem',
              fontWeight: 700,
              color: 'var(--primary)',
              background: 'color-mix(in oklab, var(--primary) 18%, transparent)',
            }}
          >
            {(admin?.fullName ?? admin?.login ?? '?').charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
      </Stack>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle2" noWrap>
            {admin?.fullName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            @{admin?.login}
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 2, py: 1 }}>
          <LanguageSwitcher />
        </Box>

        <MenuItem onClick={() => { setAnchor(null); void navigate('/settings'); }}>
          <ListItemIcon><SettingsRoundedIcon fontSize="small" /></ListItemIcon>
          {t('nav.settings')}
        </MenuItem>

        <MenuItem onClick={() => { setAnchor(null); signOut(); }} sx={{ color: 'var(--destructive)' }}>
          <ListItemIcon><LogoutRoundedIcon fontSize="small" sx={{ color: 'inherit' }} /></ListItemIcon>
          {t('auth.signOut')}
        </MenuItem>
      </Menu>
    </Paper>
  );
}
