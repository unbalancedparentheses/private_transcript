import { cn } from '../../lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
}

export function Progress({
  value,
  max = 100,
  className,
  showLabel = false,
  label,
  indeterminate = false,
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          {showLabel && !indeterminate && (
            <span className="text-sm text-muted-foreground">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        {indeterminate ? (
          <div
            className="h-full bg-primary rounded-full animate-pulse"
            style={{ width: '50%', animation: 'indeterminate 1.5s ease-in-out infinite' }}
          />
        ) : (
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
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
