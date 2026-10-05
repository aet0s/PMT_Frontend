// client/src/pages/ReportsPage.jsx
import React, { useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function ReportsPage({ workspace }) {
  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Reports | TaskFlow`;
  }, [workspace]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 tabIndex={-1} className="text-xl font-bold text-text-primary tracking-tight">
            Workspace Reports
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Aggregated analytics on task throughput, completion rates, and project progress.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-surface border border-border rounded-xl shadow-xs">
            <p className="text-xs font-semibold text-text-secondary">Completion Rate</p>
            <p className="text-2xl font-bold text-text-primary mt-1">94%</p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl shadow-xs">
            <p className="text-xs font-semibold text-text-secondary">Avg Cycle Time</p>
            <p className="text-2xl font-bold text-text-primary mt-1">2.4 days</p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-xl shadow-xs">
            <p className="text-xs font-semibold text-text-secondary">Overdue Rate</p>
            <p className="text-2xl font-bold text-text-primary mt-1">3.1%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
