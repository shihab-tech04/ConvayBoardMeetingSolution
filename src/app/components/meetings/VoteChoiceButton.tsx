import type { ButtonHTMLAttributes } from "react";

export type VoteChoice = "for" | "against" | "abstain";

export interface VoteChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  choice: VoteChoice;
  selected?: boolean;
  count?: number;
}

const CHOICE_LABELS: Record<VoteChoice, string> = {
  for: "For",
  against: "Against",
  abstain: "Abstain",
};

const CHOICE_COLORS: Record<VoteChoice, { active: string; border: string; text: string }> = {
  for:     { active: "var(--color-success)",        border: "var(--color-success)",        text: "var(--color-success)" },
  against: { active: "var(--color-error)",          border: "var(--color-error)",          text: "var(--color-error)" },
  abstain: { active: "var(--color-text-secondary)", border: "var(--color-border)",         text: "var(--color-text-secondary)" },
};

export function VoteChoiceButton({
  choice,
  selected = false,
  count,
  disabled,
  className = "",
  type = "button",
  ...rest
}: VoteChoiceButtonProps) {
  const colors = CHOICE_COLORS[choice];

  return (
    <button
      type={type}
      disabled={disabled}
      aria-pressed={selected}
      className={["vote-choice-btn", selected ? "vote-choice-btn--selected" : "", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        minWidth: 72,
        height: 56,
        padding: "0 16px",
        borderRadius: "var(--radius-md)",
        border: `1.5px solid ${selected ? colors.active : colors.border}`,
        background: selected ? `color-mix(in srgb, ${colors.active} 12%, transparent)` : "transparent",
        color: selected ? colors.active : colors.text,
        fontWeight: 700,
        fontSize: "0.8rem",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.42 : 1,
        transition: "background 140ms ease, border-color 140ms ease, color 140ms ease",
      }}
      {...rest}
    >
      <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{CHOICE_LABELS[choice]}</span>
      {count !== undefined && (
        <span style={{ fontSize: "1rem", fontWeight: 800, lineHeight: 1 }}>{count}</span>
      )}
    </button>
  );
}
