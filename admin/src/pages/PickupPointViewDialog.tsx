import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { pickupPointsApi } from '../api/endpoints';
import type { PickupPoint } from '../api/types';
import { DetailRow } from '../components/ui/DetailRow';
import { StatusBadge } from '../components/ui/StatusBadge';
import { VideoUploadField } from '../components/ui/VideoUploadField';
import { formatCompactMoney, formatDateTime, formatNumber } from '../lib/format';
import { useToast } from '../providers/ToastProvider';

interface Props {
  point: PickupPoint | null;
  onClose: () => void;
  onEdit: (p: PickupPoint) => void;
}

const PREVIEW_LIMIT = 6;

/** Salonni ko'rish oynasi — video, avtomobillar va xarita havolasi bilan. */
export function PickupPointViewDialog({ point, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [progress, setProgress] = useState<number | null>(null);

  const id = point?.id;

  // Dialog ochilganda salonning YANGI holatini olamiz: video yuklangach
  // ro'yxatdagi eski nusxa emas, shu so'rov javobi ko'rsatiladi.
  const detail = useQuery({
    queryKey: ['pickup-points', 'one', id],
    queryFn: () => pickupPointsApi.one(id!),
    enabled: !!id,
  });

  const products = useQuery({
    queryKey: ['pickup-points', 'products', id],
    queryFn: () => pickupPointsApi.products(id!, 1, 100),
    enabled: !!id,
  });

  const current = detail.data ?? point;

  const onError = (e: unknown) => {
    const msg = errorMessage(e, t('error.unknown'));
    toast(msg === 'network' ? t('error.network') : msg, 'error');
    setProgress(null);
  };

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['pickup-points'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => pickupPointsApi.uploadVideo(id!, file, setProgress),
    onSuccess: (res) => {
      toast(res.message);
      setProgress(null);
      invalidate();
    },
    onError,
  });

  const removeVideoMutation = useMutation({
    mutationFn: () => pickupPointsApi.removeVideo(id!),
    onSuccess: (res) => {
      toast(res.message);
      invalidate();
    },
    onError,
  });

  const items = products.data?.items ?? [];
  const total = products.data?.meta.total ?? 0;
  const totalValue = items.reduce((sum, p) => sum + p.price * p.stock, 0);

  const mapUrl =
    current?.latitude != null && current?.longitude != null
      ? `https://www.google.com/maps?q=${current.latitude},${current.longitude}`
      : null;

  return (
    <Dialog open={!!point} onClose={onClose} maxWidth="sm" fullWidth>
      {current && (
        <>
          <DialogTitle sx={{ pb: 1, pr: 6 }}>
            <Typography variant="h6">{t('pickupPoints.viewTitle')}</Typography>
            <IconButton
              onClick={onClose}
              aria-label={t('common.close')}
              sx={{ position: 'absolute', top: 12, right: 12 }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2.5}>
              {/* ── Sarlavha ─────────────────────────────────────── */}
              <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
                    {current.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {current.city}
                  </Typography>
                </Box>

                <Stack spacing={0.5} alignItems="flex-end">
                  <StatusBadge status={current.isActive ? 'active' : 'inactive'} />
                  {current.isOpenNow !== undefined && (
                    <Typography
                      variant="caption"
                      sx={{ color: current.isOpenNow ? 'var(--success)' : 'text.secondary' }}
                    >
                      {t(current.isOpenNow ? 'pickupPoints.openNow' : 'pickupPoints.closedNow')}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {/* ── Rasm ─────────────────────────────────────────── */}
              {current.imageUrl && (
                <Box
                  component="img"
                  src={current.imageUrl}
                  alt=""
                  sx={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'cover',
                    display: 'block',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                  }}
                />
              )}

              {/* ── Ma'lumotlar ──────────────────────────────────── */}
              <Box>
                <DetailRow label={t('pickupPoints.address')} value={current.address} />
                <DetailRow
                  label={t('pickupPoints.phone')}
                  value={
                    <Box component="a" href={`tel:${current.phone}`} sx={{ color: 'var(--primary)' }}>
                      {current.phone}
                    </Box>
                  }
                  mono
                />
                <DetailRow
                  label={t('pickupPoints.hours')}
                  value={`${current.opensAt} — ${current.closesAt}`}
                  mono
                />
                <DetailRow
                  label={t('pickupPoints.coords')}
                  value={
                    mapUrl ? (
                      `${current.latitude}, ${current.longitude}`
                    ) : (
                      <Typography variant="body2" sx={{ color: 'var(--warning)' }}>
                        {t('pickupPoints.noCoords')}
                      </Typography>
                    )
                  }
                  mono
                />
                <DetailRow
                  label={t('pickupPoints.createdAt')}
                  value={formatDateTime(current.createdAt, lang)}
                  mono
                />
              </Box>

              {mapUrl && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MapRoundedIcon />}
                  endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                  component="a"
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {t('pickupPoints.openMap')}
                </Button>
              )}

              <Divider />

              {/* ── Video ────────────────────────────────────────── */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('pickupPoints.video')}
                </Typography>

                <VideoUploadField
                  videoUrl={current.videoUrl}
                  busy={uploadMutation.isPending}
                  progress={progress}
                  onUpload={(file) => uploadMutation.mutate(file)}
                  onRemove={() => removeVideoMutation.mutate()}
                  onReject={(message) => toast(message, 'error')}
                />
              </Box>

              <Divider />

              {/* ── Salondagi avtomobillar ───────────────────────── */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">{t('pickupPoints.products')}</Typography>
                  <Typography variant="body2" className="tabular" sx={{ color: 'text.secondary' }}>
                    {formatNumber(total, lang)}
                  </Typography>
                </Stack>

                {products.isPending ? (
                  <Stack spacing={1}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={40} />
                    ))}
                  </Stack>
                ) : total === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('pickupPoints.noProducts')}
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {items.slice(0, PREVIEW_LIMIT).map((p) => (
                      <Paper
                        key={p.id}
                        variant="outlined"
                        sx={{
                          px: 1.5,
                          py: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          background: 'color-mix(in oklab, var(--card) 45%, transparent)',
                        }}
                      >
                        <DirectionsCarFilledRoundedIcon
                          fontSize="small"
                          sx={{ color: 'text.secondary' }}
                        />
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="body2" className="tabular">
                          {formatCompactMoney(p.price, lang)}
                        </Typography>
                      </Paper>
                    ))}

                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t('pickupPoints.totalValue')}: {formatCompactMoney(totalValue, lang)}
                      </Typography>

                      <Button
                        size="small"
                        onClick={() => {
                          onClose();
                          navigate(`/products?pickupPointId=${current.id}`);
                        }}
                      >
                        {t('pickupPoints.showAllProducts')}
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
              {t('common.close')}
            </Button>
            <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={() => onEdit(current)}>
              {t('common.edit')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
