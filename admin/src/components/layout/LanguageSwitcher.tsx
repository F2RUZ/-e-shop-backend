import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type Language } from '../../providers/I18nProvider';

/**
 * Til almashtirgich — tema tanlagichi bilan bir xil uslubda (TZ §9.7).
 * ⚠️ Til almashganda tema va shrift O'ZGARMAYDI (TZ §9.5).
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language as Language;

  return (
    <Stack
      direction="row"
      role="group"
      aria-label={t('language.title')}
      sx={{
        p: 0.375,
        borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--border)',
        background: 'color-mix(in oklab, var(--muted) 40%, transparent)',
      }}
    >
      {LANGUAGES.map((lng) => {
        const active = current === lng;
        return (
          <Box
            key={lng}
            component="button"
            type="button"
            onClick={() => void i18n.changeLanguage(lng)}
            aria-pressed={active}
            title={t(`language.${lng}`)}
            sx={{
              px: 1.25,
              py: 0.375,
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '.6875rem',
              fontWeight: 700,
              letterSpacing: '.04em',
              color: active ? 'var(--primary)' : 'var(--muted-foreground)',
              background: active
                ? 'color-mix(in oklab, var(--primary) 15%, transparent)'
                : 'transparent',
              transition: 'background-color .15s ease, color .15s ease',
            }}
          >
            {lng.toUpperCase()}
          </Box>
        );
      })}
    </Stack>
  );
}
