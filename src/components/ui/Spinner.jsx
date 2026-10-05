// client/src/components/ui/Spinner.jsx
import React from 'react';

const SIZES = {
  xs: 'w-3.5 h-3.5 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-10 h-10 border-4'
};

export function Spinner({ size = 'md', className = '', label = 'Loading...' }) {
  const sizeClasses = SIZES[size] || SIZES.md;
  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-border-strong border-t-primary ${sizeClasses} ${className}`}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default Spinner;
