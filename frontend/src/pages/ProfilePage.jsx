import { User, Shield, Mail, Calendar, Key } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user } = useAuth();

  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-8 space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-3 sm:gap-4 border-b border-slate-100 pb-6 min-w-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs shrink-0">
          <User className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight break-words">
            {user?.username || 'User Profile'}
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate" title={user?.email}>
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{user?.email || 'No email registered'}</span>
          </p>
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Key className="w-3.5 h-3.5 text-indigo-600" />
            User ID
          </div>
          <p className="text-xs font-mono text-slate-800 truncate" title={user?._id}>
            {user?._id || 'N/A'}
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Member Since
          </div>
          <p className="text-xs font-semibold text-slate-800">
            {formattedJoinDate}
          </p>
        </div>
      </div>

      {/* Session Security Banner */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-xs text-indigo-950 space-y-0.5">
          <p className="font-semibold">HttpOnly Session Active</p>
          <p className="text-indigo-800">
            Your authentication session is securely maintained using encrypted, HttpOnly browser cookies with automated refresh token rotation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
