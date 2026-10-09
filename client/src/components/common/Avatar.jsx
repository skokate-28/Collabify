import React from 'react';
import { getAvatarColor, getInitials } from '../../utils/generateAvatar';

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg font-semibold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User'}
        className={`rounded-full object-cover border border-darkBorder flex-shrink-0 ${sizes[size]} ${className}`}
        onError={(e) => {
          e.target.onerror = null;
          // Fallback to initials if image load fails
          e.target.style.display = 'none';
        }}
      />
    );
  }

  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`rounded-full flex items-center justify-center text-white border border-darkBorder select-none flex-shrink-0 font-medium ${sizes[size]} ${className}`}
    >
      {initials}
    </div>
  );
}
