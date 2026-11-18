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
  Palette,
  Calendar
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import { ThemeSelector } from '../../../components/ui/ThemeToggle';
import { useToast } from '../../../components/ui/Toast';
import useDisplayPreferences, { saveDisplayPreferences } from '../../../hooks/useDisplayPreferences';

export default function PreferencesTab({ setFormDirty }) {
  const toast = useToast();
  const hasUserEditedRef = useRef(false);

  const { density, reducedMotion, setDensity, setReducedMotion } = useDisplayPreferences();
  const [isSaving, setIsSaving] = useState(false);
  const [testAnimActive, setTestAnimActive] = useState(false);

  // Handle live density toggle
  const handleDensityChange = (newDensity) => {
    hasUserEditedRef.current = true;
    setDensity(newDensity);
    setFormDirty?.(true);
  };

  // Handle live reduced motion toggle
  const handleReducedMotionChange = (checked) => {
    hasUserEditedRef.current = true;
    setReducedMotion(checked);
    setFormDirty?.(true);
  };

  // Reset all preferences back to defaults
  const handleResetDefaults = async () => {
    hasUserEditedRef.current = false;
    setDensity('detailed');
    setReducedMotion(false);
    toast.show('Preferences reset to default display settings', 'info');
    setFormDirty?.(false);
  };

  // Save preferences
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      saveDisplayPreferences({ density, reducedMotion });
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
                      { value: 'detailed', label: 'Detailed (Standard comfortable spacing with descriptions, tags & assignees)' },
                      { value: 'compact', label: 'Compact (Title and date only. Click card to view full details)' }
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
                    className={`bg-surface border rounded-xl p-3 space-y-2 transition-all cursor-pointer select-none ${
                      density === 'compact'
                        ? 'ring-2 ring-primary border-primary shadow-sm bg-surface'
                        : 'border-border/70 opacity-60 hover:opacity-100 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[9px] font-bold text-success uppercase tracking-wider bg-success-tint px-1.5 py-0.5 rounded border border-success/20">
                        Title & Date Only
                      </span>
                      <span className="text-[10px] text-text-muted italic">Click to view details</span>
                    </div>
                    <p className="text-xs font-bold text-text-primary leading-snug truncate">
                      Q3 Design System Overhaul & Component Library
                    </p>
                    <div className="flex items-center pt-0.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted text-text-secondary border border-border/50">
                        <Calendar className="w-3 h-3 text-text-muted" />
                        Due in 3 days
                      </span>
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
                    Completely disables all card transitions, drop animations, blinking, and live cursor streaming. Drag and drop cards directly into lists without cards flying around.
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
              Compact density displays strictly card titles and dates for ultra-clean, minimal scannability across columns. Clicking any card opens its modal with all rich details.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Accessibility & Reduced Motion
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Enabling Reduced Motion completely disables animations, transitions, and live card flight effects. Teammates dragging cards will not show floating cursors, and dropped cards instantly snap into place without blinking.
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
