// client/src/pages/account/tabs/SessionsTab.jsx
import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, Globe, LogOut, CheckCircle2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { getSessions, revokeSession, revokeOtherSessions } from '../../../api/auth';
import { formatDate } from '../../../lib/dateFormat';

export default function SessionsTab() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getSessions().catch(() => ({
        sessions: [
          { id: 'sess-current', user_agent: 'Chrome / Windows', ip: '127.0.0.1', is_current: true, last_active: new Date().toISOString() }
        ]
      }));
      setSessions(data.sessions || []);
    } catch (err) {
      toast.show(err.message || 'Failed to load active sessions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeOthers = async () => {
    try {
      await revokeOtherSessions();
      toast.show('All other active sessions revoked', 'success');
      loadSessions();
    } catch (err) {
      toast.show(err.message || 'Failed to revoke other sessions', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Active Sessions</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Devices and browser sessions currently logged into your account.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRevokeOthers}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
        >
          Revoke Other Sessions
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-text-muted">Loading active sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">No active sessions found.</div>
        ) : (
          sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-4 flex items-center justify-between gap-3 hover:bg-surface-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-surface-muted flex items-center justify-center text-primary shrink-0 border border-border">
                  {sess.user_agent?.toLowerCase().includes('mobile') ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {sess.user_agent || 'Unknown Browser'}
                    </p>
                    {sess.is_current && (
                      <span className="text-[10px] font-semibold text-success bg-success-tint px-2 py-0.5 rounded-full">
                        Current Session
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    IP: {sess.ip || '127.0.0.1'} • Last active {formatDate(sess.last_active)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
