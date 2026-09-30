import React from 'react';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) {
  const variants = {
    neutral: 'bg-arena-panel text-arena-muted border-arena-border',
    blue: 'bg-arena-blue/15 text-blue-400 border-blue-500/30',
    emerald: 'bg-arena-emerald/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-arena-amber/15 text-amber-400 border-amber-500/30',
    rose: 'bg-arena-rose/15 text-rose-400 border-rose-500/30',
    purple: 'bg-arena-purple/15 text-purple-400 border-purple-500/30',
    live: 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60 font-semibold animate-pulse-subtle',
    code: 'bg-slate-900 text-blue-400 border-slate-700 font-mono font-medium',
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
