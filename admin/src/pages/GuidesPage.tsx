import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../api/client';
import { guidesApi } from '../api/endpoints';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/TableStates';
import { formatDate } from '../lib/format';

/** Tanlagichda ko'rinadigan til nomlari — backend faqat kodini beradi. */
const LANGUAGE_NAMES: Record<string, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
};

/**
 * PDF qo'llanmalar.
 *
 * Ro'yxatni ham, yuklab olish havolalarini ham backend beradi — bu yerda
 * qo'llanma nomlari qo'lda yozilmaydi. Yangi qo'llanma qo'shilsa,
 * sahifada o'zi paydo bo'ladi.
 *
 * Havolalar token talab qilmaydi, shuning uchun oddiy `<a download>` ishlaydi:
 * `fetch` + blob kerak emas.
 */
export default function GuidesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const query = useQuery({
    queryKey: ['guides'],
    queryFn: () => guidesApi.list(),
    staleTime: 5 * 60_000,
  });

  const guides = query.data ?? [];

  return (
    <>
      <PageHeader
        kickerKey="guides.kicker"
        titleKey="guides.title"
        descriptionKey="guides.subtitle"
        icon={<MenuBookRoundedIcon />}
      />

      <CollapsibleSection
        titleKey="guides.list"
        icon={<MenuBookRoundedIcon />}
        count={guides.length}
      >
        {query.isPending ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={128} />
            ))}
          </Stack>
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, t('error.unknown'))}
            onRetry={() => void query.refetch()}
          />
        ) : guides.length === 0 ? (
          <EmptyState
            titleKey="guides.empty"
            descriptionKey="guides.emptyHint"
            icon={<MenuBookRoundedIcon />}
          />
        ) : (
          <Stack spacing={1.5}>
            {guides.map((guide) => (
              <Paper
                key={guide.key}
                variant="outlined"
                sx={{
                  p: 2,
                  background: 'color-mix(in oklab, var(--card) 45%, transparent)',
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', md: 'center' }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      borderRadius: 'var(--radius-lg)',
                      color: 'var(--destructive)',
                      background: 'color-mix(in oklab, var(--destructive) 12%, transparent)',
                    }}
                  >
                    <PictureAsPdfRoundedIcon />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {/* Sarlavha panel tilida; o'sha til yo'q bo'lsa — birinchisi */}
                      {guide.title[lang] ?? guide.title[guide.languages[0]]}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {guide.description[lang] ?? guide.description[guide.languages[0]]}
                    </Typography>

                    <Typography
                      variant="caption"
                      className="tabular"
                      sx={{ color: 'text.secondary' }}
                    >
                      {guide.format.toUpperCase()} · {t('guides.updatedAt')}{' '}
                      {formatDate(guide.updatedAt, lang)}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    {guide.languages.map((code) => (
                      <Button
                        key={code}
                        size="small"
                        variant={code === lang ? 'contained' : 'outlined'}
                        startIcon={<DownloadRoundedIcon />}
                        component="a"
                        href={guide.downloads[code]}
                        download
                        aria-label={`${guide.title[code] ?? guide.key} — ${LANGUAGE_NAMES[code] ?? code}`}
                      >
                        {LANGUAGE_NAMES[code] ?? code.toUpperCase()}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </CollapsibleSection>
    </>
  );
}
