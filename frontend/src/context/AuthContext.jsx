import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from './authContextDef.js';
import authApi from '../api/auth.api.js';
import { setOnSessionExpired } from '../api/client.js';

/**
 * Authentication Context Provider managing global user session state,
 * session restoration on startup, login, registration, logout operations,
 * and automated session expiration feedback.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Reusable session verification
  const checkAuth = useCallback(async () => {
    try {
      const response = await authApi.getCurrentUser();
      setUser(response.data?.data || null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  // Initial session restoration on application mount
  useEffect(() => {
    let isMounted = true;

    setOnSessionExpired(() => {
      if (isMounted) {
        // Only surface expiration if an active authenticated user session was invalidated
        if (userRef.current) {
          setSessionExpired(true);
        }
        setUser(null);
      }
    });

    async function restoreSession() {
      try {
        const response = await authApi.getCurrentUser();
        if (isMounted) {
          setUser(response.data?.data || null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
      setOnSessionExpired(null);
    };
  }, []);

  // Login handler
  const login = useCallback(async (credentials) => {
    const response = await authApi.login(credentials);
    const authenticatedUser = response.data?.data?.user;
    setUser(authenticatedUser || null);
    setSessionExpired(false);
    return authenticatedUser;
  }, []);

  // Registration handler
  const register = useCallback(async (userData) => {
    const response = await authApi.register(userData);
    const registeredUser = response.data?.data?.user;
    setUser(registeredUser || null);
    setSessionExpired(false);
    return registeredUser;
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      userRef.current = null;
      setUser(null);
      setSessionExpired(false);
    }
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    sessionExpired,
    clearSessionExpired,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
