import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import { useTranslation } from 'react-i18next';

/** Backend chegarasining nusxasi — o'zimizdan qoida to'qimaymiz (TZ §16.1). */
const MAX_MB = 50;
const ACCEPT = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';

interface Props {
  /** Backend qaytargan tayyor havola. `null` — video yo'q. */
  videoUrl: string | null | undefined;
  busy: boolean;
  /** 0–100 — tarmoq orqali yuborilgan foiz. `null` — yuborilmayapti. */
  progress: number | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  /** Fayl juda katta yoki formati noto'g'ri bo'lsa */
  onReject: (message: string) => void;
}

/**
 * Salonning tanishtiruv videosi.
 *
 * Uchta holat: video yo'q · yuklanmoqda · video bor.
 * Yuklash foizini `onUploadProgress` beradi; 100% ga yetgach javob DARHOL
 * kelmaydi — server videoni siqadi, shuning uchun alohida matn ko'rsatiladi.
 */
export function VideoUploadField({
  videoUrl,
  busy,
  progress,
  onUpload,
  onRemove,
  onReject,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      onReject(t('pickupPoints.videoTooBig', { max: MAX_MB }));
      return;
    }

    onUpload(file);
  };

  // Yuklanmoqda ────────────────────────────────────────────────────
  if (busy) {
    const sending = progress !== null && progress < 100;

    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          background: 'color-mix(in oklab, var(--card) 55%, transparent)',
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" fontWeight={600}>
              {sending ? t('pickupPoints.videoUploading') : t('pickupPoints.videoCompressing')}
            </Typography>
            {sending && (
              <Typography variant="body2" className="tabular" sx={{ color: 'text.secondary' }}>
                {progress}%
              </Typography>
            )}
          </Stack>

          <LinearProgress
            variant={sending ? 'determinate' : 'indeterminate'}
            value={progress ?? 0}
            sx={{ height: 6, borderRadius: 999 }}
          />

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {sending ? t('pickupPoints.videoUploadingHint') : t('pickupPoints.videoCompressingHint')}
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Video bor ──────────────────────────────────────────────────────
  if (videoUrl) {
    return (
      <Stack spacing={1.25}>
        <Box
          component="video"
          src={videoUrl}
          controls
          preload="metadata"
          sx={{
            width: '100%',
            maxHeight: 260,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            background: '#000',
            display: 'block',
          }}
        />

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<UploadRoundedIcon />}
            onClick={() => inputRef.current?.click()}
          >
            {t('pickupPoints.videoReplace')}
          </Button>
          <Button
            size="small"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={onRemove}
            sx={{ color: 'var(--destructive)' }}
          >
            {t('pickupPoints.videoRemove')}
          </Button>
        </Stack>

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

  // Video yo'q ─────────────────────────────────────────────────────
  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files?.[0]);
      }}
      sx={{
        p: 3,
        textAlign: 'center',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed',
        borderColor: dragging ? 'var(--primary)' : 'var(--border)',
        background: dragging
          ? 'color-mix(in oklab, var(--primary) 8%, transparent)'
          : 'color-mix(in oklab, var(--card) 40%, transparent)',
        transition: 'border-color .15s ease, background-color .15s ease',
      }}
    >
      <Stack spacing={1} alignItems="center">
        <VideocamRoundedIcon sx={{ color: 'text.secondary' }} />

        <Typography variant="body2" fontWeight={600}>
          {t('pickupPoints.videoEmpty')}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 360 }}>
          {t('pickupPoints.videoHint', { max: MAX_MB })}
        </Typography>

        <Button
          size="small"
          variant="outlined"
          startIcon={<UploadRoundedIcon />}
          onClick={() => inputRef.current?.click()}
          sx={{ mt: 0.5 }}
        >
          {t('pickupPoints.videoPick')}
        </Button>
      </Stack>

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
    </Box>
  );
}
