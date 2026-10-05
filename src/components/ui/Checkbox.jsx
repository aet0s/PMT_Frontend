// client/src/components/ui/Checkbox.jsx
import React, { forwardRef, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';

export const Checkbox = forwardRef(function Checkbox(
  {
    label,
    checked = false,
    indeterminate = false,
    onChange,
    disabled = false,
    id,
    className = '',
    description,
    ...props
  },
  ref
) {
  const innerRef = useRef(null);
  const combinedRef = ref || innerRef;

  useEffect(() => {
    if (combinedRef.current) {
      combinedRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate, combinedRef]);

  const checkboxId = id || (label ? `chk-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          ref={combinedRef}
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
          {...props}
        />
        <div
          className={`w-4 h-4 rounded border transition-colors duration-150 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
            checked || indeterminate
              ? 'bg-primary border-primary text-white'
              : 'bg-surface border-border-strong group-hover:border-primary'
          }`}
        >
          {indeterminate ? (
            <Minus className="w-3 h-3 stroke-[3]" />
          ) : checked ? (
            <Check className="w-3 h-3 stroke-[3]" />
          ) : null}
        </div>
      </div>
      {(label || description) && (
        <div className="text-left leading-tight">
          {label && (
            <span className="text-sm font-medium text-text-primary block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-text-muted block mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
});

export default Checkbox;
