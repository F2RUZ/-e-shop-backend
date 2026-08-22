import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../api/client';
import { pickupPointsApi } from '../api/endpoints';
import type { PickupPoint } from '../api/types';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { PagedList } from '../components/ui/PagedList';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState, TableSkeleton } from '../components/ui/TableStates';
import { TableToolbar } from '../components/ui/TableToolbar';
import { useAutoPageSize } from '../hooks/useAutoPageSize';
import { formatNumber } from '../lib/format';
import { useToast } from '../providers/ToastProvider';
import { PickupPointFormDialog, type PickupPointSubmit } from './PickupPointFormDialog';
import { PickupPointViewDialog } from './PickupPointViewDialog';

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'active', labelKey: 'pickupPoints.open' },
  { value: 'inactive', labelKey: 'pickupPoints.closed' },
];

export default function PickupPointsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [city, setCity] = useState('all');
  const [editing, setEditing] = useState<PickupPoint | null | 'new'>(null);
  const [viewing, setViewing] = useState<PickupPoint | null>(null);
  const [deleting, setDeleting] = useState<PickupPoint | null>(null);

  const pageSize = useAutoPageSize({ rowHeight: 56, reserved: 420, min: 5, max: 25 });

  // Salonlar soni kichik — hammasini bir marta olib, filtrni mijozda qilamiz
  const query = useQuery({
    queryKey: ['pickup-points'],
    queryFn: () => pickupPointsApi.list({ limit: 100, sortBy: 'id', order: 'ASC' }),
  });

  const all = useMemo(() => query.data?.items ?? [], [query.data]);

  // Shahar filtri ro'yxati — mavjud salonlardan yig'iladi, qo'lda yozilmaydi
  const cityOptions = useMemo(() => {
    const names = [...new Set(all.map((p) => p.city))].sort((a, b) => a.localeCompare(b));
    return [{ value: 'all', labelKey: 'common.all' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [all]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return all.filter((p) => {
      if (status === 'active' && !p.isActive) return false;
      if (status === 'inactive' && p.isActive) return false;
      if (city !== 'all' && p.city !== city) return false;
      if (!q) return true;

      return (
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
      );
    });
  }, [all, search, status, city]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['pickup-points'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
  };

  const onError = (e: unknown) => {
    const msg = errorMessage(e, t('error.unknown'));
    toast(msg === 'network' ? t('error.network') : msg, 'error');
  };

  /**
   * Saqlash ikki qadamdan iborat bo'lishi mumkin.
   *
   * Rasm endpointi `/pickup-points/{id}/image` — ya'ni ID kerak. Yangi salonda
   * ID hali yo'q, shuning uchun avval salon yaratiladi, keyin rasm yuboriladi.
   * Foydalanuvchi uchun bu bitta amal bo'lib ko'rinadi.
   */
  const saveMutation = useMutation({
    mutationFn: async (v: PickupPointSubmit) => {
      const saved = v.id
        ? await pickupPointsApi.update(v.id, v.body)
        : await pickupPointsApi.create(v.body);

      const id = saved.data.id;

      // Yuklangan rasmni o'chirish so'ralgan bo'lsa — lekin faqat u haqiqatan bo'lsa
      if (v.removeImage && !v.imageFile && saved.data.imagePath) {
        return pickupPointsApi.removeImage(id);
      }

      if (v.imageFile) {
        return pickupPointsApi.uploadImage(id, v.imageFile);
      }

      return saved;
    },
    onSuccess: (res) => {
      toast(res.message);
      setEditing(null);
      invalidate();
    },
    onError,
  });

  const statusMutation = useMutation({
    mutationFn: (v: { id: number; isActive: boolean }) =>
      pickupPointsApi.setStatus(v.id, v.isActive),
    onSuccess: (res) => {
      toast(res.message);
      invalidate();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pickupPointsApi.remove(id),
    onSuccess: (res) => {
      toast(res.message);
      setDeleting(null);
      invalidate();
    },
    onError: (e) => {
      onError(e);
      setDeleting(null);
    },
  });

  const filtered = search !== '' || status !== 'all' || city !== 'all';

  return (
    <>
      <PageHeader
        kickerKey="pickupPoints.kicker"
        titleKey="pickupPoints.title"
        descriptionKey="pickupPoints.subtitle"
        icon={<StorefrontRoundedIcon />}
        actions={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setEditing('new')}
          >
            {t('pickupPoints.add')}
          </Button>
        }
      />

      <CollapsibleSection
        titleKey="pickupPoints.list"
        icon={<StorefrontRoundedIcon />}
        count={rows.length}
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholderKey="pickupPoints.searchPlaceholder"
          filters={[
            { value: city, onChange: setCity, labelKey: 'pickupPoints.city', options: cityOptions },
            {
              value: status,
              onChange: setStatus,
              labelKey: 'status.title',
              options: STATUS_OPTIONS,
            },
          ]}
        />

        {query.isPending ? (
          <TableSkeleton rows={pageSize} columns={6} />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, t('error.unknown'))}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <PagedList
            items={rows}
            pageSize={pageSize}
            resetKey={`${search}|${status}|${city}`}
            empty={
              <EmptyState
                titleKey={filtered ? 'empty.search' : 'pickupPoints.empty'}
                descriptionKey={filtered ? 'empty.searchHint' : 'pickupPoints.emptyHint'}
                icon={<StorefrontRoundedIcon />}
                action={{
                  labelKey: 'pickupPoints.add',
                  onClick: () => setEditing('new'),
                  icon: <AddRoundedIcon />,
                }}
              />
            }
          >
            {(pageRows) => (
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 820 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '34%' }}>{t('pickupPoints.name')}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('pickupPoints.city')}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'nowrap' }}
                      >
                        {t('pickupPoints.hours')}
                      </TableCell>
                      <TableCell align="right">{t('pickupPoints.productsCount')}</TableCell>
                      <TableCell align="center">{t('status.title')}</TableCell>
                      <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                        {t('common.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pageRows.map((p) => (
                      <TableRow
                        key={p.id}
                        hover
                        tabIndex={0}
                        role="button"
                        aria-label={p.name}
                        onClick={() => setViewing(p)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setViewing(p);
                          }
                        }}
                        sx={{ height: 56, cursor: 'pointer' }}
                      >
                        <TableCell sx={{ maxWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Typography variant="body2" fontWeight={600} noWrap title={p.name}>
                              {p.name}
                            </Typography>
                            {p.videoUrl && (
                              <Tooltip title={t('pickupPoints.hasVideo')}>
                                <VideocamRoundedIcon
                                  fontSize="small"
                                  sx={{ color: 'var(--primary)', flexShrink: 0 }}
                                />
                              </Tooltip>
                            )}
                          </Stack>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary' }}
                            noWrap
                            display="block"
                          >
                            {p.address}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          {p.city}
                        </TableCell>

                        <TableCell
                          align="center"
                          className="tabular"
                          sx={{
                            display: { xs: 'none', sm: 'table-cell' },
                            whiteSpace: 'nowrap',
                            color: p.isOpenNow ? 'var(--success)' : 'text.secondary',
                          }}
                        >
                          {p.opensAt}–{p.closesAt}
                        </TableCell>

                        <TableCell align="right" className="tabular">
                          {formatNumber(p.productsCount ?? 0, lang)}
                        </TableCell>

                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                            spacing={0.5}
                          >
                            <StatusBadge status={p.isActive ? 'active' : 'inactive'} />
                            <Switch
                              size="small"
                              checked={p.isActive}
                              disabled={statusMutation.isPending}
                              onChange={(e) =>
                                statusMutation.mutate({ id: p.id, isActive: e.target.checked })
                              }
                              inputProps={{
                                'aria-label': p.isActive
                                  ? t('pickupPoints.deactivate')
                                  : t('pickupPoints.activate'),
                              }}
                            />
                          </Stack>
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{ whiteSpace: 'nowrap' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title={t('common.view')}>
                            <IconButton size="small" onClick={() => setViewing(p)}>
                              <VisibilityRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.edit')}>
                            <IconButton size="small" onClick={() => setEditing(p)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <IconButton
                              size="small"
                              onClick={() => setDeleting(p)}
                              sx={{ color: 'var(--destructive)' }}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </PagedList>
        )}
      </CollapsibleSection>

      <PickupPointViewDialog
        point={viewing}
        onClose={() => setViewing(null)}
        onEdit={(p) => {
          setViewing(null);
          setEditing(p);
        }}
      />

      <PickupPointFormDialog
        value={editing}
        busy={saveMutation.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(v) => saveMutation.mutate(v)}
        onReject={(message) => toast(message, 'error')}
      />

      <ConfirmModal
        open={!!deleting}
        titleKey="pickupPoints.deleteTitle"
        text={t('pickupPoints.deleteText', { name: deleting?.name ?? '' })}
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
