import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api/endpoints';
import type { Category } from '../api/types';
import { DetailRow } from '../components/ui/DetailRow';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCompactMoney, formatDateTime, formatNumber } from '../lib/format';

interface Props {
  category: Category | null;
  onClose: () => void;
  onEdit: (c: Category) => void;
}

const PREVIEW_LIMIT = 6;

/** Kategoriyani ko'rish oynasi — ichidagi avtomobillar namunasi bilan. */
export function CategoryViewDialog({ category, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const c = category;

  // Kategoriya ichidagi avtomobillar — faqat dialog ochilganda so'raladi
  const products = useQuery({
    queryKey: ['products', 'by-category', c?.id],
    queryFn: () => productsApi.list({ categoryId: c!.id, limit: 100, sortBy: 'price', order: 'DESC' }),
    enabled: !!c,
  });

  const items = products.data?.items ?? [];
  const total = products.data?.meta.total ?? 0;
  const activeCount = items.filter((p) => p.isActive).length;
  const totalStock = items.reduce((sum, p) => sum + p.stock, 0);
  const totalValue = items.reduce((sum, p) => sum + p.price * p.stock, 0);

  return (
    <Dialog open={!!c} onClose={onClose} maxWidth="sm" fullWidth>
      {c && (
        <>
          <DialogTitle sx={{ pb: 1, pr: 6 }}>
            <Typography variant="h6">{t('categories.viewTitle')}</Typography>
            <IconButton
              onClick={onClose}
              aria-label={t('common.close')}
              sx={{ position: 'absolute', top: 12, right: 12 }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2}>
              {/* ── Sarlavha ─────────────────────────────────────── */}
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                <Box
                  aria-hidden
                  sx={{
                    flexShrink: 0,
                    width: 46,
                    height: 46,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--primary)',
                    background: 'color-mix(in oklab, var(--primary) 14%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--primary) 24%, transparent)',
                    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,.14)',
                  }}
                >
                  <CategoryRoundedIcon />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
                    {c.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mt: 0.25 }}
                  >
                    {c.description || t('categories.noDescription')}
                  </Typography>
                </Box>

                <Box sx={{ flexShrink: 0, pt: 0.5 }}>
                  <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
                </Box>
              </Stack>

              {/* ── Raqamlar ─────────────────────────────────────── */}
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[
                  { label: t('categories.productsCount'), value: formatNumber(total, lang) },
                  { label: t('categories.activeProducts'), value: formatNumber(activeCount, lang) },
                  { label: t('categories.totalStock'), value: formatNumber(totalStock, lang) },
                ].map((box) => (
                  <Paper key={box.label} variant="glassSoft" sx={{ p: 1.5, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                      {box.label}
                    </Typography>
                    {products.isPending ? (
                      <Skeleton variant="text" sx={{ width: '60%', height: 26 }} />
                    ) : (
                      <Typography className="tabular" sx={{ fontSize: '1.125rem', fontWeight: 800 }}>
                        {box.value}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>

              <Paper variant="glassSoft" sx={{ px: 1.75, py: 0.5 }}>
                <DetailRow
                  label={t('categories.totalValue')}
                  value={
                    products.isPending
                      ? '…'
                      : `${formatCompactMoney(totalValue, lang)} ${t('products.currency')}`
                  }
                  mono
                />
                <DetailRow label={t('common.id')} value={`#${c.id}`} mono />
                <DetailRow label={t('categories.createdAt')} value={formatDateTime(c.createdAt, lang)} mono />
                <DetailRow label={t('common.updatedAt')} value={formatDateTime(c.updatedAt, lang)} mono />
              </Paper>

              {/* ── Ichidagi avtomobillar ────────────────────────── */}
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1, minWidth: 0 }}>
                    {t('categories.viewProducts')}
                  </Typography>
                  {total > 0 && (
                    <Button
                      size="small"
                      variant="soft"
                      endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                      onClick={() => {
                        onClose();
                        void navigate('/products');
                      }}
                    >
                      {t('common.openList')}
                    </Button>
                  )}
                </Stack>

                {products.isPending ? (
                  <Stack spacing={0.75}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" sx={{ height: 44 }} />
                    ))}
                  </Stack>
                ) : items.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
                    {t('categories.noProducts')}
                  </Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {items.slice(0, PREVIEW_LIMIT).map((p) => (
                      <Stack
                        key={p.id}
                        direction="row"
                        alignItems="center"
                        spacing={1.25}
                        sx={{
                          px: 1.25,
                          py: 0.75,
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid color-mix(in oklab, var(--border) 50%, transparent)',
                        }}
                      >
                        <DirectionsCarFilledRoundedIcon
                          sx={{ fontSize: 16, color: 'var(--muted-foreground)', flexShrink: 0 }}
                        />
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }} title={p.name}>
                          {p.name}
                        </Typography>
                        <Typography variant="body2" className="tabular" sx={{ flexShrink: 0 }}>
                          {formatCompactMoney(p.price, lang)}
                        </Typography>
                      </Stack>
                    ))}

                    {items.length > PREVIEW_LIMIT && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', pt: 0.5 }}>
                        +{formatNumber(items.length - PREVIEW_LIMIT, lang)}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
              {t('common.close')}
            </Button>
            <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={() => onEdit(c)}>
              {t('common.edit')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
