import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { productsApi } from '../api/endpoints';
import type { Category, PickupPoint, Product } from '../api/types';

interface Props {
  value: Product | null | 'new';
  categories: Category[];
  pickupPoints: PickupPoint[];
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (e: unknown) => void;
}

const EMPTY = {
  name: '',
  description: '',
  price: '',
  stock: '',
  image: '',
  categoryId: '',
  /** Bo'sh satr — «salon tanlanmagan». Saqlashda `null` bo'lib ketadi. */
  pickupPointId: '',
};

export function ProductFormDialog({
  value,
  categories,
  pickupPoints,
  onClose,
  onSaved,
  onError,
}: Props) {
  const { t } = useTranslation();
  const isNew = value === 'new';
  const product = isNew ? null : value;

  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);

  // Dialog OCHILISH o'tishida to'ldiramiz — qator almashuvida emas.
  // Aks holda xuddi o'sha avtomobilni qayta ochganda eski qiymatlar qolib ketardi.
  const open = !!value;
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setTouched(false);
      setForm(
        product
          ? {
              name: product.name,
              description: product.description ?? '',
              price: String(product.price),
              stock: String(product.stock),
              image: product.image ?? '',
              categoryId: String(product.categoryId),
              pickupPointId: product.pickupPointId != null ? String(product.pickupPointId) : '',
            }
          : EMPTY,
      );
    }
  }

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const errors = {
    name: form.name.trim().length < 2,
    price: !form.price || Number(form.price) <= 0 || Number.isNaN(Number(form.price)),
    categoryId: !form.categoryId,
  };
  const invalid = errors.name || errors.price || errors.categoryId;

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        stock: form.stock === '' ? 0 : Number(form.stock),
        image: form.image.trim() || undefined,
        categoryId: Number(form.categoryId),
        // Salon ixtiyoriy: tanlanmagan bo'lsa `null` — avtomobil salondan chiqadi.
        // Bu maydon `null` qabul qiladigan kam sonli maydonlardan biri.
        pickupPointId: form.pickupPointId === '' ? null : Number(form.pickupPointId),
      };
      return product ? productsApi.update(product.id, body) : productsApi.create(body);
    },
    onSuccess: (res) => onSaved(res.message),
    onError,
  });

  // Faqat FAOL kategoriyalarga qo'shish mumkin — backend qoidasi bilan mos
  const selectable = categories.filter((c) => c.isActive || String(c.id) === form.categoryId);

  return (
    <Dialog open={!!value} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t(isNew ? 'products.createTitle' : 'products.editTitle')}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('products.name')}
            placeholder={t('products.namePlaceholder')}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            onBlur={() => setTouched(true)}
            error={touched && errors.name}
            helperText={touched && errors.name ? t('common.required') : ' '}
            fullWidth
            autoFocus
          />

          <TextField
            select
            label={t('products.category')}
            value={form.categoryId}
            onChange={(e) => set('categoryId')(e.target.value)}
            error={touched && errors.categoryId}
            helperText={touched && errors.categoryId ? t('common.required') : ' '}
            fullWidth
          >
            {selectable.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t('products.pickupPoint')}
            value={form.pickupPointId}
            onChange={(e) => set('pickupPointId')(e.target.value)}
            helperText={t('products.pickupPointHint')}
            fullWidth
          >
            {/* Bo'sh variant SHART: salon majburiy emas */}
            <MenuItem value="">
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {t('products.pickupPointNone')}
              </Box>
            </MenuItem>
            {pickupPoints.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('products.price')}
              value={form.price}
              onChange={(e) => set('price')(e.target.value.replace(/[^\d.]/g, ''))}
              onBlur={() => setTouched(true)}
              error={touched && errors.price}
              helperText={touched && errors.price ? t('common.required') : ' '}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">{t('products.currency')}</InputAdornment>,
                  sx: { fontFamily: 'var(--font-mono)' },
                },
              }}
            />

            <TextField
              label={t('products.stock')}
              value={form.stock}
              onChange={(e) => set('stock')(e.target.value.replace(/[^\d]/g, ''))}
              fullWidth
              helperText=" "
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">{t('products.pieces')}</InputAdornment>,
                  sx: { fontFamily: 'var(--font-mono)' },
                },
              }}
            />
          </Stack>

          <TextField
            label={t('products.image')}
            placeholder={t('products.imagePlaceholder')}
            value={form.image}
            onChange={(e) => set('image')(e.target.value)}
            fullWidth
          />

          {form.image && (
            <Box
              sx={{
                height: 150,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                background: 'var(--muted)',
                display: 'grid',
                placeItems: 'center',
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={form.image}
                alt=""
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = 'none';
                }}
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              <Stack
                alignItems="center"
                sx={{ position: 'absolute', color: 'var(--muted-foreground)', pointerEvents: 'none', zIndex: -1 }}
              >
                <DirectionsCarFilledRoundedIcon />
                <Typography variant="caption">{t('products.image')}</Typography>
              </Stack>
            </Box>
          )}

          <TextField
            label={t('products.description')}
            placeholder={t('products.descriptionPlaceholder')}
            value={form.description}
            onChange={(e) => set('description')(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ color: 'text.secondary' }}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          disabled={save.isPending || invalid}
          onClick={() => {
            setTouched(true);
            if (!invalid) save.mutate();
          }}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
