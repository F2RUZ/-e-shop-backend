import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  titleKey: string;
  /** i18n kaliti + interpolatsiya qiymatlari */
  text: string;
  hintKey?: string;
  confirmKey?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Qaytarib bo'lmaydigan har amal uchun (TZ §7.6).
 * MUI Dialog portal orqali `body` ga chiqadi — shisha panel ichida qolib ketmaydi.
 */
export function ConfirmModal({
  open,
  titleKey,
  text,
  hintKey,
  confirmKey = 'confirm.delete',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Stack
            aria-hidden
            alignItems="center"
            justifyContent="center"
            sx={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: 'var(--radius-md)',
              color: danger ? 'var(--destructive)' : 'var(--warning)',
              background: `color-mix(in oklab, ${danger ? 'var(--destructive)' : 'var(--warning)'} 15%, transparent)`,
            }}
          >
            <WarningAmberRoundedIcon fontSize="small" />
          </Stack>
          <Typography variant="h6" sx={{ minWidth: 0 }}>
            {t(titleKey)}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {text}
        </Typography>
        {hintKey && (
          <Typography variant="body2" sx={{ mt: 1.5, color: 'var(--warning)' }}>
            {t(hintKey)}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          onClick={onConfirm}
          disabled={loading}
        >
          {t(confirmKey)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
