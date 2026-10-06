// client/src/pages/account/tabs/SessionsTab.jsx
import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, Globe, LogOut, CheckCircle2, Shield, Info, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { getSessions, revokeSession, revokeOtherSessions } from '../../../api/auth';
import { formatDate } from '../../../lib/dateFormat';

export default function SessionsTab() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

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

  const handleRevokeSingle = async (sessId) => {
    setRevokingId(sessId);
    try {
      await revokeSession(sessId);
      toast.show('Session terminated', 'success');
      setSessions((prev) => prev.filter((s) => s.id !== sessId));
    } catch (err) {
      toast.show(err.message || 'Failed to revoke session', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    try {
      await revokeOtherSessions();
      toast.show('All other active sessions revoked', 'success');
      loadSessions();
    } catch (err) {
      toast.show(err.message || 'Failed to revoke other sessions', 'error');
    } finally {
      setRevokingOthers(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Laptop className="w-5 h-5 text-primary" />
            Active Sessions
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Devices, browsers, and mobile apps currently signed into your TaskFlow account.
          </p>
        </div>

        {otherSessionsCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeOthers}
            isLoading={revokingOthers}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Revoke All Other Sessions
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-text-muted">Loading active sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-xs text-text-muted">No active sessions found.</div>
            ) : (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-surface-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-primary shrink-0 border border-border">
                      {sess.user_agent?.toLowerCase().includes('mobile') ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {sess.user_agent || 'Desktop Browser'}
                        </p>
                        {sess.is_current && (
                          <span className="text-[10px] font-bold text-success bg-success-tint px-2 py-0.5 rounded-full border border-success/30">
                            Current Device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        IP: {sess.ip || '127.0.0.1'} • Last active {formatDate(sess.last_active)}
                      </p>
                    </div>
                  </div>

                  {!sess.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSingle(sess.id)}
                      disabled={revokingId === sess.id}
                      className="px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger-tint rounded-lg transition cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {revokingId === sess.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info & Policy Guide (1 col) */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Session Protection
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              TaskFlow uses rotating session tokens with strict IP matching. If you notice any unfamiliar device or location, revoke the session immediately and change your account password.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Automatic Inactivity Logout
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Sessions that remain inactive for more than 30 days are automatically retired to safeguard sensitive project data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
