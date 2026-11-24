import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/client.js';
import { getCurrentUser, logout as logoutRequest } from '../api/auth.js';

// Central login state. Every protected page reads from here, so they all behave the same.
// status: 'loading' while we ask the server who we are, then 'authenticated', 'anonymous' or 'error'.
const AuthContext = createContext(null);

const ANONYMOUS = { status: 'anonymous', user: null, error: null };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null });

  const loadSession = useCallback(async () => {
    setState({ status: 'loading', user: null, error: null });
    try {
      const { user } = await getCurrentUser();
      setState({ status: 'authenticated', user, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState(ANONYMOUS);
      } else {
        setState({ status: 'error', user: null, error: err.message });
      }
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signIn = useCallback((user) => setState({ status: 'authenticated', user, error: null }), []);

  // Used when any API call says the session has ended.
  const markSignedOut = useCallback(() => setState(ANONYMOUS), []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // Clear local state even if the request failed. The server session expires anyway.
      setState(ANONYMOUS);
    }
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, markSignedOut, retry: loadSession }),
    [state, signIn, signOut, markSignedOut, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
