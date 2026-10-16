// client/src/components/shared/Avatar.jsx
// Consolidated adapter forwarding to modern token-based UI Avatar
import React from 'react';
import { Avatar as UIAvatar } from '../ui/Avatar';

export default function Avatar({ name, email, src, avatarUrl, avatar_url, avatar, user, size = 'md', className = '', ...props }) {
  return (
    <UIAvatar
      name={name}
      email={email}
      src={src || avatarUrl || avatar_url || avatar || user?.avatar_url || user?.avatar || user?.user_avatar}
      user={user}
      size={size}
      className={className}
      {...props}
    />
  );
}

export { UIAvatar as Avatar };
