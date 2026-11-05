// client/src/components/Reports/ReportsLabels.jsx
import React, { useState } from 'react';
import { Tag, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import Badge from '../ui/Badge';
import { formatNumber } from './reportsUtils';

export default function ReportsLabels({ labelsBreakdown = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const labels = labelsBreakdown.labels || [];
  const unlabeledTasks = labelsBreakdown.unlabeled_tasks || 0;

  if (labels.length === 0 && unlabeledTasks === 0) {
    return null;
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-surface-elevated/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">Label Distribution</h2>
              <Badge variant="secondary" className="text-xs">
                {labels.length} {labels.length === 1 ? 'label' : 'labels'}
              </Badge>
              {unlabeledTasks > 0 && (
                <span className="text-[11px] text-text-muted">
                  ({formatNumber(unlabeledTasks)} unlabeled)
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">Task tagging density and category breakdown across boards</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-text-muted">
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 pt-0 border-t border-border/60">
          <div className="flex flex-wrap gap-2 pt-4">
            {labels.map((lb) => (
              <div
                key={lb.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-xs"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: lb.color || '#6366f1' }}
                />
                <span className="font-semibold text-text-primary">{lb.name}</span>
                <span className="text-text-muted text-[11px]">({lb.board_name})</span>
                <Badge variant="secondary" className="text-[10px] font-bold ml-1">
                  {formatNumber(lb.task_count)}
                </Badge>
              </div>
            ))}

            {unlabeledTasks > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border text-xs text-text-muted">
                <span>Unlabeled tasks:</span>
                <span className="font-bold text-text-secondary">{formatNumber(unlabeledTasks)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

