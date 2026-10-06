// client/src/pages/settings/tabs/NotificationsTab.jsx
import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  UserCheck,
  MessageSquare,
  Calendar,
  Volume2,
  Shield,
  Radio,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Switch from '../../../components/ui/Switch';
import { useToast } from '../../../components/ui/Toast';
import { getNotificationPreferences, updateNotificationPreferences } from '../../../api/notifications';

export default function NotificationsTab({ workspace, setFormDirty }) {
  const toast = useToast();
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [notifyDueDates, setNotifyDueDates] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getNotificationPreferences();
        if (res.preferences) {
          setNotifyAssignments(res.preferences.notify_assignments ?? true);
          setNotifyMentions(res.preferences.notify_mentions ?? true);
          setNotifyDueDates(res.preferences.notify_due_dates ?? true);
          setSoundEffects(res.preferences.sound_effects ?? true);
        }
      } catch (err) {
        console.warn('Failed to load notification preferences:', err);
      } finally {
        setIsLoading(false);
        setFormDirty?.(false);
      }
    }
    load();
  }, [setFormDirty]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateNotificationPreferences({
        notify_assignments: notifyAssignments,
        notify_mentions: notifyMentions,
        notify_due_dates: notifyDueDates,
        sound_effects: soundEffects
      });
      toast.show('Notification preferences saved successfully', 'success');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAll = (val) => {
    setNotifyAssignments(val);
    setNotifyMentions(val);
    setNotifyDueDates(val);
    setSoundEffects(val);
    setFormDirty?.(true);
  };

  const handleTestChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      toast.show('Chime preview played', 'info');
    } catch {
      toast.show('Audio chime test triggered', 'info');
    }
  };

  const activeAlertsCount = [notifyAssignments, notifyMentions, notifyDueDates].filter(Boolean).length;

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notification Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Choose which notifications, alerts, and auditory chimes you receive for workspace events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleToggleAll(true)}
            className="px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-tint rounded-lg transition cursor-pointer"
          >
            Enable All
          </button>
          <span className="text-text-muted">•</span>
          <button
            type="button"
            onClick={() => handleToggleAll(false)}
            className="px-2.5 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-muted rounded-lg transition cursor-pointer"
          >
            Mute All
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">
              {activeAlertsCount} of 3 Alerts Active
            </span>
            <span className="text-[11px] text-text-secondary block truncate">In-app activity stream</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${soundEffects ? 'bg-success-tint text-success-text' : 'bg-surface-muted text-text-muted'}`}>
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">
              {soundEffects ? 'Audio Chimes Enabled' : 'Audio Chimes Muted'}
            </span>
            <span className="text-[11px] text-text-secondary block truncate">Subtle task event sounds</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-info-tint text-info flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">Strict Scope Protected</span>
            <span className="text-[11px] text-text-secondary block truncate">Scoped to your permissions</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Task & Activity Alerts */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" />
                    Task & Activity Alerts
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Real-time notifications sent to your in-app notification center.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border mt-1">
                {/* Card Assignments */}
                <div className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary-tint text-primary shrink-0 mt-0.5">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Card Assignments</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Get alerted immediately when you are assigned or unassigned from any card.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyAssignments}
                    onChange={(checked) => {
                      setNotifyAssignments(checked);
                      setFormDirty?.(true);
                    }}
                  />
                </div>

                {/* Mentions & Comments */}
                <div className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-info-tint text-info shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Mentions & Comments</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Get alerted when someone @mentions you or comments on your cards.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyMentions}
                    onChange={(checked) => {
                      setNotifyMentions(checked);
                      setFormDirty?.(true);
                    }}
                  />
                </div>

                {/* Due Date Reminders */}
                <div className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-warning-tint text-warning shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Due Date Alerts</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Get reminder alerts 24 hours before your assigned tasks expire.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyDueDates}
                    onChange={(checked) => {
                      setNotifyDueDates(checked);
                      setFormDirty?.(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Audio, Sound & Device Preferences */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="border-b border-border pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Sound & Audio Preferences
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Audio cues and auditory notification feedback while in the workspace.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border mt-1">
                {/* Audio Chimes Switch */}
                <div className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-surface-muted text-text-primary shrink-0 mt-0.5">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-primary">In-App Audio Chimes</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Play subtle audio sound on incoming real-time notifications and assignments.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={soundEffects}
                    onChange={(checked) => {
                      setSoundEffects(checked);
                      setFormDirty?.(true);
                    }}
                  />
                </div>

                {/* Sound Preview Action */}
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Sound Test</p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Listen to a sample chime to calibrate your speaker volume.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestChime}
                    className="px-3 py-1.5 text-xs font-semibold text-text-secondary bg-surface-muted hover:text-text-primary hover:bg-border rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Play Sample
                  </button>
                </div>

                {/* Scope & Privacy Notice */}
                <div className="py-4 bg-surface-muted/40 rounded-xl p-3.5 mt-2 border border-border/60">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">Role-based Notification Security</p>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                        TaskFlow automatically filters notifications to ensure you only receive alerts for boards and cards you have permission to view.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-text-secondary">
            Preferences apply across all boards in this workspace.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}
