// client/src/pages/settings/tabs/ProjectTab.jsx
import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import { useToast } from '../../../components/ui/Toast';
import { getTenantItem, setTenantItem } from '../../../lib/storage';

export default function ProjectTab({ workspace, setFormDirty }) {
  const toast = useToast();
  const tenantId = workspace?.company_id || workspace?.id;

  const [wipLimitEnabled, setWipLimitEnabled] = useState(true);
  const [wipLimitMax, setWipLimitMax] = useState(5);
  const [defaultCardSort, setDefaultCardSort] = useState('position');
  const [autoArchiveDays, setAutoArchiveDays] = useState('never');
  const [taskEstimatesEnabled, setTaskEstimatesEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = getTenantItem(tenantId, 'project_defaults', null);
    if (saved) {
      setWipLimitEnabled(saved.wipLimitEnabled ?? true);
      setWipLimitMax(saved.wipLimitMax ?? 5);
      setDefaultCardSort(saved.defaultCardSort ?? 'position');
      setAutoArchiveDays(saved.autoArchiveDays ?? 'never');
      setTaskEstimatesEnabled(saved.taskEstimatesEnabled ?? true);
    }
    setFormDirty?.(false);
  }, [tenantId, setFormDirty]);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTenantItem(tenantId, 'project_defaults', {
      wipLimitEnabled,
      wipLimitMax: Number(wipLimitMax),
      defaultCardSort,
      autoArchiveDays,
      taskEstimatesEnabled
    });
    setIsSaving(false);
    setFormDirty?.(false);
    toast.show('Project defaults saved successfully', 'success');
  };

  return (
    <div className="space-y-6 max-w-2xl text-left">
      <div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Project Defaults</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Configure default card ordering, WIP limits, and auto-archive policies across projects.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 bg-surface border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <p className="text-xs font-semibold text-text-primary">Work in Progress (WIP) Limits</p>
            <p className="text-[11px] text-text-secondary">Warn when column card count exceeds target limit.</p>
          </div>
          <Switch
            checked={wipLimitEnabled}
            onChange={(checked) => {
              setWipLimitEnabled(checked);
              setFormDirty?.(true);
            }}
          />
        </div>

        {wipLimitEnabled && (
          <div className="space-y-1.5 pb-4 border-b border-border">
            <label className="block text-xs font-semibold text-text-secondary">
              Default Column WIP Max
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={wipLimitMax}
              onChange={(e) => {
                setWipLimitMax(e.target.value);
                setFormDirty?.(true);
              }}
              className="w-32 px-3 py-1.5 bg-surface text-xs text-text-primary border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
        )}

        <div className="space-y-1.5 pb-4 border-b border-border">
          <Select
            label="Default Card Sorting"
            value={defaultCardSort}
            onChange={(val) => {
              setDefaultCardSort(val);
              setFormDirty?.(true);
            }}
            options={[
              { value: 'position', label: 'Manual (by drag-and-drop position)' },
              { value: 'due_date', label: 'Due Date (Earliest first)' },
              { value: 'title', label: 'Alphabetical (A to Z)' }
            ]}
          />
        </div>

        <div className="space-y-1.5 pb-4 border-b border-border">
          <Select
            label="Auto-Archive Completed Cards"
            value={autoArchiveDays}
            onChange={(val) => {
              setAutoArchiveDays(val);
              setFormDirty?.(true);
            }}
            options={[
              { value: 'never', label: 'Never auto-archive' },
              { value: '7', label: 'After 7 days of completion' },
              { value: '14', label: 'After 14 days of completion' },
              { value: '30', label: 'After 30 days of completion' }
            ]}
          />
        </div>

        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="text-xs font-semibold text-text-primary">Task Estimation Points</p>
            <p className="text-[11px] text-text-secondary">Allow story points and time estimates on cards.</p>
          </div>
          <Switch
            checked={taskEstimatesEnabled}
            onChange={(checked) => {
              setTaskEstimatesEnabled(checked);
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
            Save Project Defaults
          </Button>
        </div>
      </form>
    </div>
  );
}
