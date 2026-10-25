import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function RegisterPage() {
  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
      <div className="text-center space-y-1">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 border border-indigo-100">
          <UserPlus className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Register (Placeholder)</h1>
        <p className="text-xs text-slate-500">
          Route placeholder for <code>/register</code>. User onboarding will be implemented in Task 3.
        </p>
      </div>

      <div className="space-y-4">
        <Input label="Username" placeholder="johndoe" disabled />
        <Input label="Email Address" type="email" placeholder="user@example.com" disabled />
        <Input label="Password" type="password" placeholder="••••••••" disabled />
        <Button variant="primary" className="w-full" disabled>
          Create Account (Task 3)
        </Button>
      </div>

      <div className="text-center pt-2 text-xs text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold underline">
          Log in here
        </Link>
      </div>
    </div>
  );
}

export default RegisterPage;
