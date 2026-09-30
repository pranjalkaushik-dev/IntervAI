import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    className = '',
    containerClassName = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-xs bg-arena-panel border rounded-md text-arena-text placeholder-slate-500 transition-colors focus:outline-none ${
            Icon ? 'pl-9' : ''
          } ${
            error
              ? 'border-arena-rose focus:border-arena-rose focus:ring-1 focus:ring-arena-rose'
              : 'border-arena-border focus:border-arena-blue focus:ring-1 focus:ring-arena-blue'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    children,
    className = '',
    containerClassName = '',
    id,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`w-full px-3 py-2 text-xs bg-arena-panel border rounded-md text-arena-text transition-colors focus:outline-none ${
          error
            ? 'border-arena-rose focus:border-arena-rose focus:ring-1 focus:ring-arena-rose'
            : 'border-arena-border focus:border-arena-blue focus:ring-1 focus:ring-arena-blue'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-[11px] text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
