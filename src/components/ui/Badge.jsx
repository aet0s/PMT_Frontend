// client/src/components/ui/Badge.jsx
import React from 'react';

const VARIANTS = {
  primary: 'bg-primary-tint text-primary-text border border-primary/20',
  secondary: 'bg-surface-muted text-text-secondary border border-border',
  success: 'bg-success-tint text-success-text border border-success/20',
  warning: 'bg-warning-tint text-warning-text border border-warning/20',
  danger: 'bg-danger-tint text-danger-text border border-danger/20',
  info: 'bg-info-tint text-info-text border border-info/20',
  // Solid button-style badges with white text (passes theme lint allowed white text context)
  solidPrimary: 'bg-primary text-white',
  solidDanger: 'bg-danger text-white',
  solidSuccess: 'bg-success text-white'
};

const SIZES = {
  sm: 'text-[10px] font-semibold px-1.5 py-0.5 rounded',
  md: 'text-xs font-medium px-2 py-0.5 rounded-md',
  lg: 'text-sm font-medium px-2.5 py-1 rounded-md'
};

export function Badge({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  ...props
}) {
  const variantClasses = VARIANTS[variant] || VARIANTS.secondary;
  const sizeClasses = SIZES[size] || SIZES.md;

  return (
    <span
      className={`inline-flex items-center gap-1 select-none leading-none ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
