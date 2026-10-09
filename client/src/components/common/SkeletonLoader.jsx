import React from 'react';

export default function SkeletonLoader({ variant = 'card', count = 1, className = '' }) {
  const items = Array.from({ length: count });

  if (variant === 'table') {
    return (
      <div className={`w-full flex flex-col gap-4 animate-pulse ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="flex gap-4 items-center justify-between py-4 border-b border-darkBorder">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-darkInput" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 bg-darkInput rounded" />
                <div className="h-3 w-48 bg-darkInput rounded" />
              </div>
            </div>
            <div className="h-6 w-16 bg-darkInput rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="p-5 bg-darkSurface border border-darkBorder rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 bg-darkInput rounded" />
              <div className="h-6 w-12 bg-darkInput rounded" />
            </div>
            <div className="h-4 w-full bg-darkInput rounded" />
            <div className="h-4 w-2/3 bg-darkInput rounded" />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-full bg-darkInput" />
                <div className="w-6 h-6 rounded-full bg-darkInput" />
              </div>
              <div className="h-4 w-16 bg-darkInput rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // default single line text skeleton
  return (
    <div className={`flex flex-col gap-3 animate-pulse ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="h-4 bg-darkInput rounded w-full" />
      ))}
    </div>
  );
}
