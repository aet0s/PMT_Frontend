import React from 'react';
import { Check, Minus } from 'lucide-react';

export default function CustomCheckbox({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  indeterminate = false,
  className = '',
  size = 'md',
  name,
  id
}) {
  const handleInputChange = (e) => {
    if (disabled || !onChange) return;
    onChange(e.target.checked, e);
  };

  const handleKeyDown = (e) => {
    if (disabled || !onChange) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked, e);
    }
  };

  const boxSizes = {
    sm: 'w-4 h-4 rounded',
    md: 'w-4.5 h-4.5 rounded-md',
    lg: 'w-5.5 h-5.5 rounded-md'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <label
      className={`inline-flex items-start gap-2.5 select-none cursor-pointer group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={handleInputChange}
        className="sr-only"
      />

      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`${boxSizes[size] || boxSizes.md} shrink-0 flex items-center justify-center border transition-all duration-150 ${
          checked || indeterminate
            ? 'bg-primary border-primary text-white shadow-xs'
            : 'bg-surface border-border-strong hover:border-primary text-transparent'
        } ${!disabled ? 'focus:ring-2 focus:ring-primary/40 focus:outline-none' : ''}`}
      >
        {indeterminate ? (
          <Minus className={`${iconSizes[size] || iconSizes.md} stroke-[3]`} />
        ) : (
          <Check
            className={`${iconSizes[size] || iconSizes.md} stroke-[3] transition-transform duration-150 ${
              checked ? 'scale-100' : 'scale-0'
            }`}
          />
        )}
      </div>

      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <span className="text-xs font-medium text-text-primary group-hover:text-primary transition-colors block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-text-muted block leading-normal">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
