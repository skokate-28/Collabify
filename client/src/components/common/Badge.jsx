import React from 'react';

export default function Badge({ children, variant = 'info', className = '' }) {
  const variants = {
    info: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/10',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/10',
    brand: 'bg-indigoAccent/10 text-indigo-400 border border-indigoAccent/10',
    neutral: 'bg-gray-500/10 text-gray-400 border border-gray-500/10',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase select-none border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
