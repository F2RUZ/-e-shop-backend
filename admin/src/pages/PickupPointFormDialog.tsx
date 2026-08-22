import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { PickupPoint, PickupPointPayload } from '../api/types';
import { ImageUploadField } from '../components/ui/ImageUploadField';
import { MapPicker } from '../components/ui/MapPicker';

export interface PickupPointSubmit {
  id?: number;
  body: PickupPointPayload;
  /** Tanlangan rasm — saqlangandan KEYIN alohida so'rov bilan yuboriladi */
  imageFile: File | null;
  /** Yuklangan rasmni o'chirish kerakmi */
  removeImage: boolean;
}

interface Props {
  value: PickupPoint | null | 'new';
  busy: boolean;
  onClose: () => void;
  onSubmit: (v: PickupPointSubmit) => void;
  onReject: (message: string) => void;
}

/**
 * Salon qo'shish / tahrirlash.
 *
 * Tekshiruvlar backend DTO'sining NUSXASI (TZ §16.1) — bu yerda o'zimizdan
 * qoida to'qilmaydi. Telefon ataylab bo'sh qo'yilgan: backend uni o'zi
 * tozalab `+998901234567` ko'rinishiga keltiradi, shuning uchun faqat
 * raqamlar soni tekshiriladi.
 */
export function PickupPointFormDialog({ value, busy, onClose, onSubmit, onReject }: Props) {
  const { t } = useTranslation();

  const open = !!value;

  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    opensAt: '09:00',
    closesAt: '19:00',
    image: '',
  });
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [touched, setTouched] = useState(false);

  // Dialog OCHILISH o'tishini kuzatamiz — qator almashuvini emas.
  // Aks holda xuddi o'sha salonni qayta ochganda eski qiymatlar qolib ketardi.
  const [wasOpen, setWasOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{ isNew: boolean; row: PickupPoint | null }>({
    isNew: false,
    row: null,
  });

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      const isNew = value === 'new';
      const row = isNew ? null : (value as PickupPoint);

      setSnapshot({ isNew, row });
      setTouched(false);
      setImageFile(null);
      setRemoveImage(false);
      setForm({
        name: row?.name ?? '',
        city: row?.city ?? '',
        address: row?.address ?? '',
        phone: row?.phone ?? '',
        opensAt: row?.opensAt ?? '09:00',
        closesAt: row?.closesAt ?? '19:00',
        image: row?.image ?? '',
      });
      setCoords({ lat: row?.latitude ?? null, lng: row?.longitude ?? null });
    }
  }

  // Yopilish animatsiyasida sarlavha sakramasin uchun surat ishlatiladi
  const { isNew, row } = snapshot;

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const digits = form.phone.replace(/\D/g, '').length;

  const errors = {
    name: form.name.trim().length < 2 || form.name.trim().length > 150,
    city: form.city.trim().length < 2 || form.city.trim().length > 100,
    address: form.address.trim().length < 5 || form.address.trim().length > 300,
    phone: digits !== 9 && digits !== 12,
    time: form.closesAt <= form.opensAt,
  };

  const invalid = Object.values(errors).some(Boolean);

  // Tugmani JIM o'chirib qo'yish yomon: foydalanuvchi nima yetishmayotganini
  // bilmay qoladi. Shuning uchun tugma doim bosiladi, bosilganda esa
  // xato maydonlar belgilanadi va pastda ro'yxati chiqadi.
  const missing = (
    [
      ['name', errors.name],
      ['city', errors.city],
      ['address', errors.address],
      ['phone', errors.phone],
      ['hours', errors.time],
    ] as const
  )
    .filter(([, bad]) => bad)
    .map(([field]) => t(`pickupPoints.${field}`));

  const submit = () => {
    // Xatolar bo'lsa yubormaymiz, lekin SABABINI ko'rsatamiz
    if (invalid) {
      setTouched(true);
      return;
    }

    onSubmit({
      id: row?.id,
      body: {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        opensAt: form.opensAt,
        closesAt: form.closesAt,
        // `null` — koordinatani tozalash. Backend buni ataylab qo'llab-quvvatlaydi.
        latitude: coords.lat,
        longitude: coords.lng,
        // Fayl tanlangan bo'lsa tashqi havola yuborilmaydi — ikkalasi birga turmaydi
        image: imageFile ? null : form.image.trim() || null,
      },
      imageFile,
      removeImage,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      // `paper` — ichki qism scroll bo'ladi, sarlavha va tugmalar joyida
      // qoladi. Xarita qo'shilgach dialog balandlashdi, shusiz «Saqlash»
      // tugmasi ekrandan chiqib ketardi.
      scroll="paper"
      slotProps={{ paper: { sx: { maxHeight: 'calc(100dvh - 48px)' } } }}
    >
      <DialogTitle>
        {t(isNew ? 'pickupPoints.createTitle' : 'pickupPoints.editTitle')}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('pickupPoints.name')}
            placeholder={t('pickupPoints.namePlaceholder')}
            value={form.name}
            onChange={set('name')}
            onBlur={() => setTouched(true)}
            error={touched && errors.name}
            helperText={touched && errors.name ? t('pickupPoints.nameError') : ' '}
            fullWidth
            autoFocus
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('pickupPoints.city')}
              placeholder={t('pickupPoints.cityPlaceholder')}
              value={form.city}
              onChange={set('city')}
              onBlur={() => setTouched(true)}
              error={touched && errors.city}
              helperText={touched && errors.city ? t('pickupPoints.cityError') : ' '}
              fullWidth
            />

            <TextField
              label={t('pickupPoints.phone')}
              placeholder={t('pickupPoints.phonePlaceholder')}
              value={form.phone}
              onChange={set('phone')}
              onBlur={() => setTouched(true)}
              error={touched && errors.phone}
              helperText={touched && errors.phone ? t('pickupPoints.phoneError') : t('pickupPoints.phoneHint')}
              fullWidth
            />
          </Stack>

          <TextField
            label={t('pickupPoints.address')}
            placeholder={t('pickupPoints.addressPlaceholder')}
            value={form.address}
            onChange={set('address')}
            onBlur={() => setTouched(true)}
            error={touched && errors.address}
            helperText={touched && errors.address ? t('pickupPoints.addressError') : ' '}
            fullWidth
            multiline
            minRows={2}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label={t('pickupPoints.opensAt')}
              type="time"
              value={form.opensAt}
              onChange={set('opensAt')}
              error={touched && errors.time}
              helperText=" "
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={t('pickupPoints.closesAt')}
              type="time"
              value={form.closesAt}
              onChange={set('closesAt')}
              onBlur={() => setTouched(true)}
              error={touched && errors.time}
              helperText={touched && errors.time ? t('pickupPoints.timeError') : ' '}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <Box>
            <Typography variant="subtitle2">{t('pickupPoints.coords')}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('pickupPoints.coordsHint')}
            </Typography>
          </Box>

          <MapPicker
            latitude={coords.lat}
            longitude={coords.lng}
            onChange={(lat, lng) => setCoords({ lat, lng })}
            onResolved={(result) => {
              // Xaritadan nuqta belgilandi — SHAHAR va MANZIL o'zi to'ladi.
              //
              // Salon NOMIGA tegilmaydi: u biznes nomi («Magnate Motors — Yunusobod»),
              // manzildan kelib chiqmaydi va uni foydalanuvchi o'zi yozadi.
              setForm((prev) => ({
                ...prev,
                city: result.city ?? prev.city,
                address: result.address ?? prev.address,
              }));
            }}
            addressHint={[form.address, form.city].filter(Boolean).join(', ')}
          />

          <Box>
            <Typography variant="subtitle2">{t('pickupPoints.image')}</Typography>
          </Box>

          <ImageUploadField
            imageUrl={removeImage ? null : row?.imageUrl}
            pendingFile={imageFile}
            externalUrl={form.image}
            busy={busy}
            progress={null}
            onPickFile={(file) => {
              setImageFile(file);
              if (file) setRemoveImage(false);
            }}
            onExternalUrlChange={(v) => setForm((prev) => ({ ...prev, image: v }))}
            onRemove={() => setRemoveImage(true)}
            onReject={onReject}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1, flexWrap: 'wrap' }}>
        {touched && invalid && (
          <Typography
            variant="caption"
            role="alert"
            sx={{ color: 'var(--destructive)', flex: 1, minWidth: 200, textAlign: 'left' }}
          >
            {t('pickupPoints.fixFields', { fields: missing.join(', ') })}
          </Typography>
        )}

        <Button onClick={onClose} disabled={busy} sx={{ color: 'text.secondary' }}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" disabled={busy} onClick={submit}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
