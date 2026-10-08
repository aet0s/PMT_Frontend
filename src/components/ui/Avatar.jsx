import React, { useState } from 'react';
import { getFileUrl } from '../../api/config';

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm min-w-[40px] min-h-[40px]',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
};

const PASTEL_PALETTE = [
  'bg-primary-tint text-primary-text border border-primary/20',
  'bg-success-tint text-success-text border border-success/20',
  'bg-info-tint text-info-text border border-info/20',
  'bg-warning-tint text-warning-text border border-warning/20',
  'bg-danger-tint text-danger-text border border-danger/20',
  'bg-surface-muted text-text-primary border border-border-strong'
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPaletteIndex(str) {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PASTEL_PALETTE.length;
}

export function Avatar({
  src,
  avatarUrl,
  avatar_url,
  name,
  email,
  size = 'md',
  className = '',
  status, // 'online' | 'offline' | 'busy'
  ...props
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZES[size] || SIZES.md;
  const displayName = name || email || '';
  const initials = getInitials(displayName);
  const pastelClass = PASTEL_PALETTE[getPaletteIndex(displayName)];
  
  const rawUrl = src || avatarUrl || avatar_url;
  const finalSrc = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : getFileUrl(rawUrl)) : null;
  const showImage = finalSrc && !imgError;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 rounded-full ${sizeClass} ${className}`} {...props}>
      {showImage ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full rounded-full object-cover border border-border"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-semibold select-none ${pastelClass}`}
          title={name}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface ${
            status === 'online'
              ? 'bg-success'
              : status === 'busy'
              ? 'bg-danger'
              : 'bg-border-strong'
          }`}
        />
      )}
    </div>
  );
}

export function AvatarGroup({ children, max = 4, size = 'sm', className = '' }) {
  const childrenArray = React.Children.toArray(children);
  const visible = childrenArray.slice(0, max);
  const remaining = childrenArray.length - max;

  return (
    <div className={`inline-flex items-center -space-x-2 overflow-hidden ${className}`}>
      {visible.map((child, idx) => (
        <div key={idx} className="relative ring-2 ring-surface rounded-full">
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`relative ring-2 ring-surface rounded-full bg-surface-muted border border-border-strong flex items-center justify-center font-semibold text-text-secondary select-none ${
            SIZES[size] || SIZES.sm
          }`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
