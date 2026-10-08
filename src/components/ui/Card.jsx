// client/src/components/ui/Card.jsx
import React, { forwardRef } from 'react';

export const Card = forwardRef(function Card({ className = '', ...props }, ref) {
  return (
    <div
      ref={ref}
      className={`rounded-xl border border-border bg-surface text-text-primary shadow-xs transition-colors ${className}`}
      {...props}
    />
  );
});

export const CardHeader = forwardRef(function CardHeader({ className = '', ...props }, ref) {
  return (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-6 border-b border-border/50 ${className}`}
      {...props}
    />
  );
});

export const CardTitle = forwardRef(function CardTitle({ className = '', ...props }, ref) {
  return (
    <h3
      ref={ref}
      className={`font-semibold leading-none tracking-tight text-text-primary text-base ${className}`}
      {...props}
    />
  );
});

export const CardDescription = forwardRef(function CardDescription({ className = '', ...props }, ref) {
  return (
    <p
      ref={ref}
      className={`text-xs text-text-secondary leading-relaxed ${className}`}
      {...props}
    />
  );
});

export const CardContent = forwardRef(function CardContent({ className = '', ...props }, ref) {
  return (
    <div
      ref={ref}
      className={`p-6 ${className}`}
      {...props}
    />
  );
});

export const CardFooter = forwardRef(function CardFooter({ className = '', ...props }, ref) {
  return (
    <div
      ref={ref}
      className={`flex items-center p-6 pt-0 border-t border-border/50 ${className}`}
      {...props}
    />
  );
});

export default Card;
