import { useEffect, useMemo, useState } from 'react';
import Avatar from '@mui/material/Avatar';
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
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { categoriesApi, pickupPointsApi, productsApi } from '../api/endpoints';
import type { Product } from '../api/types';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { PaginationBar } from '../components/ui/PaginationBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableToolbar } from '../components/ui/TableToolbar';
import { ErrorState, TableSkeleton } from '../components/ui/TableStates';
import { useAutoPageSize } from '../hooks/useAutoPageSize';
import { useDebounced } from '../hooks/useDebounced';
import { formatNumber } from '../lib/format';
import { useToast } from '../providers/ToastProvider';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductViewDialog } from './ProductViewDialog';

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'active', labelKey: 'status.active' },
  { value: 'inactive', labelKey: 'status.inactive' },
];

const STOCK_OPTIONS = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'in', labelKey: 'status.inStock' },
  { value: 'out', labelKey: 'status.outOfStock' },
];

export default function ProductsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  // Salon sahifasidan ?pickupPointId=3 bilan kelinishi mumkin
  const [searchParams] = useSearchParams();
  const [pickupPointId, setPickupPointId] = useState(searchParams.get('pickupPointId') ?? 'all');
  const [status, setStatus] = useState('all');
  const [stock, setStock] = useState('all');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<Product | null | 'new'>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const debouncedSearch = useDebounced(search, 350);
  const limit = useAutoPageSize({ rowHeight: 64, reserved: 430, min: 5, max: 25 });

  // Filtr o'zgarganda sahifa 1 ga qaytadi (TZ §7A.3)
  const filterKey = `${debouncedSearch}|${categoryId}|${pickupPointId}|${status}|${stock}|${limit}`;
  useEffect(() => setPage(1), [filterKey]);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: 100, sortBy: 'name', order: 'ASC' }),
  });

  const pickupPoints = useQuery({
    queryKey: ['pickup-points'],
    queryFn: () => pickupPointsApi.list({ limit: 100, sortBy: 'name', order: 'ASC' }),
  });

  // ⚠️ Server tomonida sahifalash — ro'yxat cheksiz o'sishi mumkin (TZ §7A.4).
  // Ko'rinish esa mijoz tomonidagi bilan BIR XIL: o'sha hisoblagich, o'sha tugmalar.
  const query = useQuery({
    queryKey: ['products', { page, limit, debouncedSearch, categoryId, pickupPointId, status, stock }],
    queryFn: () =>
      productsApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        categoryId: categoryId === 'all' ? undefined : Number(categoryId),
        pickupPointId: pickupPointId === 'all' ? undefined : Number(pickupPointId),
        isActive: status === 'all' ? undefined : status === 'active',
        inStock: stock === 'all' ? undefined : stock === 'in',
        sortBy: 'id',
        order: 'ASC',
      }),
    placeholderData: keepPreviousData,
  });

  const pickupPointOptions = useMemo(
    () => [
      { value: 'all', labelKey: 'common.all' as const },
      ...(pickupPoints.data?.items ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [pickupPoints.data],
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'all', labelKey: 'common.all' },
      ...(categories.data?.items ?? []).map((c) => ({ value: String(c.id), labelKey: c.name })),
    ],
    [categories.data],
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const onError = (e: unknown) => {
    const msg = errorMessage(e, t('error.unknown'));
    toast(msg === 'network' ? t('error.network') : msg, 'error');
  };

  const statusMutation = useMutation({
    mutationFn: (v: { id: number; isActive: boolean }) => productsApi.setStatus(v.id, v.isActive),
    onSuccess: (res) => {
      toast(res.message);
      invalidate();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
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

  const items = query.data?.items ?? [];
  const meta = query.data?.meta;
  const hasFilters =
    !!debouncedSearch ||
    categoryId !== 'all' ||
    pickupPointId !== 'all' ||
    status !== 'all' ||
    stock !== 'all';

  return (
    <>
      <PageHeader
        kickerKey="products.kicker"
        titleKey="products.title"
        descriptionKey="products.subtitle"
        icon={<DirectionsCarFilledRoundedIcon />}
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setEditing('new')}>
            {t('products.add')}
          </Button>
        }
      />

      <CollapsibleSection
        titleKey="products.list"
        icon={<DirectionsCarFilledRoundedIcon />}
        count={meta?.total}
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholderKey="products.searchPlaceholder"
          filters={[
            { value: categoryId, onChange: setCategoryId, labelKey: 'products.category', options: categoryOptions, width: 200 },
            { value: pickupPointId, onChange: setPickupPointId, labelKey: 'products.pickupPoint', options: pickupPointOptions, width: 200 },
            { value: status, onChange: setStatus, labelKey: 'status.title', options: STATUS_OPTIONS, width: 150 },
            { value: stock, onChange: setStock, labelKey: 'products.stock', options: STOCK_OPTIONS, width: 150 },
          ]}
        />

        {query.isPending ? (
          <TableSkeleton rows={limit} columns={6} />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, t('error.unknown'))}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            titleKey={hasFilters ? 'empty.search' : 'products.empty'}
            descriptionKey={hasFilters ? 'empty.searchHint' : 'products.emptyHint'}
            icon={<DirectionsCarFilledRoundedIcon />}
            action={
              hasFilters
                ? undefined
                : { labelKey: 'products.add', onClick: () => setEditing('new'), icon: <AddRoundedIcon /> }
            }
          />
        ) : (
          <>
            <Box sx={{ width: '100%', overflowX: 'auto', opacity: query.isFetching ? 0.6 : 1, transition: 'opacity .15s ease' }}>
              <Table size="small" sx={{ minWidth: 860 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '38%' }}>{t('products.name')}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {t('products.category')}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {t('products.pickupPoint')}
                    </TableCell>
                    <TableCell align="right">{t('products.price')}</TableCell>
                    <TableCell align="right">{t('products.stock')}</TableCell>
                    <TableCell align="center">{t('status.title')}</TableCell>
                    <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                      {t('common.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {items.map((p) => (
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
                      sx={{ height: 64, cursor: 'pointer' }}
                    >
                      <TableCell sx={{ maxWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          {/* ⚠️ Rasm ustiga blur qo'yilmaydi (TZ §4.2) */}
                          <Avatar
                            src={p.image ?? undefined}
                            variant="rounded"
                            alt=""
                            sx={{
                              width: 44,
                              height: 32,
                              flexShrink: 0,
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--muted)',
                              color: 'var(--muted-foreground)',
                            }}
                          >
                            <DirectionsCarFilledRoundedIcon sx={{ fontSize: 16 }} />
                          </Avatar>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap title={p.name}>
                              {p.name}
                            </Typography>
                            {p.description && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap display="block">
                                {p.description}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}>
                        <Typography variant="body2" noWrap>
                          {p.category?.name ?? '—'}
                        </Typography>
                      </TableCell>

                      <TableCell
                        sx={{ display: { xs: 'none', lg: 'table-cell' }, color: 'text.secondary' }}
                      >
                        <Typography variant="body2" noWrap>
                          {p.pickupPoint?.name ?? '—'}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" className="tabular" sx={{ whiteSpace: 'nowrap' }}>
                        {formatNumber(p.price, lang)}
                      </TableCell>

                      <TableCell align="right" className="tabular">
                        <Box component="span" sx={{ color: p.stock === 0 ? 'var(--destructive)' : 'inherit' }}>
                          {formatNumber(p.stock, lang)}
                        </Box>
                      </TableCell>

                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                          <StatusBadge status={p.isActive ? 'active' : 'inactive'} />
                          <Switch
                            size="small"
                            checked={p.isActive}
                            disabled={statusMutation.isPending}
                            onChange={(e) => statusMutation.mutate({ id: p.id, isActive: e.target.checked })}
                            inputProps={{
                              'aria-label': p.isActive ? t('products.deactivate') : t('products.activate'),
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
                          <IconButton size="small" onClick={() => setDeleting(p)} sx={{ color: 'var(--destructive)' }}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {meta && meta.totalPages > 1 && (
              <PaginationBar
                page={meta.page}
                pages={meta.totalPages}
                from={(meta.page - 1) * meta.limit + 1}
                to={Math.min(meta.page * meta.limit, meta.total)}
                total={meta.total}
                onChange={setPage}
              />
            )}
          </>
        )}
      </CollapsibleSection>

      <ProductViewDialog
        product={viewing}
        onClose={() => setViewing(null)}
        onEdit={(p) => {
          setViewing(null);
          setEditing(p);
        }}
      />

      <ProductFormDialog
        value={editing}
        categories={categories.data?.items ?? []}
        pickupPoints={pickupPoints.data?.items ?? []}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          toast(message);
          setEditing(null);
          invalidate();
        }}
        onError={onError}
      />

      <ConfirmModal
        open={!!deleting}
        titleKey="products.deleteTitle"
        text={t('products.deleteText', { name: deleting?.name ?? '' })}
        hintKey="products.deleteHint"
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
