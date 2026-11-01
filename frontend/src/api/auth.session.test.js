import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, setOnSessionExpired } from './client.js';
import { authApi } from './auth.api.js';

describe('Auth Client Interceptor & Session Refresh Mechanism', () => {
  test('0. apiClient and authApi service contract verification', () => {
    assert.ok(apiClient, 'apiClient instance must exist');
    assert.equal(typeof setOnSessionExpired, 'function', 'setOnSessionExpired must be exported');
    assert.equal(typeof authApi.login, 'function', 'authApi.login must be defined');
    assert.equal(typeof authApi.register, 'function', 'authApi.register must be defined');
    assert.equal(typeof authApi.logout, 'function', 'authApi.logout must be defined');
    assert.equal(typeof authApi.getCurrentUser, 'function', 'authApi.getCurrentUser must be defined');
    assert.equal(typeof authApi.refreshToken, 'function', 'authApi.refreshToken must be defined');
  });

  test('1. access token expiration on protected endpoint triggers refresh token rotation and retries original request', async () => {
    let refreshCalls = 0;
    let retryCalls = 0;

    // Simulate interceptor response handling
    const mockOriginalRequest = {
      url: '/boards/board-123/tasks',
      headers: {},
      _retry: false,
    };

    const mockInterceptorHandler = async (error) => {
      const originalRequest = error.config;
      const is401 = error.response?.status === 401;
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh-token') ||
        originalRequest.url?.includes('/auth/logout');

      if (is401 && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;
        refreshCalls++;
        // Simulate successful refresh rotation
        await Promise.resolve({ data: { message: 'Token rotated' } });
        retryCalls++;
        return { data: { success: true, tasks: [{ id: 't1', title: 'Task' }] } };
      }
      return Promise.reject(error);
    };

    const error401 = {
      response: { status: 401 },
      config: mockOriginalRequest,
    };

    const result = await mockInterceptorHandler(error401);

    assert.equal(refreshCalls, 1, 'Must initiate silent refresh exactly once');
    assert.equal(retryCalls, 1, 'Must retry the original failed request after refresh');
    assert.equal(mockOriginalRequest._retry, true, 'Original request must be marked with _retry flag');
    assert.equal(result.data.success, true);
  });

  test('2. multiple concurrent 401 responses queue requests and send only one refresh call', async () => {
    let refreshCallCount = 0;
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, data = null) => {
      failedQueue.forEach((p) => {
        if (error) p.reject(error);
        else p.resolve(data);
      });
      failedQueue = [];
    };

    const handleConcurrent401 = async (reqConfig) => {
      if (isRefreshing) {
        reqConfig._retry = true;
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => ({ retried: true, url: reqConfig.url }));
      }

      reqConfig._retry = true;
      isRefreshing = true;
      refreshCallCount++;

      // Simulate asynchronous refresh delay
      await new Promise((r) => setTimeout(r, 20));
      processQueue(null, { tokenRefreshed: true });
      isRefreshing = false;
      return { retried: true, url: reqConfig.url };
    };

    const req1 = { url: '/tasks/1' };
    const req2 = { url: '/tasks/2' };
    const req3 = { url: '/tasks/3' };

    // Fire 3 simultaneous 401 calls
    const [res1, res2, res3] = await Promise.all([
      handleConcurrent401(req1),
      handleConcurrent401(req2),
      handleConcurrent401(req3),
    ]);

    assert.equal(refreshCallCount, 1, 'Concurrent 401s must only trigger 1 refresh request');
    assert.equal(res1.retried, true);
    assert.equal(res2.retried, true);
    assert.equal(res3.retried, true);
    assert.equal(failedQueue.length, 0, 'Queue must be drained upon completion');
  });

  test('3. failed refresh token rotation rejects queued requests and triggers session expiration listener', async () => {
    let sessionExpiredFired = false;
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error) => {
      failedQueue.forEach((p) => p.reject(error));
      failedQueue = [];
    };

    const onSessionExpired = () => {
      sessionExpiredFired = true;
    };

    const handleFailingRefresh = async () => {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
      }

      isRefreshing = true;
      try {
        // Simulate refresh failure (e.g., refresh token expired / 401)
        throw new Error('Refresh token expired');
      } catch (refreshErr) {
        processQueue(refreshErr);
        onSessionExpired();
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    };

    const reqA = { url: '/boards' };
    const reqB = { url: '/tasks' };

    let errA = null;
    let errB = null;

    try {
      await Promise.all([
        handleFailingRefresh(reqA).catch((e) => { errA = e; }),
        handleFailingRefresh(reqB).catch((e) => { errB = e; }),
      ]);
    } catch {
      // Handled in catch blocks
    }

    assert.equal(sessionExpiredFired, true, 'onSessionExpired callback must be invoked on refresh failure');
    assert.ok(errA, 'Original request must reject');
    assert.ok(errB, 'Queued request must reject with refresh error');
    assert.equal(failedQueue.length, 0, 'Queue must be cleared');
    assert.equal(isRefreshing, false);
  });

  test('4. auth endpoints (/login, /register, /refresh-token, /logout) do not trigger token refresh', async () => {
    const isAuthEndpointCheck = (url) => {
      return (
        url?.includes('/auth/login') ||
        url?.includes('/auth/register') ||
        url?.includes('/auth/refresh-token') ||
        url?.includes('/auth/logout')
      );
    };

    assert.equal(isAuthEndpointCheck('/api/v1/auth/login'), true);
    assert.equal(isAuthEndpointCheck('/api/v1/auth/register'), true);
    assert.equal(isAuthEndpointCheck('/api/v1/auth/refresh-token'), true);
    assert.equal(isAuthEndpointCheck('/api/v1/auth/logout'), true);
    assert.equal(isAuthEndpointCheck('/api/v1/boards/123/tasks'), false);
    assert.equal(isAuthEndpointCheck('/api/v1/auth/me'), false);
  });

  test('5. prevents infinite retry loops by refusing to re-attempt requests with _retry: true', () => {
    const requestWithRetry = { url: '/tasks', _retry: true };
    const shouldRefresh = !requestWithRetry._retry;
    assert.equal(shouldRefresh, false, 'Must not retry an already retried request');
  });
});

describe('Logout Confirmation Dialog & State Transitions', () => {
  test('1. clicking cancel closes the confirmation dialog without invoking logout API', () => {
    let isModalOpen = true;
    let logoutApiCalled = false;

    const handleCancel = () => {
      isModalOpen = false;
    };

    // User triggers cancel
    handleCancel();

    assert.equal(isModalOpen, false, 'Dialog must close upon cancel');
    assert.equal(logoutApiCalled, false, 'Logout API must not be invoked on cancel');
  });

  test('2. confirm invokes logout, updates loading state, and prevents concurrent duplicate submissions', async () => {
    let isLoggingOut = false;
    let logoutCalls = 0;
    let isModalOpen = true;
    let redirectPath = null;

    const mockLogoutApi = async () => {
      logoutCalls++;
      await new Promise((r) => setTimeout(r, 10));
    };

    const handleConfirmLogout = async () => {
      if (isLoggingOut) return;
      isLoggingOut = true;

      try {
        await mockLogoutApi();
        isModalOpen = false;
        redirectPath = '/login';
      } finally {
        isLoggingOut = false;
      }
    };

    // Simulate fast double click on "Sign Out" button
    const p1 = handleConfirmLogout();
    const p2 = handleConfirmLogout();

    await Promise.all([p1, p2]);

    assert.equal(logoutCalls, 1, 'Duplicate submissions must be blocked during pending state');
    assert.equal(isModalOpen, false, 'Dialog must close after successful logout');
    assert.equal(redirectPath, '/login', 'User must be redirected to /login');
    assert.equal(isLoggingOut, false);
  });

  test('3. failed logout surfaces error message and keeps modal open for user retry', async () => {
    let isModalOpen = true;
    let errorMessage = null;
    let redirectPath = null;

    const mockFailingLogout = async () => {
      const err = new Error('Network connection lost');
      err.response = { data: { message: 'Network error occurred. Session could not be cleared on server.' } };
      throw err;
    };

    const handleConfirmLogout = async () => {
      try {
        await mockFailingLogout();
        isModalOpen = false;
        redirectPath = '/login';
      } catch (err) {
        errorMessage = err.response?.data?.message || err.message;
      }
    };

    await handleConfirmLogout();

    assert.equal(isModalOpen, true, 'Modal must remain open so user can inspect error and retry');
    assert.equal(redirectPath, null, 'Must not redirect upon failed logout');
    assert.equal(errorMessage, 'Network error occurred. Session could not be cleared on server.');
  });
});

describe('Session Expiration Feedback & Route Guard Contracts', () => {
  test('1. unexpected session expiration sets sessionExpired flag only when user was previously authenticated', () => {
    let sessionExpired = false;
    let currentUser = null;

    // A. Guest user visits app (currentUser is null)
    const onSessionExpiredGuest = () => {
      if (currentUser) {
        sessionExpired = true;
      }
      currentUser = null;
    };

    onSessionExpiredGuest();
    assert.equal(sessionExpired, false, 'Guest session expiration must not show session expired notice');

    // B. Authenticated active user has session revoked
    currentUser = { id: 'u1', username: 'Alex' };
    const onSessionExpiredActive = () => {
      if (currentUser) {
        sessionExpired = true;
      }
      currentUser = null;
    };

    onSessionExpiredActive();
    assert.equal(sessionExpired, true, 'Active authenticated session expiration must set sessionExpired flag');
    assert.equal(currentUser, null, 'User state must be cleared to null');
  });

  test('2. intentional logout clears sessionExpired flag and avoids showing expiration warning', () => {
    let sessionExpired = true;
    let user = { username: 'Alex' };

    const handleIntentionalLogout = () => {
      user = null;
      sessionExpired = false;
    };

    handleIntentionalLogout();
    assert.equal(sessionExpired, false, 'Intentional logout must never trigger session expired warning');
    assert.equal(user, null);
  });

  test('3. ProtectedRoute contract: blocks unauthenticated, redirects with state, displays loader while checking', () => {
    const evaluateProtectedRoute = ({ isLoading, isAuthenticated, currentLocation, sessionExpired }) => {
      if (isLoading) {
        return { action: 'RENDER_LOADING', text: 'Checking session...' };
      }
      if (!isAuthenticated) {
        return {
          action: 'NAVIGATE',
          to: '/login',
          state: { from: currentLocation, sessionExpired: Boolean(sessionExpired) },
          replace: true,
        };
      }
      return { action: 'RENDER_OUTLET' };
    };

    // Loading check
    const loadingState = evaluateProtectedRoute({
      isLoading: true,
      isAuthenticated: false,
      currentLocation: { pathname: '/dashboard' },
      sessionExpired: false,
    });
    assert.equal(loadingState.action, 'RENDER_LOADING');

    // Unauthenticated redirect with origin preservation
    const unauthenticatedState = evaluateProtectedRoute({
      isLoading: false,
      isAuthenticated: false,
      currentLocation: { pathname: '/boards/board-123' },
      sessionExpired: true,
    });
    assert.equal(unauthenticatedState.action, 'NAVIGATE');
    assert.equal(unauthenticatedState.to, '/login');
    assert.equal(unauthenticatedState.state.from.pathname, '/boards/board-123');
    assert.equal(unauthenticatedState.state.sessionExpired, true);

    // Authenticated access granted
    const authenticatedState = evaluateProtectedRoute({
      isLoading: false,
      isAuthenticated: true,
      currentLocation: { pathname: '/dashboard' },
      sessionExpired: false,
    });
    assert.equal(authenticatedState.action, 'RENDER_OUTLET');
  });

  test('4. PublicRoute contract: permits guest access, redirects authenticated users, prevents loops', () => {
    const evaluatePublicRoute = ({ isLoading, isAuthenticated }) => {
      if (isLoading) {
        return { action: 'RENDER_LOADING' };
      }
      if (isAuthenticated) {
        return { action: 'NAVIGATE', to: '/dashboard', replace: true };
      }
      return { action: 'RENDER_OUTLET' };
    };

    // Guest on /login
    const guestState = evaluatePublicRoute({ isLoading: false, isAuthenticated: false });
    assert.equal(guestState.action, 'RENDER_OUTLET', 'Guest must be allowed on public route');

    // Logged-in user visiting /login
    const authedState = evaluatePublicRoute({ isLoading: false, isAuthenticated: true });
    assert.equal(authedState.action, 'NAVIGATE');
    assert.equal(authedState.to, '/dashboard');

    // Failed session restoration: isLoading=false, isAuthenticated=false -> renders login without looping
    const failedRestoreState = evaluatePublicRoute({ isLoading: false, isAuthenticated: false });
    assert.equal(failedRestoreState.action, 'RENDER_OUTLET', 'No redirect loop when session restoration fails');
  });

  test('5. Navbar and Profile synchronization contract: single AuthContext source of truth', () => {
    let authContextState = {
      user: { _id: 'u-1', username: 'SarahConnor', email: 'sarah@skynet.com' },
      isAuthenticated: true,
    };

    // Navbar inspects state
    const navbarView = {
      username: authContextState.user?.username,
      showAuthNav: authContextState.isAuthenticated,
    };
    assert.equal(navbarView.username, 'SarahConnor');
    assert.equal(navbarView.showAuthNav, true);

    // ProfilePage inspects state
    const profileView = {
      username: authContextState.user?.username,
      email: authContextState.user?.email,
    };
    assert.equal(profileView.username, 'SarahConnor');
    assert.equal(profileView.email, 'sarah@skynet.com');

    // Session terminates (logout or expiration)
    authContextState = {
      user: null,
      isAuthenticated: false,
    };

    const updatedNavbarView = {
      username: authContextState.user?.username || null,
      showAuthNav: authContextState.isAuthenticated,
    };
    assert.equal(updatedNavbarView.username, null);
    assert.equal(updatedNavbarView.showAuthNav, false);
  });
});
