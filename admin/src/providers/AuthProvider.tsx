import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TOKEN_KEY, setUnauthorizedHandler } from '../api/client';
import { authApi } from '../api/endpoints';
import type { Admin } from '../api/types';

interface AuthValue {
  admin: Admin | null;
  ready: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthValue>({
  admin: null,
  ready: false,
  signIn: async () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAdmin(null);
  }, []);

  // 401 kelganda avtomatik chiqarish
  useEffect(() => {
    setUnauthorizedHandler(() => setAdmin(null));
  }, []);

  // Sahifa ochilganda saqlangan token hali amal qilyaptimi tekshiramiz
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    authApi
      .me()
      .then(setAdmin)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    const res = await authApi.login(login, password);
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    setAdmin(res.admin);
  }, []);

  const value = useMemo(() => ({ admin, ready, signIn, signOut }), [admin, ready, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);
