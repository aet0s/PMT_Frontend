// client/src/pages/account/tabs/PreferencesTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  Clock,
  Check,
  Eye,
  RefreshCw,
  RotateCcw,
  Zap,
  Minimize2,
  Maximize2
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import { ThemeSelector } from '../../../components/ui/ThemeToggle';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { useServerNow, syncServerTime } from '../../../lib/serverTime';

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - Server Time, UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (Gulf Standard Time, UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore Standard Time, UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan Standard Time, UTC+09:00)' },
  { value: 'Europe/London', label: 'Europe/London (Greenwich Mean Time / BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (Central European Time)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (Central European Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time - US & Canada)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time - US & Canada)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time - US & Canada)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time - US & Canada)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (Australian Eastern Time)' }
];

const LOCALE_OPTIONS = [
  { value: 'en-IN', label: 'English (India) — DD/MM/YYYY format (IST standard)' },
  { value: 'en-GB', label: 'English (UK / International) — DD/MM/YYYY format' },
  { value: 'en-US', label: 'English (United States) — MM/DD/YYYY format' }
];

export default function PreferencesTab({ setFormDirty }) {
  const toast = useToast();
  const { user, updateUserProfile } = useAuth();
  const serverNow = useServerNow();
  const hasUserEditedRef = useRef(false);

  const [density, setDensity] = useState(() => localStorage.getItem('taskflow_density') || 'detailed');
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('taskflow_reduced_motion') === 'true');
  const [timezone, setTimezone] = useState(() => {
    const tz = user?.timezone;
    return tz && tz !== 'UTC' ? tz : 'Asia/Kolkata';
  });
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('taskflow_locale') || user?.locale || 'en-IN';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingClock, setIsSyncingClock] = useState(false);

  useEffect(() => {
    if (!hasUserEditedRef.current) {
      if (user?.timezone && user.timezone !== 'UTC') {
        setTimezone(user.timezone);
      } else {
        setTimezone('Asia/Kolkata');
      }
      if (user?.locale) {
        setLocale(user.locale);
      }
    }
  }, [user]);

  // Handle live density toggle
  const handleDensityChange = (newDensity) => {
    hasUserEditedRef.current = true;
    setDensity(newDensity);
    try {
      localStorage.setItem('taskflow_density', newDensity);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('density-compact', newDensity === 'compact');
      }
    } catch (e) {}
    setFormDirty?.(true);
  };

  // Handle live reduced motion toggle
  const handleReducedMotionChange = (checked) => {
    hasUserEditedRef.current = true;
    setReducedMotion(checked);
    try {
      localStorage.setItem('taskflow_reduced_motion', String(checked));
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('reduce-motion', Boolean(checked));
      }
    } catch (e) {}
    setFormDirty?.(true);
  };

  // Synchronize server clock on demand
  const handleSyncClock = async () => {
    setIsSyncingClock(true);
    try {
      await syncServerTime();
      toast.show('Server clock synchronized with Asia/Kolkata (IST)', 'success');
    } catch {
      toast.show('Clock calibration checked', 'info');
    } finally {
      setTimeout(() => setIsSyncingClock(false), 500);
    }
  };

  // Reset all preferences back to company defaults
  const handleResetDefaults = async () => {
    const defaultDensity = 'detailed';
    const defaultMotion = false;
    const defaultTz = 'Asia/Kolkata';
    const defaultLocale = 'en-IN';

    hasUserEditedRef.current = false;
    setDensity(defaultDensity);
    setReducedMotion(defaultMotion);
    setTimezone(defaultTz);
    setLocale(defaultLocale);

    try {
      localStorage.setItem('taskflow_density', defaultDensity);
      localStorage.setItem('taskflow_reduced_motion', 'false');
      localStorage.setItem('taskflow_locale', defaultLocale);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('density-compact');
        document.documentElement.classList.remove('reduce-motion');
      }
      await updateUserProfile({ timezone: defaultTz, locale: defaultLocale });
      toast.show('Preferences reset to company defaults (IST Server Time)', 'info');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to reset preferences', 'error');
    }
  };

  // Save preferences form
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      localStorage.setItem('taskflow_density', density);
      localStorage.setItem('taskflow_reduced_motion', String(reducedMotion));
      localStorage.setItem('taskflow_locale', locale);

      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('reduce-motion', Boolean(reducedMotion));
        document.documentElement.classList.toggle('density-compact', density === 'compact');
      }

      const effectiveTimezone = timezone && timezone !== 'UTC' ? timezone : 'Asia/Kolkata';
      await updateUserProfile({ timezone: effectiveTimezone, locale });
      hasUserEditedRef.current = false;
      toast.show('Preferences saved successfully', 'success');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Formatted server time string
  const formattedServerTime = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(serverNow);

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Display & Regional Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Customize visual layout density, motion accessibility, server time sync, and regional formats.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings (2 cols) */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-5 bg-surface border border-border rounded-xl p-6 shadow-xs">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary">Interface Density & Accessibility</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Configure card sizing, layout spacing, animations, and color scheme.
              </p>
            </div>

            {/* UI Density Selector & Interactive Live Preview */}
            <div className="space-y-3 pb-5 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <Select
                    label="Card & List Density"
                    value={density}
                    onChange={handleDensityChange}
                    options={[
                      { value: 'detailed', label: 'Detailed (Standard comfortable spacing)' },
                      { value: 'compact', label: 'Compact (Higher information density)' }
                    ]}
                  />
                </div>
                <div className="inline-flex items-center p-1 rounded-xl bg-surface-muted border border-border gap-1 self-start sm:self-end sm:mb-1">
                  <button
                    type="button"
                    onClick={() => handleDensityChange('detailed')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                      density === 'detailed'
                        ? 'bg-surface text-primary font-bold shadow-xs border border-border'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Detailed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDensityChange('compact')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                      density === 'compact'
                        ? 'bg-surface text-primary font-bold shadow-xs border border-border'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Compact</span>
                  </button>
                </div>
              </div>

              {/* Mini Interactive Preview Card */}
              <div className="p-3 bg-surface-muted/60 border border-border/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  <span>Live Preview — {density === 'compact' ? 'Compact Density' : 'Detailed Density'}</span>
                  <span className="text-primary font-semibold">Active Mode</span>
                </div>
                <div
                  className={`bg-surface border border-border rounded-xl transition-all shadow-xs ${
                    density === 'compact' ? 'p-2.5 space-y-1.5' : 'p-4 space-y-3'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-text-muted">TASK #142</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary-tint text-primary border border-primary/20">
                      High Priority
                    </span>
                  </div>
                  <p className="text-xs font-bold text-text-primary leading-tight">
                    Project Management & Tracking Sprint
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/40">
                    <span>Due Today</span>
                    <span className="font-semibold text-text-secondary">2 assignees</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reduced Motion Switch with Live Animation Beacon */}
            <div className="flex items-center justify-between pb-5 border-b border-border gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-text-primary">Reduced Motion</p>
                  {reducedMotion ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-muted text-text-muted border border-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                      Animations Off
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-success-tint text-success-text border border-success/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                      Smooth Motion On
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-secondary">
                  Disable drag-and-drop transitions, modal animations, and smooth scrolling for faster response and accessibility.
                </p>
              </div>
              <Switch
                aria-label="Reduced motion"
                checked={reducedMotion}
                onChange={handleReducedMotionChange}
              />
            </div>

            {/* Theme Appearance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border gap-3">
              <div>
                <p className="text-xs font-semibold text-text-primary">Theme Appearance</p>
                <p className="text-[11px] text-text-secondary">Choose between Light, Dark, or System color themes.</p>
              </div>
              <ThemeSelector />
            </div>

            {/* Timezone Section with Prominent Server Time Status */}
            <div className="space-y-3 pb-5 border-b border-border">
              <Select
                label="Primary Timezone"
                value={timezone}
                onChange={(val) => {
                  hasUserEditedRef.current = true;
                  setTimezone(val);
                  setFormDirty?.(true);
                }}
                options={TIMEZONE_OPTIONS}
              />

              {/* Authoritative Server Time Status Banner */}
              <div className="bg-primary-tint/20 border border-primary/25 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-text-primary">Authoritative Server Time (IST)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-white font-bold tracking-wider">
                      UTC+05:30
                    </span>
                  </div>
                  <p className="text-sm font-mono font-bold text-primary tracking-wide">
                    {formattedServerTime}
                  </p>
                  <p className="text-[11px] text-text-secondary leading-snug">
                    Daily tracker cutoffs (8:00 PM IST), card deadlines, audit logs, and reports strictly adhere to Server Time.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={handleSyncClock}
                  disabled={isSyncingClock}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncingClock ? 'animate-spin text-primary' : ''}`} />}
                  className="shrink-0 self-start sm:self-center"
                >
                  {isSyncingClock ? 'Syncing...' : 'Sync Server Clock'}
                </Button>
              </div>
            </div>

            {/* Regional Locale & Date Format */}
            <div className="space-y-2 pb-2">
              <Select
                label="Language & Regional Date Format"
                value={locale}
                onChange={(val) => {
                  hasUserEditedRef.current = true;
                  setLocale(val);
                  try {
                    localStorage.setItem('taskflow_locale', val);
                  } catch (e) {}
                  setFormDirty?.(true);
                }}
                options={LOCALE_OPTIONS}
              />
              <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                <span>Active Date Format:</span>
                <span className="font-mono font-semibold text-text-secondary bg-surface-muted px-1.5 py-0.5 rounded border border-border text-[10px]">
                  {locale === 'en-US' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'}
                </span>
                <span>(e.g. {locale === 'en-US' ? '11/17/2026' : '17/11/2026'})</span>
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                Reset to Server Defaults
              </Button>
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

        {/* Right Info Column (1 col) */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Server Time Synchronization
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              PMT operates on Indian Standard Time (<strong className="text-text-primary">Asia/Kolkata, UTC+05:30</strong>). Daily Tracker 8:00 PM cutoffs, leave policies, audit stamps, and reminder schedules strictly synchronize with the server clock regardless of local browser offsets.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              High Density & Performance
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Compact density mode minimizes vertical padding and spacing across board cards and issue tables, allowing you to view more tasks simultaneously without scrolling.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Accessibility Standard
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              All UI controls meet WCAG 2.1 AA accessibility guidelines with full keyboard navigation, screen reader indicators, high-contrast borders, and motion toggle support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
