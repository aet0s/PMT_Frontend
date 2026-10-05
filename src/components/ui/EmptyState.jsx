// client/src/components/ui/EmptyState.jsx
import React from 'react';
import Button from './Button';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = '',
  children
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl bg-surface border border-border ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-primary-tint text-primary-text border border-primary/20 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-text-primary mb-1">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          onClick={onAction}
          leftIcon={actionIcon}
          className="mt-1"
        >
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}

export default EmptyState;
