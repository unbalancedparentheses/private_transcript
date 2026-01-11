import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        'btn-press',
        {
          // Primary - solid gradient
          'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-md hover:shadow-[var(--primary)]/20':
            variant === 'primary',
          // Gradient - full gradient
          'bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-md shadow-[var(--primary)]/25 hover:shadow-lg hover:shadow-[var(--primary)]/30':
            variant === 'gradient',
          // Secondary - subtle background
          'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)] border border-[var(--border)]':
            variant === 'secondary',
          // Ghost - transparent
          'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]':
            variant === 'ghost',
          // Destructive - danger
          'bg-[var(--destructive)] text-white hover:bg-[var(--destructive)]/90 shadow-sm hover:shadow-md hover:shadow-[var(--destructive)]/20':
            variant === 'destructive',
          // Sizes
          'h-8 px-3 text-xs': size === 'sm',
          'h-10 px-4 text-sm': size === 'md',
          'h-12 px-6 text-base': size === 'lg',
          'h-10 w-10 p-0': size === 'icon',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
