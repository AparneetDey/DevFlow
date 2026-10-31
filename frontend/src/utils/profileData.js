/**
 * Profile Data Adapter
 *
 * Normalizes and safely formats user data for presentation in profile components,
 * insulating UI components from backend schema variations and missing attributes.
 */

/**
 * Derives a 1-2 character uppercase initials string from a username or email.
 *
 * @param {string} [username='']
 * @param {string} [email='']
 * @returns {string} 1-2 character initials
 */
export function getInitials(username = '', email = '') {
  const name = (username || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    const tokenParts = name.split(/[._-]+/).filter(Boolean);
    if (tokenParts.length >= 2) {
      return (tokenParts[0][0] + tokenParts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  const emailHandle = (email || '').split('@')[0].trim();
  if (emailHandle) {
    const emailParts = emailHandle.split(/[._-]+/).filter(Boolean);
    if (emailParts.length >= 2) {
      return (emailParts[0][0] + emailParts[1][0]).toUpperCase();
    }
    return emailHandle.slice(0, 2).toUpperCase();
  }

  return 'DF';
}

/**
 * Formats an ISO date string into a user-friendly membership date.
 * Gracefully falls back to 'Recently' for missing or invalid dates.
 *
 * @param {string|Date} [dateString]
 * @param {string} [locale='en-US']
 * @returns {string} Formatted date (e.g., 'October 24, 2026')
 */
export function formatMemberSince(dateString, locale = 'en-US') {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Maps raw authenticated user record into a presentation-ready profile model.
 *
 * @param {object|null} user - Raw user document from AuthContext
 * @returns {object} Normalized profile view model
 */
export function mapUserProfile(user) {
  if (!user || typeof user !== 'object') {
    return {
      userId: '',
      username: 'Guest',
      email: '',
      displayName: 'Guest',
      initials: 'DF',
      memberSince: 'Recently',
      rawCreatedAt: null,
      rawUpdatedAt: null,
      role: 'DevFlow Member',
    };
  }

  const username = typeof user.username === 'string' ? user.username.trim() : '';
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  const displayName = username || (email ? email.split('@')[0] : 'User');
  const initials = getInitials(username, email);
  const memberSince = formatMemberSince(user.createdAt);

  return {
    userId: user._id ? String(user._id) : '',
    username: username || 'User',
    email: email || 'No email registered',
    displayName,
    initials,
    memberSince,
    rawCreatedAt: user.createdAt || null,
    rawUpdatedAt: user.updatedAt || null,
    role: 'DevFlow Member',
  };
}

export default mapUserProfile;
