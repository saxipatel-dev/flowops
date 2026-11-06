// The FlowOps mark: a short transit line with a completed stop and the current stop.
export default function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#181c2b" />
      <path d="M6 21h7l6-10h7" stroke="#9d8cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="13" cy="21" r="3.2" fill="#0b0d15" stroke="#45d6b0" strokeWidth="2.2" />
      <circle cx="19" cy="11" r="3.2" fill="#0b0d15" stroke="#9d8cff" strokeWidth="2.2" />
    </svg>
  );
}
