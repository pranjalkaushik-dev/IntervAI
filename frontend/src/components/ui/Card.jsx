import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl shadow-sm ${
        hoverEffect ? 'hover:border-slate-300 hover:shadow transition-all duration-150 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', actions }) {
  return (
    <div className={`p-4 border-b border-slate-100 flex items-center justify-between gap-3 ${className}`}>
      <div className="space-y-0.5">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
