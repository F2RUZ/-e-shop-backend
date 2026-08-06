/**
 * Ko'rinish sozlamalari — temadan MUSTAQIL (TZ §8).
 * Shrift turi va o'lchami `<html>` atributlarida, tema esa `<body>` klassida.
 */

// ─────────────────────────── SHRIFT O'LCHAMI ───────────────────────────

export type FontSizeKey = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const FONT_SIZES: Record<FontSizeKey, { px: number; i18nKey: string }> = {
  sm: { px: 14, i18nKey: 'appearance.size.small' },
  md: { px: 16, i18nKey: 'appearance.size.medium' },
  lg: { px: 18, i18nKey: 'appearance.size.large' },
  xl: { px: 20, i18nKey: 'appearance.size.xlarge' },
  xxl: { px: 26, i18nKey: 'appearance.size.max' },
};

export const FONT_SIZE_KEYS = Object.keys(FONT_SIZES) as FontSizeKey[];
export const DEFAULT_FONT_SIZE: FontSizeKey = 'md';

// ─────────────────────────── SHRIFT TURI ───────────────────────────────

export type FontCategory = 'sans' | 'serif' | 'mono' | 'system';

export interface FontOption {
  key: string;
  /** CSS font-family qiymati */
  stack: string;
  /** Google Fonts nomi (tizim shriftida — null) */
  google: string | null;
  category: FontCategory;
  label: string;
}

const SYSTEM_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * ⚠️ Har bir shrift KIRILLNI qo'llab-quvvatlaydi (TZ §9.4).
 * Lato, Poppins, Raleway, Nunito kabi kirillsiz shriftlar ataylab yo'q —
 * ruscha matn boshqa shriftga tushib, sahifa "yamoq" bo'lib ko'rinadi.
 */
export const FONTS: FontOption[] = [
  { key: 'system', label: 'Tizim shrifti', google: null, category: 'system', stack: SYSTEM_STACK },

  { key: 'inter', label: 'Inter', google: 'Inter', category: 'sans', stack: `"Inter", ${SYSTEM_STACK}` },
  { key: 'roboto', label: 'Roboto', google: 'Roboto', category: 'sans', stack: `"Roboto", ${SYSTEM_STACK}` },
  { key: 'open-sans', label: 'Open Sans', google: 'Open Sans', category: 'sans', stack: `"Open Sans", ${SYSTEM_STACK}` },
  { key: 'noto-sans', label: 'Noto Sans', google: 'Noto Sans', category: 'sans', stack: `"Noto Sans", ${SYSTEM_STACK}` },
  { key: 'montserrat', label: 'Montserrat', google: 'Montserrat', category: 'sans', stack: `"Montserrat", ${SYSTEM_STACK}` },
  { key: 'pt-sans', label: 'PT Sans', google: 'PT Sans', category: 'sans', stack: `"PT Sans", ${SYSTEM_STACK}` },
  { key: 'fira-sans', label: 'Fira Sans', google: 'Fira Sans', category: 'sans', stack: `"Fira Sans", ${SYSTEM_STACK}` },
  { key: 'ibm-plex', label: 'IBM Plex Sans', google: 'IBM Plex Sans', category: 'sans', stack: `"IBM Plex Sans", ${SYSTEM_STACK}` },
  { key: 'rubik', label: 'Rubik', google: 'Rubik', category: 'sans', stack: `"Rubik", ${SYSTEM_STACK}` },
  { key: 'manrope', label: 'Manrope', google: 'Manrope', category: 'sans', stack: `"Manrope", ${SYSTEM_STACK}` },

  { key: 'pt-serif', label: 'PT Serif', google: 'PT Serif', category: 'serif', stack: `"PT Serif", Georgia, serif` },
  { key: 'lora', label: 'Lora', google: 'Lora', category: 'serif', stack: `"Lora", Georgia, serif` },

  { key: 'jetbrains', label: 'JetBrains Mono', google: 'JetBrains Mono', category: 'mono', stack: `"JetBrains Mono", ui-monospace, monospace` },
  { key: 'roboto-mono', label: 'Roboto Mono', google: 'Roboto Mono', category: 'mono', stack: `"Roboto Mono", ui-monospace, monospace` },
];

export const DEFAULT_FONT = 'inter';

export const FONT_BY_KEY = new Map(FONTS.map((f) => [f.key, f]));

/** Jadval raqamlari uchun — foydalanuvchi tanlovidan QAT'IY NAZAR o'zgarmaydi. */
export const MONO_STACK = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// ─────────────────────────── localStorage kalitlari ────────────────────

export const STORAGE_KEYS = {
  theme: 'ui-theme',
  fontSize: 'ui-font-size',
  font: 'ui-font',
  lang: 'ui-lang',
  sidebarCollapsed: 'ui-sidebar-collapsed',
} as const;
