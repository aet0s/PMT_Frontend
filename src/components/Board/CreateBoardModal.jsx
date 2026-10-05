import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Palette, Sparkles, Check } from 'lucide-react';
import { PALETTES } from '../../lib/palettes';

export default function CreateBoardModal({ isOpen, onClose, onCreateBoard }) {
  const [name, setName] = useState('');
  const [selectedBg, setSelectedBg] = useState(PALETTES[0].bg);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateBoard(name.trim(), selectedBg);
      setName('');
      onClose();
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Board"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!name.trim()}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Create Board
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        <Input
          label="Board Title"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q4 Sprint Planning"
        />

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary" />
            Background Theme
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 border border-border rounded-xl bg-surface-muted/50">
            {PALETTES.map((p) => {
              const isSelected = selectedBg === p.bg;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setSelectedBg(p.bg)}
                  className={`h-14 rounded-lg ${p.bg} p-2 text-left flex flex-col justify-between border-2 transition-all cursor-pointer relative shadow-xs ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/40'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  {isSelected && (
                    <span className="self-end bg-primary text-white rounded-full p-0.5 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-text-primary mt-auto truncate w-full">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
