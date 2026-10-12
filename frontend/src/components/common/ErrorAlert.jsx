import React from 'react';

/**
 * ErrorAlert – a reusable error message component with optional retry button.
 * It uses the project's dark theme colors and Tailwind utilities.
 */
export const ErrorAlert = ({ message, onRetry }) => (
  <div className="border border-rose-600 bg-rose-900/30 text-rose-200 rounded-md p-4 flex items-center space-x-3">
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
    </svg>
    <span className="flex-1 text-sm">{message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm font-medium underline hover:text-rose-100 transition"
      >
        Retry
      </button>
    )}
  </div>
);

export default ErrorAlert;
