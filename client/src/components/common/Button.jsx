import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyle = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm';
  
  const variants = {
    primary: 'bg-indigoAccent hover:bg-indigo-500 text-white shadow-lg shadow-indigoAccent/10 active:scale-[0.98]',
    secondary: 'bg-darkInput border border-darkBorder hover:bg-darkBorder text-gray-300 active:scale-[0.98]',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/10 active:scale-[0.98]',
    ghost: 'hover:bg-darkInput text-gray-400 hover:text-white',
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
