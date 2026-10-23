import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import type { ButtonVariant, ButtonSize } from "./Button";

type LucideIcon = React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }>;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  label: string;
  variant?: "default" | "ghost" | "danger";
  size?: ButtonSize;
  loading?: boolean;
  active?: boolean;
  tooltip?: string;
}

const ICON_SIZES: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export function IconButton({
  icon: Icon,
  label,
  variant = "default",
  size = "md",
  loading = false,
  active = false,
  tooltip,
  disabled,
  className = "",
  type = "button",
  ...rest
}: IconButtonProps) {
  const iconSize = ICON_SIZES[size];

  const classes = [
    "app-icon-btn",
    `app-icon-btn--${size}`,
    `app-icon-btn--${variant}`,
    active ? "app-icon-btn--active" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-label={label}
      title={tooltip ?? label}
      aria-busy={loading ? "true" : undefined}
      aria-pressed={active}
      className={classes}
      {...rest}
    >
      {loading
        ? <Loader2 size={iconSize} strokeWidth={2} className="app-btn__spinner" aria-hidden="true" />
        : <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />
      }
    </button>
  );
}
