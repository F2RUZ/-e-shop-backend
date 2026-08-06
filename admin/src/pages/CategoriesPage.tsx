import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../api/client';
import { categoriesApi } from '../api/endpoints';
import type { Category } from '../api/types';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { PagedList } from '../components/ui/PagedList';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableToolbar } from '../components/ui/TableToolbar';
import { CategoryViewDialog } from './CategoryViewDialog';
import { ErrorState, TableSkeleton } from '../components/ui/TableStates';
import { useAutoPageSize } from '../hooks/useAutoPageSize';
import { formatDate, formatNumber } from '../lib/format';
import { useToast } from '../providers/ToastProvider';

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'active', labelKey: 'status.active' },
  { value: 'inactive', labelKey: 'status.inactive' },
];

export default function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<Category | null | 'new'>(null);
  const [viewing, setViewing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const pageSize = useAutoPageSize({ rowHeight: 56, reserved: 420, min: 5, max: 25 });

  // Backend 100 tagacha qaytaradi — ro'yxat kichik, mijoz tomonida sahifalaymiz (TZ §7A.4)
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list({ limit: 100, sortBy: 'id', order: 'ASC' }),
  });

  const rows = useMemo(() => {
    const items = query.data?.items ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (status === 'active' && !c.isActive) return false;
      if (status === 'inactive' && c.isActive) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
    });
  }, [query.data, search, status]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['categories'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
  };

  const onError = (e: unknown) => {
    const msg = errorMessage(e, t('error.unknown'));
    toast(msg === 'network' ? t('error.network') : msg, 'error');
  };

  const saveMutation = useMutation({
    mutationFn: (v: { id?: number; name: string; description?: string }) =>
      v.id
        ? categoriesApi.update(v.id, { name: v.name, description: v.description })
        : categoriesApi.create({ name: v.name, description: v.description }),
    onSuccess: (res) => {
      toast(res.message);
      setEditing(null);
      invalidate();
    },
    onError,
  });

  const statusMutation = useMutation({
    mutationFn: (v: { id: number; isActive: boolean }) => categoriesApi.setStatus(v.id, v.isActive),
    onSuccess: (res) => {
      toast(res.message);
      invalidate();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
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

  return (
    <>
      <PageHeader
        kickerKey="categories.kicker"
        titleKey="categories.title"
        descriptionKey="categories.subtitle"
        icon={<CategoryRoundedIcon />}
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setEditing('new')}>
            {t('categories.add')}
          </Button>
        }
      />

      <CollapsibleSection titleKey="categories.list" icon={<CategoryRoundedIcon />} count={rows.length}>
        <TableToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholderKey="categories.searchPlaceholder"
          filters={[
            { value: status, onChange: setStatus, labelKey: 'status.title', options: STATUS_OPTIONS },
          ]}
        />

        {query.isPending ? (
          <TableSkeleton rows={pageSize} columns={5} />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, t('error.unknown'))}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <PagedList
            items={rows}
            pageSize={pageSize}
            resetKey={`${search}|${status}`}
            empty={
              <EmptyState
                titleKey={search || status !== 'all' ? 'empty.search' : 'categories.empty'}
                descriptionKey={search || status !== 'all' ? 'empty.searchHint' : 'categories.emptyHint'}
                icon={<CategoryRoundedIcon />}
                action={{ labelKey: 'categories.add', onClick: () => setEditing('new'), icon: <AddRoundedIcon /> }}
              />
            }
          >
            {(pageRows) => (
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '40%' }}>{t('categories.name')}</TableCell>
                      <TableCell align="right">{t('categories.productsCount')}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('categories.createdAt')}
                      </TableCell>
                      <TableCell align="center">{t('status.title')}</TableCell>
                      <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                        {t('common.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pageRows.map((c) => (
                      <TableRow
                        key={c.id}
                        hover
                        tabIndex={0}
                        role="button"
                        aria-label={c.name}
                        onClick={() => setViewing(c)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setViewing(c);
                          }
                        }}
                        sx={{ height: 56, cursor: 'pointer' }}
                      >
                        <TableCell sx={{ maxWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap title={c.name}>
                            {c.name}
                          </Typography>
                          {c.description && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap display="block">
                              {c.description}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="right" className="tabular">
                          {formatNumber(c.productsCount ?? 0, lang)}
                        </TableCell>

                        <TableCell
                          className="tabular"
                          sx={{ display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary' }}
                        >
                          {formatDate(c.createdAt, lang)}
                        </TableCell>

                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                            <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
                            <Switch
                              size="small"
                              checked={c.isActive}
                              disabled={statusMutation.isPending}
                              onChange={(e) => statusMutation.mutate({ id: c.id, isActive: e.target.checked })}
                              inputProps={{
                                'aria-label': c.isActive ? t('categories.deactivate') : t('categories.activate'),
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
                            <IconButton size="small" onClick={() => setViewing(c)}>
                              <VisibilityRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.edit')}>
                            <IconButton size="small" onClick={() => setEditing(c)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <IconButton
                              size="small"
                              onClick={() => setDeleting(c)}
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

      <CategoryViewDialog
        category={viewing}
        onClose={() => setViewing(null)}
        onEdit={(c) => {
          setViewing(null);
          setEditing(c);
        }}
      />

      <CategoryFormDialog
        value={editing}
        busy={saveMutation.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(v) => saveMutation.mutate(v)}
      />

      <ConfirmModal
        open={!!deleting}
        titleKey="categories.deleteTitle"
        text={t('categories.deleteText', { name: deleting?.name ?? '' })}
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

// ─────────────────────────── Forma dialogi ───────────────────────────

interface FormProps {
  value: Category | null | 'new';
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: { id?: number; name: string; description?: string }) => void;
}

function CategoryFormDialog({ value, busy, onClose, onSubmit }: FormProps) {
  const { t } = useTranslation();
  const isNew = value === 'new';
  const category = isNew ? null : value;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  // Dialog ochilganda maydonlarni to'ldiramiz
  const key = isNew ? 'new' : (category?.id ?? 'none');
  const [lastKey, setLastKey] = useState<string | number>('none');
  if (value && key !== lastKey) {
    setLastKey(key);
    setName(category?.name ?? '');
    setDescription(category?.description ?? '');
    setTouched(false);
  }

  const invalid = name.trim().length < 2;

  return (
    <Dialog open={!!value} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t(isNew ? 'categories.createTitle' : 'categories.editTitle')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('categories.name')}
            placeholder={t('categories.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && invalid}
            helperText={touched && invalid ? t('common.required') : ' '}
            fullWidth
            autoFocus
          />

          <TextField
            label={t('categories.description')}
            placeholder={t('categories.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ color: 'text.secondary' }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={busy || invalid}
          onClick={() =>
            onSubmit({
              id: category?.id,
              name: name.trim(),
              description: description.trim() || undefined,
            })
          }
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
