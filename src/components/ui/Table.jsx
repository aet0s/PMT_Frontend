// client/src/components/ui/Table.jsx
import React, { forwardRef } from 'react';

export const Table = forwardRef(function Table({ className = '', ...props }, ref) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm text-text-primary ${className}`}
        {...props}
      />
    </div>
  );
});

export const TableHeader = forwardRef(function TableHeader({ className = '', ...props }, ref) {
  return (
    <thead
      ref={ref}
      className={`[&_tr]:border-b border-border bg-surface-muted/60 text-text-secondary uppercase text-[10px] tracking-wider font-bold select-none ${className}`}
      {...props}
    />
  );
});

export const TableBody = forwardRef(function TableBody({ className = '', ...props }, ref) {
  return (
    <tbody
      ref={ref}
      className={`[&_tr:last-child]:border-0 divide-y divide-border text-text-primary ${className}`}
      {...props}
    />
  );
});

export const TableFooter = forwardRef(function TableFooter({ className = '', ...props }, ref) {
  return (
    <tfoot
      ref={ref}
      className={`border-t border-border bg-surface-muted/50 font-medium [&>tr]:last:border-b-0 ${className}`}
      {...props}
    />
  );
});

export const TableRow = forwardRef(function TableRow({ className = '', ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={`border-b border-border transition-colors hover:bg-surface-muted/40 data-[state=selected]:bg-surface-muted ${className}`}
      {...props}
    />
  );
});

export const TableHead = forwardRef(function TableHead({ className = '', ...props }, ref) {
  return (
    <th
      ref={ref}
      className={`h-10 px-4 text-left align-middle font-semibold text-text-secondary [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  );
});

export const TableCell = forwardRef(function TableCell({ className = '', ...props }, ref) {
  return (
    <td
      ref={ref}
      className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  );
});

export const TableCaption = forwardRef(function TableCaption({ className = '', ...props }, ref) {
  return (
    <caption
      ref={ref}
      className={`mt-4 text-xs text-text-muted ${className}`}
      {...props}
    />
  );
});

export default Table;
