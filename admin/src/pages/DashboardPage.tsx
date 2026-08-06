import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import InventoryRoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { EmptyState } from '../components/ui/EmptyState';
import { PagedList } from '../components/ui/PagedList';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState, TableSkeleton } from '../components/ui/TableStates';
import { useAutoPageSize } from '../hooks/useAutoPageSize';
import { formatCompactMoney, formatNumber } from '../lib/format';

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: () => dashboardApi.stats() });
  const byCategory = useQuery({
    queryKey: ['dashboard', 'category-stats'],
    queryFn: () => dashboardApi.categoryStats(),
  });
  const lowStock = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: () => dashboardApi.lowStock(),
  });

  const pageSize = useAutoPageSize({ rowHeight: 52, reserved: 620, min: 4, max: 12 });
  const s = stats.data;

  const maxCount = Math.max(1, ...(byCategory.data ?? []).map((c) => c.productsCount));

  return (
    <>
      <PageHeader
        kickerKey="dashboard.kicker"
        titleKey="dashboard.title"
        descriptionKey="dashboard.subtitle"
        icon={<DashboardRoundedIcon />}
      />

      {/* ── Statistika kartochkalari ─────────────────────────── */}
      {stats.isError ? (
        <ErrorState message={errorMessage(stats.error, t('error.unknown'))} onRetry={() => void stats.refetch()} />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <StatCard
            labelKey="dashboard.products"
            label={t('dashboard.products')}
            value={s ? formatNumber(s.products.total, lang) : '—'}
            hint={s ? t('dashboard.activeOf', { active: s.products.active, inactive: s.products.inactive }) : undefined}
            icon={<DirectionsCarFilledRoundedIcon />}
            tone="primary"
            loading={stats.isPending}
          />
          <StatCard
            labelKey="dashboard.categories"
            label={t('dashboard.categories')}
            value={s ? formatNumber(s.categories.total, lang) : '—'}
            hint={s ? t('dashboard.emptyCategories', { count: s.categories.empty }) : undefined}
            icon={<CategoryRoundedIcon />}
            tone="violet"
            loading={stats.isPending}
          />
          <StatCard
            labelKey="dashboard.totalStock"
            label={t('dashboard.totalStock')}
            value={s ? formatNumber(s.stock.totalItems, lang) : '—'}
            hint={s ? t('dashboard.outOfStockCount', { count: s.products.outOfStock }) : undefined}
            icon={<InventoryRoundedIcon />}
            tone="info"
            loading={stats.isPending}
          />
          <StatCard
            labelKey="dashboard.totalValue"
            label={t('dashboard.totalValue')}
            value={s ? `${formatCompactMoney(s.stock.totalValue, lang)} ${t('products.currency')}` : '—'}
            icon={<PaidRoundedIcon />}
            tone="success"
            loading={stats.isPending}
          />
          <StatCard
            labelKey="dashboard.averagePrice"
            label={t('dashboard.averagePrice')}
            value={s ? `${formatCompactMoney(s.stock.averagePrice, lang)} ${t('products.currency')}` : '—'}
            icon={<PaidRoundedIcon />}
            tone="primary"
            loading={stats.isPending}
          />
          <StatCard
            labelKey="dashboard.lowStock"
            label={t('dashboard.lowStock')}
            value={s ? formatNumber(s.products.lowStock, lang) : '—'}
            hint={s ? t('dashboard.lowStockHint', { count: s.lowStockThreshold }) : undefined}
            icon={<WarningAmberRoundedIcon />}
            tone="warning"
            loading={stats.isPending}
          />
        </Box>
      )}

      {/* ── Kategoriyalar kesimi ─────────────────────────────── */}
      <CollapsibleSection
        titleKey="dashboard.byCategory"
        icon={<CategoryRoundedIcon />}
        count={byCategory.data?.length}
      >
        {byCategory.isPending ? (
          <TableSkeleton rows={5} columns={4} />
        ) : byCategory.isError ? (
          <ErrorState
            message={errorMessage(byCategory.error, t('error.unknown'))}
            onRetry={() => void byCategory.refetch()}
          />
        ) : (
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            {(byCategory.data ?? []).map((c) => (
              <Box key={c.id}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap title={c.name}>
                    {c.name}
                  </Typography>
                  <Typography variant="caption" className="tabular" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                    {formatNumber(c.productsCount, lang)}
                  </Typography>
                  <Typography
                    variant="caption"
                    className="tabular"
                    sx={{ color: 'text.secondary', flexShrink: 0, minWidth: 90, textAlign: 'right' }}
                  >
                    {formatCompactMoney(c.totalValue, lang)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(c.productsCount / maxCount) * 100}
                  aria-label={c.name}
                  sx={{ height: 5 }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </CollapsibleSection>

      {/* ── Kam qolganlar ────────────────────────────────────── */}
      <CollapsibleSection
        titleKey="dashboard.lowStock"
        icon={<WarningAmberRoundedIcon />}
        count={lowStock.data?.length}
        defaultOpen={false}
      >
        {lowStock.isPending ? (
          <TableSkeleton rows={5} columns={4} />
        ) : lowStock.isError ? (
          <ErrorState
            message={errorMessage(lowStock.error, t('error.unknown'))}
            onRetry={() => void lowStock.refetch()}
          />
        ) : (
          <PagedList
            items={lowStock.data ?? []}
            pageSize={pageSize}
            empty={<EmptyState titleKey="empty.title" />}
          >
            {(rows) => (
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('products.name')}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {t('products.category')}
                      </TableCell>
                      <TableCell align="right">{t('products.stock')}</TableCell>
                      <TableCell align="right">{t('status.title')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" noWrap title={p.name}>
                            {p.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}>
                          <Typography variant="body2" noWrap>
                            {p.category?.name ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" className="tabular">
                          {formatNumber(p.stock, lang)}
                        </TableCell>
                        <TableCell align="right">
                          <StatusBadge status={p.stock === 0 ? 'outOfStock' : 'lowStock'} />
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
    </>
  );
}
