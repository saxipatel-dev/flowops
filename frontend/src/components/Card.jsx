export default function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={`card ${className}`} {...props}>
      {children}
    </Tag>
  );
}

// A card title row with an optional description and action on the right.
export function CardHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  );
}
