/**
 * ⭐ YAGONA MANBA — butun paneldagi barcha rang, radius, blur va soya SHU YERDA.
 *
 * Boshqa hech qaysi faylda hex/rgb yozilmaydi (AGENTS.md ga qarang).
 * Bu obyektdan ikkita narsa hosil bo'ladi:
 *   1) CSS o'zgaruvchilari  -> cssVars.tsx  (komponentlar `var(--primary)` deb oladi)
 *   2) MUI palitrasi        -> theme.ts     (MUI'ga HAQIQIY hex kerak, `var()` emas)
 */

export type ThemeName = 'night' | 'frost' | 'daylight' | 'deep';

export interface ThemeTokens {
  kind: 'dark' | 'light';
  /** Tema tanlagichda ko'rinadigan i18n kaliti */
  i18nKey: string;

  // ── Asosiy sirtlar ─────────────────────────────────────────
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  // ── Semantik ranglar ───────────────────────────────────────
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;

  // ── Chegara va maydonlar ───────────────────────────────────
  border: string;
  input: string;
  ring: string;

  // ── Holat ranglari ─────────────────────────────────────────
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  destructive: string;
  destructiveForeground: string;
  info: string;
  infoForeground: string;
  violet: string;
  violetForeground: string;

  // ── Yon panel o'z pastki palitrasiga ega ───────────────────
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;

  // ── Diagramma seriyalari (tartibi o'zgarmaydi) ─────────────
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;

  // ── Shakl va soya ──────────────────────────────────────────
  radius: string;
  panelShadow: string;
  panelShadowSm: string;

  // ── Brauzer chrome ─────────────────────────────────────────
  scrollbarThumb: string;
  scrollbarThumbHover: string;

  // ── Yuklanish animatsiyasi ─────────────────────────────────
  skeletonBase: string;
  skeletonSheen: string;

  // ── Shisha retsepti (§4) ───────────────────────────────────
  glassBlur: string;
  glassOpacity: string;
  glassRim: string;

  /** Sahifa orqasidagi rangli "aura" */
  ambient: string;
}

// ═══════════════════════════════════════════════════════════════
//  1) NIGHT — to'q ko'k-kulrang (default)
// ═══════════════════════════════════════════════════════════════
const night: ThemeTokens = {
  kind: 'dark',
  i18nKey: 'theme.night',

  background: '#0b1119',
  foreground: '#eaf1f8',
  card: '#17212b',
  cardForeground: '#eaf1f8',
  popover: '#17212b',
  popoverForeground: '#eaf1f8',

  primary: '#3390ec',
  primaryForeground: '#ffffff',
  secondary: '#232e3c',
  secondaryForeground: '#eaf1f8',
  muted: '#212d39',
  mutedForeground: '#8a9aa9',
  accent: '#232e3c',
  accentForeground: '#eaf1f8',

  border: '#26313d',
  input: '#242f3d',
  ring: '#3390ec',

  success: '#4ade80',
  successForeground: '#052e16',
  warning: '#fbbf24',
  warningForeground: '#3b2400',
  destructive: '#ef5350',
  destructiveForeground: '#ffffff',
  info: '#4ea4f5',
  infoForeground: '#04203a',
  violet: '#c084fc',
  violetForeground: '#2c0a4a',

  sidebar: '#141e28',
  sidebarForeground: '#eaf1f8',
  sidebarPrimary: '#3390ec',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#2b5278',
  sidebarAccentForeground: '#eaf1f8',
  sidebarBorder: '#222d38',
  sidebarRing: '#3390ec',

  chart1: '#3390ec',
  chart2: '#4ea4f5',
  chart3: '#6fb4f2',
  chart4: '#2b5278',
  chart5: '#8ec5ff',

  radius: '0.75rem',
  panelShadow: '0 18px 50px -18px rgba(0,0,0,.65)',
  panelShadowSm: '0 8px 24px -14px rgba(0,0,0,.55)',

  scrollbarThumb: 'rgba(138,154,169,.28)',
  scrollbarThumbHover: 'rgba(138,154,169,.45)',

  skeletonBase: 'rgba(138,154,169,.10)',
  skeletonSheen: 'rgba(138,154,169,.20)',

  glassBlur: '30px',
  glassOpacity: '60%',
  glassRim: 'rgba(255,255,255,.08)',

  ambient: 'radial-gradient(1000px 600px at 50% -8%, rgba(51,144,236,.10), transparent 62%)',
};

// ═══════════════════════════════════════════════════════════════
//  2) FROST — grafit + ko'k nur (App Store uslubi)
// ═══════════════════════════════════════════════════════════════
const frost: ThemeTokens = {
  kind: 'dark',
  i18nKey: 'theme.frost',

  background: '#161617',
  foreground: '#f5f5f7',
  card: '#2c2c2e',
  cardForeground: '#f5f5f7',
  popover: '#2c2c2e',
  popoverForeground: '#f5f5f7',

  primary: '#0a84ff',
  primaryForeground: '#ffffff',
  secondary: '#2c2c2e',
  secondaryForeground: '#f5f5f7',
  muted: '#2c2c2e',
  mutedForeground: '#98989d',
  accent: '#3a3a3c',
  accentForeground: '#f5f5f7',

  border: '#38383a',
  input: '#2c2c2e',
  ring: '#0a84ff',

  success: '#30d158',
  successForeground: '#04210d',
  warning: '#ffd60a',
  warningForeground: '#332900',
  destructive: '#ff453a',
  destructiveForeground: '#ffffff',
  info: '#0a84ff',
  infoForeground: '#ffffff',
  violet: '#bf5af2',
  violetForeground: '#2a0940',

  sidebar: '#1c1c1e',
  sidebarForeground: '#f5f5f7',
  sidebarPrimary: '#0a84ff',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#2c2c2e',
  sidebarAccentForeground: '#0a84ff',
  sidebarBorder: '#2f2f31',
  sidebarRing: '#0a84ff',

  chart1: '#0a84ff',
  chart2: '#409cff',
  chart3: '#64d2ff',
  chart4: '#5e5ce6',
  chart5: '#bf5af2',

  radius: '0.875rem',
  panelShadow: '0 18px 50px -18px rgba(0,0,0,.7)',
  panelShadowSm: '0 8px 24px -14px rgba(0,0,0,.6)',

  scrollbarThumb: 'rgba(152,152,157,.28)',
  scrollbarThumbHover: 'rgba(152,152,157,.45)',

  skeletonBase: 'rgba(152,152,157,.10)',
  skeletonSheen: 'rgba(152,152,157,.22)',

  glassBlur: '40px',
  glassOpacity: '55%',
  glassRim: 'rgba(255,255,255,.10)',

  ambient: 'radial-gradient(1200px 600px at 50% -10%, rgba(10,132,255,.08), transparent 60%)',
};

// ═══════════════════════════════════════════════════════════════
//  3) DAYLIGHT — yagona YORUG' tema (liquid glass)
// ═══════════════════════════════════════════════════════════════
const daylight: ThemeTokens = {
  kind: 'light',
  i18nKey: 'theme.daylight',

  background: '#eaf1fb',
  foreground: '#1c1c1e',
  card: '#ffffff',
  cardForeground: '#1c1c1e',
  popover: '#ffffff',
  popoverForeground: '#1c1c1e',

  primary: '#007aff',
  primaryForeground: '#ffffff',
  secondary: '#e7eef7',
  secondaryForeground: '#1c1c1e',
  muted: '#eef3f9',
  mutedForeground: '#6b7688',
  accent: '#e2ecf9',
  accentForeground: '#1c1c1e',

  border: '#d6e0ec',
  input: '#ffffff',
  ring: '#007aff',

  success: '#16a34a',
  successForeground: '#ffffff',
  warning: '#d97706',
  warningForeground: '#ffffff',
  destructive: '#ff3b30',
  destructiveForeground: '#ffffff',
  info: '#0284c7',
  infoForeground: '#ffffff',
  violet: '#9333ea',
  violetForeground: '#ffffff',

  sidebar: '#ffffff',
  sidebarForeground: '#1c1c1e',
  sidebarPrimary: '#007aff',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#e2ecf9',
  sidebarAccentForeground: '#007aff',
  sidebarBorder: '#dce5f0',
  sidebarRing: '#007aff',

  chart1: '#007aff',
  chart2: '#34c1ff',
  chart3: '#5ac8fa',
  chart4: '#5e5ce6',
  chart5: '#af52de',

  radius: '1rem',
  // Yorug' temada soya YENGIL bo'ladi
  panelShadow: '0 18px 44px -20px rgba(11,18,32,.26)',
  panelShadowSm: '0 8px 20px -14px rgba(11,18,32,.20)',

  scrollbarThumb: 'rgba(107,118,136,.30)',
  scrollbarThumbHover: 'rgba(107,118,136,.48)',

  skeletonBase: 'rgba(107,118,136,.12)',
  skeletonSheen: 'rgba(107,118,136,.22)',

  // Yorug' temada shaffoflik KAM — aks holda matn o'qilmaydi
  glassBlur: '24px',
  glassOpacity: '70%',
  glassRim: 'rgba(255,255,255,.60)',

  ambient: [
    'radial-gradient(900px 500px at 12% 8%, rgba(90,200,250,.35), transparent 55%)',
    'radial-gradient(900px 600px at 88% 18%, rgba(120,160,255,.30), transparent 55%)',
    'radial-gradient(1000px 700px at 50% 110%, rgba(175,82,222,.16), transparent 55%)',
  ].join(', '),
};

// ═══════════════════════════════════════════════════════════════
//  4) DEEP — chuqur navy + nur chiziqlari
// ═══════════════════════════════════════════════════════════════
const deep: ThemeTokens = {
  kind: 'dark',
  i18nKey: 'theme.deep',

  background: '#0a1326',
  foreground: '#eaf0ff',
  card: '#13223f',
  cardForeground: '#eaf0ff',
  popover: '#13223f',
  popoverForeground: '#eaf0ff',

  primary: '#4a90ff',
  primaryForeground: '#ffffff',
  secondary: '#1a2b4c',
  secondaryForeground: '#eaf0ff',
  muted: '#162542',
  mutedForeground: '#90a2c8',
  accent: '#1d3157',
  accentForeground: '#eaf0ff',

  border: '#24365e',
  input: '#162542',
  ring: '#4a90ff',

  success: '#34d399',
  successForeground: '#022c22',
  warning: '#fbbf24',
  warningForeground: '#3b2400',
  destructive: '#ff5a5f',
  destructiveForeground: '#ffffff',
  info: '#4a90ff',
  infoForeground: '#ffffff',
  violet: '#c084fc',
  violetForeground: '#2c0a4a',

  sidebar: '#0c1830',
  sidebarForeground: '#eaf0ff',
  sidebarPrimary: '#4a90ff',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#1d3157',
  sidebarAccentForeground: '#eaf0ff',
  sidebarBorder: '#1e2f52',
  sidebarRing: '#4a90ff',

  chart1: '#4a90ff',
  chart2: '#6aa8ff',
  chart3: '#8ec5ff',
  chart4: '#5e5ce6',
  chart5: '#a0c4ff',

  radius: '0.875rem',
  panelShadow: '0 18px 50px -18px rgba(0,0,0,.7)',
  panelShadowSm: '0 8px 24px -14px rgba(0,0,0,.6)',

  scrollbarThumb: 'rgba(144,162,200,.28)',
  scrollbarThumbHover: 'rgba(144,162,200,.45)',

  skeletonBase: 'rgba(144,162,200,.10)',
  skeletonSheen: 'rgba(144,162,200,.22)',

  glassBlur: '32px',
  glassOpacity: '58%',
  glassRim: 'rgba(255,255,255,.09)',

  ambient: [
    'radial-gradient(900px 500px at 15% 0%, rgba(74,144,255,.16), transparent 55%)',
    'radial-gradient(900px 600px at 85% 20%, rgba(94,92,230,.14), transparent 55%)',
  ].join(', '),
};

export const THEMES: Record<ThemeName, ThemeTokens> = { night, frost, daylight, deep };

export const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export const DEFAULT_THEME: ThemeName = 'night';

/** camelCase -> kebab-case (chart1 -> chart-1) */
const kebab = (s: string) => s.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();

/**
 * Tema tokenlarini CSS o'zgaruvchilari obyektiga aylantiradi.
 * `kind` va `i18nKey` — bular meta ma'lumot, CSS'ga chiqmaydi.
 */
export function toCssVars(name: ThemeName): Record<string, string> {
  const tokens = THEMES[name];
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'kind' || key === 'i18nKey') continue;
    out[`--${kebab(key)}`] = value as string;
  }

  // Radius shkalasi — hammasi --radius dan hosil bo'ladi (§3.3)
  out['--radius-sm'] = 'calc(var(--radius) * .6)';
  out['--radius-md'] = 'calc(var(--radius) * .8)';
  out['--radius-lg'] = 'var(--radius)';
  out['--radius-xl'] = 'calc(var(--radius) * 1.4)';
  out['--radius-2xl'] = 'calc(var(--radius) * 1.8)';
  out['--radius-pill'] = '980px';

  return out;
}
