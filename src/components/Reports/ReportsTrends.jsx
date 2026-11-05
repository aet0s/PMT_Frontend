// client/src/components/Reports/ReportsTrends.jsx
import React, { useMemo } from 'react';
import { TrendingUp, Plus, Check } from 'lucide-react';
import { formatNumber } from './reportsUtils';

export default function ReportsTrends({ velocity = [] }) {
  const maxVal = useMemo(() => {
    let max = 1;
    velocity.forEach((v) => {
      if (v.created > max) max = v.created;
      if (v.completed > max) max = v.completed;
    });
    return max;
  }, [velocity]);

  const totalCreated = useMemo(() => velocity.reduce((acc, v) => acc + (v.created || 0), 0), [velocity]);
  const totalCompleted = useMemo(() => velocity.reduce((acc, v) => acc + (v.completed || 0), 0), [velocity]);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text-primary">7-Day Activity & Velocity</h2>
            <span className="text-xs text-text-muted">Daily creation vs completion</span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">Tracking workspace productivity momentum across the last week</p>
        </div>

        {/* Legend & 7-day totals */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500 shrink-0" />
            <span className="text-text-muted">Created:</span>
            <span className="font-bold text-text-primary">{formatNumber(totalCreated)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
            <span className="text-text-muted">Completed:</span>
            <span className="font-bold text-text-primary">{formatNumber(totalCompleted)}</span>
          </div>
        </div>
      </div>

      {velocity.length === 0 ? (
        <div className="py-8 text-center text-text-muted border border-dashed border-border rounded-lg bg-surface-elevated/40">
          <p className="text-xs font-medium">No activity recorded for this period</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-4 border-t border-border/60">
          {velocity.map((day) => {
            const createdHeight = Math.max(4, Math.round(((day.created || 0) / maxVal) * 100));
            const completedHeight = Math.max(4, Math.round(((day.completed || 0) / maxVal) * 100));

            return (
              <div key={day.date} className="flex flex-col items-center group">
                {/* Bar Container */}
                <div className="h-32 w-full flex items-end justify-center gap-1 sm:gap-2 pb-2">
                  {/* Created Bar */}
                  <div className="flex flex-col items-center flex-1 max-w-[20px] h-full justify-end">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.created}
                    </span>
                    <div
                      style={{ height: `${createdHeight}%` }}
                      className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:brightness-110"
                      title={`${day.label}: ${day.created} created`}
                    />
                  </div>

                  {/* Completed Bar */}
                  <div className="flex flex-col items-center flex-1 max-w-[20px] h-full justify-end">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.completed}
                    </span>
                    <div
                      style={{ height: `${completedHeight}%` }}
                      className="w-full bg-emerald-500 rounded-t-sm transition-all duration-300 hover:brightness-110"
                      title={`${day.label}: ${day.completed} completed`}
                    />
                  </div>
                </div>

                {/* Date Label */}
                <span className="text-[11px] font-medium text-text-muted group-hover:text-text-primary transition-colors text-center truncate max-w-full">
                  {day.label ? day.label.split(',')[0] : day.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

