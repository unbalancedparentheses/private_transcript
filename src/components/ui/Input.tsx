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
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-[12px] font-medium text-[var(--foreground)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full h-7 rounded-md border bg-[var(--card)] px-2 text-[13px]',
          'placeholder:text-[var(--muted-foreground)]',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--muted)]',
          error
            ? 'border-[var(--destructive)] focus:ring-[var(--destructive)]/30'
            : 'border-[var(--border)]',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-[11px] text-[var(--muted-foreground)]">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-[var(--destructive)]">{error}</p>
      )}
    </div>
  );
}
