// client/src/components/ui/Button.jsx
import React, { forwardRef } from 'react';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-primary hover:bg-primary-hover active:bg-primary-active text-white border border-transparent shadow-sm',
  secondary: 'bg-surface hover:bg-surface-hover active:bg-surface-active text-text-primary border border-border shadow-sm',
  ghost: 'bg-transparent hover:bg-surface-muted active:bg-surface-active text-text-primary border border-transparent',
  danger: 'bg-danger hover:bg-danger-hover active:bg-danger text-white border border-transparent shadow-sm',
  dangerGhost: 'bg-transparent hover:bg-danger-tint active:bg-danger-tint text-danger-text border border-transparent',
  success: 'bg-success hover:bg-success-hover active:bg-success text-white border border-transparent shadow-sm'
};

const SIZES = {
  sm: 'h-8 px-2.5 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-md gap-2 min-h-[40px]',
  lg: 'h-11 px-5 text-base rounded-md gap-2.5 min-h-[44px]'
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    isLoading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const variantClasses = VARIANTS[variant] || VARIANTS.secondary;
  const sizeClasses = SIZES[size] || SIZES.md;
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium select-none transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" className="mr-1.5" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
});

export default Button;
