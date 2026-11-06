// Light pastel discs with dark initials stay readable on every dark surface.
const palette = [
  'bg-[#b9b0ff] text-[#151233]',
  'bg-[#9ccfff] text-[#0d2236]',
  'bg-[#7fe3c8] text-[#0b2a22]',
  'bg-[#f7cf8a] text-[#33230a]',
  'bg-[#f0a3b5] text-[#3a1420]',
  'bg-[#c9b8ff] text-[#1d1440]',
  'bg-[#8fe0e0] text-[#0b2b2b]',
]

const sizes = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-12 w-12 text-base',
};

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// The same name always gets the same color.
function colorFor(name = '') {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
}

export default function Avatar({ name, size = 'md' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${colorFor(name)}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

// An avatar next to a name, used in tables and detail panels.
export function UserLabel({ name, size = 'sm' }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={name} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}
