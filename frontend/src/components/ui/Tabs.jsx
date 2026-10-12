import React from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'line',
  className = '',
}) {
  if (variant === 'pills') {
    return (
      <div className={`inline-flex p-1 bg-arena-panel rounded-lg border border-arena-border gap-1 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-arena-blue text-white shadow-sm'
                  : 'text-arena-muted hover:text-white hover:bg-arena-surface'
              }`}
            >
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-arena-border text-arena-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex border-b border-arena-border gap-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all -mb-[1px] ${
              isActive
                ? 'border-arena-blue text-arena-text bg-arena-surface/40'
                : 'border-transparent text-arena-muted hover:text-arena-text hover:border-arena-border'
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] bg-arena-panel px-1.5 py-0.5 rounded text-arena-muted">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
