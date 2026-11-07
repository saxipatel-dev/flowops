import { useRef } from 'react';
import { heatLevel } from '../services/missionControl.js';

const levelStyles = ['bg-hover', 'bg-accent/25', 'bg-accent/45', 'bg-accent/70', 'bg-accent'];
const weekdayLetters = ['M', '', 'W', '', 'F', '', 'S'];

export function longDate(key) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-faint" aria-hidden="true">
      Less
      {levelStyles.map((style) => (
        <span key={style} className={`h-[11px] w-[11px] rounded-[3px] ${style}`} />
      ))}
      More
    </div>
  );
}

// Days as a Monday-first week grid, one cell per day, shaded by how many events it had.
// One cell is in the tab order at a time; arrow keys move by day (up/down) and week (left/right).
// `selected` may be null, in which case the last day takes keyboard focus.
export default function HeatGrid({ days, selected, onPick, label = 'Events per day. Use the arrow keys to move between days.' }) {
  const gridRef = useRef(null);
  const max = Math.max(0, ...days.map((day) => day.count));
  const padding = days.length ? (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const focusIndex = selected ?? days.length - 1;

  function pick(index) {
    const next = Math.max(0, Math.min(days.length - 1, index));
    onPick(next);
    gridRef.current?.querySelector(`[data-index="${next}"]`)?.focus();
  }

  function handleKeyDown(event) {
    const moves = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7, Home: -days.length, End: days.length };
    if (moves[event.key] === undefined) return;
    event.preventDefault();
    pick(focusIndex + moves[event.key]);
  }

  return (
    <div className="flex gap-2">
      <div className="grid grid-rows-7 gap-[3px] font-mono text-[9px] leading-[13px] text-faint lg:leading-4" aria-hidden="true">
        {weekdayLetters.map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
      </div>
      <div ref={gridRef} role="group" aria-label={label} onKeyDown={handleKeyDown} className="grid grid-flow-col grid-rows-7 gap-[3px]">
        {Array.from({ length: padding }, (_, index) => (
          <span key={`pad-${index}`} className="h-[13px] w-[13px] lg:h-4 lg:w-4" aria-hidden="true" />
        ))}
        {days.map((day, index) => {
          const isSelected = index === selected;
          return (
            <button
              key={day.date}
              type="button"
              data-index={index}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => pick(index)}
              aria-pressed={isSelected}
              aria-label={`${longDate(day.date)}: ${day.count} ${day.count === 1 ? 'event' : 'events'}`}
              className={`h-[13px] w-[13px] rounded-[3px] transition-transform duration-100 hover:scale-125 lg:h-4 lg:w-4 ${levelStyles[heatLevel(day.count, max)]} ${
                isSelected ? 'outline-2 outline-offset-1 outline-ink' : ''
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
