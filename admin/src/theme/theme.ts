import { createTheme, type Theme } from '@mui/material/styles';
import { ruRU } from '@mui/material/locale';
import { glass, glassChrome, glassSoft, glassSolid } from './glass';
import { THEMES, type ThemeName } from './tokens';

/**
 * 2-QATLAM — MUI theme.
 *
 * ⚠️ A-VARIANT (TZ §5.2): MUI palitrasiga HAQIQIY hex beriladi, `var()` emas.
 * Sabab: alpha() / lighten() / darken() CSS `var()` ni parse qila olmaydi va
 * butun panel qora rangga aylanib qoladi. Ikkala tomon ham `tokens.ts` dan
 * oziqlanadi — yagona manba saqlanadi.
 */

const TRANSITION = 'cubic-bezier(.4,0,.2,1)';

/** Status rangi asosidagi yumshoq fon: `color-mix` (oklab) */
const soft = (v: string, pct = 15) => `color-mix(in oklab, ${v} ${pct}%, transparent)`;

export function buildTheme(name: ThemeName, lang: string): Theme {
  const t = THEMES[name];

  return createTheme(
    {
      palette: {
        mode: t.kind,
        primary: { main: t.primary, contrastText: t.primaryForeground },
        secondary: { main: t.secondary, contrastText: t.secondaryForeground },
        error: { main: t.destructive, contrastText: t.destructiveForeground },
        warning: { main: t.warning, contrastText: t.warningForeground },
        info: { main: t.info, contrastText: t.infoForeground },
        success: { main: t.success, contrastText: t.successForeground },
        background: { default: t.background, paper: t.card },
        text: { primary: t.foreground, secondary: t.mutedForeground },
        divider: t.border,
      },

      shape: { borderRadius: parseFloat(t.radius) * 16 },

      // 1 birlik = 0.5rem -> shrift o'lchami o'sganda ORALIQLAR HAM o'sadi (TZ §5.4)
      spacing: (factor: number) => `${0.5 * factor}rem`,

      typography: {
        fontFamily: 'var(--font-ui)',
        htmlFontSize: 16, // ⚠️ O'ZGARTIRILMAYDI — html font-size o'zi kattalashtiradi
        h1: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15 },
        h2: { fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.015em' },
        h3: { fontSize: '1.25rem', fontWeight: 700 },
        h4: { fontSize: '1.0625rem', fontWeight: 700 },
        h5: { fontSize: '1rem', fontWeight: 700 },
        h6: { fontSize: '.9375rem', fontWeight: 700 },
        subtitle1: { fontSize: '.9375rem', fontWeight: 600 },
        subtitle2: { fontSize: '.875rem', fontWeight: 600 },
        body1: { fontSize: '.875rem' },
        body2: { fontSize: '.8125rem' },
        caption: { fontSize: '.6875rem', letterSpacing: '.04em' },
        // ⚠️ MAJBURIY: kirillda UPPERCASE o'qishni qiyinlashtiradi (TZ §5.3, §9.2)
        button: { textTransform: 'none', fontWeight: 600 },
      },

      components: {
        // ─────────────────────────── BASELINE ───────────────────────
        MuiCssBaseline: {
          styleOverrides: {
            '#root': { minHeight: '100dvh' },
            a: { color: 'var(--primary)', textDecoration: 'none' },
          },
        },

        // ⭐ ENG MUHIM — MUI barcha sirtlarni Paper'dan quradi
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              backgroundImage: 'none', // MUI'ning dark-mode elevation overlay'ini o'chiradi
              transition: `background-color .25s ease, border-color .25s ease`,
            },
          },
          variants: [
            { props: { variant: 'glass' }, style: glass },
            { props: { variant: 'glassSoft' }, style: glassSoft },
            { props: { variant: 'glassChrome' }, style: glassChrome },
            { props: { variant: 'glassSolid' }, style: glassSolid },
          ],
        },

        MuiCard: {
          defaultProps: { variant: 'glass' as never },
          styleOverrides: { root: { borderRadius: 'var(--radius-2xl)' } },
        },
        MuiCardContent: {
          styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
        },

        // ─────────────────────────── CHROME ─────────────────────────
        MuiAppBar: {
          defaultProps: { elevation: 0, color: 'transparent' },
          styleOverrides: {
            root: { ...glassChrome, boxShadow: 'none', backgroundImage: 'none' },
          },
        },

        MuiDrawer: {
          styleOverrides: {
            paper: { ...glassChrome, borderRadius: 0, border: 'none' },
          },
        },

        // ─────────────────────── QATLAMLI SIRTLAR ───────────────────
        MuiDialog: {
          defaultProps: { PaperProps: { variant: 'glassSolid' as never } },
          styleOverrides: { paper: { borderRadius: 'var(--radius-2xl)' } },
        },
        MuiBackdrop: {
          styleOverrides: {
            root: {
              backgroundColor: 'rgba(0,0,0,.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            },
          },
        },
        MuiMenu: {
          defaultProps: { elevation: 0 },
          styleOverrides: { paper: { ...glassSolid } },
        },
        MuiPopover: {
          defaultProps: { elevation: 0 },
          styleOverrides: { paper: { ...glassSolid } },
        },
        MuiMenuItem: {
          styleOverrides: {
            root: {
              borderRadius: 'var(--radius-md)',
              margin: '2px 6px',
              minHeight: 38,
              fontSize: '.875rem',
              '&:hover': { background: 'var(--accent)' },
              '&.Mui-selected': {
                background: soft('var(--primary)', 18),
                color: 'var(--primary)',
                '&:hover': { background: soft('var(--primary)', 26) },
              },
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              ...glassSolid,
              borderRadius: 'var(--radius-md)',
              fontSize: '.75rem',
              padding: '6px 10px',
              color: 'var(--popover-foreground)',
            },
            arrow: { color: 'var(--popover)' },
          },
        },

        // ─────────────────────────── AMALLAR ────────────────────────
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: {
              borderRadius: 'var(--radius-md)',
              minWidth: 0, // ⚠️ ruscha uzun matn uchun (TZ §9.2)
              padding: '7px 16px',
              transition: `transform .2s ${TRANSITION}, background-color .15s ease, box-shadow .2s ease`,
              '&:hover': { transform: 'translateY(-1px)' },
              '&:active': { transform: 'scale(.98)' },
            },
            contained: { boxShadow: 'var(--panel-shadow-sm)' },
            outlined: { borderColor: 'var(--border)' },
          },
          variants: [
            {
              props: { variant: 'soft' },
              style: {
                background: soft('var(--primary)', 14),
                color: 'var(--primary)',
                '&:hover': { background: soft('var(--primary)', 22) },
              },
            },
          ],
        },

        MuiIconButton: {
          styleOverrides: {
            root: {
              borderRadius: 'var(--radius-md)', // doira emas
              transition: `background-color .15s ease, transform .2s ${TRANSITION}`,
              '&:hover': { background: 'var(--accent)' },
              '&:active': { transform: 'scale(.94)' },
            },
          },
        },

        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: '.75rem',
              height: 24,
            },
            outlined: { borderColor: 'var(--border)' },
          },
        },

        // ─────────────────────────── MAYDONLAR ──────────────────────
        MuiTextField: { defaultProps: { size: 'small' } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in oklab, var(--input) 70%, transparent)',
              '& fieldset': { borderColor: 'var(--border)' },
              '&:hover fieldset': { borderColor: 'var(--ring)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--ring)', borderWidth: 2 },
            },
            input: { fontSize: '.875rem' },
          },
        },
        MuiInputLabel: { styleOverrides: { root: { fontSize: '.875rem' } } },
        MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2, fontSize: '.75rem' } } },
        MuiSelect: { defaultProps: { size: 'small' } },

        MuiSwitch: {
          styleOverrides: {
            switchBase: { '&.Mui-checked': { color: 'var(--primary)' } },
            track: { backgroundColor: 'var(--muted-foreground)' },
          },
        },
        MuiCheckbox: { styleOverrides: { root: { color: 'var(--muted-foreground)' } } },
        MuiRadio: { styleOverrides: { root: { color: 'var(--muted-foreground)' } } },

        // ─────────────────────────── JADVAL (§7A.3) ─────────────────
        MuiTableContainer: {
          styleOverrides: { root: { background: 'transparent', boxShadow: 'none' } },
        },
        MuiTable: { styleOverrides: { root: { borderCollapse: 'separate', borderSpacing: 0 } } },
        MuiTableHead: {
          styleOverrides: {
            root: {
              '& .MuiTableCell-root': {
                fontSize: '.6875rem',
                fontWeight: 700,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                color: 'var(--muted-foreground)',
                background: 'transparent',
                height: 40,
                whiteSpace: 'nowrap',
                borderBottom: '1px solid var(--border)',
              },
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              transition: 'background-color .15s ease',
              '&:last-of-type .MuiTableCell-root': { borderBottom: 'none' },
            },
            hover: { '&:hover': { backgroundColor: soft('var(--accent)', 40) } },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderBottom: `1px solid ${soft('var(--border)', 50)}`,
              padding: '12px',
              fontSize: '.8125rem',
            },
            sizeSmall: { padding: '8px 12px' },
          },
        },

        // ─────────────────────────── NAVIGATSIYA ────────────────────
        MuiTabs: {
          styleOverrides: {
            root: { minHeight: 40 },
            indicator: { height: 2, borderRadius: 'var(--radius-pill)', background: 'var(--primary)' },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '.875rem' },
          },
        },

        // ─────────────────────────── HOLATLAR ───────────────────────
        MuiLinearProgress: {
          styleOverrides: {
            root: { borderRadius: 'var(--radius-pill)', background: 'var(--muted)', height: 6 },
            bar: { borderRadius: 'var(--radius-pill)' },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: { borderRadius: 'var(--radius-xl)', fontSize: '.8125rem' },
            standardSuccess: { background: soft('var(--success)'), color: 'var(--success)' },
            standardWarning: { background: soft('var(--warning)'), color: 'var(--warning)' },
            standardError: { background: soft('var(--destructive)'), color: 'var(--destructive)' },
            standardInfo: { background: soft('var(--info)'), color: 'var(--info)' },
          },
        },
        MuiSkeleton: {
          defaultProps: { animation: 'wave' },
          styleOverrides: {
            root: { backgroundColor: 'var(--skeleton-base)', borderRadius: 'var(--radius-md)' },
          },
        },
        MuiDivider: { styleOverrides: { root: { borderColor: soft('var(--border)', 60) } } },
        MuiListItemIcon: { styleOverrides: { root: { minWidth: 34, color: 'inherit' } } },
      },
    },
    // MUI'ning O'Z ichki matnlari (pagination, select va h.k.) — TZ §9.6
    lang === 'ru' ? ruRU : {},
  );
}
