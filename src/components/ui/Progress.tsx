import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Progress({
  value,
  max = 100,
  className,
  showLabel = false,
  label,
  indeterminate = false,
  size = 'md',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heights = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
          {showLabel && !indeterminate && (
            <span className="text-xs font-medium text-[var(--foreground)]">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={cn(
        'w-full rounded-full overflow-hidden bg-[var(--muted)]',
        heights[size]
      )}>
        {indeterminate ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-[var(--gradient-end)] to-[var(--primary)]"
            style={{
              width: '50%',
              animation: 'indeterminate 1.5s ease-in-out infinite',
              backgroundSize: '200% 100%',
            }}
          />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--gradient-end)] transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      <style>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}
