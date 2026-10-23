import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type LucideIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "destructive"
  | "destructive-subtle";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

const ICON_SIZES: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  loading = false,
  loadingText,
  fullWidth = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = ICON_SIZES[size];

  const classes = [
    "app-btn",
    `app-btn--${variant}`,
    `app-btn--${size}`,
    fullWidth ? "app-btn--full" : "",
    loading ? "app-btn--loading" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      className={classes}
      {...rest}
    >
      {loading ? (
        <Loader2 size={iconSize} strokeWidth={2} className="app-btn__spinner" aria-hidden="true" />
      ) : LeadingIcon ? (
        <LeadingIcon size={iconSize} strokeWidth={2} aria-hidden="true" />
      ) : null}

      {loading && loadingText ? loadingText : children}

      {!loading && TrailingIcon && (
        <TrailingIcon size={iconSize} strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}
