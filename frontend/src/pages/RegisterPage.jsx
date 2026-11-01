import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../api/error';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validate = () => {
    const errors = {};
    const username = formData.username;

    if (!username || !username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    } else if (username.length > 30) {
      errors.username = 'Username cannot exceed 30 characters';
    } else if (!USERNAME_REGEX.test(username)) {
      errors.username = 'Username can only contain English letters, numbers, and underscores';
    }

    const email = formData.email.trim();
    if (!email) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Please provide a valid email address';
    }

    const password = formData.password;
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Backend registration immediately logs the user in and establishes HttpOnly cookies
      navigate('/dashboard', { replace: true });
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
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Create an account</h1>
        <p className="text-xs text-[var(--color-text-secondary)]">Get started with your DevFlow project workspaces</p>
      </div>

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

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Username"
          id="username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          placeholder="e.g. sarahconnor"
          error={formErrors.username}
          disabled={isSubmitting}
          required
          autoComplete="username"
        />

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
          placeholder="At least 6 characters"
          error={formErrors.password}
          disabled={isSubmitting}
          required
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      {/* Footer link to Login */}
      <div className="text-center pt-2 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-semibold underline underline-offset-2"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default RegisterPage;
