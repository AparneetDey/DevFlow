import { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextDef.js';
import authApi from '../api/auth.api.js';
import { setOnSessionExpired } from '../api/client.js';

/**
 * Authentication Context Provider managing global user session state,
 * session restoration on startup, login, registration, and logout operations.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Initial session restoration on application mount
  useEffect(() => {
    let isMounted = true;

    setOnSessionExpired(() => {
      if (isMounted) {
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
    return authenticatedUser;
  }, []);

  // Registration handler
  const register = useCallback(async (userData) => {
    const response = await authApi.register(userData);
    const registeredUser = response.data?.data?.user;
    setUser(registeredUser || null);
    return registeredUser;
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
