import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: 'default' | 'ghost' | 'primary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  'aria-label': string;
}

const sizeConfig = {
  sm: { button: 'w-6 h-6', icon: 12 },
  md: { button: 'w-7 h-7', icon: 14 },
  lg: { button: 'w-8 h-8', icon: 16 },
};

export function IconButton({
  icon: Icon,
  variant = 'default',
  size = 'md',
  active = false,
  className,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: IconButtonProps) {
  const { button: buttonSize, icon: iconSize } = sizeConfig[size];

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonSize,
        {
          // Default
          'hover:bg-[var(--muted)] text-[var(--foreground)]':
            variant === 'default' && !active,
          // Ghost
          'hover:bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]':
            variant === 'ghost' && !active,
          // Primary
          'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]':
            variant === 'primary' || active,
          // Destructive
          'hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)]':
            variant === 'destructive',
        },
        className
      )}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
    >
      <Icon width={iconSize} height={iconSize} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
