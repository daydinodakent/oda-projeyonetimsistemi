import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  padding?: 'sm' | 'md';
  className?: string;
  children?: React.ReactNode;
}

// Thin, typed wrapper over the existing `.card` architecture class (defined
// in src/index.css) with an optional header slot using the already-defined
// `.card-header-title` / `.card-header-subtitle` typography roles — so a
// card's header always matches the app's unified type scale instead of
// each screen picking its own font-size/weight.
export function Card({ title, subtitle, icon, actions, padding = 'md', className = '', children }: CardProps) {
  const paddingClasses = padding === 'sm' ? 'p-3' : 'p-4';

  return (
    <div className={`card ${paddingClasses} ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <div className="min-w-0">
              {title && <div className="card-header-title truncate">{title}</div>}
              {subtitle && <div className="card-header-subtitle truncate">{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
