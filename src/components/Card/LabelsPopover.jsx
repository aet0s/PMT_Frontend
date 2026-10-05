import React, { useState } from 'react';
import Popover from '../shared/Popover';
import LabelPill from '../shared/LabelPill';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Check, Plus } from 'lucide-react';
import { LABEL_PALETTES } from '../../lib/labelColors';

export default function LabelsPopover({
  isOpen,
  onClose,
  anchorRef,
  cardLabels = [],
  boardLabels = [],
  onToggleLabel,
  onCreateBoardLabel
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await onCreateBoardLabel(name.trim(), selectedColor);
      setName('');
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} title="Labels" className="w-72">
      <div className="space-y-3 text-xs">
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block">
          Board Labels
        </span>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {boardLabels.length === 0 ? (
            <p className="text-xs text-text-muted italic py-1">No labels created yet.</p>
          ) : (
            boardLabels.map((l) => {
              const isChecked = cardLabels.some((cl) => cl.id === l.id);
              return (
                <div
                  key={l.id}
                  onClick={() => onToggleLabel(l.id)}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface hover:bg-surface-muted border border-border cursor-pointer transition-colors"
                >
                  <LabelPill name={l.name} color={l.color} size="sm" />
                  {isChecked && <Check className="w-4 h-4 text-success" />}
                </div>
              );
            })
          )}
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
              Create a new label
            </Button>
          )}
        </div>
      </div>
    </Popover>
  );
}
