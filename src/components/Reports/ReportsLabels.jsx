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
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 sm:p-5 flex items-start sm:items-center justify-between gap-3 text-left hover:bg-surface-elevated/40 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5 sm:mt-0">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            {/* Header Title + Badges: Clean stacked row on mobile, inline on sm+ */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
              <h2 className="text-sm font-bold text-text-primary whitespace-nowrap">
                Label Distribution
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0.5 shrink-0">
                  {labels.length} {labels.length === 1 ? 'label' : 'labels'}
                </Badge>
                {unlabeledTasks > 0 && (
                  <span className="text-[11px] font-medium text-text-muted shrink-0">
                    ({formatNumber(unlabeledTasks)} unlabeled)
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-text-muted mt-1 sm:mt-0.5 leading-relaxed">
              Task tagging density and category breakdown across boards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-text-muted shrink-0 pt-0.5 sm:pt-0">
          <span className="hidden xs:inline">{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3.5 sm:p-5 pt-0 border-t border-border/60">
          <div className="flex flex-wrap gap-2 pt-3.5 sm:pt-4">
            {labels.map((lb) => {
              const boardLabel = lb.board_count > 1
                ? `${lb.board_count} boards`
                : lb.board_name;

              return (
                <div
                  key={lb.id || lb.name}
                  className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-xs transition-colors hover:border-border/80 max-w-full"
                  title={lb.board_names ? `Boards: ${lb.board_names}` : (lb.board_name ? `Board: ${lb.board_name}` : undefined)}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: lb.color || 'var(--color-primary)' }}
                  />
                  <span className="font-semibold text-text-primary truncate">{lb.name}</span>
                  {boardLabel && (
                    <span className="text-text-muted text-[10px] sm:text-[11px] shrink-0 truncate max-w-[130px]">
                      ({boardLabel})
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[10px] font-bold ml-0.5 px-1.5 py-0.5 shrink-0">
                    {formatNumber(lb.task_count)}
                  </Badge>
                </div>
              );
            })}

            {unlabeledTasks > 0 && (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-dashed border-border bg-surface-elevated/40 text-xs text-text-muted">
                <Layers className="w-3.5 h-3.5 text-text-muted shrink-0" />
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
