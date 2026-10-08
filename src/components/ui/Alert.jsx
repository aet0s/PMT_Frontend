// client/src/components/ui/Alert.jsx
import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const VARIANTS = {
  default: 'bg-surface-muted text-text-primary border-border',
  primary: 'bg-primary-tint text-primary-text border-primary/25',
  success: 'bg-success-tint text-success-text border-success/25',
  warning: 'bg-warning-tint text-warning-text border-warning/25',
  destructive: 'bg-danger-tint text-danger-text border-danger/25'
};

const ICONS = {
  default: <Info className="w-4 h-4 text-text-secondary shrink-0" />,
  primary: <Info className="w-4 h-4 text-primary shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning shrink-0" />,
  destructive: <AlertCircle className="w-4 h-4 text-danger shrink-0" />
};

export const Alert = forwardRef(function Alert(
  { className = '', variant = 'default', children, icon, ...props },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.default;
  const defaultIcon = ICONS[variant] || ICONS.default;

  return (
    <div
      ref={ref}
      role="alert"
      className={`relative w-full rounded-xl border p-4 text-xs [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7 ${variantClass} ${className}`}
      {...props}
    >
      {icon !== undefined ? icon : defaultIcon}
      {children}
    </div>
  );
});

export const AlertTitle = forwardRef(function AlertTitle({ className = '', ...props }, ref) {
  return (
    <h5
      ref={ref}
      className={`mb-1 font-semibold leading-none tracking-tight text-sm ${className}`}
      {...props}
    />
  );
});

export const AlertDescription = forwardRef(function AlertDescription({ className = '', ...props }, ref) {
  return (
    <div
      ref={ref}
      className={`text-xs [&_p]:leading-relaxed opacity-90 ${className}`}
      {...props}
    />
  );
});

export default Alert;
