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
      className={`bg-arena-surface border border-arena-border rounded-lg shadow-subtle-rim ${
        hoverEffect ? 'hover:border-arena-borderLight hover:bg-arena-panel transition-all duration-150 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', actions }) {
  return (
    <div className={`p-4 border-b border-arena-border flex items-center justify-between gap-3 ${className}`}>
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
    <div className={`p-3 bg-arena-surface/50 border-t border-arena-border text-xs text-arena-muted flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
