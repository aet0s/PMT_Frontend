// client/src/components/DailyTracker/QuickCheckinModal.jsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { createCardCheckin } from '../../api/cards';
import { CheckCircle2, AlertTriangle, Link2, Clock, AlertCircle } from 'lucide-react';

export function countWords(str) {
  return String(str || '').trim().split(/\s+/).filter(Boolean).length;
}

export default function QuickCheckinModal({
  isOpen,
  onClose,
  card,
  onSuccess
}) {
  const [did, setDid] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockerNote, setBlockerNote] = useState('');
  const [progressPercent, setProgressPercent] = useState(card?.progress_pct ?? card?.progress_percent ?? 50);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !card) return null;

  const didChars = did.trim().length;
  const didWords = countWords(did);
  const nextChars = nextStep.trim().length;

  // Requirement 3: what I did (min 30 characters, 6 words), next step (min 10 characters), a Blocked checkbox with a note
  const isDidValid = didChars >= 30 && didWords >= 6;
  const isNextValid = nextChars >= 10;
  const isBlockerValid = !isBlocked || blockerNote.trim().length > 0;
  const canSubmit = isDidValid && isNextValid && isBlockerValid && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      await createCardCheckin(card.id || card.card_id, {
        did: did.trim(),
        next_step: nextStep.trim(),
        blocker: isBlocked ? blockerNote.trim() : null,
        status: isBlocked ? 'blocked' : 'normal',
        is_blocked: isBlocked,
        progress_pct: Number(progressPercent),
        progress_percent: Number(progressPercent),
        evidence_url: evidenceUrl.trim() || null
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Work Check-in"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Card Header info */}
        <div className="p-3 bg-surface-muted border border-border/80 rounded-xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">
              Task
            </span>
            <h4 className="text-sm font-bold text-text-primary truncate">
              {card.title || card.card_title}
            </h4>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface text-text-secondary border border-border shrink-0">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Daily Update</span>
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-danger-tint border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. What did you accomplish today? (min 30 chars, 6 words) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-primary">
              What did you accomplish today? <span className="text-danger">*</span>
            </label>
            <span className={`text-[11px] font-medium ${isDidValid ? 'text-success' : 'text-text-muted'}`}>
              {didChars}/30 chars &bull; {didWords}/6 words
            </span>
          </div>
          <textarea
            value={did}
            onChange={(e) => setDid(e.target.value)}
            placeholder="Describe what you worked on, tested, built, or accomplished today (min 30 characters and 6 words)..."
            rows={3}
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* 2. What is your next concrete step? (min 10 chars) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-primary">
              What is your next step? <span className="text-danger">*</span>
            </label>
            <span className={`text-[11px] font-medium ${isNextValid ? 'text-success' : 'text-text-muted'}`}>
              {nextChars}/10 chars
            </span>
          </div>
          <textarea
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="e.g. Run integration tests, fix reviewer feedback, complete documentation..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* 3. Blocked Checkbox with Note */}
        <div className="p-3 bg-surface-muted/50 border border-border/80 rounded-xl space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isBlocked}
              onChange={(e) => setIsBlocked(e.target.checked)}
              className="w-4 h-4 rounded text-danger focus:ring-danger border-border cursor-pointer accent-danger"
            />
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <AlertCircle className={`w-3.5 h-3.5 ${isBlocked ? 'text-danger' : 'text-text-muted'}`} />
              <span>I am blocked on this task</span>
            </span>
          </label>

          {isBlocked && (
            <div className="space-y-1 pl-6">
              <label className="text-[11px] font-semibold text-danger block">
                Blocker details (required when checked) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={blockerNote}
                onChange={(e) => setBlockerNote(e.target.value)}
                placeholder="Explain what is blocking you (e.g. awaiting API credentials, design approval)..."
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface border border-danger/40 focus:border-danger outline-none text-text-primary placeholder:text-text-muted"
              />
            </div>
          )}
        </div>

        {/* 4. Progress percentage (0 - 100) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-primary">
              Progress: <span className="text-primary">{progressPercent}%</span>
            </label>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progressPercent}
            onChange={(e) => setProgressPercent(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 5. Optional Link / Evidence */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-text-muted" />
            <span>Link / Evidence (optional)</span>
          </label>
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://github.com/... or link to work done"
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
              canSubmit
                ? 'hover:bg-primary-hover shadow-primary/20'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Save Update'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
