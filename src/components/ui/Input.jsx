// client/src/components/ui/Input.jsx
import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    id,
    leftIcon,
    rightIcon,
    className = '',
    disabled = false,
    required = false,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-text-secondary select-none"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-text-muted pointer-events-none flex items-center">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={props.type || 'text'}
          disabled={disabled}
          required={required}
          className={`w-full h-10 min-h-[40px] px-3.5 bg-surface text-text-primary text-sm rounded-md border transition-colors duration-150 placeholder:text-text-muted disabled:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-muted focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 ${
            leftIcon ? 'pl-9' : ''
          } ${rightIcon ? 'pr-9' : ''} ${
            error
              ? 'border-danger focus-visible:border-danger focus-visible:ring-danger/30'
              : 'border-border hover:border-border-strong'
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-text-muted pointer-events-none flex items-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-danger font-medium leading-tight">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-secondary leading-tight">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
