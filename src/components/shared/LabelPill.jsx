import React from 'react';
import { getLabelClasses } from '../../lib/labelColors';

export default function LabelPill({ name, color, size = 'sm', onClick, className = '' }) {
  const palette = getLabelClasses(color);

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] font-semibold rounded',
    sm: 'px-2.5 py-0.5 text-xs font-semibold rounded-md',
    md: 'px-3 py-1 text-sm font-semibold rounded-md'
  }[size] || 'px-2.5 py-0.5 text-xs font-semibold rounded-md';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 select-none border transition-opacity hover:opacity-90 ${palette.bg} ${palette.text} ${palette.border} ${sizeClasses} ${className}`}
    >
      <span className="truncate max-w-[120px]">{name}</span>
    </span>
  );
}
