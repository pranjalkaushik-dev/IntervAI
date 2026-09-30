import React from 'react';

export default function StatusDot({
  status = 'online',
  pulse = true,
  label,
  className = '',
}) {
  const colors = {
    online: 'bg-emerald-400',
    live: 'bg-emerald-500',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    offline: 'bg-slate-500',
    blue: 'bg-blue-400',
  };

  const pingColors = {
    online: 'bg-emerald-400',
    live: 'bg-emerald-500',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    offline: 'bg-slate-400',
    blue: 'bg-blue-400',
  };

  const colorClass = colors[status] || colors.online;
  const pingClass = pingColors[status] || pingColors.online;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-arena-muted ${className}`}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingClass}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClass}`} />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
