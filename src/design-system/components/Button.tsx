import React from 'react';
import { Tone } from '../tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'tone';

interface ButtonProps {
  variant?: Variant;
  tone?: Tone; // only used when variant="tone"
  size?: 'sm' | 'md';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'text-xs px-2.5 py-1 gap-1',
  md: 'text-xs px-4 py-2 gap-1.5',
};

// Solid variants keyed literally (not built from a template string) so
// Tailwind's scanner can see and generate every class.
const toneVariantClasses: Record<Tone, string> = {
  success: 'bg-success text-white hover:brightness-110',
  warning: 'bg-warning text-white hover:brightness-110',
  danger: 'bg-danger text-white hover:brightness-110',
  info: 'bg-info text-white hover:brightness-110',
  neutral: 'bg-neutral text-white hover:brightness-110',
  accent: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
};

// Wraps the `.premium-btn` hover/press micro-interaction (translateY + scale
// on hover, scale-down on active — see src/index.css) that's already applied
// globally to every non-native <button>, and standardizes the padding/shape
// choices that were previously copy-pasted per screen (see AdminPanel.tsx's
// gradient action buttons).
export function Button({ variant = 'secondary', tone = 'accent', size = 'md', className = '', children, ...rest }: ButtonProps) {
  const base = 'premium-btn inline-flex items-center justify-center rounded-lg font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses =
    variant === 'primary'
      ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
      : variant === 'tone'
      ? toneVariantClasses[tone]
      : variant === 'ghost'
      ? 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] border border-transparent hover:border-[var(--border)]'
      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)]/40';

  return (
    <button className={`${base} ${variantClasses} ${sizeClasses[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
