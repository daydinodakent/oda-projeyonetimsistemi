import React from 'react';

interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

// Thin wrapper over the `.panel` architecture class — the heavier-shadow
// sibling of `.card`, used for sidebars and large surfaces (see
// PlanLeftPanel.tsx, InsaatRightPanel.tsx). Header uses the `.panel-main-title`
// / `.panel-main-subtitle` roles already reserved for this context.
export function Panel({ title, subtitle, actions, className = '', children }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-2 p-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            {title && <div className="panel-main-title truncate">{title}</div>}
            {subtitle && <div className="panel-main-subtitle truncate">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
