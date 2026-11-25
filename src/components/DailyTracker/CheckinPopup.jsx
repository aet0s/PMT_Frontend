// client/src/components/DailyTracker/CheckinPopup.jsx
// Calm, server-driven non-blocking reminder banner (no blocking modal, no localStorage).
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, BellOff, Coffee, CheckCircle2 } from 'lucide-react';
import {
  getWorkspacePendingCheckins,
  snoozeDailyTracker,
  markOnLeaveToday
} from '../../api/workspaces';
import { useSocket } from '../../context/SocketProvider';
import { Modal } from '../ui/Modal';
import DailyUpdatePanel from './DailyUpdatePanel';
import toast from 'react-hot-toast';

export default function CheckinPopup({ workspaceId }) {
  const [loading, setLoading] = useState(true);
  const [pendingData, setPendingData] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadPending = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await getWorkspacePendingCheckins(workspaceId);
      setPendingData(res);
    } catch {
      // Silently ignore if unauthorized
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    const onUpdated = () => loadPending();
    if (typeof window !== 'undefined') {
      window.addEventListener('daily-tracker-updated', onUpdated);
      return () => window.removeEventListener('daily-tracker-updated', onUpdated);
    }
  }, [loadPending]);

  let socketContext = null;
  try {
    socketContext = useSocket();
  } catch {
    // Outside SocketProvider
  }
  const socket = socketContext?.socket;

  useEffect(() => {
    if (!socket || !workspaceId) return;
    let timer = null;
    const handleCardChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(loadPending, 400);
    };
    socket.on('card:updated', handleCardChange);
    socket.on('card:moved', handleCardChange);
    socket.on('card:archived', handleCardChange);
    socket.on('card:deleted', handleCardChange);
    return () => {
      if (timer) clearTimeout(timer);
      socket.off('card:updated', handleCardChange);
      socket.off('card:moved', handleCardChange);
      socket.off('card:archived', handleCardChange);
      socket.off('card:deleted', handleCardChange);
    };
  }, [socket, workspaceId, loadPending]);

  if (loading || !pendingData || !pendingData.should_remind_banner) {
    return (
      <Modal
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Daily Update"
        maxWidth="max-w-2xl"
      >
        <DailyUpdatePanel
          workspaceId={workspaceId}
          compact
          onSuccess={() => {
            setPanelOpen(false);
            loadPending();
          }}
        />
      </Modal>
    );
  }

  const handleSnooze = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await snoozeDailyTracker(workspaceId);
      toast.success('Reminder snoozed until tomorrow');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily-tracker-updated'));
      }
      await loadPending();
    } catch (err) {
      toast.error(err?.message || 'Could not snooze reminder');
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveToday = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await markOnLeaveToday(workspaceId, 'On leave today');
      toast.success('Marked as on leave today');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('daily-tracker-updated'));
      }
      await loadPending();
    } catch (err) {
      toast.error(err?.message || 'Could not mark leave today');
    } finally {
      setBusy(false);
    }
  };

  const count = pendingData.cards?.length || 0;

  return (
    <>
      <div
        role="status"
        className="w-full bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex items-center justify-between gap-3 text-xs text-text-primary shrink-0 flex-wrap"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="truncate">
            <strong>Daily update:</strong> You have {count} active task{count === 1 ? '' : 's'} — takes under 30 seconds.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={handleLeaveToday}
            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-muted border border-border text-text-secondary font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
          >
            <Coffee className="w-3.5 h-3.5 text-purple-600" />
            <span>I&apos;m on leave</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSnooze}
            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-muted border border-border text-text-secondary font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
          >
            <BellOff className="w-3.5 h-3.5" />
            <span>Snooze until tomorrow</span>
          </button>
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary-hover font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Update now</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Daily Update"
        maxWidth="max-w-2xl"
      >
        <DailyUpdatePanel
          workspaceId={workspaceId}
          compact
          onSuccess={() => {
            setPanelOpen(false);
            loadPending();
          }}
        />
      </Modal>
    </>
  );
}
