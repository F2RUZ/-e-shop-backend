import { useState, type FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../api/client';
import { useAuth } from '../providers/AuthProvider';
import { AppearanceMenu } from '../components/layout/AppearanceMenu';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';

export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(login.trim(), password);
    } catch (err) {
      const msg = errorMessage(err, t('auth.failed'));
      setError(msg === 'network' ? t('error.network') : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Box aria-hidden className="ambient" />

      <Box sx={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 1, alignItems: 'center' }}>
        <LanguageSwitcher />
        <AppearanceMenu />
        <ThemeSwitcher />
      </Box>

      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2 }}>
        <Paper variant="glass" sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2.5}>
            <Stack alignItems="center" spacing={1.5}>
              <Box
                aria-hidden
                sx={{
                  width: 56,
                  height: 56,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 'var(--radius-xl)',
                  color: 'var(--primary)',
                  background:
                    'linear-gradient(160deg, color-mix(in oklab, var(--primary) 28%, transparent), transparent)',
                  border: '1px solid color-mix(in oklab, var(--primary) 28%, transparent)',
                  boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
                }}
              >
                <DirectionsCarFilledRoundedIcon sx={{ fontSize: 28 }} />
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3">{t('auth.title')}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  {t('auth.subtitle')}
                </Typography>
              </Box>
            </Stack>

            <Box component="form" onSubmit={submit}>
              <Stack spacing={1.75}>
                {error && (
                  <Alert severity="error" onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <TextField
                  label={t('auth.login')}
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  fullWidth
                  required
                />

                <TextField
                  label={t('auth.password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  fullWidth
                  required
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={busy}
                  startIcon={<LoginRoundedIcon />}
                  fullWidth
                >
                  {busy ? t('auth.signingIn') : t('auth.signIn')}
                </Button>

                <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  {t('auth.hint')}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
