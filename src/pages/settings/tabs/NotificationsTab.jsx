// client/src/pages/settings/tabs/NotificationsTab.jsx
import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
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
      toast.show('Notification preferences saved', 'success');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Notification Preferences</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Choose which notifications you wish to receive for events in this workspace.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 bg-surface border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-text-primary">Card Assignments</p>
            <p className="text-[11px] text-text-secondary">Get notified when you are assigned or unassigned from a card.</p>
          </div>
          <Switch
            checked={notifyAssignments}
            onChange={(checked) => {
              setNotifyAssignments(checked);
              setFormDirty?.(true);
            }}
          />
        </div>

        <div className="flex items-center justify-between pb-3.5 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-text-primary">Mentions & Comments</p>
            <p className="text-[11px] text-text-secondary">Get notified when someone @mentions you or comments on your card.</p>
          </div>
          <Switch
            checked={notifyMentions}
            onChange={(checked) => {
              setNotifyMentions(checked);
              setFormDirty?.(true);
            }}
          />
        </div>

        <div className="flex items-center justify-between pb-3.5 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-text-primary">Due Date Alerts</p>
            <p className="text-[11px] text-text-secondary">Reminders 24 hours before a card due date expires.</p>
          </div>
          <Switch
            checked={notifyDueDates}
            onChange={(checked) => {
              setNotifyDueDates(checked);
              setFormDirty?.(true);
            }}
          />
        </div>

        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="text-xs font-semibold text-text-primary">In-App Audio Chimes</p>
            <p className="text-[11px] text-text-secondary">Play subtle audio alert on new real-time mentions and assignments.</p>
          </div>
          <Switch
            checked={soundEffects}
            onChange={(checked) => {
              setSoundEffects(checked);
              setFormDirty?.(true);
            }}
          />
        </div>

        <div className="flex justify-end pt-3">
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
