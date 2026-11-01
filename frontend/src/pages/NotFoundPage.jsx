import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto my-16 text-center space-y-5 px-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-warning)]/15 text-[var(--color-warning)] flex items-center justify-center mx-auto border border-[var(--color-warning)]/30 shadow-xs">
        <HelpCircle className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)] tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-[var(--color-text-secondary)] mt-1">Page Not Found</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">
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
