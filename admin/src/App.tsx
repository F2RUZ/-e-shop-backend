import { lazy, Suspense, useMemo } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AppearanceProvider } from './providers/AppearanceProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { I18nProvider } from './providers/I18nProvider';
import { ThemeModeProvider, useThemeMode } from './providers/ThemeModeProvider';
import { ToastProvider } from './providers/ToastProvider';
import { CssVariables } from './theme/cssVars';
import { buildTheme } from './theme/theme';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const PickupPointsPage = lazy(() => import('./pages/PickupPointsPage'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const AdminsPage = lazy(() => import('./pages/AdminsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

function FullPageLoader() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress size={28} />
    </Box>
  );
}

/**
 * MUI theme til va temaga bog'liq — ikkalasi ham o'zgarganda qayta quriladi.
 * Boshqa hech narsa qayta render bo'lmaydi (TZ §12).
 */
function MuiLayer({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeMode();
  const { i18n } = useTranslation();
  const muiTheme = useMemo(() => buildTheme(theme, i18n.language), [theme, i18n.language]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme />
      <CssVariables />
      {children}
    </ThemeProvider>
  );
}

/** Token bo'lmasa login sahifasi, bo'lsa panel. */
function Gate() {
  const { admin, ready } = useAuth();

  if (!ready) return <FullPageLoader />;

  return (
    <Suspense fallback={<FullPageLoader />}>
      {admin ? (
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/pickup-points" element={<PickupPointsPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/admins" element={<AdminsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      ) : (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      )}
    </Suspense>
  );
}

/**
 * Provayder tuzilishi (TZ §5.1).
 * Uchta o'q mustaqil: til · tema · ko'rinish.
 */
export default function App() {
  return (
    <AppearanceProvider>
      <ThemeModeProvider>
        <I18nProvider>
          <MuiLayer>
            <ToastProvider>
              <QueryClientProvider client={queryClient}>
                <AuthProvider>
                  <BrowserRouter>
                    <Gate />
                  </BrowserRouter>
                </AuthProvider>
              </QueryClientProvider>
            </ToastProvider>
          </MuiLayer>
        </I18nProvider>
      </ThemeModeProvider>
    </AppearanceProvider>
  );
}
