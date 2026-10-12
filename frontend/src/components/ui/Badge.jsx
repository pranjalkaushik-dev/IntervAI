import React from 'react';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    live: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold animate-pulse-subtle',
    code: 'bg-slate-50 text-slate-800 border-slate-200 font-mono font-medium',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded',
    sm: 'text-[11px] px-2 py-0.5 rounded-md',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border leading-tight ${variants[variant] || variants.neutral} ${sizes[size] || sizes.sm} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'emerald' || variant === 'live'
              ? 'bg-emerald-400'
              : variant === 'amber'
              ? 'bg-amber-400'
              : variant === 'rose'
              ? 'bg-rose-400'
              : variant === 'blue'
              ? 'bg-blue-400'
              : 'bg-slate-400'
          }`}
        />
      )}
      {children}
    </span>
  );
}
