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
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:opacity-80',
        {
          // Primary and Gradient - macOS style solid blue
          'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]':
            variant === 'primary' || variant === 'gradient',
          // Secondary - subtle background
          'bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--border)]':
            variant === 'secondary',
          // Ghost - transparent
          'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]':
            variant === 'ghost',
          // Destructive - danger
          'bg-[var(--destructive)] text-white hover:opacity-90':
            variant === 'destructive',
          // Sizes - more compact for macOS
          'h-6 px-2 text-[12px]': size === 'sm',
          'h-8 px-3 text-[13px]': size === 'md',
          'h-9 px-4 text-[14px]': size === 'lg',
          'h-8 w-8 p-0': size === 'icon',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
