import React, { useState } from 'react';
import { Bell, X, Check, Laptop } from 'lucide-react';
import { usePushNotifications } from '../../context/PushNotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

export default function PushNotificationBanner() {
  const { user } = useAuth();
  const {
    configured,
    supported,
    enabled,
    permission,
    bannerVisible,
    isIosNeedsInstall,
    enable,
    dismissBanner
  } = usePushNotifications();

  const toast = useToast();
  const [isEnabling, setIsEnabling] = useState(false);

  // If not configured, not supported, user not logged in, already enabled, permission not default, or banner dismissed: hide
  if (!configured || !supported || !user || enabled || permission !== 'default' || !bannerVisible) {
    return null;
  }

  const handleEnable = async () => {
    if (isIosNeedsInstall) {
      toast.show('Add TaskFlow to your Home Screen first to enable notifications on iOS.', 'info');
      dismissBanner();
      return;
    }

    setIsEnabling(true);
    try {
      const ok = await enable();
      if (ok) {
        toast.show('Desktop notifications enabled!', 'success');
      } else {
        toast.show('Notification permission was not granted.', 'warning');
      }
    } catch (err) {
      toast.show(err.message || 'Failed to enable desktop notifications', 'error');
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Desktop notifications banner"
      className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-text-primary text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all animate-fadeIn"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
          <Bell className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <span className="font-semibold block sm:inline mr-1.5 text-text-primary">
            Turn on desktop notifications?
          </span>
          <span className="text-text-secondary text-[11px]">
            Get timely alerts for card assignments, mentions, and due dates even when TaskFlow is minimized.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={handleEnable}
          disabled={isEnabling}
          className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
        >
          {isEnabling ? 'Enabling...' : 'Enable Notifications'}
        </button>
        <button
          type="button"
          onClick={dismissBanner}
          className="px-2.5 py-1 text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-lg font-medium text-xs transition-colors cursor-pointer"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
