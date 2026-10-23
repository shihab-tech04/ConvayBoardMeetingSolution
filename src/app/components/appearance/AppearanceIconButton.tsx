import { Palette } from "lucide-react";

interface AppearanceIconButtonProps {
  onClick: () => void;
  open: boolean;
}

export function AppearanceIconButton({ onClick, open }: AppearanceIconButtonProps) {
  return (
    <button
      onClick={onClick}
      title="Appearance settings"
      aria-label="Appearance settings"
      aria-expanded={open}
      aria-haspopup="dialog"
      className={`topbar__icon-button${open ? " topbar__icon-button--active" : ""} relative flex-shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2`}
    >
      <Palette size={17} strokeWidth={1.75} className="topbar__icon-button-icon" />
    </button>
  );
}
