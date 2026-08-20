import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../api/client';
import { adminsApi } from '../api/endpoints';
import type { AdminRow } from '../api/types';
import { PageHeader } from '../components/layout/PageHeader';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { PagedList } from '../components/ui/PagedList';
import { TableToolbar } from '../components/ui/TableToolbar';
import { ErrorState, TableSkeleton } from '../components/ui/TableStates';
import { useAutoPageSize } from '../hooks/useAutoPageSize';
import { formatDate } from '../lib/format';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';

/** Parol qoidasi backend bilan bir xil: kamida 6 ta belgi. */
const MIN_PASSWORD = 6;

/** Login qoidasi backend bilan bir xil: kichik lotin harflari, raqam va . _ - */
const LOGIN_PATTERN = /^[a-z0-9._-]+$/;

export default function AdminsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const { toast } = useToast();
  const { admin } = useAuth();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminRow | null | 'new'>(null);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const pageSize = useAutoPageSize({ rowHeight: 56, reserved: 420, min: 5, max: 25 });

  // Adminlar soni kam — hammasini olib, mijoz tomonida qidiramiz
  const query = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminsApi.list({ limit: 100, sortBy: 'id', order: 'ASC' }),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  /**
   * Men bosh adminmanmi?
   * Backend `/auth/me` da bu belgi yo'q — shuning uchun ro'yxatdan
   * o'z yozuvimni topib olamiz. Bosh admin bo'lmasam qo'shish/tahrirlash/
   * o'chirish tugmalari umuman ko'rinmaydi (backend ham 403 beradi).
   */
  const me = useMemo(() => items.find((a) => a.id === admin?.id) ?? null, [items, admin]);
  const iAmSuper = me?.isSuperAdmin ?? false;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) => a.login.toLowerCase().includes(q) || a.fullName.toLowerCase().includes(q),
    );
  }, [items, search]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admins'] });
  };

  const onError = (e: unknown) => {
    const msg = errorMessage(e, t('error.unknown'));
    toast(msg === 'network' ? t('error.network') : msg, 'error');
  };

  const saveMutation = useMutation({
    mutationFn: (v: { id?: number; login: string; fullName: string; password?: string }) =>
      v.id
        ? adminsApi.update(v.id, {
            login: v.login,
            fullName: v.fullName,
            // parol bo'sh qoldirilsa — eskisi o'zgarmaydi
            ...(v.password ? { password: v.password } : {}),
          })
        : adminsApi.create({ login: v.login, fullName: v.fullName, password: v.password ?? '' }),
    onSuccess: (res) => {
      toast(res.message);
      setEditing(null);
      invalidate();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminsApi.remove(id),
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

  const passwordMutation = useMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) =>
      adminsApi.changeOwnPassword(v.currentPassword, v.newPassword),
    onSuccess: (res) => {
      toast(res.message);
      setChangingPassword(false);
    },
    onError,
  });

  return (
    <>
      <PageHeader
        kickerKey="admins.kicker"
        titleKey="admins.title"
        descriptionKey="admins.subtitle"
        icon={<AdminPanelSettingsRoundedIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            {me && !me.isSuperAdmin && (
              <Button
                startIcon={<KeyRoundedIcon />}
                onClick={() => setChangingPassword(true)}
                sx={{ color: 'text.secondary' }}
              >
                {t('admins.changePassword')}
              </Button>
            )}
            {iAmSuper && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => setEditing('new')}
              >
                {t('admins.add')}
              </Button>
            )}
          </Stack>
        }
      />

      {/* Bosh admin bo'lmaganlarga nega tugmalar yo'qligini tushuntiramiz */}
      {!query.isPending && !iAmSuper && (
        <Paper variant="glassSoft" sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
            <InfoOutlinedIcon fontSize="small" sx={{ color: 'var(--info)', mt: '2px' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }}>
              {t('admins.readOnlyHint')}
            </Typography>
          </Stack>
        </Paper>
      )}

      <CollapsibleSection
        titleKey="admins.list"
        icon={<AdminPanelSettingsRoundedIcon />}
        count={rows.length}
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholderKey="admins.searchPlaceholder"
        />

        {query.isPending ? (
          <TableSkeleton rows={pageSize} columns={4} />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, t('error.unknown'))}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <PagedList
            items={rows}
            pageSize={pageSize}
            resetKey={search}
            empty={
              <EmptyState
                titleKey={search ? 'empty.search' : 'admins.empty'}
                descriptionKey={search ? 'empty.searchHint' : 'admins.emptyHint'}
                icon={<AdminPanelSettingsRoundedIcon />}
                action={
                  iAmSuper && !search
                    ? {
                        labelKey: 'admins.add',
                        onClick: () => setEditing('new'),
                        icon: <AddRoundedIcon />,
                      }
                    : undefined
                }
              />
            }
          >
            {(pageRows) => (
              <Box sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '45%' }}>{t('admins.fullName')}</TableCell>
                      <TableCell align="center">{t('admins.role')}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {t('admins.createdAt')}
                      </TableCell>
                      <TableCell align="right" sx={{ width: '1%', whiteSpace: 'nowrap' }}>
                        {t('common.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {pageRows.map((a) => {
                      const isMe = a.id === admin?.id;
                      // Bosh adminga hech kim tegmaydi — backend ham 409 qaytaradi
                      const canManage = iAmSuper && !a.isSuperAdmin;

                      return (
                        <TableRow key={a.id} hover sx={{ height: 56 }}>
                          <TableCell sx={{ maxWidth: 0 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ minWidth: 0 }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                noWrap
                                title={a.fullName}
                                sx={{ minWidth: 0 }}
                              >
                                {a.fullName}
                              </Typography>
                              {isMe && <MeBadge />}
                            </Stack>
                            <Typography
                              variant="caption"
                              className="tabular"
                              sx={{ color: 'text.secondary' }}
                              noWrap
                              display="block"
                              title={a.login}
                            >
                              {a.login}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <RoleBadge isSuperAdmin={a.isSuperAdmin} />
                              {a.isSuperAdmin && (
                                <Tooltip title={t('admins.superAdminHint')}>
                                  <LockRoundedIcon
                                    fontSize="small"
                                    sx={{ color: 'var(--muted-foreground)', fontSize: 16 }}
                                  />
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell
                            className="tabular"
                            sx={{
                              display: { xs: 'none', md: 'table-cell' },
                              color: 'text.secondary',
                            }}
                          >
                            {formatDate(a.createdAt, lang)}
                          </TableCell>

                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {canManage ? (
                              <>
                                <Tooltip title={t('common.edit')}>
                                  <IconButton size="small" onClick={() => setEditing(a)}>
                                    <EditRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('common.delete')}>
                                  <IconButton
                                    size="small"
                                    onClick={() => setDeleting(a)}
                                    sx={{ color: 'var(--destructive)' }}
                                  >
                                    <DeleteOutlineRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {t('common.none')}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </PagedList>
        )}
      </CollapsibleSection>

      <AdminFormDialog
        value={editing}
        busy={saveMutation.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(v) => saveMutation.mutate(v)}
      />

      <ChangeOwnPasswordDialog
        open={changingPassword}
        busy={passwordMutation.isPending}
        onClose={() => setChangingPassword(false)}
        onSubmit={(v) => passwordMutation.mutate(v)}
      />

      <ConfirmModal
        open={!!deleting}
        titleKey="admins.deleteTitle"
        text={t('admins.deleteText', { name: deleting?.fullName ?? '' })}
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

// ─────────────────────────────── Belgilar ────────────────────────────

/** Admin turi: bosh admin yoki oddiy admin. Rang yagona signal emas — matn ham bor. */
function RoleBadge({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { t } = useTranslation();
  const color = isSuperAdmin ? 'var(--primary)' : 'var(--muted-foreground)';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 'var(--radius-pill)',
        fontSize: '.75rem',
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        color,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      {t(isSuperAdmin ? 'admins.superAdmin' : 'admins.regularAdmin')}
    </Box>
  );
}

/** «Siz» belgisi — ro'yxatda o'z yozuvini topish oson bo'lsin. */
function MeBadge() {
  const { t } = useTranslation();

  return (
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        px: 0.75,
        py: 0.125,
        borderRadius: 'var(--radius-pill)',
        fontSize: '.6875rem',
        fontWeight: 700,
        lineHeight: 1.4,
        color: 'var(--info)',
        background: 'color-mix(in oklab, var(--info) 15%, transparent)',
        border: '1px solid color-mix(in oklab, var(--info) 28%, transparent)',
      }}
    >
      {t('admins.you')}
    </Box>
  );
}

// ─────────────────────────── Forma dialogi ───────────────────────────

interface FormValue {
  id?: number;
  login: string;
  fullName: string;
  password?: string;
}

interface FormProps {
  value: AdminRow | null | 'new';
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: FormValue) => void;
}

function AdminFormDialog({ value, busy, onClose, onSubmit }: FormProps) {
  const { t } = useTranslation();
  const isNew = value === 'new';
  const row = isNew ? null : value;

  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  // Dialog ochilganda maydonlarni to'ldiramiz
  const key = isNew ? 'new' : (row?.id ?? 'none');
  const [lastKey, setLastKey] = useState<string | number>('none');
  if (value && key !== lastKey) {
    setLastKey(key);
    setLogin(row?.login ?? '');
    setFullName(row?.fullName ?? '');
    setPassword('');
    setTouched(false);
  }

  const loginValue = login.trim().toLowerCase();
  const loginInvalid = loginValue.length < 3 || !LOGIN_PATTERN.test(loginValue);
  const nameInvalid = fullName.trim().length < 2;
  // Tahrirlashda parol ixtiyoriy: bo'sh qolsa eski parol saqlanadi
  const passwordInvalid = isNew
    ? password.length < MIN_PASSWORD
    : password.length > 0 && password.length < MIN_PASSWORD;
  const invalid = loginInvalid || nameInvalid || passwordInvalid;

  return (
    <Dialog open={!!value} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t(isNew ? 'admins.createTitle' : 'admins.editTitle')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('admins.fullName')}
            placeholder={t('admins.fullNamePlaceholder')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && nameInvalid}
            helperText={touched && nameInvalid ? t('common.required') : ' '}
            fullWidth
            autoFocus
          />

          <TextField
            label={t('admins.login')}
            placeholder={t('admins.loginPlaceholder')}
            value={login}
            onChange={(e) => setLogin(e.target.value.toLowerCase())}
            onBlur={() => setTouched(true)}
            error={touched && loginInvalid}
            helperText={touched && loginInvalid ? t('admins.loginHint') : ' '}
            fullWidth
            slotProps={{
              htmlInput: { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false },
            }}
          />

          <TextField
            label={t('admins.password')}
            placeholder={t('admins.passwordPlaceholder')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && passwordInvalid}
            helperText={
              touched && passwordInvalid
                ? t('admins.passwordHint')
                : isNew
                  ? t('admins.passwordHint')
                  : t('admins.passwordKeepHint')
            }
            fullWidth
            autoComplete="new-password"
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
              id: row?.id,
              login: loginValue,
              fullName: fullName.trim(),
              password: password || undefined,
            })
          }
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────── O'z parolini almashtirish dialogi ───────────────

interface PasswordProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: { currentPassword: string; newPassword: string }) => void;
}

function ChangeOwnPasswordDialog({ open, busy, onClose, onSubmit }: PasswordProps) {
  const { t } = useTranslation();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [touched, setTouched] = useState(false);

  // Dialog har ochilganda maydonlar tozalanadi
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCurrent('');
      setNext('');
      setTouched(false);
    }
  }

  const currentInvalid = current.length === 0;
  const nextInvalid = next.length < MIN_PASSWORD;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('admins.changePasswordTitle')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('admins.changePasswordHint')}
          </Typography>

          <TextField
            label={t('admins.currentPassword')}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && currentInvalid}
            helperText={touched && currentInvalid ? t('common.required') : ' '}
            fullWidth
            autoFocus
            autoComplete="current-password"
          />

          <TextField
            label={t('admins.newPassword')}
            placeholder={t('admins.passwordPlaceholder')}
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && nextInvalid}
            helperText={t('admins.passwordHint')}
            fullWidth
            autoComplete="new-password"
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ color: 'text.secondary' }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={busy || currentInvalid || nextInvalid}
          onClick={() => onSubmit({ currentPassword: current, newPassword: next })}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
