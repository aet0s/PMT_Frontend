// client/src/pages/account/tabs/PreferencesTab.jsx
import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Globe, Clock, Check } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time - US & Canada)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time - US & Canada)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time - US & Canada)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time - US & Canada)' },
  { value: 'Europe/London', label: 'Europe/London (Greenwich Mean Time / BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (Central European Time)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (Central European Time)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (India Standard Time - IST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore Standard Time)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan Standard Time)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (Australian Eastern Time)' }
];

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English (US / International)' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'de', label: 'Deutsch (German)' },
  { value: 'ja', label: '日本語 (Japanese)' }
];

export default function PreferencesTab({ setFormDirty }) {
  const toast = useToast();
  const { user, updateUserProfile } = useAuth();

  const [density, setDensity] = useState(() => localStorage.getItem('taskflow_density') || 'detailed');
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('taskflow_reduced_motion') === 'true');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [locale, setLocale] = useState(user?.locale || 'en');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTimezone(user?.timezone || 'UTC');
    setLocale(user?.locale || 'en');
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      localStorage.setItem('taskflow_density', density);
      localStorage.setItem('taskflow_reduced_motion', String(reducedMotion));
      await updateUserProfile({ timezone, locale });
      toast.show('Preferences updated successfully', 'success');
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
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Display & Regional Preferences</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Customize UI density, motion settings, time format, and localization.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 bg-surface border border-border rounded-xl p-5 shadow-xs">
        {/* UI Density */}
        <div className="space-y-1.5 pb-4 border-b border-border">
          <Select
            label="Card & List Density"
            value={density}
            onChange={(val) => {
              setDensity(val);
              setFormDirty?.(true);
            }}
            options={[
              { value: 'detailed', label: 'Detailed (Standard comfortable spacing)' },
              { value: 'compact', label: 'Compact (Higher information density)' }
            ]}
          />
        </div>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-text-primary">Reduced Motion</p>
            <p className="text-[11px] text-text-secondary">Disable animations and transitions for improved accessibility.</p>
          </div>
          <Switch
            aria-label="Reduced motion"
            checked={reducedMotion}
            onChange={(checked) => {
              setReducedMotion(checked);
              setFormDirty?.(true);
            }}
          />
        </div>

        {/* Timezone */}
        <div className="space-y-1.5 pb-4 border-b border-border">
          <Select
            label="Timezone"
            value={timezone}
            onChange={(val) => {
              setTimezone(val);
              setFormDirty?.(true);
            }}
            options={TIMEZONE_OPTIONS}
          />
        </div>

        {/* Locale */}
        <div className="space-y-1.5 pb-2">
          <Select
            label="Language / Locale"
            value={locale}
            onChange={(val) => {
              setLocale(val);
              setFormDirty?.(true);
            }}
            options={LOCALE_OPTIONS}
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
