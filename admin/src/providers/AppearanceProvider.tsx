import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  FONT_BY_KEY,
  FONT_SIZE_KEYS,
  STORAGE_KEYS,
  type FontSizeKey,
} from '../theme/appearance';

interface AppearanceValue {
  fontSize: FontSizeKey;
  setFontSize: (s: FontSizeKey) => void;
  font: string;
  setFont: (f: string) => void;
}

const Ctx = createContext<AppearanceValue>({
  fontSize: DEFAULT_FONT_SIZE,
  setFontSize: () => {},
  font: DEFAULT_FONT,
  setFont: () => {},
});

const readSize = (): FontSizeKey => {
  if (typeof window === 'undefined') return DEFAULT_FONT_SIZE;
  const s = localStorage.getItem(STORAGE_KEYS.fontSize) as FontSizeKey | null;
  return s && FONT_SIZE_KEYS.includes(s) ? s : DEFAULT_FONT_SIZE;
};

const readFont = (): string => {
  if (typeof window === 'undefined') return DEFAULT_FONT;
  const f = localStorage.getItem(STORAGE_KEYS.font);
  return f && FONT_BY_KEY.has(f) ? f : DEFAULT_FONT;
};

/** Ko'rinish `<html>` atributlarida yashaydi — temaga umuman tegmaydi. */
export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setSizeState] = useState<FontSizeKey>(readSize);
  const [font, setFontState] = useState<string>(readFont);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize);
    localStorage.setItem(STORAGE_KEYS.fontSize, fontSize);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', font);
    localStorage.setItem(STORAGE_KEYS.font, font);
  }, [font]);

  const setFontSize = useCallback((s: FontSizeKey) => setSizeState(s), []);
  const setFont = useCallback((f: string) => setFontState(f), []);

  const value = useMemo(
    () => ({ fontSize, setFontSize, font, setFont }),
    [fontSize, setFontSize, font, setFont],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppearance = () => useContext(Ctx);
