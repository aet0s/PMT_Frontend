import React, { useState } from 'react';
import Popover from '../shared/Popover';
import LabelPill from '../shared/LabelPill';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Check, Plus, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { LABEL_PALETTES } from '../../lib/labelColors';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../context/PermissionContext';

export const PRESET_LABELS = [
  { name: 'Feature', color: 'blue' },
  { name: 'Bug', color: 'rose' },
  { name: 'Design', color: 'purple' },
  { name: 'Backend', color: 'green' },
  { name: 'Frontend', color: 'teal' },
  { name: 'Urgent', color: 'amber' }
];

export default function LabelsPopover({
  isOpen,
  onClose,
  anchorRef,
  cardLabels = [],
  boardLabels = [],
  onToggleLabel,
  onCreateBoardLabel,
  onDeleteBoardLabel,
  currentUser: propUser,
  userRole: propRole
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [isSeedingPresets, setIsSeedingPresets] = useState(false);
  const [deletingLabelId, setDeletingLabelId] = useState(null);

  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch (e) {}

  let contextRole = null;
  let contextPermissions = [];
  try {
    const permCtx = usePermissions();
    contextRole = permCtx?.userRole;
    contextPermissions = permCtx?.permissions || [];
  } catch (e) {}

  const currentUser = propUser || authUser;
  const userRole = propRole || contextRole;

  const roleName = (typeof userRole === 'string' ? userRole : userRole?.name || '').toLowerCase().trim();
  const isPrivileged = [
    'owner',
    'super admin',
    'admin',
    'project manager',
    'manager'
  ].includes(roleName) || (userRole?.rank >= 60) || contextPermissions.includes('label.delete');

  const handleDeleteLabel = async (e, labelId) => {
    e.stopPropagation();
    if (!onDeleteBoardLabel || deletingLabelId) return;
    setDeletingLabelId(labelId);
    try {
      await onDeleteBoardLabel(labelId);
    } catch (err) {
      console.error('Failed to delete label:', err);
    } finally {
      setDeletingLabelId(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const created = await onCreateBoardLabel(name.trim(), selectedColor);
      if (created?.id) {
        onToggleLabel(created.id);
      }
      setName('');
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePresetClick = async (preset) => {
    // Check if this preset label already exists on the board
    const existing = boardLabels.find(
      (l) => l.name.toLowerCase() === preset.name.toLowerCase()
    );

    if (existing) {
      onToggleLabel(existing.id);
    } else {
      try {
        const created = await onCreateBoardLabel(preset.name, preset.color);
        if (created?.id) {
          onToggleLabel(created.id);
        }
      } catch (err) {
        console.error('Failed to create preset label:', err);
      }
    }
  };

  const handleAddAllPresets = async () => {
    setIsSeedingPresets(true);
    try {
      for (const preset of PRESET_LABELS) {
        const exists = boardLabels.some(
          (l) => l.name.toLowerCase() === preset.name.toLowerCase()
        );
        if (!exists) {
          await onCreateBoardLabel(preset.name, preset.color);
        }
      }
    } catch (err) {
      console.error('Failed to seed preset labels:', err);
    } finally {
      setIsSeedingPresets(false);
    }
  };

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} title="Labels" className="w-80">
      <div className="space-y-4 text-xs">
        {/* Board Labels Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
              Board Labels
            </span>
            {boardLabels.length === 0 && (
              <button
                type="button"
                onClick={handleAddAllPresets}
                disabled={isSeedingPresets}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isSeedingPresets ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Add presets
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {boardLabels.length === 0 ? (
              <div className="p-3 bg-surface-muted/60 rounded-xl border border-dashed border-border text-center">
                <p className="text-xs text-text-muted mb-2">No labels configured on this board yet.</p>
                <Button
                  type="button"
                  size="xs"
                  variant="primary"
                  onClick={handleAddAllPresets}
                  disabled={isSeedingPresets}
                  leftIcon={isSeedingPresets ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  className="mx-auto"
                >
                  Load 6 Preset Labels
                </Button>
              </div>
            ) : (
              boardLabels.map((l) => {
                const isChecked = cardLabels.some((cl) => cl.id === l.id);
                const isCustom = Boolean(
                  l.is_custom === 1 ||
                  l.is_custom === true ||
                  l.created_by_user_id ||
                  (l.is_custom !== 0 && !PRESET_LABELS.some((p) => p.name.toLowerCase() === l.name.toLowerCase()))
                );

                const isOwnerOfLabel = Boolean(
                  isCustom &&
                  currentUser?.id &&
                  l.created_by_user_id &&
                  Number(l.created_by_user_id) === Number(currentUser.id)
                );

                const canDelete = isCustom && (isPrivileged || isOwnerOfLabel);
                const isDeleting = deletingLabelId === l.id;

                return (
                  <div
                    key={l.id}
                    className={`group flex items-center gap-1.5 p-1.5 rounded-lg bg-surface hover:bg-surface-muted border transition-all ${
                      isChecked ? 'border-primary/50 bg-primary/5 shadow-xs' : 'border-border'
                    }`}
                  >
                    {/* Dustbin icon in front of custom created label */}
                    {canDelete && (
                      <button
                        type="button"
                        title="Delete custom label"
                        aria-label={`Delete custom label ${l.name}`}
                        onClick={(e) => handleDeleteLabel(e, l.id)}
                        disabled={isDeleting}
                        className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <div
                      onClick={() => onToggleLabel(l.id)}
                      className="flex-1 flex items-center justify-between cursor-pointer min-w-0 py-0.5"
                    >
                      <LabelPill name={l.name} color={l.color} size="sm" />
                      {isChecked && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Preset Badges */}
        <div className="pt-2 border-t border-border">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
            Preset Suggestions
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LABELS.map((preset) => {
              const boardMatch = boardLabels.find(
                (l) => l.name.toLowerCase() === preset.name.toLowerCase()
              );
              const isChecked = boardMatch && cardLabels.some((cl) => cl.id === boardMatch.id);

              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                    isChecked
                      ? 'ring-2 ring-primary border-primary shadow-xs'
                      : 'hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <LabelPill name={preset.name} color={preset.color} size="xs" />
                  {isChecked && <Check className="w-3 h-3 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Create new label section */}
        <div className="pt-2 border-t border-border">
          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <Input
                placeholder="Label name"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-[11px] text-text-secondary font-semibold block">Select Pastel Color:</label>
                <div className="flex flex-wrap gap-1.5">
                  {LABEL_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => setSelectedColor(pal.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${pal.bg} ${pal.text} ${
                        selectedColor === pal.id ? 'ring-2 ring-primary border-primary' : pal.border
                      }`}
                    >
                      {pal.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" variant="primary" size="sm" className="flex-1">
                  Create Label
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreating(true)}
              leftIcon={<Plus className="w-3.5 h-3.5 text-primary" />}
              className="w-full"
            >
              Create a custom label
            </Button>
          )}
        </div>
      </div>
    </Popover>
  );
}
