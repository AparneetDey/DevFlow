import { useState } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Loading } from '../components/common/Loading';
import { LayoutDashboard, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

export function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [simulateLoading, setSimulateLoading] = useState(false);

  const handleTestError = () => {
    if (!demoInput.trim()) {
      setInputError('This field cannot be empty.');
    } else {
      setInputError('');
    }
  };

  const handleTestLoading = () => {
    setSimulateLoading(true);
    setTimeout(() => setSimulateLoading(false), 1200);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Foundation Verification</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard (Placeholder)</h1>
          <p className="text-sm text-slate-500 mt-1">
            This placeholder page verifies route navigation and foundational UI components for Task 2.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleTestLoading} isLoading={simulateLoading}>
            Test Loading
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Open Test Modal
          </Button>
        </div>
      </div>

      {/* Component Foundation Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buttons Showcase */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Reusable Button Variants
          </h2>
          <p className="text-xs text-slate-500">
            Standardized button component supporting <code>primary</code>, <code>secondary</code>, <code>outline</code>, and <code>danger</code> variants.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="primary" isLoading>Loading</Button>
          </div>
        </div>

        {/* Input Showcase */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            Reusable Form Input
          </h2>
          <div className="space-y-3">
            <Input
              label="Board or Task Title"
              placeholder="e.g., Sprint Planning"
              value={demoInput}
              onChange={(e) => {
                setDemoInput(e.target.value);
                if (inputError) setInputError('');
              }}
              error={inputError}
              required
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleTestError}>
                Validate Input
              </Button>
              {demoInput && (
                <Button size="sm" variant="secondary" onClick={() => { setDemoInput(''); setInputError(''); }}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status & Next Steps */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-950">
          <p className="font-semibold mb-0.5">Task 2 Foundation Active</p>
          <p className="text-indigo-800 text-xs">
            Routing, Axios client, Tailwind styling, and reusable UI components are now verified. Real authentication and dashboard logic will follow in Tasks 3 and 4.
          </p>
        </div>
      </div>

      {/* Test Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Reusable Modal Component"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This modal confirms accessible backdrop dismissal, Escape key closing, and clean border framing.
          </p>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
            <strong>Ready for:</strong> Create Board Modal (Task 5) &amp; Task Editor Modal (Task 7).
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Acknowledge
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inline Loading Demonstration */}
      {simulateLoading && (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-center">
          <Loading text="Demonstrating loading component..." />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
