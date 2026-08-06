import type { CSSObject } from '@mui/material/styles';

/**
 * Shishaning 4 darajasi (TZ §4).
 *
 * Qoidalar:
 *  1. `glass` ichida yana `glass` bo'lmaydi — ichkarida faqat `glassSoft`.
 *  2. Bir ekranda 4 tadan ortiq blur qatlami bo'lmaydi.
 *  3. Ro'yxat qatorlariga blur berilmaydi.
 *  4. Dialog/menyu — `glassSolid` (deyarli qattiq), aks holda matn o'qilmaydi.
 */

/** Yuqori qirradagi bir piksel "nur" — shishaga qalinlik hissini beradi. */
const RIM_LIGHT = 'inset 0 1px 0 0 rgba(255,255,255,.14)';

const blur = (px: string) => ({
  backdropFilter: `blur(${px}) saturate(180%)`,
  WebkitBackdropFilter: `blur(${px}) saturate(180%)`,
});

/** 1-daraja — asosiy panel, karta, hero */
export const glass: CSSObject = {
  background: 'color-mix(in oklab, var(--card) var(--glass-opacity), transparent)',
  ...blur('var(--glass-blur)'),
  border: '1px solid var(--glass-rim)',
  borderRadius: 'var(--radius-2xl)',
  boxShadow: `${RIM_LIGHT}, var(--panel-shadow)`,
  backgroundImage: 'none',
};

/** 2-daraja — panel ICHIDAGI blok: toolbar, filtr, pagination */
export const glassSoft: CSSObject = {
  background: 'color-mix(in oklab, var(--card) 40%, transparent)',
  ...blur('16px'),
  border: '1px solid color-mix(in oklab, var(--border) 50%, transparent)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'none',
  backgroundImage: 'none',
};

/** 3-daraja — sidebar va topbar */
export const glassChrome: CSSObject = {
  background: 'color-mix(in oklab, var(--sidebar) 70%, transparent)',
  ...blur('40px'),
  border: '1px solid var(--glass-rim)',
  borderRadius: 'var(--radius-2xl)',
  boxShadow: `${RIM_LIGHT}, var(--panel-shadow-sm)`,
  backgroundImage: 'none',
};

/** 4-daraja — dialog, menyu, tooltip, dropdown (matn ustma-ust tushmasin) */
export const glassSolid: CSSObject = {
  background: 'color-mix(in oklab, var(--popover) 92%, transparent)',
  ...blur('20px'),
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: `${RIM_LIGHT}, var(--panel-shadow)`,
  backgroundImage: 'none',
};

/**
 * `backdrop-filter` qo'llab-quvvatlanmaydigan brauzerlar uchun zaxira:
 * shaffoflik olib tashlanadi, aks holda matn fon ustida o'qilmaydi.
 */
export const glassFallback: CSSObject = {
  '@supports not (backdrop-filter: blur(1px))': {
    '.glass-any': { background: 'var(--card)' },
  },
};
