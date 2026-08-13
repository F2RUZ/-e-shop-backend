import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
}

interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'nav.section.main',
    items: [{ to: '/', labelKey: 'nav.dashboard', icon: <DashboardRoundedIcon /> }],
  },
  {
    titleKey: 'nav.section.catalog',
    items: [
      { to: '/categories', labelKey: 'nav.categories', icon: <CategoryRoundedIcon /> },
      { to: '/products', labelKey: 'nav.products', icon: <DirectionsCarFilledRoundedIcon /> },
    ],
  },
  {
    titleKey: 'nav.section.support',
    items: [{ to: '/chat', labelKey: 'nav.chat', icon: <ChatRoundedIcon /> }],
  },
  {
    titleKey: 'nav.section.system',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: <SettingsRoundedIcon /> }],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  /** Mobil drawer ichida — sticky va balandlik boshqacha */
  inDrawer?: boolean;
  onNavigate?: () => void;
}

/** Dock uslubidagi yon panel (TZ §6.2). */
export function AppSidebar({ collapsed, onToggle, inDrawer = false, onNavigate }: Props) {
  const { t } = useTranslation();
  const width = collapsed ? 72 : 256;

  return (
    <Paper
      variant={inDrawer ? 'glassChrome' : 'glassChrome'}
      component="nav"
      sx={{
        width: inDrawer ? 256 : width,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .25s cubic-bezier(.4,0,.2,1)',
        ...(inDrawer
          ? { height: '100%', borderRadius: 0, border: 'none' }
          : { position: 'sticky', top: 12, height: 'calc(100dvh - 24px)' }),
      }}
    >
      {/* ── Logotip ──────────────────────────────────────────── */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: collapsed && !inDrawer ? 1.5 : 2, py: 2, minHeight: 64 }}
      >
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 14,
            color: 'var(--sidebar-primary)',
            background: 'color-mix(in oklab, var(--sidebar-primary) 18%, transparent)',
            border: '1px solid color-mix(in oklab, var(--sidebar-primary) 30%, transparent)',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
          }}
        >
          <DirectionsCarFilledRoundedIcon sx={{ fontSize: 20 }} />
        </Box>

        {(!collapsed || inDrawer) && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {t('app.name')}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {t('app.subtitle')}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* ── Navigatsiya ──────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.25, pb: 1 }}>
        {NAV_GROUPS.map((group) => (
          <Box key={group.titleKey} sx={{ mb: 1.5 }}>
            {(!collapsed || inDrawer) && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 1.25,
                  mb: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '.18em',
                  color: 'color-mix(in oklab, var(--muted-foreground) 70%, transparent)',
                }}
              >
                {t(group.titleKey)}
              </Typography>
            )}

            <Stack spacing={0.5}>
              {group.items.map((item) => (
                <Tooltip
                  key={item.to}
                  title={collapsed && !inDrawer ? t(item.labelKey) : ''}
                  placement="right"
                  arrow
                >
                  <Box
                    component={NavLink}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      px: collapsed && !inDrawer ? 0 : 1,
                      py: 0.5,
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--sidebar-foreground)',
                      textDecoration: 'none',
                      justifyContent: collapsed && !inDrawer ? 'center' : 'flex-start',
                      '&.active .dock-tile': {
                        color: 'var(--sidebar-primary)',
                        background: 'color-mix(in oklab, var(--sidebar-primary) 20%, transparent)',
                        borderColor: 'color-mix(in oklab, var(--sidebar-primary) 40%, transparent)',
                      },
                      '&.active .dock-label': { color: 'var(--sidebar-primary)', fontWeight: 700 },
                      '&:hover .dock-tile': { transform: 'translateY(-2px) scale(1.08)' },
                    }}
                  >
                    <Box
                      className="dock-tile"
                      aria-hidden
                      sx={{
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 14,
                        border: '1px solid transparent',
                        background: 'color-mix(in oklab, var(--sidebar-accent) 45%, transparent)',
                        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
                        transition: 'transform .2s cubic-bezier(.4,0,.2,1), background-color .15s ease',
                        '& svg': { fontSize: 19 },
                      }}
                    >
                      {item.icon}
                    </Box>

                    {(!collapsed || inDrawer) && (
                      <Typography
                        className="dock-label"
                        variant="body2"
                        sx={{
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={t(item.labelKey)}
                      >
                        {t(item.labelKey)}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>

      {/* ── Yig'ish tugmasi (mobil drawer'da kerak emas) ──────── */}
      {!inDrawer && (
        <Box
          component="button"
          type="button"
          onClick={onToggle}
          aria-label={t('common.close')}
          sx={{
            m: 1.25,
            mt: 0,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1,
            px: collapsed ? 0 : 1.25,
            border: '1px solid var(--sidebar-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            color: 'var(--muted-foreground)',
            cursor: 'pointer',
            font: 'inherit',
            transition: 'background-color .15s ease',
            '&:hover': { background: 'color-mix(in oklab, var(--sidebar-accent) 40%, transparent)' },
          }}
        >
          <MenuOpenRoundedIcon
            sx={{
              fontSize: 18,
              transform: collapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
            }}
          />
        </Box>
      )}
    </Paper>
  );
}
