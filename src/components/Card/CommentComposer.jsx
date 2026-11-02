// client/src/components/Card/CommentComposer.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar } from '../ui/Avatar';
import { Send, X, AtSign, CornerDownLeft, Loader2 } from 'lucide-react';
import { getMentionCandidates } from '../../api/cards';
import { useAuth } from '../../hooks/useAuth';
import { getDraft, setDraft, clearDraft } from '../../lib/storage';

export default function CommentComposer({
  cardId,
  replyTarget = null,
  onCancelReply = null,
  onSubmitComment,
  placeholder = 'Write a comment...',
  autoFocus = false,
  boardMembers = []
}) {
  const { user } = useAuth();
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState(null); // string query or null if not mentioning
  const [mentionIndex, setMentionIndex] = useState(-1); // start index of '@' in text
  const [candidates, setCandidates] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState([]); // array of { id, name }

  // Restore draft for top-level comments
  useEffect(() => {
    if (!replyTarget && cardId) {
      const restored = getDraft(null, cardId, 'comment');
      if (restored && restored.trim()) {
        setText(restored);
      }
    }
  }, [cardId, replyTarget]);

  // Handle auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, replyTarget]);

  // Adjust textarea height dynamically
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  // Debounced mention candidates search
  useEffect(() => {
    if (mentionQuery === null) {
      setCandidates([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingCandidates(true);

    const timer = setTimeout(async () => {
      try {
        const res = await getMentionCandidates(cardId, mentionQuery);
        if (!isCancelled) {
          const list = res?.candidates || [];
          setCandidates(list);
          setSelectedIndex(0);
        }
      } catch (err) {
        if (!isCancelled) {
          // Fallback to local boardMembers if API is offline or returns error
          const filtered = (boardMembers || []).filter((m) => {
            const name = (m.name || '').toLowerCase();
            const email = (m.email || '').toLowerCase();
            const q = mentionQuery.toLowerCase();
            return name.includes(q) || email.includes(q);
          });
          setCandidates(filtered);
          setSelectedIndex(0);
        }
      } finally {
        if (!isCancelled) setIsLoadingCandidates(false);
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [mentionQuery, cardId, boardMembers]);

  // Detect '@' trigger while typing
  const handleTextChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setText(val);
    setErrorMsg('');

    if (!replyTarget && cardId) {
      setDraft(null, cardId, 'comment', val);
    }

    // Inspect text preceding cursor for mention trigger
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx !== -1) {
      // Must either be start of string or preceded by whitespace
      const charBeforeAt = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : ' ';
      if (/\s/.test(charBeforeAt)) {
        const textFromAt = textBeforeCursor.slice(lastAtIdx);
        // Check if this @ is part of an already completed mention (e.g. `@Name `)
        const isCompletedMention =
          (selectedMentions || []).some((m) => textFromAt.startsWith(`@${m.name} `)) ||
          (boardMembers || []).some((m) => textFromAt.startsWith(`@${m.name} `));

        if (!isCompletedMention) {
          const query = textBeforeCursor.slice(lastAtIdx + 1);
          // Only trigger if no newline or closing bracket within query,
          // no sentence punctuation ending a mention (.,!?:;),
          // and at most 1 space (first name + last name)
          const spaceCount = (query.match(/ /g) || []).length;
          if (!/[\n\]]/.test(query) && !/[.,!?:;]/.test(query) && spaceCount <= 1 && query.length <= 25) {
            setMentionQuery(query);
            setMentionIndex(lastAtIdx);
            return;
          }
        }
      }
    }

    setMentionQuery(null);
    setMentionIndex(-1);
  };

  // Select and insert a mention token
  const handleSelectMention = (candidate) => {
    if (!candidate || mentionIndex === -1) return;

    const el = textareaRef.current;
    const cursorPos = el ? el.selectionStart : text.length;

    const beforeMention = text.slice(0, mentionIndex);
    const afterMention = text.slice(cursorPos);
    const mentionToken = `@${candidate.name} `;

    const nextText = `${beforeMention}${mentionToken}${afterMention}`;
    setText(nextText);

    setSelectedMentions((prev) => {
      const exists = prev.some((m) => Number(m.id) === Number(candidate.id));
      if (exists) return prev;
      return [...prev, { id: Number(candidate.id), name: candidate.name }];
    });

    if (!replyTarget && cardId) {
      setDraft(null, cardId, 'comment', nextText);
    }

    setMentionQuery(null);
    setMentionIndex(-1);
    setCandidates([]);

    // Restore focus and cursor position after inserted token
    setTimeout(() => {
      if (el) {
        el.focus();
        const nextPos = beforeMention.length + mentionToken.length;
        el.setSelectionRange(nextPos, nextPos);
      }
    }, 10);
  };

  // Keyboard navigation for mention dropdown & submit shortcut
  const handleKeyDown = (e) => {
    // If mention candidates dropdown is visible
    if (mentionQuery !== null && candidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(candidates[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        setMentionIndex(-1);
        return;
      }
    }

    // Submit shortcut: Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Submit comment or reply
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    // Resolve mentions: both from selectedMentions whose @Name is still in text,
    // plus any boardMembers explicitly typed as @Name, plus legacy pattern if pasted
    const mentionsSet = new Set();
    const lowerText = trimmed.toLowerCase();

    // 1. Check tracked selectedMentions
    for (const m of selectedMentions) {
      if (lowerText.includes(`@${m.name.toLowerCase()}`)) {
        mentionsSet.add(Number(m.id));
      }
    }

    // 2. Check boardMembers if manually typed as @Name
    for (const bm of boardMembers || []) {
      if (bm?.name && lowerText.includes(`@${bm.name.toLowerCase()}`)) {
        mentionsSet.add(Number(bm.id));
      }
    }

    // 3. Check legacy @[Name](user:ID) pattern if pasted
    const legacyRegex = /@\[[^\]]+\]\(user:(\d+)\)/g;
    let match;
    while ((match = legacyRegex.exec(trimmed)) !== null) {
      mentionsSet.add(Number(match[1]));
    }

    const mentions = Array.from(mentionsSet);

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSubmitComment({
        body: trimmed,
        parent_comment_id: replyTarget ? replyTarget.id : null,
        mentions
      });

      // Clear draft, text & tracked mentions on success
      if (!replyTarget && cardId) {
        clearDraft(null, cardId, 'comment');
      }
      setText('');
      setSelectedMentions([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      if (onCancelReply) onCancelReply();
    } catch (err) {
      console.error('Failed to post comment:', err);
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to post comment. Please try again.';
      setErrorMsg(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-20 bg-surface rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
      {/* Active Reply Banner */}
      {replyTarget && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-primary/10 border-b border-primary/20 rounded-t-xl text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-text-muted text-[11px]">Replying to</span>
            <span className="font-semibold text-primary truncate max-w-[180px]">
              @{replyTarget.author_name}
            </span>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="text-text-muted hover:text-text-primary p-0.5 rounded-full hover:bg-surface/50 transition-colors"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Mention Autocomplete Dropdown */}
      {mentionQuery !== null && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 mt-1.5 w-72 max-h-56 overflow-y-auto bg-surface border border-border rounded-xl shadow-xl py-1 backdrop-blur-md"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b border-border/50 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AtSign className="w-3 h-3 text-primary" />
              Mention Member
            </span>
            {isLoadingCandidates && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </div>

          {candidates.length === 0 ? (
            <div className="p-3 text-xs text-text-muted text-center italic">
              {isLoadingCandidates ? 'Searching members...' : 'No board members found'}
            </div>
          ) : (
            candidates.map((c, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent losing focus
                    handleSelectMention(c);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-surface-muted text-text-primary'
                  }`}
                >
                  <Avatar
                    name={c.name}
                    src={c.avatar_url || c.avatar}
                    size="xs"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.name}</div>
                    {c.email && (
                      <div className="text-[10px] text-text-muted truncate">{c.email}</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Textarea Input */}
      <div className="p-2.5">
        <textarea
          ref={textareaRef}
          rows={replyTarget ? 2 : 2}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={replyTarget ? `Reply to @${replyTarget.author_name}...` : placeholder}
          className="w-full bg-transparent resize-none text-xs text-text-primary placeholder:text-text-muted focus:outline-none font-sans leading-relaxed min-h-[38px]"
        />

        {errorMsg && (
          <div className="mt-1 text-[11px] text-danger-text bg-danger-tint px-2 py-1 rounded">
            {errorMsg}
          </div>
        )}

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
            <span className="flex items-center gap-0.5" title="Type @ to mention eligible board members">
              <AtSign className="w-3 h-3 text-text-muted hover:text-primary transition-colors cursor-pointer" />
              <span>mention</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {replyTarget && onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                disabled={isSubmitting}
                className="px-2.5 py-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>{replyTarget ? 'Reply' : 'Post'}</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

