// client/src/components/Workspace/WorkspaceIcon.jsx
// Secure, resilient workspace icon component that retrieves images over the encrypted gateway.
import React, { useState } from 'react';
import { useProtectedImage } from '../../hooks/useProtectedImage';

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base font-semibold',
  xl: 'w-16 h-16 text-xl font-bold',
  '2xl': 'w-20 h-20 text-2xl font-bold'
};

export default function WorkspaceIcon({
  workspace,
  iconUrl,
  name,
  size = 'md',
  className = '',
  imgClassName = '',
  alt = ''
}) {
  const effectiveUrl = iconUrl || workspace?.icon_url || workspace?.settings?.icon_url || null;
  const effectiveName = name || workspace?.name || 'Workspace';
  const blobUrl = useProtectedImage(effectiveUrl);
  const [loadError, setLoadError] = useState(false);

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const initial = (effectiveName?.[0] || 'W').toUpperCase();

  if (effectiveUrl && blobUrl && !loadError) {
    return (
      <img
        src={blobUrl}
        alt={alt || effectiveName}
        onError={() => setLoadError(true)}
        className={`${sizeClass} object-cover rounded-lg shrink-0 ${imgClassName || className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-lg flex items-center justify-center font-bold bg-primary/10 text-primary shrink-0 select-none ${className}`}
      aria-label={effectiveName}
    >
      {initial}
    </div>
  );
}

