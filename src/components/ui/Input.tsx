import { clsx } from 'clsx';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full h-10 rounded-lg border bg-[var(--background)] px-3 text-sm',
          'placeholder:text-[var(--muted-foreground)]',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--muted)]',
          'hover:border-[var(--muted-foreground)]/30',
          error
            ? 'border-[var(--destructive)] focus:ring-[var(--destructive)]/20 focus:border-[var(--destructive)]'
            : 'border-[var(--border)]',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-[10px] text-[var(--muted-foreground)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-[var(--destructive)] flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
