import React from 'react';

export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-medium text-gray-400 select-none">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 rounded-lg bg-darkInput border border-darkBorder text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigoAccent focus:ring-1 focus:ring-indigoAccent/30 transition-all text-sm ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}
