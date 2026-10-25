import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto my-16 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
        <HelpCircle className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-slate-700 mt-1">Page Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">
          The page or route you are looking for does not exist or has been moved.
        </p>
      </div>
      <div className="pt-2">
        <Link to="/dashboard">
          <Button variant="primary" size="md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
