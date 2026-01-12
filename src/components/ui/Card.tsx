import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const paddingMap = {
  none: '',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-[var(--border)]',
        paddingMap[padding],
        {
          'bg-[var(--card)]': variant === 'default' || variant === 'elevated' || variant === 'interactive',
          'shadow-[var(--shadow-sm)]': variant === 'elevated',
          'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow cursor-pointer':
            variant === 'interactive',
          'bg-transparent border-transparent': variant === 'ghost',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={clsx('flex items-center justify-between mb-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={clsx('text-[13px] font-semibold text-[var(--foreground)]', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <p
      className={clsx('text-[12px] text-[var(--muted-foreground)]', className)}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={clsx('', className)} {...props}>
      {children}
    </div>
  );
}
