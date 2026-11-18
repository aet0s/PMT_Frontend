// client/src/pages/account/tabs/PreferencesTab.jsx
import React, { useState, useRef } from 'react';
import {
  SlidersHorizontal,
  Check,
  Eye,
  RotateCcw,
  Zap,
  Minimize2,
  Maximize2,
  Sparkles,
  Layers,
  Palette
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import { ThemeSelector } from '../../../components/ui/ThemeToggle';
import { useToast } from '../../../components/ui/Toast';

export default function PreferencesTab({ setFormDirty }) {
  const toast = useToast();
  const hasUserEditedRef = useRef(false);

  const [density, setDensity] = useState(() => localStorage.getItem('taskflow_density') || 'detailed');
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('taskflow_reduced_motion') === 'true');
  const [isSaving, setIsSaving] = useState(false);
  const [testAnimActive, setTestAnimActive] = useState(false);

  // Handle live density toggle
  const handleDensityChange = (newDensity) => {
    hasUserEditedRef.current = true;
    setDensity(newDensity);
    try {
      localStorage.setItem('taskflow_density', newDensity);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('density-compact', newDensity === 'compact');
      }
    } catch (e) { }
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
    } catch (e) { }
    setFormDirty?.(true);
  };

  // Reset all preferences back to defaults
  const handleResetDefaults = async () => {
    const defaultDensity = 'detailed';
    const defaultMotion = false;

    hasUserEditedRef.current = false;
    setDensity(defaultDensity);
    setReducedMotion(defaultMotion);

    try {
      localStorage.setItem('taskflow_density', defaultDensity);
      localStorage.setItem('taskflow_reduced_motion', 'false');
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('density-compact');
        document.documentElement.classList.remove('reduce-motion');
      }
      toast.show('Preferences reset to default display settings', 'info');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to reset preferences', 'error');
    }
  };

  // Save preferences
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      localStorage.setItem('taskflow_density', density);
      localStorage.setItem('taskflow_reduced_motion', String(reducedMotion));

      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('reduce-motion', Boolean(reducedMotion));
        document.documentElement.classList.toggle('density-compact', density === 'compact');
      }

      hasUserEditedRef.current = false;
      toast.show('Preferences saved successfully', 'success');
      setFormDirty?.(false);
    } catch (err) {
      toast.show(err.message || 'Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerMotionTest = () => {
    setTestAnimActive(true);
    setTimeout(() => setTestAnimActive(false), 1200);
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Display & Visual Preferences
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Customize interface density, motion accessibility, and color themes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings (2 cols) */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-6 bg-surface border border-border rounded-xl p-6 shadow-xs">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary">Interface Density & Accessibility</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Configure card sizing, layout spacing, animations, and color scheme.
              </p>
            </div>

            {/* UI Density Selector & Interactive Live Comparison Preview */}
            <div className="space-y-4 pb-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <Select
                    label="Card & List Density"
                    value={density}
                    onChange={handleDensityChange}
                    options={[
                      { value: 'detailed', label: 'Detailed (Standard comfortable spacing with descriptions & full tags)' },
                      { value: 'compact', label: 'Compact (High information density: tight spacing, streamlined cards)' }
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

              {/* Side-by-Side or Highlighted Interactive Preview */}
              <div className="p-4 bg-surface-muted/60 border border-border/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Live Comparison Preview
                  </span>
                  <span className="text-primary font-bold bg-primary-tint px-2 py-0.5 rounded-full text-[10px] border border-primary/20">
                    Active: {density === 'compact' ? 'Compact Density' : 'Detailed Density'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Detailed Preview Card */}
                  <div
                    onClick={() => handleDensityChange('detailed')}
                    className={`bg-surface border rounded-xl p-4 space-y-2.5 transition-all cursor-pointer select-none ${
                      density === 'detailed'
                        ? 'ring-2 ring-primary border-primary shadow-sm bg-surface'
                        : 'border-border/70 opacity-60 hover:opacity-100 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">TASK-101</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary-tint text-primary border border-primary/20">
                        Detailed Mode
                      </span>
                    </div>
                    <p className="text-sm font-bold text-text-primary leading-tight">
                      Q3 Design System Overhaul & Component Library
                    </p>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      Detailed view provides comfortable spacing, multi-line card descriptions, and generous visual padding for relaxed browsing.
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border/50">
                      <span>Due in 3 days</span>
                      <span className="font-semibold text-text-secondary">3 assignees</span>
                    </div>
                  </div>

                  {/* Compact Preview Card */}
                  <div
                    onClick={() => handleDensityChange('compact')}
                    className={`bg-surface border rounded-xl p-2.5 space-y-1.5 transition-all cursor-pointer select-none ${
                      density === 'compact'
                        ? 'ring-2 ring-primary border-primary shadow-sm bg-surface'
                        : 'border-border/70 opacity-60 hover:opacity-100 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">TASK-102</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-success-tint text-success border border-success/20">
                        Compact (2x Density)
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-text-primary leading-snug truncate">
                      Q3 Design System Overhaul & Component Library
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border/40">
                      <span>Due Today</span>
                      <span className="font-medium text-text-secondary">2 assignees</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reduced Motion Switch with Live Animation Beacon & Test */}
            <div className="pb-6 border-b border-border space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-text-primary">Reduced Motion</p>
                    {reducedMotion ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-muted text-text-muted border border-border">
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                        Animations Off
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-success-tint text-success-text border border-success/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                        Smooth Motion Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Disable transitions, pulse beacons, modal slide-ins, and animations for accessibility and instant UI response.
                  </p>
                </div>
                <Switch
                  aria-label="Reduced motion"
                  checked={reducedMotion}
                  onChange={handleReducedMotionChange}
                />
              </div>

              {/* Interactive Motion Test Area */}
              <div className="p-3 bg-surface-muted/50 border border-border/70 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      reducedMotion
                        ? 'bg-surface border border-border text-text-muted'
                        : testAnimActive
                        ? 'bg-primary text-white scale-110 rotate-12 duration-300'
                        : 'bg-primary-tint text-primary animate-pulse'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">
                      {reducedMotion ? 'Static Mode Active (No Motion)' : 'Smooth Animation Enabled'}
                    </span>
                    <span className="text-[11px] text-text-muted block">
                      {reducedMotion
                        ? 'Transitions and loops are completely stopped.'
                        : 'Elements smoothly ease, slide, and animate.'}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={triggerMotionTest}
                  className="shrink-0 text-xs"
                >
                  Test Motion
                </Button>
              </div>
            </div>

            {/* Theme Appearance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
              <div>
                <p className="text-xs font-semibold text-text-primary">Theme Appearance</p>
                <p className="text-[11px] text-text-secondary">Choose between Light, Dark, or System color themes.</p>
              </div>
              <ThemeSelector />
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
                Reset to Defaults
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
              <Zap className="w-4 h-4 text-primary" />
              High Density & Scannability
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Compact density minimizes card margins and collapses non-essential descriptions, displaying up to 2x more tasks on your board simultaneously without scrolling.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Accessibility & Reduced Motion
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Enabling Reduced Motion disables animations and transition effects across modal overlays, toast notifications, drag-and-drop indicators, and buttons according to WCAG 2.1 AA guidelines.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Adaptive Color Theme
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Themes apply instantly across all workspaces and boards. The System theme automatically syncs with your operating system light and dark schedule.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
