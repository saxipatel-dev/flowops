const variants = {
  primary: 'bg-accent-strong text-on-accent shadow-raised hover:bg-accent-hover disabled:opacity-50',
  secondary: 'border border-line bg-raised text-ink hover:border-line-strong hover:bg-hover disabled:opacity-50',
  ghost: 'text-muted hover:bg-hover hover:text-ink disabled:opacity-50',
  dangerOutline: 'border border-bad/40 text-bad hover:border-bad hover:bg-bad-soft disabled:opacity-50',
  danger: 'bg-bad text-on-status hover:bg-bad/85 disabled:opacity-50',
  success: 'bg-ok text-on-status hover:bg-ok/85 disabled:opacity-50',
};

const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-2 px-4 text-sm',
  icon: 'h-9 w-9',
};

// Shared so links that act as buttons look identical to real buttons.
export function buttonClasses(variant = 'primary', size = 'md') {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${sizes[size]}`;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button type={type} disabled={loading || disabled} className={`${buttonClasses(variant, size)} ${className}`} {...props}>
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
