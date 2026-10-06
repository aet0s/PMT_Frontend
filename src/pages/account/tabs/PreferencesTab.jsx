// client/src/pages/account/tabs/PreferencesTab.jsx
import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Globe, Clock, Check, Sparkles, Eye, Info } from 'lucide-react';
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
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Display & Regional Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Customize visual layout density, accessibility animations, timezone offsets, and localization.
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
                Adjust how cards, boards, and lists are formatted on screen.
              </p>
            </div>

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
                <p className="text-[11px] text-text-secondary">Disable drag-and-drop transitions and decorative animations.</p>
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
                label="Primary Timezone"
                value={timezone}
                onChange={(val) => {
                  setTimezone(val);
                  setFormDirty?.(true);
                }}
                options={TIMEZONE_OPTIONS}
              />
              <p className="text-[11px] text-text-muted">
                Card due dates and activity timestamps will be automatically converted to your selected timezone.
              </p>
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

            <div className="flex justify-end pt-3 border-t border-border">
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
              Global Time Sync
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              TaskFlow stores all events in UTC and translates them to your personal timezone. Teammates in different regions see synchronized due dates relative to their own local time.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Accessibility Standard
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              All UI components are built to meet WCAG AA contrast standards with keyboard navigation support, focus indicators, and screen reader labels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
