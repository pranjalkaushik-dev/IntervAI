import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-arena-bg disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-arena-blue hover:bg-arena-blueHover text-white shadow-btn-primary border border-blue-500/30 focus:ring-arena-blue',
    secondary:
      'bg-arena-panel hover:bg-arena-card text-arena-text border border-arena-border hover:border-arena-borderLight focus:ring-arena-borderLight',
    outline:
      'bg-transparent hover:bg-arena-panel text-arena-text border border-arena-border hover:border-arena-borderLight focus:ring-arena-border',
    ghost:
      'bg-transparent hover:bg-arena-panel text-arena-muted hover:text-arena-text border border-transparent',
    danger:
      'bg-arena-rose/90 hover:bg-arena-rose text-white border border-red-500/30 focus:ring-arena-rose',
    success:
      'bg-arena-emerald/90 hover:bg-arena-emerald text-white border border-emerald-500/30 focus:ring-arena-emerald',
  };

  const sizes = {
    xs: 'text-[11px] px-2 py-1 gap-1.5',
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2 font-medium',
    lg: 'text-sm px-4 py-2.5 gap-2 font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
