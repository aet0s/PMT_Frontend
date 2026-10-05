// client/src/components/ui/IconButton.jsx
import React, { forwardRef } from 'react';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-primary hover:bg-primary-hover active:bg-primary-active text-white border border-transparent shadow-sm',
  secondary: 'bg-surface hover:bg-surface-hover active:bg-surface-active text-text-primary border border-border shadow-sm',
  ghost: 'bg-transparent hover:bg-surface-muted active:bg-surface-active text-text-secondary hover:text-text-primary border border-transparent',
  danger: 'bg-danger hover:bg-danger-hover active:bg-danger text-white border border-transparent shadow-sm',
  dangerGhost: 'bg-transparent hover:bg-danger-tint active:bg-danger-tint text-danger-text border border-transparent'
};

const SIZES = {
  sm: 'w-8 h-8 rounded-md p-1.5',
  md: 'w-10 h-10 min-w-[40px] min-h-[40px] rounded-md p-2',
  lg: 'w-11 h-11 min-w-[44px] min-h-[44px] rounded-md p-2.5'
};

export const IconButton = forwardRef(function IconButton(
  {
    icon,
    'aria-label': ariaLabel,
    variant = 'ghost',
    size = 'md',
    isLoading = false,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const variantClasses = VARIANTS[variant] || VARIANTS.ghost;
  const sizeClasses = SIZES[size] || SIZES.md;
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center shrink-0 select-none transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : icon}
    </button>
  );
});

export default IconButton;
