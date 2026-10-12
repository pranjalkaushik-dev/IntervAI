import React from 'react';

/**
 * LoadingSpinner - a reusable spinner component.
 * Uses Tailwind CSS utility classes consistent with the project's dark theme.
 */
export default function LoadingSpinner({ size = 8, className = '' }) {
  const sizeClass = `w-${size} h-${size}`;
  return (
    <div className={`flex items-center justify-center ${className}`}> 
      <div className={`${sizeClass} border-2 border-arena-blue border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}
