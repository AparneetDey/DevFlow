import { useParams, Link } from 'react-router-dom';
import { Kanban, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export function BoardPage() {
  const { boardId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
        <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium border border-indigo-100">
          Route Param: boardId = <code>{boardId}</code>
        </span>
      </div>

      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-xs text-center max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
          <Kanban className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Kanban Board View (Placeholder)
        </h1>
        <p className="text-sm text-slate-500">
          Route <code>/boards/:boardId</code> successfully loaded with ID: <span className="font-mono font-semibold text-slate-800">{boardId}</span>.
        </p>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
          3-Column Kanban Board UI (Todo, In Progress, Done) and Task Management will be implemented in Tasks 6 and 7.
        </div>
        <div className="pt-2">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default BoardPage;
