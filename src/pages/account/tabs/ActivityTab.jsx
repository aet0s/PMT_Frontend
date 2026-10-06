// client/src/pages/account/tabs/ActivityTab.jsx
import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldCheck, KeyRound, Lock, Info, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../../api/client';
import { formatDate } from '../../../lib/dateFormat';
import Badge from '../../../components/ui/Badge';

export default function ActivityTab() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      setIsLoading(true);
      try {
        const data = await apiFetch('/api/auth/activity');
        setEvents(data.events || data.logs || []);
      } catch (err) {
        console.warn('Failed to load user activity:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivity();
  }, []);

  const getActionBadgeProps = (action = '') => {
    const act = String(action).toLowerCase();
    if (act.includes('fail') || act.includes('deny') || act.includes('revoke')) {
      return { variant: 'danger', icon: <Lock className="w-3 h-3" /> };
    }
    if (act.includes('password') || act.includes('2fa') || act.includes('security')) {
      return { variant: 'primary', icon: <ShieldCheck className="w-3 h-3" /> };
    }
    if (act.includes('login') || act.includes('session') || act.includes('auth')) {
      return { variant: 'info', icon: <KeyRound className="w-3 h-3" /> };
    }
    return { variant: 'neutral', icon: <Info className="w-3 h-3" /> };
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Account Activity Log
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Audit history of authentication attempts, credential changes, and security actions on your account.
          </p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <table className="w-full table-fixed text-xs text-left">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[32%]" />
            <col className="w-[20%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-surface-muted text-text-secondary border-b border-border uppercase text-[10px] tracking-wider font-bold">
            <tr>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Details</th>
              <th className="py-3 px-4">Network / IP</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text-primary">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading activity log...</span>
                  </div>
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-text-muted">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
                  <p className="font-semibold text-text-primary">No recent security events</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Sign-ins and profile updates will be recorded here automatically.
                  </p>
                </td>
              </tr>
            ) : (
              events.map((ev) => {
                const badgeProps = getActionBadgeProps(ev.action || ev.event);
                return (
                  <tr key={ev.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <Badge variant={badgeProps.variant} size="sm">
                        <span className="flex items-center gap-1 font-mono text-[11px] truncate">
                          {badgeProps.icon}
                          <span>{ev.action || ev.event || 'Activity'}</span>
                        </span>
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-text-secondary font-medium truncate" title={ev.details}>
                      {ev.details || ev.action || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-text-secondary truncate">
                      {ev.ip || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-text-secondary text-[11px]">
                      {formatDate(ev.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
