import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../theme/appearance';
import { DEFAULT_THEME, THEME_NAMES, type ThemeName } from '../theme/tokens';

interface ThemeModeValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const Ctx = createContext<ThemeModeValue>({ theme: DEFAULT_THEME, setTheme: () => {} });

const read = (): ThemeName => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const saved = localStorage.getItem(STORAGE_KEYS.theme) as ThemeName | null;
  return saved && THEME_NAMES.includes(saved) ? saved : DEFAULT_THEME;
};

/** Tema `<body>` klassida yashaydi (ko'rinish sozlamalari esa `<html>` da). */
export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(read);

  useEffect(() => {
    const body = document.body;
    THEME_NAMES.forEach((n) => body.classList.remove(n));
    body.classList.add(theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useThemeMode = () => useContext(Ctx);
