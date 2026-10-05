// client/src/components/ui/ProgressBar.jsx
import React from 'react';

const VARIANTS = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
};

const SIZES = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4'
};

export function ProgressBar({
  value = 0,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className = ''
}) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
          <span>Progress</span>
          <span className="font-semibold text-text-primary">{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`w-full bg-surface-muted border border-border rounded-full overflow-hidden ${sizeClass}`}
      >
        <div
          className={`h-full transition-all duration-300 rounded-full ${variantClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
