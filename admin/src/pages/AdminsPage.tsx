import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
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

/** Cheklovlar backend DTO'lari bilan AYNAN bir xil — shunda "Saqlash" bosilib 400 kelmaydi. */
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 72;
const MIN_LOGIN = 3;
const MAX_LOGIN = 50;
const MIN_NAME = 2;
const MAX_NAME = 100;

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
    mutationFn: (v: FormValue) =>
      v.id
        ? adminsApi.update(v.id, {
            // bosh adminda login umuman yuborilmaydi — backend uni rad etadi
            ...(v.login ? { login: v.login } : {}),
            fullName: v.fullName,
            // parol bo'sh qoldirilsa — eskisi o'zgarmaydi
            ...(v.password ? { password: v.password } : {}),
          })
        : adminsApi.create({
            login: v.login ?? '',
            fullName: v.fullName,
            password: v.password ?? '',
          }),
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
          // Ro'yxat yuklanmaguncha kim ekanimizni bilmaymiz (isSuperAdmin faqat
          // ro'yxatdan keladi) — shuning uchun tugmalar shundan keyin chiziladi
          !query.isSuccess ? undefined : (
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
          )
        }
      />

      {/*
        Oddiy adminga nega tugmalar yo'qligini tushuntiramiz.
        Xato holatida ko'rsatilmaydi — u paytda kim ekanimiz noma'lum.
        Blur berilmagan: AGENTS.md bir ekranda 4 tadan ortiq blur qatlamini taqiqlaydi.
      */}
      {query.isSuccess && !iAmSuper && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: 'var(--radius-xl)',
            background: 'color-mix(in oklab, var(--info) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--info) 24%, transparent)',
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
            <InfoOutlinedIcon fontSize="small" sx={{ color: 'var(--info)', mt: '2px' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }}>
              {t('admins.readOnlyHint')}
            </Typography>
          </Stack>
        </Box>
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
                      // Bosh adminda faqat ISM o'zgaradi (login/parol emas),
                      // o'chirish esa hech qachon mumkin emas — backend ham 409 qaytaradi
                      const canEdit = iAmSuper;
                      const canDelete = iAmSuper && !a.isSuperAdmin;

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
                                // SVG fokus olmaydi — tooltip klaviatura bilan ham
                                // ochilishi uchun fokuslanadigan span ichiga olamiz
                                <Tooltip title={t('admins.superAdminHint')}>
                                  <Box
                                    component="span"
                                    tabIndex={0}
                                    role="note"
                                    aria-label={t('admins.superAdminHint')}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      borderRadius: 'var(--radius-sm)',
                                    }}
                                  >
                                    <LockRoundedIcon
                                      fontSize="small"
                                      sx={{ color: 'var(--muted-foreground)' }}
                                    />
                                  </Box>
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
                            {canEdit || canDelete ? (
                              <>
                                {canEdit && (
                                  <Tooltip
                                    title={
                                      a.isSuperAdmin ? t('admins.editNameOnly') : t('common.edit')
                                    }
                                  >
                                    <IconButton size="small" onClick={() => setEditing(a)}>
                                      <EditRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {canDelete && (
                                  <Tooltip title={t('common.delete')}>
                                    <IconButton
                                      size="small"
                                      onClick={() => setDeleting(a)}
                                      sx={{ color: 'var(--destructive)' }}
                                    >
                                      <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
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

/**
 * Kichkina yumaloq belgi (pill).
 *
 * Rang YAGONA signal emas: nuqta + fon + chegara + matn birga ishlaydi —
 * shunda rangni ajratmaydigan foydalanuvchi ham farqni ko'radi (AGENTS.md §11.5).
 * Rang har doim token orqali keladi, hech qachon qotib yozilmaydi.
 */
function Pill({ color, label, dot = true }: { color: string; label: string; dot?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 0.75 : 0,
        px: dot ? 1.25 : 0.75,
        py: dot ? 0.5 : 0.125,
        borderRadius: 'var(--radius-pill)',
        fontSize: dot ? '.75rem' : '.6875rem',
        fontWeight: dot ? 600 : 700,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        color,
        background: `color-mix(in oklab, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
      }}
    >
      {dot && (
        <Box
          component="span"
          aria-hidden
          sx={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}
        />
      )}
      {label}
    </Box>
  );
}

/** Admin turi: bosh admin yoki oddiy admin. */
function RoleBadge({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { t } = useTranslation();

  return (
    <Pill
      color={isSuperAdmin ? 'var(--primary)' : 'var(--muted-foreground)'}
      label={t(isSuperAdmin ? 'admins.superAdmin' : 'admins.regularAdmin')}
    />
  );
}

/** «Siz» belgisi — ro'yxatda o'z yozuvini topish oson bo'lsin. */
function MeBadge() {
  const { t } = useTranslation();

  return <Pill color="var(--info)" label={t('admins.you')} dot={false} />;
}

// ─────────────────────────── Forma dialogi ───────────────────────────

interface FormValue {
  id?: number;
  /** Bosh adminni tahrirlaganda yuborilmaydi — uning logini o'zgarmaydi. */
  login?: string;
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
  const open = !!value;

  const [login, setLogin] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  /**
   * Maydonlar dialog YOPIQ holatdan OCHIQ holatga o'tganda tozalanadi.
   *
   * Nega aynan ochilish kuzatiladi (qaysi qator tanlangani emas): dialog
   * yopilgach ham komponent ekranda qoladi. Agar faqat qator almashuvini
   * kuzatsak, XUDDI O'SHA qatorni qayta ochganda eski qiymatlar — jumladan
   * yozib qo'yilgan PAROL — maydonda qolib ketardi va bilmasdan saqlanardi.
   *
   * `snapshot` esa yopilish animatsiyasi paytida sarlavha va qulflar
   * sakrab ketmasligi uchun: `value` darhol `null` bo'ladi, dialog esa
   * yana ~200 ms ko'rinib turadi.
   */
  const [wasOpen, setWasOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{ isNew: boolean; row: AdminRow | null }>({
    isNew: false,
    row: null,
  });

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const openingNew = value === 'new';
      const openingRow = openingNew ? null : (value as AdminRow);
      setSnapshot({ isNew: openingNew, row: openingRow });
      setLogin(openingRow?.login ?? '');
      setFullName(openingRow?.fullName ?? '');
      setPassword('');
      setTouched(false);
    }
  }

  const { isNew, row } = snapshot;
  // Bosh adminda faqat ism o'zgaradi — login va parol maydonlari yopiladi
  const isSuper = row?.isSuperAdmin ?? false;

  const loginValue = login.trim().toLowerCase();
  const nameValue = fullName.trim();

  const loginInvalid =
    !isSuper &&
    (loginValue.length < MIN_LOGIN ||
      loginValue.length > MAX_LOGIN ||
      !LOGIN_PATTERN.test(loginValue));
  const nameInvalid = nameValue.length < MIN_NAME || nameValue.length > MAX_NAME;
  // Tahrirlashda parol ixtiyoriy: bo'sh qolsa eski parol saqlanadi
  const passwordInvalid =
    !isSuper &&
    ((isNew && password.length < MIN_PASSWORD) ||
      (password.length > 0 && password.length < MIN_PASSWORD) ||
      password.length > MAX_PASSWORD);
  const invalid = loginInvalid || nameInvalid || passwordInvalid;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t(isNew ? 'admins.createTitle' : 'admins.editTitle')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {isSuper && (
            <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <LockRoundedIcon fontSize="small" sx={{ color: 'var(--warning)', mt: '2px' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }}>
                {t('admins.superAdminEditHint')}
              </Typography>
            </Stack>
          )}

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
            helperText={
              isSuper
                ? t('admins.superAdminLoginLocked')
                : touched && loginInvalid
                  ? t('admins.loginHint')
                  : ' '
            }
            disabled={isSuper}
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
              isSuper
                ? t('admins.superAdminPasswordLocked')
                : isNew || password.length > 0
                  ? t('admins.passwordHint')
                  : t('admins.passwordKeepHint')
            }
            disabled={isSuper}
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
              // bosh adminda login va parol umuman yuborilmaydi
              login: isSuper ? undefined : loginValue,
              fullName: nameValue,
              password: isSuper ? undefined : password || undefined,
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
