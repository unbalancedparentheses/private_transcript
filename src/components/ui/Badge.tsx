import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'sm',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        {
          // Sizes
          'px-1.5 py-0.5 text-[10px]': size === 'sm',
          'px-2 py-0.5 text-[11px]': size === 'md',
          // Variants
          'bg-[var(--secondary)] text-[var(--foreground)]': variant === 'default',
          'bg-[var(--success)]/10 text-[var(--success)]': variant === 'success',
          'bg-[var(--destructive)]/10 text-[var(--destructive)]': variant === 'error',
          'bg-[var(--warning)]/10 text-[var(--warning)]': variant === 'warning',
          'bg-[var(--primary)]/10 text-[var(--primary)]': variant === 'info',
          'border border-[var(--border)] bg-transparent text-[var(--muted-foreground)]': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Dot indicator for status
interface StatusDotProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export function StatusDot({ status, pulse = false, size = 'sm' }: StatusDotProps) {
  return (
    <span
      className={clsx(
        'rounded-full',
        {
          'w-1.5 h-1.5': size === 'sm',
          'w-2 h-2': size === 'md',
          'bg-[var(--success)]': status === 'success',
          'bg-[var(--destructive)]': status === 'error',
          'bg-[var(--warning)]': status === 'warning',
          'bg-[var(--primary)]': status === 'info',
          'bg-[var(--muted-foreground)]': status === 'neutral',
          'animate-pulse': pulse,
        }
      )}
      aria-hidden="true"
    />
  );
}
