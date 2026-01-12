import { clsx } from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel,
  id,
}: SwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        {
          'bg-[var(--primary)]': checked,
          'bg-[var(--border)]': !checked,
          'w-9 h-5': size === 'md',
          'w-7 h-4': size === 'sm',
        }
      )}
    >
      <span
        className={clsx(
          'pointer-events-none rounded-full bg-white shadow-sm transition-transform duration-200',
          {
            'w-4 h-4': size === 'md',
            'w-3 h-3': size === 'sm',
            'translate-x-4': checked && size === 'md',
            'translate-x-3': checked && size === 'sm',
            'translate-x-0.5': !checked,
          }
        )}
        style={{ marginTop: size === 'md' ? '2px' : '2px' }}
      />
    </button>
  );
}
