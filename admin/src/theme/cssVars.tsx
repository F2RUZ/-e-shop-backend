import GlobalStyles from '@mui/material/GlobalStyles';
import { FONTS, FONT_SIZES, MONO_STACK } from './appearance';
import { THEME_NAMES, toCssVars } from './tokens';

/**
 * 1-QATLAM CSS'ga chiqadi.
 *
 * Tema `<body class="night">` bilan almashadi, shrift/o'lcham esa
 * `<html data-font data-font-size>` bilan — ikkisi bir-biriga xalaqit bermaydi.
 */

// Har tema uchun bitta selektor: body.night { --primary: ... }
const themeBlocks = Object.fromEntries(
  THEME_NAMES.map((name) => [`body.${name}`, toCssVars(name)]),
);

// Shrift o'lchamlari: html[data-font-size="lg"] { --font-size-base: 18px }
const sizeBlocks = Object.fromEntries(
  Object.entries(FONT_SIZES).map(([key, { px }]) => [
    `html[data-font-size="${key}"]`,
    { '--font-size-base': `${px}px` },
  ]),
);

// Shrift turlari: html[data-font="inter"] { --font-ui: "Inter", ... }
const fontBlocks = Object.fromEntries(
  FONTS.map((f) => [`html[data-font="${f.key}"]`, { '--font-ui': f.stack }]),
);

export function CssVariables() {
  return (
    <GlobalStyles
      styles={{
        ':root': {
          '--font-size-base': '16px',
          '--font-ui': FONTS[1].stack, // Inter
          '--font-mono': MONO_STACK,
        },

        ...themeBlocks,
        ...sizeBlocks,
        ...fontBlocks,

        html: {
          fontSize: 'var(--font-size-base)',
          // Tema almashuvi — faqat rang animatsiya qilinadi (TZ §10)
          colorScheme: 'dark light',
        },

        body: {
          fontFamily: 'var(--font-ui)',
          background: 'var(--background)',
          color: 'var(--foreground)',
          transition: 'background-color .25s ease, color .25s ease',
          minHeight: '100dvh',
        },

        // ── Ambient fon (TZ §6.3) — ALOHIDA fixed qatlam ────────────
        '.ambient': {
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: 'var(--ambient)',
          overflow: 'hidden',
        },
        '.ambient::before': {
          content: '""',
          position: 'absolute',
          inset: '-20%',
          background: [
            'radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 42%)',
            'radial-gradient(circle at 80% 65%, color-mix(in oklab, var(--chart-2) 16%, transparent), transparent 46%)',
          ].join(', '),
          filter: 'blur(46px)',
          animation: 'aurora 26s ease-in-out infinite',
        },
        '@keyframes aurora': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-2%,0) scale(1.06)' },
        },

        // ── Scrollbar ────────────────────────────────────────────────
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': {
          background: 'var(--scrollbar-thumb)',
          borderRadius: 999,
          border: '2px solid transparent',
          backgroundClip: 'content-box',
        },
        '*::-webkit-scrollbar-thumb:hover': { background: 'var(--scrollbar-thumb-hover)' },
        '*': { scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar-thumb) transparent' },

        // ── Tanlash va fokus ─────────────────────────────────────────
        '::selection': {
          background: 'color-mix(in oklab, var(--primary) 35%, transparent)',
          color: 'var(--foreground)',
        },
        ':focus-visible': {
          outline: '2px solid var(--ring)',
          outlineOffset: 2,
          borderRadius: 'var(--radius-sm)',
        },

        // Raqamlar kengligi sakramasin
        '.tabular': { fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)' },

        // ── Harakatni kamaytirish rejimi (TZ §10, §11) ───────────────
        '@media (prefers-reduced-motion: reduce)': {
          '.ambient::before': { animation: 'none' },
          '*, *::before, *::after': {
            animationDuration: '.01ms !important',
            transitionDuration: '.01ms !important',
          },
        },

        // ── backdrop-filter yo'q brauzerlar uchun zaxira (TZ §4.3) ───
        '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
          '.MuiPaper-root': { background: 'var(--card) !important' },
        },
      }}
    />
  );
}
