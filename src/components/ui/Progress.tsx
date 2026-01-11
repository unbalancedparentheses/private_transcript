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
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-[var(--muted-foreground)]">{label}</span>
          {showLabel && !indeterminate && (
            <span className="text-[11px] tabular-nums text-[var(--foreground)]">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={cn(
        'w-full rounded-full overflow-hidden bg-[var(--border)]',
        heights[size]
      )}>
        {indeterminate ? (
          <div
            className="h-full rounded-full bg-[var(--primary)]"
            style={{
              width: '30%',
              animation: 'indeterminate 1.2s ease-in-out infinite',
            }}
          />
        ) : (
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      <style>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
