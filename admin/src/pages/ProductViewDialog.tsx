import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Product } from '../api/types';
import { DetailRow } from '../components/ui/DetailRow';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDateTime, formatNumber } from '../lib/format';

interface Props {
  product: Product | null;
  onClose: () => void;
  onEdit: (p: Product) => void;
}

/** Avtomobilni ko'rish oynasi — dialog `glassSolid` (TZ §4.1, 4-daraja). */
export function ProductViewDialog({ product, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [imageFailed, setImageFailed] = useState(false);

  const p = product;

  return (
    <Dialog open={!!p} onClose={onClose} maxWidth="sm" fullWidth>
      {p && (
        <>
          <DialogTitle sx={{ pb: 1, pr: 6 }}>
            <Typography variant="h6" sx={{ minWidth: 0 }}>
              {t('products.viewTitle')}
            </Typography>
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
              {/* ── Rasm (blur qo'yilmaydi — TZ §4.2) ─────────────── */}
              <Box
                sx={{
                  height: 190,
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border)',
                  background: 'var(--muted)',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {p.image && !imageFailed ? (
                  <Box
                    component="img"
                    src={p.image}
                    alt={p.name}
                    onError={() => setImageFailed(true)}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Stack alignItems="center" spacing={0.5} sx={{ color: 'var(--muted-foreground)' }}>
                    <DirectionsCarFilledRoundedIcon />
                    <Typography variant="caption">{t('products.noImage')}</Typography>
                  </Stack>
                )}
              </Box>

              {/* ── Nom + holat ──────────────────────────────────── */}
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" sx={{ wordBreak: 'break-word' }}>
                    {p.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                    {p.category?.name ?? '—'}
                  </Typography>
                </Box>
                <Box sx={{ flexShrink: 0, pt: 0.5 }}>
                  <StatusBadge status={p.isActive ? 'active' : 'inactive'} />
                </Box>
              </Stack>

              {/* ── Narx va soni ─────────────────────────────────── */}
              <Stack direction="row" spacing={1.5}>
                <Paper variant="glassSoft" sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {t('products.price')}
                  </Typography>
                  <Typography className="tabular" sx={{ fontSize: '1.125rem', fontWeight: 800 }} noWrap>
                    {formatNumber(p.price, lang)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('products.currency')}
                  </Typography>
                </Paper>

                <Paper variant="glassSoft" sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {t('products.stock')}
                  </Typography>
                  <Typography
                    className="tabular"
                    sx={{
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: p.stock === 0 ? 'var(--destructive)' : 'inherit',
                    }}
                  >
                    {formatNumber(p.stock, lang)}
                  </Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <StatusBadge
                      status={p.stock === 0 ? 'outOfStock' : p.stock <= 5 ? 'lowStock' : 'inStock'}
                    />
                  </Box>
                </Paper>
              </Stack>

              {/* ── Tavsif ───────────────────────────────────────── */}
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  {t('products.description')}
                </Typography>
                <Typography variant="body2" sx={{ color: p.description ? 'inherit' : 'text.secondary' }}>
                  {p.description || t('products.noDescription')}
                </Typography>
              </Box>

              {/* ── Texnik ma'lumot ──────────────────────────────── */}
              <Paper variant="glassSoft" sx={{ px: 1.75, py: 0.5 }}>
                <DetailRow label={t('common.id')} value={`#${p.id}`} mono />
                <DetailRow label={t('categories.createdAt')} value={formatDateTime(p.createdAt, lang)} mono />
                <DetailRow label={t('common.updatedAt')} value={formatDateTime(p.updatedAt, lang)} mono />
              </Paper>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
              {t('common.close')}
            </Button>
            <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={() => onEdit(p)}>
              {t('common.edit')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
