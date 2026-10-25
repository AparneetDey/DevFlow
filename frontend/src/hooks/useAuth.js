import { useContext } from 'react';
import { AuthContext } from '../context/authContextDef.js';

/**
 * Custom React hook to consume the central Authentication Context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
