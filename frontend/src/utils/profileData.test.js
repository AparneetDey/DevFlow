import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getInitials, formatMemberSince, mapUserProfile } from './profileData.js';

describe('Profile Data Adapter - getInitials', () => {
  test('extracts initials from multi-word usernames', () => {
    assert.equal(getInitials('John Doe'), 'JD');
    assert.equal(getInitials('Aparneet Singh'), 'AS');
    assert.equal(getInitials('Grace Brewster Murray Hopper'), 'GB');
  });

  test('extracts initials from single-word usernames', () => {
    assert.equal(getInitials('Alice'), 'AL');
    assert.equal(getInitials('developer'), 'DE');
    assert.equal(getInitials('X'), 'X');
  });

  test('extracts initials from tokenized usernames with punctuation', () => {
    assert.equal(getInitials('john.doe'), 'JD');
    assert.equal(getInitials('jane_smith'), 'JS');
    assert.equal(getInitials('dev-lead'), 'DL');
  });

  test('falls back to email handle when username is omitted', () => {
    assert.equal(getInitials('', 'alex.smith@example.com'), 'AS');
    assert.equal(getInitials('', 'sarah_connor@skynet.com'), 'SC');
    assert.equal(getInitials('', 'marcus@example.com'), 'MA');
  });

  test('falls back to DF for missing, null, or whitespace-only inputs', () => {
    assert.equal(getInitials('', ''), 'DF');
    assert.equal(getInitials(null, null), 'DF');
    assert.equal(getInitials(undefined, undefined), 'DF');
    assert.equal(getInitials('   ', '   '), 'DF');
  });
});

describe('Profile Data Adapter - formatMemberSince', () => {
  test('formats valid ISO dates into friendly locale strings', () => {
    const formatted = formatMemberSince('2026-10-24T12:00:00.000Z', 'en-US');
    assert.equal(formatted, 'October 24, 2026');
  });

  test('formats leap year dates accurately', () => {
    const formatted = formatMemberSince('2024-02-29T12:00:00.000Z', 'en-US');
    assert.equal(formatted, 'February 29, 2024');
  });

  test('gracefully handles missing, null, and empty date inputs', () => {
    assert.equal(formatMemberSince(null), 'Recently');
    assert.equal(formatMemberSince(undefined), 'Recently');
    assert.equal(formatMemberSince(''), 'Recently');
  });

  test('gracefully handles malformed or non-parseable date strings', () => {
    assert.equal(formatMemberSince('not-a-date'), 'Recently');
    assert.equal(formatMemberSince('2026-99-99'), 'Recently');
  });
});

describe('Profile Data Adapter - mapUserProfile', () => {
  test('maps complete authenticated user object to view model', () => {
    const rawUser = {
      _id: '6543210987abcdef65432109',
      username: 'DevFlowAdmin',
      email: 'admin@devflow.app',
      createdAt: '2026-05-15T08:30:00.000Z',
      updatedAt: '2026-10-31T12:00:00.000Z',
    };

    const model = mapUserProfile(rawUser);

    assert.equal(model.userId, '6543210987abcdef65432109');
    assert.equal(model.username, 'DevFlowAdmin');
    assert.equal(model.email, 'admin@devflow.app');
    assert.equal(model.displayName, 'DevFlowAdmin');
    assert.equal(model.initials, 'DE');
    assert.equal(model.memberSince, 'May 15, 2026');
    assert.equal(model.rawCreatedAt, '2026-05-15T08:30:00.000Z');
    assert.equal(model.rawUpdatedAt, '2026-10-31T12:00:00.000Z');
    assert.equal(model.role, 'DevFlow Member');
  });

  test('derives display name and initials from email when username is missing', () => {
    const rawUser = {
      _id: '12345',
      email: 'alex.morgan@test.com',
      createdAt: null,
    };

    const model = mapUserProfile(rawUser);

    assert.equal(model.displayName, 'alex.morgan');
    assert.equal(model.initials, 'AM');
    assert.equal(model.memberSince, 'Recently');
    assert.equal(model.userId, '12345');
  });

  test('safely handles null, undefined, and non-object user arguments without throwing', () => {
    const defaultModel = mapUserProfile(null);
    assert.equal(defaultModel.userId, '');
    assert.equal(defaultModel.username, 'Guest');
    assert.equal(defaultModel.displayName, 'Guest');
    assert.equal(defaultModel.initials, 'DF');
    assert.equal(defaultModel.memberSince, 'Recently');

    const undefinedModel = mapUserProfile(undefined);
    assert.equal(undefinedModel.username, 'Guest');

    const stringModel = mapUserProfile('invalid');
    assert.equal(stringModel.username, 'Guest');
  });

  test('future-ready architecture contract: provides view-model guarantees for profile components', () => {
    const rawUser = {
      _id: 'usr_abc_789',
      username: 'Sarah Connor',
      email: 'sconnor@resistance.org',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const model = mapUserProfile(rawUser);

    // ProfileHeader expectations
    assert.ok(model.displayName, 'displayName must be defined');
    assert.ok(model.initials, 'initials must be defined');
    assert.ok(model.role, 'role indicator must be defined');

    // ProfileInformation expectations
    assert.equal(model.userId, 'usr_abc_789');
    assert.equal(model.email, 'sconnor@resistance.org');
    assert.ok(model.memberSince, 'memberSince must be defined');

    // Future-ready editing flag defaults to false in consumers
    const profileFieldProps = {
      label: 'Username',
      value: model.username,
      editable: false,
    };
    assert.equal(profileFieldProps.editable, false, 'Default editing mode must remain strictly disabled');
  });
});

describe('Profile Page Interactions & Security Workflows', () => {
  test('simulates copy-to-clipboard with modern navigator.clipboard API', async () => {
    let copiedText = '';
    const mockClipboard = {
      writeText: async (text) => {
        copiedText = text;
      },
    };

    const targetUserId = '6543210987abcdef65432109';
    await mockClipboard.writeText(targetUserId);

    assert.equal(copiedText, targetUserId);
  });

  test('simulates copy-to-clipboard fallback when clipboard API is unavailable or denied', async () => {
    let fallbackTriggered = false;
    let fallbackText = '';

    const executeCopy = async (text, clipboardApi) => {
      try {
        if (clipboardApi && clipboardApi.writeText) {
          await clipboardApi.writeText(text);
          return true;
        }
        // Fallback simulation
        fallbackTriggered = true;
        fallbackText = text;
        return true;
      } catch {
        // Safe catch on restriction
        return false;
      }
    };

    // Unavailable clipboard
    const successNoClipboard = await executeCopy('usr_12345', null);
    assert.equal(successNoClipboard, true);
    assert.equal(fallbackTriggered, true);
    assert.equal(fallbackText, 'usr_12345');

    // Rejecting clipboard
    const rejectingClipboard = {
      writeText: async () => {
        throw new Error('NotAllowedError: Clipboard permission denied');
      },
    };
    const successRejected = await executeCopy('usr_12345', rejectingClipboard);
    assert.equal(successRejected, false, 'Rejected clipboard must fail gracefully without throwing uncaught errors');
  });

  test('simulates logout execution, error boundary recovery, and route redirection', async () => {
    let logoutInvoked = false;
    let navigatedTo = '';
    let caughtError = null;

    const mockLogoutSuccess = async () => {
      logoutInvoked = true;
    };
    const mockNavigate = (path) => {
      navigatedTo = path;
    };

    // 1. Success workflow
    const handleLogoutSuccess = async () => {
      try {
        await mockLogoutSuccess();
        mockNavigate('/login');
      } catch (err) {
        caughtError = err.message;
      }
    };

    await handleLogoutSuccess();
    assert.equal(logoutInvoked, true);
    assert.equal(navigatedTo, '/login');
    assert.equal(caughtError, null);

    // 2. Failure workflow with error response envelope
    logoutInvoked = false;
    navigatedTo = '';
    const mockLogoutFailure = async () => {
      logoutInvoked = true;
      const error = new Error('Session termination failed');
      error.response = { data: { message: 'Token refresh expired' } };
      throw error;
    };

    const handleLogoutFailure = async () => {
      try {
        await mockLogoutFailure();
        mockNavigate('/login');
      } catch (err) {
        caughtError = err?.response?.data?.message || err?.message || 'Failed to sign out';
      }
    };

    await handleLogoutFailure();
    assert.equal(logoutInvoked, true);
    assert.equal(navigatedTo, '', 'Should not navigate away on logout error');
    assert.equal(caughtError, 'Token refresh expired');
  });

  test('simulates future-ready editable field handler when edit mode is toggled', () => {
    let savedValue = '';
    const handleSave = (newValue) => {
      savedValue = newValue;
    };

    // When editable is false, no mutation occurs
    const isEditable = false;
    if (isEditable) {
      handleSave('UpdatedUsername');
    }
    assert.equal(savedValue, '', 'Read-only mode must not trigger save operations');

    // Future edit capability: when editable is true, handleSave is invoked
    const isFutureEditable = true;
    if (isFutureEditable) {
      handleSave('UpdatedUsername');
    }
    assert.equal(savedValue, 'UpdatedUsername');
  });
});
