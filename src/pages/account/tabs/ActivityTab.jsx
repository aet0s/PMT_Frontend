// client/src/pages/account/tabs/ActivityTab.jsx
import React, { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import { apiFetch } from '../../../api/client';
import { formatDate } from '../../../lib/dateFormat';

export default function ActivityTab() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      setIsLoading(true);
      try {
        const data = await apiFetch('/api/auth/activity');
        setEvents(data.events || []);
      } catch (err) {
        console.warn('Failed to load user activity:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivity();
  }, []);

  return (
    <div className="space-y-6 max-w-2xl text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Account Activity</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Recent security events and sign-in actions associated with your account.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-muted">Loading activity log...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">No recent activity recorded.</div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="p-4 flex items-center justify-between gap-3 hover:bg-surface-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-primary">{ev.action}</p>
                  <p className="text-[11px] text-text-secondary">IP: {ev.ip || '127.0.0.1'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0">
                <Clock className="w-3 h-3" />
                <span>{formatDate(ev.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
