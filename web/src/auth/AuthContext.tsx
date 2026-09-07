import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { request, setAccessToken } from '../api/client';

export interface AuthState {
  roles: string[];
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

interface TokenResponse {
  accessToken: string;
  roles: string[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<string[] | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    request<TokenResponse>('/auth/refresh', { method: 'POST' })
      .then((response) => {
        if (cancelled) return;
        setAccessToken(response.accessToken);
        setRoles(response.roles);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const response = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
    });
    setAccessToken(response.accessToken);
    setRoles(response.roles);
  }, []);

  const logout = useCallback(async () => {
    await request<void>('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    setRoles(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      roles: roles ?? [],
      isAuthenticated: roles !== null,
      isRestoring,
      login,
      logout,
    }),
    [roles, isRestoring, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
