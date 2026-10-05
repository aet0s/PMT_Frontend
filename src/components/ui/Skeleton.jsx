// client/src/components/ui/Skeleton.jsx
import React from 'react';

export function Skeleton({ className = '', rounded = 'md', ...props }) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-surface-muted ${roundedClasses[rounded] || 'rounded-md'} ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-3.5 bg-surface rounded-lg border border-border space-y-2.5 shadow-sm">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="w-72 shrink-0 bg-surface-muted rounded-xl border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export default Skeleton;
