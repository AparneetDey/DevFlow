import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { extractErrorMessage } from '../api/error';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

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
    const username = formData.username.trim();

    if (!username) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    } else if (username.length > 30) {
      errors.username = 'Username cannot exceed 30 characters';
    }

    const email = formData.email.trim();
    if (!email) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Please provide a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
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
        username: formData.username.trim().toLowerCase(),
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
    <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-100 shadow-xs">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create an account</h1>
        <p className="text-xs text-slate-500">Get started with your DevFlow project workspaces</p>
      </div>

      {/* Global Server Error Alert */}
      {serverError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
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
      <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-indigo-600 hover:text-indigo-700 font-semibold underline underline-offset-2"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default RegisterPage;
