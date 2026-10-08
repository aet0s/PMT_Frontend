// client/src/components/shared/Avatar.jsx
// Consolidated adapter forwarding to modern token-based UI Avatar
import React from 'react';
import { Avatar as UIAvatar } from '../ui/Avatar';

export default function Avatar({ name, email, avatarUrl, avatar_url, size = 'md', className = '', ...props }) {
  return (
    <UIAvatar
      name={name}
      email={email}
      src={avatarUrl || avatar_url}
      size={size}
      className={className}
      {...props}
    />
  );
}

export { UIAvatar as Avatar };
