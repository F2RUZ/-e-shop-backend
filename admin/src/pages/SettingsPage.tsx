import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/layout/PageHeader';
import { AppearanceMenu } from '../components/layout/AppearanceMenu';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { useAuth } from '../providers/AuthProvider';
import { THEMES, THEME_NAMES } from '../theme/tokens';
import { useThemeMode } from '../providers/ThemeModeProvider';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { admin } = useAuth();
  const { theme, setTheme } = useThemeMode();

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

      {/* ── Profil (faqat ko'rish uchun) ──────────────────────── */}
      <CollapsibleSection titleKey="auth.profile" icon={<PersonRoundedIcon />} defaultOpen={false}>
        <Paper variant="glassSoft" sx={{ p: 2, maxWidth: 460 }}>
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight={600}>
              {admin?.fullName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              @{admin?.login}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', pt: 1 }}>
              {t('auth.passwordHint')}
            </Typography>
          </Stack>
        </Paper>
      </CollapsibleSection>
    </>
  );
}
