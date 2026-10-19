// client/src/components/DailyTracker/QuickCheckinModal.jsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { createCardCheckin } from '../../api/cards';
import { CheckCircle2, AlertTriangle, Link2, Sparkles, Brain, Clock } from 'lucide-react';

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
  const [blockers, setBlockers] = useState('');
  const [progressPercent, setProgressPercent] = useState(card?.progress_percent || 50);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !card) return null;

  const didChars = did.trim().length;
  const didWords = countWords(did);
  const nextChars = nextStep.trim().length;

  const isDidValid = didChars >= 40 && didWords >= 8;
  const isNextValid = nextChars >= 10;
  const canSubmit = isDidValid && isNextValid && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      await createCardCheckin(card.id, {
        did: did.trim(),
        next_step: nextStep.trim(),
        blockers: blockers.trim() || null,
        progress_percent: Number(progressPercent),
        evidence_url: evidenceUrl.trim() || null
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit check-in');
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
              Active Focus Task
            </span>
            <h4 className="text-sm font-bold text-text-primary truncate">
              {card.title}
            </h4>
          </div>
          {card.deep_work ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
              <Brain className="w-3 h-3" />
              <span>Deep Work</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface text-text-secondary border border-border shrink-0">
              <Clock className="w-3 h-3" />
              <span>Standard Task</span>
            </span>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-danger-tint border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. What did you accomplish today? */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-primary">
              What did you accomplish today? <span className="text-danger">*</span>
            </label>
            <span className={`text-[11px] font-medium ${isDidValid ? 'text-success' : 'text-text-muted'}`}>
              {didChars}/40 chars &bull; {didWords}/8 words
            </span>
          </div>
          <textarea
            value={did}
            onChange={(e) => setDid(e.target.value)}
            placeholder="Describe specific engineering/design progress, test passes, architecture specs, or refactorings completed today..."
            rows={3}
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* 2. What is your next concrete step? */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-primary">
              What is your next concrete step? <span className="text-danger">*</span>
            </label>
            <span className={`text-[11px] font-medium ${isNextValid ? 'text-success' : 'text-text-muted'}`}>
              {nextChars}/10 chars
            </span>
          </div>
          <textarea
            value={nextStep}
            onChange={(e) => setNextStep(e.target.value)}
            placeholder="e.g. Implement index migration, verify query plan, write unit tests..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* 3. Blockers */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-primary flex items-center justify-between">
            <span>Any blockers or dependencies? (Optional)</span>
            {blockers.trim() && (
              <span className="text-[11px] font-bold text-danger">⚠️ Will flag task as Blocked</span>
            )}
          </label>
          <input
            type="text"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="e.g. Awaiting security review or external API access key"
            className="w-full px-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-primary placeholder:text-text-muted"
          />
        </div>

        {/* 4. Progress percentage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-primary">
              Estimated Completion: <span className="text-primary">{progressPercent}%</span>
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

        {/* 5. Evidence URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-text-muted" />
            <span>Evidence / Deliverable Link (PR, Commit, Benchmark, Doc)</span>
          </label>
          <input
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://github.com/... or https://example.com/spec.pdf"
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
            <span>{submitting ? 'Submitting...' : 'Save Check-in'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
