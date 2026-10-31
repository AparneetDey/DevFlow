import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/common/Loading.jsx';
import { ProfileHeader } from '../components/profile/ProfileHeader.jsx';
import { ProfileInformation } from '../components/profile/ProfileInformation.jsx';
import { ProfileActions } from '../components/profile/ProfileActions.jsx';
import { mapUserProfile } from '../utils/profileData.js';

/**
 * Top-level Profile Page coordinating authenticated user inspection,
 * modular presentation sections, and session sign-out workflows.
 */
export function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setLogoutError(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to sign out. Please check your connection and try again.'
      );
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, navigate]);

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loading text="Loading profile..." />
      </div>
    );
  }

  const profile = mapUserProfile(user);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileHeader profile={profile} />
      <ProfileInformation profile={profile} />
      <ProfileActions
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        error={logoutError}
      />
    </div>
  );
}

export default ProfilePage;
