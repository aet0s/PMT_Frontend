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
  Info,
  Laptop,
  Smartphone,
  Trash2,
  Send,
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Switch from '../../../components/ui/Switch';
import { useToast } from '../../../components/ui/Toast';
import { getNotificationPreferences, updateNotificationPreferences } from '../../../api/notifications';
import { useNotificationSound } from '../../../context/NotificationSoundContext';
import { usePushNotifications } from '../../../context/PushNotificationContext';

export default function NotificationsTab({ workspace, setFormDirty }) {
  const toast = useToast();
  const { enabled: soundEffects, setEnabled: setSoundEffects, playPreview } = useNotificationSound();
  const {
    configured: pushConfigured,
    supported: pushSupported,
    permission: pushPermission,
    enabled: pushEnabled,
    devices: pushDevices,
    showDetails: pushShowDetails,
    loading: pushLoading,
    deviceId: currentDeviceId,
    isIosNeedsInstall,
    enable: enablePush,
    disable: disablePush,
    removeDevice: removePushDevice,
    sendTest: sendPushTest,
    updateShowDetails
  } = usePushNotifications();

  const [categories, setCategories] = useState({
    Workspace: [],
    Boards: [],
    Cards: []
  });
  const [inAppStates, setInAppStates] = useState({});
  const [pushStates, setPushStates] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getNotificationPreferences();
        if (res && res.preferences) {
          setCategories(res.preferences);
          const initialInApp = {};
          const initialPush = {};
          Object.values(res.preferences).forEach((eventList) => {
            if (Array.isArray(eventList)) {
              eventList.forEach((ev) => {
                initialInApp[ev.eventType] = ev.in_app !== false;
                initialPush[ev.eventType] = ev.push !== false;
              });
            }
          });
          setInAppStates(initialInApp);
          setPushStates(initialPush);
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

  const handleToggleInApp = (eventType, checked) => {
    setInAppStates((prev) => ({
      ...prev,
      [eventType]: checked
    }));
    setFormDirty?.(true);
  };

  const handleTogglePush = (eventType, checked) => {
    setPushStates((prev) => ({
      ...prev,
      [eventType]: checked
    }));
    setFormDirty?.(true);
  };

  const handleToggleAll = (val) => {
    setInAppStates((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        next[k] = val;
      });
      return next;
    });
    if (pushConfigured) {
      setPushStates((prev) => {
        const next = {};
        Object.keys(prev).forEach((k) => {
          next[k] = val;
        });
        return next;
      });
    }
    setFormDirty?.(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = [];
      Object.entries(inAppStates).forEach(([eventType, is_enabled]) => {
        updates.push({
          eventType,
          channel: 'in_app',
          is_enabled
        });
      });
      if (pushConfigured) {
        Object.entries(pushStates).forEach(([eventType, is_enabled]) => {
          updates.push({
            eventType,
            channel: 'push',
            is_enabled
          });
        });
      }
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

  const handlePushToggleAction = async () => {
    if (isIosNeedsInstall) {
      toast.show('Add TaskFlow to your Home Screen first to enable notifications on iOS.', 'info');
      return;
    }

    try {
      if (pushEnabled) {
        await disablePush();
        toast.show('Desktop notifications turned off on this device.', 'info');
      } else {
        const ok = await enablePush();
        if (ok) {
          toast.show('Desktop notifications enabled!', 'success');
        } else {
          toast.show('Browser permission was not granted.', 'warning');
        }
      }
    } catch (err) {
      toast.show(err.message || 'Failed to toggle desktop notifications', 'error');
    }
  };

  const handleSendTestPush = async () => {
    setIsTestingPush(true);
    try {
      const res = await sendPushTest();
      if (res && res.sent > 0) {
        toast.show(`Test notification sent successfully to ${res.sent} device(s)!`, 'success');
      } else {
        toast.show(res?.message || 'No active device received the test notification.', 'warning');
      }
    } catch (err) {
      toast.show(err.message || 'Failed to send test notification', 'error');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleRemoveDevice = async (subId) => {
    try {
      await removePushDevice(subId);
      toast.show('Device removed successfully', 'info');
    } catch (err) {
      toast.show(err.message || 'Failed to remove device', 'error');
    }
  };

  const activeAlertsCount = useMemo(() => {
    return Object.values(inAppStates).filter(Boolean).length;
  }, [inAppStates]);

  const totalEventsCount = useMemo(() => {
    return Object.keys(inAppStates).length || 20;
  }, [inAppStates]);

  const categoryIcons = {
    Workspace: <Briefcase className="w-4 h-4 text-primary" />,
    Boards: <Layout className="w-4 h-4 text-info" />,
    Cards: <Layers className="w-4 h-4 text-success-text" />
  };

  // Status computation for Push card
  const pushStatusBadge = useMemo(() => {
    if (!pushSupported) {
      return {
        label: 'Not supported',
        className: 'bg-surface-muted text-text-muted border-border'
      };
    }
    if (pushPermission === 'denied') {
      return {
        label: 'Blocked in browser',
        className: 'bg-danger-tint text-danger-text border-danger/30'
      };
    }
    if (pushEnabled) {
      return {
        label: 'On',
        className: 'bg-success-tint text-success-text border-success/30'
      };
    }
    return {
      label: 'Off',
      className: 'bg-surface-muted text-text-secondary border-border'
    };
  }, [pushSupported, pushPermission, pushEnabled]);

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
            Choose which notifications, desktop alerts, and auditory chimes you receive.
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
            <span className="text-[11px] text-text-secondary block truncate">Personal event sound feedback</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${pushConfigured && pushEnabled ? 'bg-primary-tint text-primary' : 'bg-surface-muted text-text-muted'}`}>
            <Laptop className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">
              {pushConfigured ? (pushEnabled ? 'Desktop Push Active' : 'Desktop Push Inactive') : 'Noise Filter Active'}
            </span>
            <span className="text-[11px] text-text-secondary block truncate">
              {pushConfigured ? `${pushDevices.length} registered device(s)` : '20 catalogue events guarded'}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Notifications Card (Hidden if push is not configured) */}
      {pushConfigured && (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-5">
          <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Laptop className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-bold text-text-primary">Desktop Notifications</h3>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${pushStatusBadge.className}`}>
                  {pushStatusBadge.label}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Receive native operating system alerts even when TaskFlow is minimized or in the background.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {pushEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestPush}
                  isLoading={isTestingPush}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send test notification
                </Button>
              )}
              <Button
                type="button"
                variant={pushEnabled ? 'outline' : 'primary'}
                size="sm"
                onClick={handlePushToggleAction}
                isLoading={pushLoading}
                disabled={!pushSupported || pushPermission === 'denied'}
              >
                {pushEnabled ? 'Turn off' : 'Turn on'}
              </Button>
            </div>
          </div>

          {/* Browser blocked warning */}
          {pushPermission === 'denied' && (
            <div className="p-3.5 bg-danger-tint/60 border border-danger/30 rounded-xl flex items-start gap-3 text-xs text-danger-text">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Notifications are blocked in your browser</p>
                <p className="text-[11px] leading-relaxed">
                  To enable alerts, click the padlock or tune icon in your browser URL address bar, find the <strong>Notifications</strong> permission, set it to <strong>Allow</strong>, and refresh this page.
                </p>
              </div>
            </div>
          )}

          {/* Privacy & Detail Setting */}
          <div className="flex items-center justify-between py-1 gap-4">
            <div>
              <p className="text-xs font-semibold text-text-primary">Show card names in notifications</p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                When turned off, notifications use generic titles without revealing sensitive card titles on your lock screen.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={pushShowDetails}
                onChange={updateShowDetails}
                aria-label="Toggle card name privacy in push notifications"
              />
              <span className={`text-xs font-bold ${pushShowDetails ? 'text-primary' : 'text-text-muted'}`}>
                {pushShowDetails ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Devices List */}
          <div className="space-y-2.5 pt-2 border-t border-border">
            <h4 className="text-xs font-bold text-text-primary">Registered Devices ({pushDevices.length})</h4>
            {pushDevices.length === 0 ? (
              <p className="text-xs text-text-secondary py-2 italic">
                No devices currently registered for desktop push notifications.
              </p>
            ) : (
              <div className="divide-y divide-border/60 border border-border/70 rounded-xl overflow-hidden bg-surface-muted/30">
                {pushDevices.map((dev) => {
                  const isCurrent = dev.device_id === currentDeviceId;
                  return (
                    <div key={dev.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 text-text-secondary">
                          {dev.platform === 'ios' || dev.platform === 'android' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-text-primary truncate">
                              {dev.label || `${dev.browser} on ${dev.os}`}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 bg-primary/15 text-primary font-bold text-[10px] rounded-md">
                                This device
                              </span>
                            )}
                            {!dev.is_active && (
                              <span className="px-1.5 py-0.2 bg-danger-tint text-danger-text text-[10px] rounded-md">
                                Revoked
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-text-secondary flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-text-muted" />
                            {dev.last_seen_at ? `Last active ${new Date(dev.last_seen_at).toLocaleDateString()}` : 'Registered recently'}
                          </span>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDevice(dev.id)}
                          className="px-2 py-1 text-danger hover:bg-danger-tint rounded-lg font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 shrink-0"
                          title="Revoke push subscription for this device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
                <div className="border-b border-border pb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {categoryIcons[catName] || <Bell className="w-4 h-4 text-primary" />}
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">{catName} Notifications</h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Configure alerts for {catName.toLowerCase()} activities.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-[11px] font-bold text-text-secondary pr-1">
                    <span>In-App</span>
                    {pushConfigured && <span>Desktop Push</span>}
                  </div>
                </div>

                <div className="divide-y divide-border mt-1">
                  {events.map((ev) => {
                    const inAppChecked = inAppStates[ev.eventType] !== false;
                    const pushChecked = pushStates[ev.eventType] !== false;
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
                        <div className="flex items-center gap-9 shrink-0">
                          <Switch
                            checked={inAppChecked}
                            onChange={(checked) => handleToggleInApp(ev.eventType, checked)}
                            aria-label={`In-app notifications for ${ev.eventType}`}
                          />
                          {pushConfigured && (
                            <Switch
                              checked={pushChecked}
                              onChange={(checked) => handleTogglePush(ev.eventType, checked)}
                              aria-label={`Desktop push notifications for ${ev.eventType}`}
                            />
                          )}
                        </div>
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
            Settings apply to your user profile across all devices.
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
