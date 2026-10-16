// client/src/pages/settings/tabs/NotificationsTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Check,
  Volume2,
  Shield,
  Radio,
  Briefcase,
  Layout,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Switch from '../../../components/ui/Switch';
import { useToast } from '../../../components/ui/Toast';
import { getNotificationPreferences, updateNotificationPreferences } from '../../../api/notifications';
import { useNotificationSound } from '../../../context/NotificationSoundContext';

export default function NotificationsTab({ workspace, setFormDirty }) {
  const toast = useToast();
  const { enabled: soundEffects, setEnabled: setSoundEffects, playPreview } = useNotificationSound();

  const [categories, setCategories] = useState({
    Workspace: [],
    Boards: [],
    Cards: []
  });
  const [eventStates, setEventStates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getNotificationPreferences();
        if (res && res.preferences) {
          setCategories(res.preferences);
          const initialStates = {};
          Object.values(res.preferences).forEach((eventList) => {
            if (Array.isArray(eventList)) {
              eventList.forEach((ev) => {
                initialStates[ev.eventType] = ev.in_app !== false;
              });
            }
          });
          setEventStates(initialStates);
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

  const handleToggleEvent = (eventType, checked) => {
    setEventStates((prev) => ({
      ...prev,
      [eventType]: checked
    }));
    setFormDirty?.(true);
  };

  const handleToggleAll = (val) => {
    setEventStates((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        next[k] = val;
      });
      return next;
    });
    setFormDirty?.(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = Object.entries(eventStates).map(([eventType, is_enabled]) => ({
        eventType,
        channel: 'in_app',
        is_enabled
      }));
      await updateNotificationPreferences({ updates });
      toast.show('Notification preferences saved successfully', 'success');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoundToggle = async (checked) => {
    try {
      await setSoundEffects(checked);
    } catch (err) {
      toast.show(err.message || 'Failed to update sound settings', 'error');
    }
  };

  const handleTestChime = () => {
    try {
      playPreview();
      toast.show('Notification bell chime played', 'info');
    } catch {
      toast.show('Audio chime test triggered', 'info');
    }
  };

  const activeAlertsCount = useMemo(() => {
    return Object.values(eventStates).filter(Boolean).length;
  }, [eventStates]);

  const totalEventsCount = useMemo(() => {
    return Object.keys(eventStates).length || 17;
  }, [eventStates]);

  const categoryIcons = {
    Workspace: <Briefcase className="w-4 h-4 text-primary" />,
    Boards: <Layout className="w-4 h-4 text-info" />,
    Cards: <Layers className="w-4 h-4 text-success-text" />
  };

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
            Choose which notifications and auditory chimes you receive for workspace events.
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
              {activeAlertsCount} of {totalEventsCount} Events Active
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
            <span className="text-[11px] text-text-secondary block truncate">Personal event sound chimes</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-info-tint text-info flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">Noise-Filtered Catalogue</span>
            <span className="text-[11px] text-text-secondary block truncate">17 essential notification events</span>
          </div>
        </div>
      </div>

      {/* Sound Preference Card - Optimistic Live Sync (No Save Required) */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs">
        <div className="border-b border-border pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              Notification Sound & Audio
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Audio feedback for real-time personal events (assignments, mentions, comments, due dates).
            </p>
          </div>
        </div>

        <div className="divide-y divide-border mt-1">
          <div className="flex items-center justify-between py-4 gap-4">
            <div>
              <p className="text-xs font-semibold text-text-primary">Play sound for incoming notifications</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Instant sync across devices and open browser tabs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={soundEffects}
                onChange={handleSoundToggle}
                aria-label="Notification sound toggle"
              />
              <span className={`text-xs font-bold ${soundEffects ? 'text-primary' : 'text-text-muted'}`}>
                {soundEffects ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-text-primary">Preview Chime</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Test audio output to verify speaker levels.
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
        </div>
      </div>

      {/* Main Events Form (Grouped as Workspace, Boards, Cards) */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-6">
          {['Workspace', 'Boards', 'Cards'].map((catName) => {
            const events = categories[catName] || [];
            if (events.length === 0) return null;

            return (
              <div key={catName} className="bg-surface border border-border rounded-xl p-5 shadow-xs">
                <div className="border-b border-border pb-3 flex items-center gap-2">
                  {categoryIcons[catName] || <Bell className="w-4 h-4 text-primary" />}
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{catName} Notifications</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Configure alerts for {catName.toLowerCase()} activities.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border mt-1">
                  {events.map((ev) => {
                    const isChecked = eventStates[ev.eventType] !== false;
                    return (
                      <div key={ev.eventType} className="flex items-center justify-between py-3.5 gap-4">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-text-primary truncate">
                            {ev.eventType}
                          </p>
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            {ev.template}
                          </p>
                        </div>
                        <Switch
                          checked={isChecked}
                          onChange={(checked) => handleToggleEvent(ev.eventType, checked)}
                          aria-label={`Toggle notifications for ${ev.eventType}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-text-secondary">
            Settings apply to your user profile across the workspace.
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
