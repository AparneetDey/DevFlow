import { User, Shield } from 'lucide-react';
import { Button } from '../components/common/Button';

export function ProfilePage() {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs p-8 space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
          <User className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Profile (Placeholder)</h1>
          <p className="text-xs text-slate-500">Route <code>/profile</code> placeholder for future user settings.</p>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Shield className="w-4 h-4 text-indigo-600" />
          Profile &amp; Session Management
        </div>
        <p>
          User profile retrieval via <code>GET /api/v1/auth/me</code> and account overview will be implemented in Task 8.
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled>
          Edit Profile (Task 8)
        </Button>
      </div>
    </div>
  );
}

export default ProfilePage;
