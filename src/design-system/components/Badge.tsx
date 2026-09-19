import React from 'react';
import { Tone, toneSoftClasses, toneSolidClasses } from '../tokens';

interface BadgeProps {
  tone?: Tone;
  variant?: 'soft' | 'solid';
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

// Consolidates the many per-file status-color lookup objects (e.g.
// `permitStatusColors` in PlanRightPanel.tsx, the inline
// isCompleted/isActive ternaries in InsaatLeftPanel.tsx) into one component
// driven by the shared tone tokens, so a status pill looks the same
// wherever it appears and stays theme-aware automatically. Renders as a
// <button> when given an onClick (e.g. the toggleable approval chips in
// PlanView.tsx), otherwise as a plain <span>.
export function Badge({ tone = 'neutral', variant = 'soft', size = 'md', className = '', title, onClick, children }: BadgeProps) {
  const toneClasses = variant === 'solid' ? toneSolidClasses[tone] : toneSoftClasses[tone];
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  const classes = `inline-flex items-center gap-1 rounded-md border font-bold ${toneClasses} ${sizeClasses} ${onClick ? 'cursor-pointer' : ''} ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={classes}>
        {children}
      </button>
    );
  }

  return (
    <span className={classes} title={title}>
      {children}
    </span>
  );
}
