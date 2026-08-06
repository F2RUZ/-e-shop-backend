import { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { Outlet, useLocation } from 'react-router-dom';
import { STORAGE_KEYS } from '../../theme/appearance';
import { AppSidebar, NAV_GROUPS } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

/** Joriy manzilga mos sarlavha kalitini topadi. */
function useCurrentTitleKey(): string {
  const { pathname } = useLocation();
  const all = NAV_GROUPS.flatMap((g) => g.items);
  const exact = all.find((i) => i.to === pathname);
  if (exact) return exact.labelKey;
  const partial = all.find((i) => i.to !== '/' && pathname.startsWith(i.to));
  return partial?.labelKey ?? 'app.name';
}

/**
 * Layout skeleti (TZ §6).
 *
 * ⚠️ Ambient fon ALOHIDA `fixed` qatlam — layout'ga `overflow:hidden`
 * qo'yilmaydi, aks holda sticky sidebar/topbar buziladi (TZ §4.3).
 */
export function AppShell() {
  const titleKey = useCurrentTitleKey();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === '1',
  );

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, v ? '0' : '1');
      return !v;
    });
  };

  return (
    <>
      <Box aria-hidden className="ambient" />

      <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, minHeight: '100dvh' }}>
        {/* Desktop sidebar */}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} />
        </Box>

        {/* Mobil drawer — portal orqali body ga chiqadi */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ display: { xs: 'block', lg: 'none' } }}
          slotProps={{ paper: { sx: { width: 256, border: 'none' } } }}
        >
          <AppSidebar
            collapsed={false}
            onToggle={() => {}}
            inDrawer
            onNavigate={() => setDrawerOpen(false)}
          />
        </Drawer>

        {/* Asosiy ustun */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <AppTopbar titleKey={titleKey} onOpenDrawer={() => setDrawerOpen(true)} />

          <Box
            component="main"
            sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </>
  );
}
