import React, { useId } from 'react';

export function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  id,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const switchId = id || (label ? `sw-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : `sw-${generatedId}`);

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
    >
      {(label || description) && (
        <div className="text-left leading-tight mr-2">
          {label && <span className="text-sm font-medium text-text-primary block">{label}</span>}
          {description && <span className="text-xs text-text-secondary block mt-0.5">{description}</span>}
        </div>
      )}
      <div className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          role="switch"
          id={switchId}
          aria-label={props['aria-label'] || label || 'Toggle switch'}
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
            checked ? 'bg-primary' : 'bg-surface-muted border border-border-strong'
          }`}
        />
        <div
          className={`absolute left-1 w-4 h-4 rounded-full bg-surface shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-4 bg-white' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
}

export default Switch;
