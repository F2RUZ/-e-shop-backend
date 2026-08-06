import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../api/client';
import { authApi } from '../api/endpoints';
import { PageHeader } from '../components/layout/PageHeader';
import { AppearanceMenu } from '../components/layout/AppearanceMenu';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { THEMES, THEME_NAMES } from '../theme/tokens';
import { useThemeMode } from '../providers/ThemeModeProvider';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useThemeMode();

  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [repeat, setRepeat] = useState('');

  const tooShort = newPassword.length > 0 && newPassword.length < 6;
  const mismatch = repeat.length > 0 && newPassword !== repeat;
  const invalid = !oldPassword || newPassword.length < 6 || newPassword !== repeat;

  const change = useMutation({
    mutationFn: () => authApi.changePassword(oldPassword, newPassword),
    onSuccess: (res) => {
      toast(res.message);
      setOld('');
      setNew('');
      setRepeat('');
    },
    onError: (e) => {
      const msg = errorMessage(e, t('error.unknown'));
      toast(msg === 'network' ? t('error.network') : msg, 'error');
    },
  });

  return (
    <>
      <PageHeader
        kickerKey="nav.section.system"
        titleKey="nav.settings"
        descriptionKey="auth.profile"
        icon={<SettingsRoundedIcon />}
      />

      {/* ── Ko'rinish ─────────────────────────────────────────── */}
      <CollapsibleSection titleKey="appearance.title" icon={<PaletteRoundedIcon />}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              {t('theme.title')}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              }}
            >
              {THEME_NAMES.map((name) => {
                const tk = THEMES[name];
                const active = theme === name;
                return (
                  <Box
                    key={name}
                    component="button"
                    type="button"
                    onClick={() => setTheme(name)}
                    aria-pressed={active}
                    sx={{
                      p: 1.25,
                      cursor: 'pointer',
                      textAlign: 'left',
                      border: '1px solid',
                      borderColor: active ? 'var(--primary)' : 'var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      background: active
                        ? 'color-mix(in oklab, var(--primary) 10%, transparent)'
                        : 'transparent',
                      color: 'inherit',
                      font: 'inherit',
                      transition: 'border-color .15s ease, background-color .15s ease',
                    }}
                  >
                    <Box
                      aria-hidden
                      sx={{
                        height: 34,
                        mb: 1,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: `linear-gradient(135deg, ${tk.primary}, ${tk.card} 60%, ${tk.background})`,
                      }}
                    />
                    <Typography variant="body2" fontWeight={active ? 700 : 500} noWrap>
                      {t(tk.i18nKey)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Divider />

          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TranslateRoundedIcon sx={{ fontSize: 18, color: 'var(--muted-foreground)' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('language.title')}
              </Typography>
              <LanguageSwitcher />
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('appearance.font')}
              </Typography>
              <AppearanceMenu />
              <ThemeSwitcher />
            </Stack>
          </Stack>
        </Stack>
      </CollapsibleSection>

      {/* ── Parol ─────────────────────────────────────────────── */}
      <CollapsibleSection titleKey="auth.changePassword" icon={<LockResetRoundedIcon />} defaultOpen={false}>
        <Paper variant="glassSoft" sx={{ p: 2, maxWidth: 460 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {admin?.fullName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                @{admin?.login}
              </Typography>
            </Box>

            <TextField
              label={t('auth.oldPassword')}
              type="password"
              value={oldPassword}
              onChange={(e) => setOld(e.target.value)}
              autoComplete="current-password"
              fullWidth
            />

            <TextField
              label={t('auth.newPassword')}
              type="password"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
              error={tooShort}
              helperText={tooShort ? t('auth.passwordMin') : ' '}
              autoComplete="new-password"
              fullWidth
            />

            <TextField
              label={t('auth.repeatPassword')}
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              error={mismatch}
              helperText={mismatch ? t('auth.passwordMismatch') : ' '}
              autoComplete="new-password"
              fullWidth
            />

            <Button
              variant="contained"
              startIcon={<LockResetRoundedIcon />}
              disabled={invalid || change.isPending}
              onClick={() => change.mutate()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('common.save')}
            </Button>
          </Stack>
        </Paper>
      </CollapsibleSection>
    </>
  );
}
