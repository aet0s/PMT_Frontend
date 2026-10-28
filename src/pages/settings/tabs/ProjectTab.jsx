// client/src/pages/settings/tabs/ProjectTab.jsx
import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Check, Kanban, Clock, Archive } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import { useToast } from '../../../components/ui/Toast';
import { getTenantItem, setTenantItem } from '../../../lib/storage';
import { updateWorkspace, autoArchiveWorkspaceCards } from '../../../api/workspaces';
import { usePermissions } from '../../../context/PermissionContext';

export default function ProjectTab({ workspace, onWorkspaceUpdated, setFormDirty }) {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const workspaceId = workspace?.id;
  const canArchive = hasPermission('task.archive');
  const canEditWorkspace = hasPermission('workspace.edit') || hasPermission('project.edit_settings');

  const [wipLimitEnabled, setWipLimitEnabled] = useState(true);
  const [wipLimitMax, setWipLimitMax] = useState(5);
  const [autoArchiveDays, setAutoArchiveDays] = useState('7');
  const [taskEstimatesEnabled, setTaskEstimatesEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    const saved =
      workspace?.settings?.workspace_defaults ||
      workspace?.settings?.project_defaults ||
      getTenantItem(`ws_defaults_${workspaceId}`, 'settings', null);

    if (saved) {
      setWipLimitEnabled(saved.wipLimitEnabled ?? true);
      setWipLimitMax(saved.wipLimitMax ?? 5);
      setAutoArchiveDays(saved.autoArchiveDays ?? '7');
      setTaskEstimatesEnabled(saved.taskEstimatesEnabled ?? true);
    } else {
      // Clean defaults: WIP ON (max 5), auto-archive 7 days
      setWipLimitEnabled(true);
      setWipLimitMax(5);
      setAutoArchiveDays('7');
      setTaskEstimatesEnabled(true);
    }
    setFormDirty?.(false);
  }, [workspaceId, workspace?.settings, setFormDirty]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!workspaceId) return;
    setIsSaving(true);

    const newDefaults = {
      wipLimitEnabled,
      wipLimitMax: Math.max(1, Number(wipLimitMax) || 5),
      autoArchiveDays,
      taskEstimatesEnabled
    };

    setTenantItem(`ws_defaults_${workspaceId}`, 'settings', newDefaults);

    try {
      const nextSettings = {
        ...(workspace.settings || {}),
        workspace_defaults: newDefaults,
        project_defaults: newDefaults // Mirror for backward compatibility
      };

      const res = await updateWorkspace(workspaceId, { settings: nextSettings });
      if (res?.workspace) {
        onWorkspaceUpdated?.(res.workspace);
      }
      toast.show('Workspace defaults saved and synced successfully', 'success');
    } catch (err) {
      console.warn('Failed to sync workspace defaults:', err);
      toast.show('Workspace defaults saved locally', 'info');
    } finally {
      setIsSaving(false);
      setFormDirty?.(false);
    }
  };

  const handleRunAutoArchiveNow = async () => {
    if (!workspaceId) return;
    setIsArchiving(true);
    try {
      const days = autoArchiveDays === 'never' ? 7 : Number(autoArchiveDays);
      const res = await autoArchiveWorkspaceCards(workspaceId, days);
      const count = res?.archived_count ?? res?.archivedCount ?? 0;
      if (count > 0) {
        toast.show(`Auto-archived ${count} completed card(s)`, 'success');
        onWorkspaceUpdated?.({ ...workspace });
      } else {
        toast.show(
          days > 0
            ? `No completed cards older than ${days} day(s) found`
            : 'No completed cards found to archive',
          'info'
        );
      }
    } catch (err) {
      toast.show(err.message || 'Auto-archive failed', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      <div className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Workspace Defaults
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure column WIP limits and auto-archive policies for projects in this workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form (2 cols) */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-6 bg-surface border border-border rounded-xl p-6 shadow-xs">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text-primary">Kanban & Flow Rules</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Default behavior for columns and boards in this workspace.
              </p>
            </div>

            {/* WIP Limits Toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <p className="text-xs font-semibold text-text-primary">Work in Progress (WIP) Limits</p>
                <p className="text-[11px] text-text-secondary">
                  When turned OFF, WIP limit warnings are disabled across all lists in this workspace.
                </p>
              </div>
              <Switch
                checked={wipLimitEnabled}
                onChange={(checked) => {
                  setWipLimitEnabled(checked);
                  setFormDirty?.(true);
                }}
              />
            </div>

            {/* Default WIP Max Input (only when WIP limits are enabled) */}
            {wipLimitEnabled && (
              <div className="space-y-1.5 pb-4 border-b border-border">
                <label className="block text-xs font-semibold text-text-primary">
                  Default Column WIP Limit
                </label>
                <p className="text-[11px] text-text-secondary">
                  Default maximum cards allowed per column. Newly created columns and columns without custom limits will use this value.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={wipLimitMax}
                    onChange={(e) => {
                      setWipLimitMax(e.target.value);
                      setFormDirty?.(true);
                    }}
                    className="w-24 px-3 py-1.5 bg-surface text-xs text-text-primary border border-border rounded-lg focus:outline-none focus:border-primary font-bold"
                  />
                  <span className="text-xs text-text-secondary">cards per column</span>
                </div>
              </div>
            )}

            {/* Auto-Archive Completed Cards (Default: 7 days) */}
            <div className="space-y-2.5 pb-4 border-b border-border">
              <Select
                label="Auto-Archive Completed Cards"
                value={autoArchiveDays}
                onChange={(val) => {
                  setAutoArchiveDays(val);
                  setFormDirty?.(true);
                }}
                options={[
                  { value: 'never', label: 'Never auto-archive' },
                  { value: '0', label: 'Immediate (Archive all completed cards)' },
                  { value: '1', label: 'After 1 day of completion' },
                  { value: '3', label: 'After 3 days of completion' },
                  { value: '7', label: 'After 7 days of completion (Default)' },
                  { value: '14', label: 'After 14 days of completion' },
                  { value: '30', label: 'After 30 days of completion' }
                ]}
              />
              <p className="text-[11px] text-text-secondary">
                Automatically archives completed cards matching this threshold across all projects in this workspace. Auto-archival applies strictly to cards; boards and lists are never affected.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-text-muted">
                  Runs automatically in the background, or trigger on demand:
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRunAutoArchiveNow}
                  isLoading={isArchiving}
                  disabled={!canArchive}
                  title={!canArchive ? 'Requires task.archive permission' : 'Trigger auto-archive sweep on demand'}
                  leftIcon={<Archive className="w-3.5 h-3.5" />}
                >
                  Run Auto-Archive Now
                </Button>
              </div>
            </div>

            {/* Task Estimates */}
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

            <div className="flex justify-end pt-3 border-t border-border">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Workspace Defaults
              </Button>
            </div>
          </form>
        </div>

        {/* Guidance and Best Practices (1 col) */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Kanban className="w-4 h-4 text-primary" />
              WIP Limits Philosophy
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              WIP (Work In Progress) constraints prevent bottlenecks by restricting unfinished tasks in any single status column, keeping team cycle time predictable. When disabled, teams can move tasks without warning prompts.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Automated Archiving
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Auto-archiving clears completed tasks from active sprint boards while retaining full historical records for audits, reports, and timeline tracking. Only cards are archived; boards and lists remain intact.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
