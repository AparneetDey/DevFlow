import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../api/error';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function LoginPage() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionNoticeDismissed, setIsSessionNoticeDismissed] = useState(false);

  const showSessionExpired =
    !isSessionNoticeDismissed && Boolean(location.state?.sessionExpired || sessionExpired);

  // Where to redirect after login (preserves intended destination)
  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
    if (showSessionExpired) {
      setIsSessionNoticeDismissed(true);
      if (typeof clearSessionExpired === 'function') {
        clearSessionExpired();
      }
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (showSessionExpired) {
      setIsSessionNoticeDismissed(true);
      if (typeof clearSessionExpired === 'function') {
        clearSessionExpired();
      }
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Redirect to requested page or dashboard upon successful authentication
      navigate(from, { replace: true });
    } catch (err) {
      const message = extractErrorMessage(err);
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-12 bg-[var(--color-surface)] text-[var(--color-text)] rounded-xl border border-[var(--color-border)] shadow-xs p-5 sm:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-muted)] text-[var(--color-primary-hover)] flex items-center justify-center mx-auto mb-3 border border-[var(--color-primary)]/40 shadow-xs">
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Welcome back</h1>
        <p className="text-xs text-[var(--color-text-secondary)]">Sign in to your DevFlow account to continue</p>
      </div>

      {/* Unobtrusive Session Expiration Notice */}
      {showSessionExpired && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] shadow-xs"
        >
          <Clock className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="font-semibold text-[var(--color-text)]">Session Expired</p>
            <p className="leading-relaxed">Your session has expired. Please sign in again to continue.</p>
          </div>
        </div>
      )}

      {/* Global Server Error Alert */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--color-danger)]/15 border border-[var(--color-danger)]/40 text-xs text-[var(--color-text)]"
        >
          <AlertCircle className="w-4 h-4 text-[var(--color-danger)] mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email Address"
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="name@example.com"
          error={formErrors.email}
          disabled={isSubmitting}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          error={formErrors.password}
          disabled={isSubmitting}
          required
          autoComplete="current-password"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      {/* Footer link to Register */}
      <div className="text-center pt-2 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]">
        Don&apos;t have an account yet?{' '}
        <Link
          to="/register"
          className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-semibold underline underline-offset-2"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;
