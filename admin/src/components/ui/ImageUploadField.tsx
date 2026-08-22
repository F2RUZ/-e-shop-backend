import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import { useTranslation } from 'react-i18next';

/** Backend chegarasining nusxasi (TZ §16.1) */
const MAX_MB = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

interface Props {
  /** Serverdagi tayyor havola (yuklangan rasm yoki tashqi havola) */
  imageUrl: string | null | undefined;
  /** Hali yuborilmagan, tanlab qo'yilgan fayl (yangi salon uchun) */
  pendingFile: File | null;
  /** Tashqi havola maydonining qiymati */
  externalUrl: string;
  busy: boolean;
  progress: number | null;
  onPickFile: (file: File | null) => void;
  onExternalUrlChange: (value: string) => void;
  onRemove: () => void;
  onReject: (message: string) => void;
}

/**
 * Salon rasmi: fayldan yuklash YOKI tashqi havola.
 *
 * Ikkalasi birga turmaydi — backend ham shunday ishlaydi: rasm yuklansa
 * tashqi havola tozalanadi va aksincha. Shuning uchun bu yerda ham
 * fayl tanlangan zahoti havola maydoni bo'shatiladi.
 */
export function ImageUploadField({
  imageUrl,
  pendingFile,
  externalUrl,
  busy,
  progress,
  onPickFile,
  onExternalUrlChange,
  onRemove,
  onReject,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Tanlangan faylni yuborishdan OLDIN ko'rsatish uchun vaqtinchalik havola
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setLocalPreview(null);
      return;
    }

    const url = URL.createObjectURL(pendingFile);
    setLocalPreview(url);

    // Xotira oqmasin: obyekt havolasi qo'lda bo'shatiladi
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const pick = (file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      onReject(t('pickupPoints.imageTooBig', { max: MAX_MB }));
      return;
    }

    onExternalUrlChange('');
    onPickFile(file);
  };

  const preview = localPreview ?? imageUrl ?? null;

  return (
    <Stack spacing={1.25}>
      {preview ? (
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={preview}
            alt=""
            sx={{
              width: '100%',
              maxHeight: 200,
              objectFit: 'cover',
              display: 'block',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2, var(--card))',
            }}
          />
          {busy && (
            <LinearProgress
              variant={progress !== null && progress < 100 ? 'determinate' : 'indeterminate'}
              value={progress ?? 0}
              sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 }}
            />
          )}
        </Box>
      ) : (
        <Box
          sx={{
            p: 2.5,
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border)',
            background: 'color-mix(in oklab, var(--card) 40%, transparent)',
          }}
        >
          <ImageRoundedIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" fontWeight={600}>
            {t('pickupPoints.imageEmpty')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('pickupPoints.imageHint', { max: MAX_MB })}
          </Typography>
        </Box>
      )}

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant={preview ? 'text' : 'outlined'}
          startIcon={<UploadRoundedIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {t(preview ? 'pickupPoints.imageReplace' : 'pickupPoints.imagePick')}
        </Button>

        {preview && (
          <Button
            size="small"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={() => {
              onPickFile(null);
              onExternalUrlChange('');
              onRemove();
            }}
            disabled={busy}
            sx={{ color: 'var(--destructive)' }}
          >
            {t('pickupPoints.imageRemove')}
          </Button>
        )}
      </Stack>

      <TextField
        size="small"
        label={t('pickupPoints.imageUrl')}
        placeholder="https://…"
        value={externalUrl}
        onChange={(e) => {
          onExternalUrlChange(e.target.value);
          // Havola yozildi — tanlangan fayl bekor bo'ladi
          if (e.target.value) onPickFile(null);
        }}
        helperText={t('pickupPoints.imageUrlHint')}
        fullWidth
        disabled={busy || !!pendingFile}
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </Stack>
  );
}
