import { X } from "lucide-react";

interface AppliedFilterChipsProps {
  values: Record<string, string>;
  onClear: () => void;
  inCard?: boolean;
}

export function AppliedFilterChips({ values, onClear, inCard }: AppliedFilterChipsProps) {
  const active = Object.entries(values).filter(([, v]) => v && !v.startsWith("All"));
  if (!active.length) return null;

  return (
    <div className={`applied-chips${inCard ? " applied-chips--in-card" : ""}`}>
      <span className="applied-chips__label">Filtered by:</span>
      {active.map(([k, v]) => (
        <span key={k} className="applied-chips__tag">{v}</span>
      ))}
      <button type="button" onClick={onClear} className="applied-chips__clear">
        <X size={12} aria-hidden="true" />
        Clear
      </button>
    </div>
  );
}
