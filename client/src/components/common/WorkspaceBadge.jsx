import React from 'react';

export default function WorkspaceBadge({ name = 'W', size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };
  const letter = (name || 'W').charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-lg bg-indigoAccent/15 border border-indigoAccent/30 flex items-center justify-center text-indigoAccent font-bold flex-shrink-0 font-sora ${sizes[size] || sizes.md} ${className}`}
    >
      {letter}
    </div>
  );
}
