// client/src/components/ui/Textarea.jsx
import React, { forwardRef } from 'react';

export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    hint,
    id,
    rows = 3,
    className = '',
    disabled = false,
    required = false,
    ...props
  },
  ref
) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold text-text-secondary select-none"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`w-full p-3 bg-surface text-text-primary text-sm rounded-md border transition-colors duration-150 placeholder:text-text-muted disabled:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 ${
          error
            ? 'border-danger focus-visible:border-danger focus-visible:ring-danger/30'
            : 'border-border hover:border-border-strong'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger font-medium leading-tight">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-secondary leading-tight">{hint}</p>
      ) : null}
    </div>
  );
});

export default Textarea;
