import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, AuthUser, setAuthToken, getAuthToken } from '../services/api';

const INACTIVITY_LIMIT_SECONDS = 30 * 60; // 30 menit

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  sessionNotice: string | null;
  remainingSeconds: number;
  login: (username: string, password: string) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(INACTIVITY_LIMIT_SECONDS);
  const lastActivityRef = useRef<number>(Date.now());

  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setRemainingSeconds(INACTIVITY_LIMIT_SECONDS);
  }, []);

  const logout = useCallback(async (reason?: string) => {
    try {
      if (getAuthToken()) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // Ignore logout network error
    } finally {
      setAuthToken(null);
      setUser(null);
      if (reason) {
        setSessionNotice(reason);
      }
    }
  }, []);

  // Verify token on initial load
  useEffect(() => {
    async function verifySession() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data);
        resetActivityTimer();
      } catch {
        setAuthToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    verifySession();
  }, [resetActivityTimer]);

  // Listen for 401 unauthorized events from Axios interceptor
  useEffect(() => {
    const handleUnauthorized = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setAuthToken(null);
      setUser(null);
      setSessionNotice(
        customEvent.detail || 'Sesi berakhir otomatis karena tidak aktif selama 30 menit.'
      );
    };
    window.addEventListener('sim-asrama:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('sim-asrama:unauthorized', handleUnauthorized);
  }, []);

  // Client-side 30-minute inactivity tracker
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const left = Math.max(0, INACTIVITY_LIMIT_SECONDS - elapsedSeconds);
      setRemainingSeconds(left);

      if (left <= 0) {
        logout('Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 30 menit.');
      }
    }, 5000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      window.clearInterval(interval);
    };
  }, [user, logout]);

  const login = async (username: string, password: string) => {
    setSessionNotice(null);
    const res = await apiClient.post('/auth/login', { username, password });
    const { token, user: loggedInUser } = res.data;
    setAuthToken(token);
    setUser(loggedInUser);
    resetActivityTimer();
  };

  const clearNotice = () => setSessionNotice(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sessionNotice,
        remainingSeconds,
        login,
        logout,
        clearNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
