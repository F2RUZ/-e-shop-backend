/**
 * Raqam, pul va sana formatlash — HAR DOIM tilga qarab (TZ §9.6).
 * Qo'lda `toLocaleString()` siz formatlanmaydi.
 */

export const formatNumber = (value: number, lang: string) =>
  new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ').format(value);

/** Katta summalarni qisqartiradi: 189 576 000 000 -> 189.6 mlrd */
export function formatCompactMoney(value: number, lang: string): string {
  const ru = lang === 'ru';
  const units: [number, string][] = ru
    ? [
        [1e12, ' трлн'],
        [1e9, ' млрд'],
        [1e6, ' млн'],
        [1e3, ' тыс'],
      ]
    : [
        [1e12, ' trln'],
        [1e9, ' mlrd'],
        [1e6, ' mln'],
        [1e3, ' ming'],
      ];

  for (const [factor, suffix] of units) {
    if (Math.abs(value) >= factor) {
      const n = value / factor;
      return (
        new Intl.NumberFormat(ru ? 'ru-RU' : 'uz-UZ', {
          maximumFractionDigits: n < 10 ? 1 : 0,
        }).format(n) + suffix
      );
    }
  }
  return formatNumber(value, lang);
}

export const formatDate = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

export const formatDateTime = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
