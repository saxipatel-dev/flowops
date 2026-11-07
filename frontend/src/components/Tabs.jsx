export default function Tabs({ tabs, active, onChange, className = 'border-b border-line' }) {
  return (
    <div className={`flex gap-1 px-3 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const selected = active === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`-mb-px border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors ${
              selected ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
