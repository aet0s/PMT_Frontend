import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { CheckCircle2, Link2, Sparkles, AlertCircle, Check } from 'lucide-react';

export default function TaskCompletionModal({
  isOpen,
  onClose,
  card,
  onSubmit,
  isSubmitting = false
}) {
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [error, setError] = useState(null);

  // Initialize from card data or recent candidates
  useEffect(() => {
    if (!isOpen || !card) return;

    if (card.completion_note) {
      setNote(card.completion_note);
    } else {
      // Find candidate from recent comments or checkins
      const recentComment = (card.comments || []).find((c) => (c.body || c.content || '').trim().length >= 20);
      if (recentComment) {
        setNote((recentComment.body || recentComment.content).trim());
      } else {
        setNote('');
      }
    }

    setEvidenceUrl(card.completion_evidence_url || '');
    setError(null);
  }, [isOpen, card]);

  if (!isOpen || !card) return null;

  const trimmedLength = note.trim().length;
  const isLengthValid = trimmedLength >= 20;

  // Candidates for quick-fill chips if note is currently empty or different
  const candidateNotes = [];
  if (card.comments && card.comments.length > 0) {
    for (const c of card.comments) {
      const content = (c.body || c.content || '').trim();
      if (content.length >= 20 && !candidateNotes.includes(content)) {
        candidateNotes.push(content);
        if (candidateNotes.length >= 2) break;
      }
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isLengthValid || isSubmitting) return;

    setError(null);
    try {
      await onSubmit({
        completion_note: note.trim(),
        completion_evidence_url: evidenceUrl.trim() || null
      });
    } catch (err) {
      setError(err?.message || 'Failed to complete task. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5 text-text-primary">
          <div className="w-8 h-8 rounded-full bg-success-tint flex items-center justify-center shrink-0 text-success border border-success/30">
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Task Completion Result</h3>
            <p className="text-xs text-text-secondary font-normal mt-0.5">
              Tasks open for more than 2 working days require an outcome summary
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isLengthValid || isSubmitting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer ${
              isLengthValid && !isSubmitting
                ? 'bg-success text-white hover:bg-success/90 active:scale-[0.98]'
                : 'bg-surface-muted text-text-muted border border-border cursor-not-allowed opacity-60'
            }`}
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                Complete Task
              </>
            )}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Task Title Banner */}
        <div className="p-3 bg-surface-muted border border-border/70 rounded-xl flex items-start gap-2.5">
          <span className="text-xs font-mono font-bold text-text-muted shrink-0 mt-0.5">#{card.id}</span>
          <p className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
            {card.title}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger-tint text-danger-text border border-danger/30 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Fill Candidate chips */}
        {candidateNotes.length > 0 && candidateNotes[0] !== note.trim() && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Use Recent Task Update
            </span>
            <div className="flex flex-col gap-1.5">
              {candidateNotes.map((cand, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNote(cand)}
                  className="text-left p-2.5 text-xs bg-primary-tint/30 hover:bg-primary-tint/60 border border-primary/30 rounded-lg text-text-primary transition-colors cursor-pointer group"
                >
                  <span className="line-clamp-2 font-medium">"{cand}"</span>
                  <span className="text-[10px] text-primary font-bold group-hover:underline mt-1 block">
                    Click to insert as outcome note →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Outcome Note Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="completion-outcome-note" className="text-xs font-bold text-text-primary">
              One-line Result / Outcome <span className="text-danger">*</span>
            </label>
            <span
              className={`text-xs font-bold transition-colors ${
                isLengthValid ? 'text-success' : 'text-danger'
              }`}
            >
              {isLengthValid ? (
                `✓ ${trimmedLength} characters`
              ) : (
                `${trimmedLength} / 20 chars minimum (${20 - trimmedLength} more needed)`
              )}
            </span>
          </div>
          <textarea
            id="completion-outcome-note"
            rows={3}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Completed verification and deployed the fix to staging successfully"
            className={`w-full p-3 bg-surface border rounded-xl text-sm text-text-primary placeholder:text-text-muted transition-all focus:outline-none focus:ring-2 ${
              isLengthValid
                ? 'border-border focus:border-success focus:ring-success/30'
                : 'border-border-strong focus:border-danger focus:ring-danger/30'
            }`}
          />
        </div>

        {/* Evidence Link Input (Optional) */}
        <div className="space-y-1.5">
          <label htmlFor="completion-evidence-url" className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-text-muted" />
            Evidence / Reference Link <span className="text-text-muted font-normal">(Optional)</span>
          </label>
          <input
            id="completion-evidence-url"
            type="url"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://github.com/... or PR / deployment URL"
            className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </form>
    </Modal>
  );
}
