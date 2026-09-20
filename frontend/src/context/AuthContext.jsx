import { createContext, useContext, useState, useCallback } from 'react';

/**
 * AuthContext  minimal demo auth.
 * Phase 1: credentials are checked against hardcoded values.
 * Phase 4+: swap for real JWT/session mechanism if needed.
 *
 * Stored in localStorage so a page refresh doesn't log the user out.
 */

const DEMO_CREDENTIALS = { username: 'admin', password: 'kohler2024' };
const STORAGE_KEY = 'kohler_facility_auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((username, password) => {
    if (
      username === DEMO_CREDENTIALS.username &&
      password === DEMO_CREDENTIALS.password
    ) {
      const session = {
        username,
        role: 'Facility Administrator',
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setUser(session);
      return { ok: true };
    }
    return { ok: false, error: 'Invalid username or password.' };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
