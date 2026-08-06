import { useEffect, useState } from 'react';

interface Options {
  /** Bitta qator balandligi (px) — barcha qatorlarda BIR XIL bo'lishi shart */
  rowHeight?: number;
  /** Sarlavha, toolbar, pagination va boshqa doimiy elementlar egallagan joy */
  reserved?: number;
  min?: number;
  max?: number;
}

/**
 * Sahifadagi qator sonini EKRAN BALANDLIGIDAN hisoblaydi (TZ §7A.4).
 *
 * Qat'iy "10 tadan" yozilmaydi: noutbukda ham, katta monitorda ham
 * sahifa aynan to'ladi va bo'sh joy qolmaydi.
 *
 * SSR: `window` yo'q paytda `min` qaytadi, mount'dan keyin aniqlashadi.
 */
export function useAutoPageSize({
  rowHeight = 56,
  reserved = 380,
  min = 5,
  max = 30,
}: Options = {}): number {
  const calc = () => {
    if (typeof window === 'undefined') return min;
    const usable = window.innerHeight - reserved;
    return Math.max(min, Math.min(max, Math.floor(usable / rowHeight)));
  };

  const [size, setSize] = useState(calc);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize(calc()));
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowHeight, reserved, min, max]);

  return size;
}
