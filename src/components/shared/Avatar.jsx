import React from 'react';

const COLOR_PAIRS = [
  'bg-blue-600 text-white',
  'bg-purple-600 text-white',
  'bg-pink-600 text-white',
  'bg-amber-600 text-white',
  'bg-emerald-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
  'bg-rose-600 text-white'
];

function getInitials(name = '') {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stringToColorIndex(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLOR_PAIRS.length;
}

export default function Avatar({ name, email, avatarUrl, avatar_url, size = 'md', className = '' }) {
  const url = avatarUrl || avatar_url;
  const [imgError, setImgError] = React.useState(false);

  const initials = getInitials(name || email);
  const colorIndex = stringToColorIndex(name || email || 'default');
  const colorClass = COLOR_PAIRS[colorIndex];

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs font-semibold',
    md: 'w-8 h-8 text-sm font-semibold',
    lg: 'w-10 h-10 text-base font-bold',
    xl: 'w-12 h-12 text-lg font-bold'
  }[size] || 'w-8 h-8 text-sm font-semibold';

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name || email || 'Avatar'}
        title={name || email}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shadow-sm select-none transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      />
    );
  }

  return (
    <div
      title={name || email}
      className={`rounded-full flex items-center justify-center shadow-sm select-none transition-transform hover:scale-105 ${colorClass} ${sizeClasses} ${className}`}
    >
      {initials}
    </div>
  );
}
