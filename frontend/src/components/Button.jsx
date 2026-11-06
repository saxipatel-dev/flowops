const variants = {
  primary: 'bg-brand text-white shadow-xs hover:bg-brand-dark disabled:bg-brand/50',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-white',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400',
  dangerOutline: 'border border-red-200 bg-white text-red-700 shadow-xs hover:border-red-300 hover:bg-red-50 disabled:text-red-300',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 disabled:bg-red-300',
  success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 disabled:bg-emerald-300',
};

const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-9 gap-2 px-4 text-sm',
  icon: 'h-9 w-9',
};

// Shared so links that act as buttons look identical to real buttons.
export function buttonClasses(variant = 'primary', size = 'md') {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`;
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
