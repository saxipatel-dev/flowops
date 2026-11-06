// Light pastel discs with dark initials stay readable on every dark surface: [disc, initials].
const palette = [
  ['#b9b0ff', '#151233'],
  ['#9ccfff', '#0d2236'],
  ['#7fe3c8', '#0b2a22'],
  ['#f7cf8a', '#33230a'],
  ['#f0a3b5', '#3a1420'],
  ['#c9b8ff', '#1d1440'],
  ['#8fe0e0', '#0b2b2b'],
];

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

// The same name always gets the same colour. Also used to tint that person's line on the week map.
export function avatarColor(name = '') {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return palette[hash % palette.length][0];
}

function textColorFor(name = '') {
  const disc = avatarColor(name);
  return palette.find(([color]) => color === disc)[1];
}

export default function Avatar({ name, size = 'md' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]}`}
      style={{ backgroundColor: avatarColor(name), color: textColorFor(name) }}
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
